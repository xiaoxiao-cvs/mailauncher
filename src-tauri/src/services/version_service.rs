/// 版本管理服务
///
/// 对应 Python 的 version_service.py + component_update_service.py + update_service.py。
/// 负责 GitHub API 版本检查、组件更新、备份/恢复、启动器自身更新检查。
use std::path::Path;

use sqlx::SqlitePool;
use tauri::AppHandle;
use tracing::{info, warn};

use crate::errors::{AppError, AppResult};
use crate::models::update::*;
use crate::models::version::*;

// ==================== GitHub 仓库配置 ====================

/// 组件对应的 GitHub 仓库
pub struct GitHubRepo {
    pub owner: &'static str,
    /// GitHub 仓库名
    pub name: &'static str,
    /// 本地目录名
    pub folder: &'static str,
    /// 是否使用 Release（为 false 时对比 commit）
    #[allow(dead_code)]
    pub has_releases: bool,
}

/// 通过 DownloadItemType 获取 GitHub 仓库信息
pub fn get_github_repo(item_type: &crate::models::download::DownloadItemType) -> GitHubRepo {
    use crate::models::download::DownloadItemType;
    match item_type {
        DownloadItemType::Maibot => GitHubRepo {
            owner: "Mai-with-u",
            name: "MaiBot",
            folder: "MaiBot",
            has_releases: false,
        },
        // 适配器为 MaiBot 插件，本地检出位于 MaiBot/plugins 下。
        DownloadItemType::NapcatAdapter => GitHubRepo {
            owner: "Mai-with-u",
            name: "MaiBot-Napcat-Adapter",
            folder: "MaiBot/plugins/MaiBot-Napcat-Adapter",
            has_releases: false,
        },
        DownloadItemType::Napcat => GitHubRepo {
            owner: "NapNeko",
            name: "NapCatQQ",
            folder: "NapCat",
            has_releases: true,
        },
        DownloadItemType::Lpmm => GitHubRepo {
            owner: "Mai-with-u",
            name: "MaiMBot-LPMM",
            folder: "MaiMBot-LPMM",
            has_releases: false,
        },
    }
}

/// 启动器自身仓库
const LAUNCHER_OWNER: &str = "xiaoxiao-cvs";
const LAUNCHER_REPO: &str = "mailauncher";

// ==================== GitHub API 客户端 ====================

/// 创建 HTTP 客户端（带 User-Agent）
///
/// 代理来源：进程环境变量 HTTP_PROXY/HTTPS_PROXY/ALL_PROXY。这些 GitHub API 入口
/// （check_launcher_update / get_channel_versions / get_component_releases）由其
/// Tauri 命令签名所限拿不到 DB 池，故代理经 source_proxy_service::apply_proxy_to_process_env
/// 在"保存代理"与"启动"两处同步进入进程环境，再由此显式读取并 .proxy() 注入，
/// 与 git/pip 子进程的代理 env 来源一致。
pub(crate) fn github_client() -> reqwest::Client {
    let mut builder = reqwest::Client::builder().user_agent("mailauncher/1.0");

    // 显式应用代理（若进程环境已设置）。reqwest 虽默认探测 env 代理，
    // 这里显式声明以保证行为可控、意图清晰。
    if let Some(url) = proxy_url_from_env() {
        if let Ok(proxy) = reqwest::Proxy::all(&url) {
            builder = builder.proxy(proxy);
        } else {
            warn!("代理地址非法，GitHub 客户端跳过代理: {}", url);
        }
    }

    // 支持可选 GitHub token，提升速率限制 (60 → 5000 req/hour)
    if let Ok(token) = std::env::var("GITHUB_TOKEN") {
        if !token.is_empty() {
            let mut headers = reqwest::header::HeaderMap::new();
            if let Ok(val) = reqwest::header::HeaderValue::from_str(&format!("Bearer {}", token)) {
                headers.insert(reqwest::header::AUTHORIZATION, val);
                builder = builder.default_headers(headers);
            }
        }
    }

    builder.build().unwrap_or_else(|_| reqwest::Client::new())
}

/// 从进程环境变量读取代理地址（按 HTTPS_PROXY → HTTP_PROXY → ALL_PROXY 优先）。
///
/// 未设置任何代理变量时返回 None（客户端走直连）。
fn proxy_url_from_env() -> Option<String> {
    for key in [
        "HTTPS_PROXY",
        "https_proxy",
        "HTTP_PROXY",
        "http_proxy",
        "ALL_PROXY",
        "all_proxy",
    ] {
        if let Ok(val) = std::env::var(key) {
            let val = val.trim();
            if !val.is_empty() {
                return Some(val.to_string());
            }
        }
    }
    None
}

/// 从 GitHub API 获取最新 commit
pub async fn get_latest_commit(owner: &str, repo: &str) -> AppResult<Option<String>> {
    let url = format!(
        "https://api.github.com/repos/{}/{}/commits?per_page=1",
        owner, repo
    );

    let client = github_client();
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::Network(format!("GitHub API 请求失败: {}", e)))?;

    if !resp.status().is_success() {
        warn!("GitHub API 返回 {}: {}/{}", resp.status(), owner, repo);
        return Ok(None);
    }

    let commits: Vec<serde_json::Value> = resp
        .json()
        .await
        .map_err(|e| AppError::Network(format!("解析 GitHub API 响应失败: {}", e)))?;

    Ok(commits
        .first()
        .and_then(|c| c["sha"].as_str())
        .map(|s| s.to_string()))
}

/// 获取组件 Release 列表
pub async fn get_releases(
    owner: &str,
    repo: &str,
    limit: Option<usize>,
) -> AppResult<Vec<GitHubRelease>> {
    let limit = limit.unwrap_or(20);
    let url = format!(
        "https://api.github.com/repos/{}/{}/releases?per_page={}",
        owner, repo, limit
    );

    let client = github_client();
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::Network(format!("GitHub API 请求失败: {}", e)))?;

    if !resp.status().is_success() {
        return Ok(Vec::new());
    }

    let releases: Vec<serde_json::Value> = resp
        .json()
        .await
        .map_err(|e| AppError::Network(format!("解析 Release 列表失败: {}", e)))?;

    let result = releases
        .into_iter()
        .map(|r| GitHubRelease {
            tag_name: r["tag_name"].as_str().unwrap_or("").to_string(),
            name: r["name"].as_str().map(|s| s.to_string()),
            body: r["body"].as_str().map(|s| s.to_string()),
            draft: r["draft"].as_bool().unwrap_or(false),
            prerelease: r["prerelease"].as_bool().unwrap_or(false),
            created_at: r["created_at"].as_str().map(|s| s.to_string()),
            published_at: r["published_at"].as_str().map(|s| s.to_string()),
            html_url: r["html_url"].as_str().map(|s| s.to_string()),
            assets: r["assets"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .map(|a| ReleaseAsset {
                            name: a["name"].as_str().unwrap_or("").to_string(),
                            download_url: a["browser_download_url"]
                                .as_str()
                                .unwrap_or("")
                                .to_string(),
                            size: a["size"].as_i64().unwrap_or(0),
                            content_type: a["content_type"].as_str().unwrap_or("").to_string(),
                        })
                        .collect()
                })
                .unwrap_or_default(),
        })
        .collect();

    Ok(result)
}

/// 对比两个 commit 间的差异
pub async fn compare_commits(
    owner: &str,
    repo: &str,
    base: &str,
    head: &str,
) -> AppResult<Option<i32>> {
    let url = format!(
        "https://api.github.com/repos/{}/{}/compare/{}...{}",
        owner, repo, base, head
    );

    let client = github_client();
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::Network(format!("GitHub compare API 失败: {}", e)))?;

    if !resp.status().is_success() {
        return Ok(None);
    }

    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| AppError::Network(format!("解析 compare 响应失败: {}", e)))?;

    Ok(data["ahead_by"].as_i64().map(|n| n as i32))
}

// ==================== 本地版本 ====================

/// 获取本地 Git commit hash
pub fn get_local_commit(component_path: &Path) -> Option<String> {
    let output = std::process::Command::new("git")
        .args(["rev-parse", "HEAD"])
        .current_dir(component_path)
        .output()
        .ok()?;

    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        None
    }
}

/// 从文件读取本地版本号
///
/// 尝试从 `__version__.py` 或 `package.json` 读取版本信息。
pub fn get_local_version_from_file(component_path: &Path, _component: &str) -> Option<String> {
    // Python 组件: __version__.py
    let version_py = component_path.join("__version__.py");
    if version_py.exists() {
        if let Ok(content) = std::fs::read_to_string(&version_py) {
            // 匹配 __version__ = "x.y.z"
            for line in content.lines() {
                if line.contains("__version__") && line.contains('=') {
                    let version = line
                        .split('=')
                        .nth(1)?
                        .trim()
                        .trim_matches('"')
                        .trim_matches('\'')
                        .to_string();
                    return Some(version);
                }
            }
        }
    }

    // Node.js 组件: package.json
    let package_json = component_path.join("package.json");
    if package_json.exists() {
        if let Ok(content) = std::fs::read_to_string(&package_json) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                return json["version"].as_str().map(|s| s.to_string());
            }
        }
    }

    None
}

// ==================== 组件版本检查 ====================

/// 检查单个组件是否有更新
pub async fn check_component_update(
    _pool: &SqlitePool,
    _instance_id: &str,
    item_type: &crate::models::download::DownloadItemType,
    base_dir: &Path,
) -> AppResult<ComponentUpdateCheck> {
    let repo = get_github_repo(item_type);
    let component_path = base_dir.join(repo.folder);
    let component = repo.name;

    let local_commit = get_local_commit(&component_path);
    let local_version = get_local_version_from_file(&component_path, component);

    let latest_commit = get_latest_commit(repo.owner, repo.name).await?;

    let has_update = match (&local_commit, &latest_commit) {
        (Some(local), Some(latest)) => local != latest,
        _ => false,
    };

    let commits_behind = if has_update {
        if let (Some(local), Some(latest)) = (&local_commit, &latest_commit) {
            compare_commits(repo.owner, repo.name, local, latest).await?
        } else {
            None
        }
    } else {
        Some(0)
    };

    Ok(ComponentUpdateCheck {
        component: component.to_string(),
        current_version: local_version,
        current_commit: local_commit,
        latest_version: None,
        latest_commit,
        has_update,
        update_notes: None,
        commits_behind,
    })
}

/// 获取实例所有组件的版本信息
pub async fn get_instance_components_version(
    pool: &SqlitePool,
    instance_id: &str,
    _base_dir: &Path,
) -> AppResult<Vec<ComponentVersionInfo>> {
    let rows: Vec<ComponentVersion> =
        sqlx::query_as("SELECT * FROM component_versions WHERE instance_id = ? ORDER BY component")
            .bind(instance_id)
            .fetch_all(pool)
            .await
            .map_err(|e| AppError::Database(format!("查询组件版本失败: {}", e)))?;

    Ok(rows
        .into_iter()
        .map(|r| ComponentVersionInfo {
            component: r.component,
            version: r.version,
            commit_hash: r.commit_hash,
            install_method: r.install_method,
            installed_at: Some(r.installed_at.to_string()),
        })
        .collect())
}

// ==================== 组件更新执行 ====================

/// 通过 Git pull 更新组件
///
/// 对应 Python `ComponentUpdateService.update_component_from_git`。
pub async fn update_component_git(
    component_path: &Path,
    target_commit: Option<&str>,
    app_handle: &AppHandle,
    event_name: &str,
) -> AppResult<()> {
    use crate::services::download_service::run_command_with_output;

    // git pull
    let output = run_command_with_output(
        "git",
        &["pull", "--progress"],
        Some(component_path),
        app_handle,
        event_name,
    )
    .await?;

    if !output.success {
        return Err(AppError::Process(format!(
            "Git pull 失败: {}",
            output.stderr
        )));
    }

    // 如果指定了 commit，checkout
    if let Some(commit) = target_commit {
        let output = run_command_with_output(
            "git",
            &["checkout", commit],
            Some(component_path),
            app_handle,
            event_name,
        )
        .await?;

        if !output.success {
            return Err(AppError::Process(format!(
                "Git checkout {} 失败: {}",
                commit, output.stderr
            )));
        }
    }

    info!("组件 Git 更新完成: {:?}", component_path);
    Ok(())
}

// ==================== 备份/恢复 ====================

/// 更新前数据备份的条目白名单与保留份数。只备份用户不可再生的状态(配置 + 数据),
/// 代码由 Git 兜底无需进备份。条目可为目录(MaiBot/NapCat 的 config/、MaiBot 的 data/)
/// 或文件(适配器根下的 config.toml)——存在哪个备哪个。
const DATA_BACKUP_ITEMS: [&str; 3] = ["config", "data", "config.toml"];
const DATA_BACKUP_KEEP: usize = 3;

/// 更新前自动备份:快照组件目录下存在的 config/ 与 data/ 子目录,写入 backups/{databak_id}/,
/// 并仅保留每实例每组件最近 DATA_BACKUP_KEEP 份(超出的删盘+删库)。
///
/// 不备份源码——代码受 Git 版本控制,误伤可回滚,纳入备份只会徒增体积。
/// 返回备份 id;若组件目录下既无 config/ 也无 data/(无可备份内容)则返回 None。
pub async fn backup_component_data(
    pool: &SqlitePool,
    instance_id: &str,
    item_type: &crate::models::download::DownloadItemType,
    component_dir: &Path,
) -> AppResult<Option<String>> {
    use uuid::Uuid;

    let repo = get_github_repo(item_type);

    // 只对真正存在的条目建备份,避免生成空备份目录。
    let present: Vec<&str> = DATA_BACKUP_ITEMS
        .iter()
        .copied()
        .filter(|item| component_dir.join(item).exists())
        .collect();
    if present.is_empty() {
        info!("组件 {} 无 config/data 可备份,跳过更新前备份", repo.folder);
        return Ok(None);
    }

    let backup_id = format!(
        "databak_{}",
        &Uuid::new_v4().to_string().replace('-', "")[..12]
    );
    let backup_path = crate::utils::platform::get_data_root()
        .join("backups")
        .join(&backup_id);
    std::fs::create_dir_all(&backup_path)
        .map_err(|e| AppError::FileSystem(format!("创建备份目录失败: {}", e)))?;

    let copied = snapshot_items(component_dir, &backup_path, &present)?;

    let backup_size = fs_dir_size(&backup_path);
    let commit_hash = get_local_commit(component_dir);
    let version = get_local_version_from_file(component_dir, repo.name);
    let description = format!("更新前自动备份: {}", copied.join("+"));

    sqlx::query(
        "INSERT INTO version_backups (id, instance_id, component, version, commit_hash, backup_path, backup_size, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
    )
    .bind(&backup_id)
    .bind(instance_id)
    .bind(repo.folder)
    .bind(&version)
    .bind(&commit_hash)
    .bind(backup_path.to_string_lossy().as_ref())
    .bind(backup_size as i64)
    .bind(&description)
    .execute(pool)
    .await
    .map_err(|e: sqlx::Error| AppError::Database(format!("记录备份失败: {}", e)))?;

    prune_data_backups(pool, instance_id, repo.folder, DATA_BACKUP_KEEP).await;

    info!(
        "更新前备份完成: {} → {} ({} 字节, {})",
        repo.folder, backup_id, backup_size, description
    );
    Ok(Some(backup_id))
}

/// 把 component_dir 下指定条目逐个复制到 dest_dir(保持同名),返回实际复制的条目名。
/// 条目为目录则递归复制,为文件则直接复制,不存在则跳过。纯文件系统操作,便于单测。
fn snapshot_items(component_dir: &Path, dest_dir: &Path, items: &[&str]) -> AppResult<Vec<String>> {
    use crate::services::download_service::copy_dir_recursive;

    let mut copied = Vec::new();
    for item in items {
        let src = component_dir.join(item);
        if src.is_dir() {
            copy_dir_recursive(&src, &dest_dir.join(item))
                .map_err(|e| AppError::FileSystem(format!("备份 {} 失败: {}", item, e)))?;
            copied.push((*item).to_string());
        } else if src.is_file() {
            std::fs::create_dir_all(dest_dir)
                .map_err(|e| AppError::FileSystem(format!("创建备份目录失败: {}", e)))?;
            std::fs::copy(&src, dest_dir.join(item))
                .map_err(|e| AppError::FileSystem(format!("备份 {} 失败: {}", item, e)))?;
            copied.push((*item).to_string());
        }
    }
    Ok(copied)
}

/// 裁剪"更新前数据备份"(databak_ 前缀),每实例每组件仅保留最近 keep 份,超出的删盘+删库。
/// 裁剪是更新的附属清理动作,失败只记日志、不阻断更新主流程。
async fn prune_data_backups(pool: &SqlitePool, instance_id: &str, component: &str, keep: usize) {
    let rows = sqlx::query_as::<_, (String, String)>(
        "SELECT id, backup_path FROM version_backups
         WHERE instance_id = ? AND component = ? AND id LIKE 'databak\\_%' ESCAPE '\\'
         ORDER BY created_at DESC, id DESC",
    )
    .bind(instance_id)
    .bind(component)
    .fetch_all(pool)
    .await;

    let rows = match rows {
        Ok(r) => r,
        Err(e) => {
            warn!("裁剪旧备份: 查询失败,跳过裁剪: {}", e);
            return;
        }
    };

    for (id, path) in rows.into_iter().skip(keep) {
        let dir = std::path::PathBuf::from(&path);
        if dir.exists() {
            if let Err(e) = std::fs::remove_dir_all(&dir) {
                warn!("裁剪旧备份: 删除目录失败 {} ({}),保留数据库记录", path, e);
                continue;
            }
        }
        match sqlx::query("DELETE FROM version_backups WHERE id = ?")
            .bind(&id)
            .execute(pool)
            .await
        {
            Ok(_) => info!("裁剪旧备份: 已删除 {}", id),
            Err(e) => warn!("裁剪旧备份: 删除记录失败 {} ({})", id, e),
        }
    }
}

/// 叠加式恢复(用于 databak_ 数据备份):把备份目录下的每个子目录原子覆盖回组件目录,
/// 仅替换 config/data 等被备份的子目录,保留组件目录里的其它内容(源码、插件等)。
pub fn restore_data_backup(backup_path: &Path, component_dir: &Path) -> AppResult<()> {
    use crate::services::download_service::copy_dir_recursive;

    std::fs::create_dir_all(component_dir)
        .map_err(|e| AppError::FileSystem(format!("创建组件目录失败: {}", e)))?;

    let entries = std::fs::read_dir(backup_path)
        .map_err(|e| AppError::FileSystem(format!("读取备份目录失败: {}", e)))?;
    for entry in entries {
        let entry = entry.map_err(|e| AppError::FileSystem(format!("遍历备份目录失败: {}", e)))?;
        let src = entry.path();
        let name = entry.file_name();
        let target = component_dir.join(&name);

        if src.is_dir() {
            // 目录:先复制到同目录暂存,成功后再原子替换,避免中途失败把原数据删了又没补上。
            let staging = component_dir.join(format!(".restoring_{}", name.to_string_lossy()));
            if staging.exists() {
                std::fs::remove_dir_all(&staging)
                    .map_err(|e| AppError::FileSystem(format!("清理暂存目录失败: {}", e)))?;
            }
            copy_dir_recursive(&src, &staging).map_err(|e| {
                let _ = std::fs::remove_dir_all(&staging);
                AppError::FileSystem(format!("恢复子目录 {:?} 失败: {}", name, e))
            })?;
            if target.exists() {
                std::fs::remove_dir_all(&target).map_err(|e| {
                    AppError::FileSystem(format!("删除旧子目录 {:?} 失败: {}", name, e))
                })?;
            }
            std::fs::rename(&staging, &target)
                .map_err(|e| AppError::FileSystem(format!("替换子目录 {:?} 失败: {}", name, e)))?;
        } else if src.is_file() {
            // 文件:直接覆盖写入(copy 会截断已存在的目标)。
            std::fs::copy(&src, &target)
                .map_err(|e| AppError::FileSystem(format!("恢复文件 {:?} 失败: {}", name, e)))?;
        }
    }
    Ok(())
}

/// 整目录恢复(用于旧式整目录备份):把备份整体原子替换回组件目录。
pub fn restore_full_backup(backup_path: &Path, component_dir: &Path) -> AppResult<()> {
    use crate::services::download_service::copy_dir_recursive;

    let base_dir = component_dir
        .parent()
        .ok_or_else(|| AppError::FileSystem("组件目录无父目录".to_string()))?;
    let comp_name = component_dir
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "component".to_string());

    let temp_restore_dir = base_dir.join(format!("_restore_temp_{}", comp_name));
    if temp_restore_dir.exists() {
        std::fs::remove_dir_all(&temp_restore_dir)
            .map_err(|e| AppError::FileSystem(format!("清理临时恢复目录失败: {}", e)))?;
    }
    copy_dir_recursive(backup_path, &temp_restore_dir).map_err(|e| {
        let _ = std::fs::remove_dir_all(&temp_restore_dir);
        AppError::FileSystem(format!("恢复备份数据失败: {}", e))
    })?;
    if component_dir.exists() {
        std::fs::remove_dir_all(component_dir)
            .map_err(|e| AppError::FileSystem(format!("删除组件目录失败: {}", e)))?;
    }
    std::fs::rename(&temp_restore_dir, component_dir)
        .map_err(|e| AppError::FileSystem(format!("重命名恢复目录失败: {}", e)))?;
    Ok(())
}

/// 计算目录大小
fn fs_dir_size(path: &Path) -> u64 {
    let mut total = 0u64;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                total += fs_dir_size(&p);
            } else if let Ok(meta) = p.metadata() {
                total += meta.len();
            }
        }
    }
    total
}

/// 获取备份列表
pub async fn get_backups(
    pool: &SqlitePool,
    instance_id: &str,
    component: Option<&str>,
) -> AppResult<Vec<VersionBackup>> {
    let backups = if let Some(comp) = component {
        sqlx::query_as::<_, VersionBackup>(
            "SELECT * FROM version_backups WHERE instance_id = ? AND component = ? ORDER BY created_at DESC",
        )
        .bind(instance_id)
        .bind(comp)
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Database(format!("查询备份失败: {}", e)))?
    } else {
        sqlx::query_as::<_, VersionBackup>(
            "SELECT * FROM version_backups WHERE instance_id = ? ORDER BY created_at DESC",
        )
        .bind(instance_id)
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Database(format!("查询备份失败: {}", e)))?
    };

    Ok(backups)
}

/// 获取更新历史
pub async fn get_update_history(
    pool: &SqlitePool,
    instance_id: &str,
    component: Option<&str>,
    limit: Option<i64>,
) -> AppResult<Vec<UpdateHistory>> {
    let limit = limit.unwrap_or(50);
    let history = if let Some(comp) = component {
        sqlx::query_as::<_, UpdateHistory>(
            "SELECT * FROM update_history WHERE instance_id = ? AND component = ? ORDER BY updated_at DESC LIMIT ?",
        )
        .bind(instance_id)
        .bind(comp)
        .bind(limit)
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Database(format!("查询更新历史失败: {}", e)))?
    } else {
        sqlx::query_as::<_, UpdateHistory>(
            "SELECT * FROM update_history WHERE instance_id = ? ORDER BY updated_at DESC LIMIT ?",
        )
        .bind(instance_id)
        .bind(limit)
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Database(format!("查询更新历史失败: {}", e)))?
    };

    Ok(history)
}

/// 写入一条组件更新历史。
///
/// 列名严格对齐 `update_history` 表结构。无论更新成功或失败都应落库:
/// git pull 已经成功、却因为这条写库语句用了不存在的列名(update_method/created_at)
/// 而让整个更新命令报错,是必须消灭的确定性缺陷。
#[allow(clippy::too_many_arguments)]
pub async fn record_update_history(
    pool: &SqlitePool,
    instance_id: &str,
    component: &str,
    from_commit: &str,
    to_commit: Option<&str>,
    status: &str,
    backup_id: Option<&str>,
    error_message: Option<&str>,
) -> AppResult<()> {
    sqlx::query(
        "INSERT INTO update_history \
         (instance_id, component, from_commit, to_commit, status, backup_id, error_message) \
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(instance_id)
    .bind(component)
    .bind(from_commit)
    .bind(to_commit)
    .bind(status)
    .bind(backup_id)
    .bind(error_message)
    .execute(pool)
    .await
    .map_err(|e| AppError::Database(format!("记录更新历史失败: {}", e)))?;
    Ok(())
}

// ==================== 启动器自身更新 ====================

/// 检查启动器更新
///
/// 对应 Python `UpdateService.check_update`。
/// 从 GitHub Releases 获取最新版本，与当前版本对比。
pub async fn check_launcher_update(channel: &str) -> AppResult<UpdateCheckResponse> {
    let current_version = env!("CARGO_PKG_VERSION");
    let releases = get_releases(LAUNCHER_OWNER, LAUNCHER_REPO, None).await?;

    // 按通道过滤
    let channel_releases: Vec<&GitHubRelease> = releases
        .iter()
        .filter(|r| filter_by_channel(&r.tag_name, channel))
        .collect();

    let latest = channel_releases.first();
    let latest_version = latest.map(|r| r.tag_name.clone());
    let has_update = latest
        .map(|r| r.tag_name.trim_start_matches('v') != current_version)
        .unwrap_or(false);

    Ok(UpdateCheckResponse {
        current_version: current_version.to_string(),
        latest_version,
        has_update,
        update_available: has_update,
        channels: vec![
            UpdateChannel {
                name: "main".to_string(),
                label: "稳定版".to_string(),
                description: "推荐用于日常使用".to_string(),
            },
            UpdateChannel {
                name: "beta".to_string(),
                label: "测试版".to_string(),
                description: "包含新功能的预览版本".to_string(),
            },
            UpdateChannel {
                name: "develop".to_string(),
                label: "开发版".to_string(),
                description: "最新开发进度，可能不稳定".to_string(),
            },
        ],
    })
}

/// 按通道过滤 Tag
fn filter_by_channel(tag: &str, channel: &str) -> bool {
    match channel {
        "develop" => tag.contains("-dev") || tag.contains("-alpha") || tag.contains("-rc"),
        "beta" => tag.contains("-beta"),
        _ => {
            !tag.contains("-dev")
                && !tag.contains("-alpha")
                && !tag.contains("-rc")
                && !tag.contains("-beta")
        }
    }
}

/// 获取通道版本列表
pub async fn get_channel_versions(
    channel: &str,
    limit: Option<usize>,
) -> AppResult<ChannelVersionsResponse> {
    let limit = limit.unwrap_or(20);
    let releases = get_releases(LAUNCHER_OWNER, LAUNCHER_REPO, Some(50)).await?;

    let versions: Vec<VersionInfo> = releases
        .iter()
        .filter(|r| filter_by_channel(&r.tag_name, channel))
        .take(limit)
        .map(|r| VersionInfo {
            version: r.tag_name.clone(),
            label: r.name.clone(),
            date: r.published_at.clone(),
            channel: channel.to_string(),
            notes: r.body.clone(),
            download_url: r.html_url.clone(),
        })
        .collect();

    Ok(ChannelVersionsResponse {
        channel: channel.to_string(),
        versions,
    })
}

// ==================== 自更新:选版本下载 + 验签 + 安装 ====================

/// 自更新签名公钥(= tauri.conf 的 updater.pubkey,内容为 base64 的 .pub 文件文本)。
/// 与 CI 签名所用私钥配对;换密钥时此处需与 tauri.conf 一并更新。
const UPDATER_PUBKEY_B64: &str = "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDEyOUMxMzM0MTFFNEQyMzUKUldRMTB1UVJOQk9jRXFvNWptM0h2cHE4Zm42cy94dUtxOUF4aTd1S0w2NUdzVHU0a3BmUG94dy8K";

/// 校验数据的 Tauri/minisign 签名。
///
/// 入参均为 Tauri 形式:`pubkey_b64` 是 base64(.pub 文件文本);`sig_b64` 是 .sig 文件内容
/// (同样 base64,内层为 minisign 签名文件文本)。校验失败(含被篡改/损坏)返回 Err。
pub fn verify_tauri_signature(data: &[u8], sig_b64: &str, pubkey_b64: &str) -> AppResult<()> {
    use base64::Engine;
    use minisign_verify::{PublicKey, Signature};

    let decode_text = |s: &str, what: &str| -> AppResult<String> {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(s.trim())
            .map_err(|e| AppError::Internal(format!("{} base64 解码失败: {}", what, e)))?;
        String::from_utf8(bytes).map_err(|e| AppError::Internal(format!("{}非 UTF8: {}", what, e)))
    };

    let pub_text = decode_text(pubkey_b64, "公钥")?;
    // .pub 文件首行为注释,真正的 minisign 公钥在其后一行
    let key_line = pub_text
        .lines()
        .map(str::trim)
        .find(|l| !l.is_empty() && !l.starts_with("untrusted comment"))
        .ok_or_else(|| AppError::Internal("公钥内容缺少密钥行".to_string()))?;
    let pk = PublicKey::from_base64(key_line)
        .map_err(|e| AppError::Internal(format!("公钥解析失败: {}", e)))?;

    let sig_text = decode_text(sig_b64, "签名")?;
    let sig = Signature::decode(&sig_text)
        .map_err(|e| AppError::Internal(format!("签名解析失败: {}", e)))?;

    pk.verify(data, &sig, false)
        .map_err(|e| AppError::Internal(format!("签名校验未通过(安装包可能被篡改或损坏): {}", e)))
}

/// 用内置 updater 公钥校验启动器安装包签名。
///
/// 跨平台编译(不加 cfg):虽然目前只有 Windows 的安装命令调用它,但保持非 cfg 可让
/// UPDATER_PUBKEY_B64 在所有平台都被引用,避免非 Windows 下 clippy 误报该常量 dead_code。
pub fn verify_launcher_signature(data: &[u8], sig_b64: &str) -> AppResult<()> {
    verify_tauri_signature(data, sig_b64, UPDATER_PUBKEY_B64)
}

/// 自更新安装目标:某个 Release 在本平台的安装包及其签名。
#[cfg(target_os = "windows")]
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallTarget {
    /// 目标版本(Release tag)
    pub version: String,
    /// 安装包下载地址
    pub installer_url: String,
    /// 安装包文件名(落地用)
    pub installer_name: String,
    /// 签名文件(.sig)下载地址
    pub sig_url: String,
}

/// 本平台安装包扩展名(目前仅 Windows 支持应用内自更新安装)。
#[cfg(target_os = "windows")]
const INSTALLER_EXT: &str = ".exe";

/// 解析选定通道/版本的安装目标:在 Release 资产里定位本平台安装包及其 .sig。
/// `version` 为 None 时取该通道最新 Release。缺签名文件则报错(拒绝无签名安装)。
#[cfg(target_os = "windows")]
pub async fn resolve_install_target(
    channel: &str,
    version: Option<&str>,
) -> AppResult<InstallTarget> {
    let releases = get_releases(LAUNCHER_OWNER, LAUNCHER_REPO, Some(50)).await?;
    let release = releases
        .iter()
        .filter(|r| filter_by_channel(&r.tag_name, channel))
        .find(|r| match version {
            Some(v) => {
                r.tag_name == v || r.tag_name.trim_start_matches('v') == v.trim_start_matches('v')
            }
            None => true,
        })
        .ok_or_else(|| {
            AppError::NotFound(format!(
                "通道 {} 未找到{}对应的 Release",
                channel,
                version.map(|v| format!("版本 {} ", v)).unwrap_or_default()
            ))
        })?;

    let installer = release
        .assets
        .iter()
        .find(|a| {
            let n = a.name.to_lowercase();
            n.ends_with(INSTALLER_EXT) && !n.ends_with(".sig")
        })
        .ok_or_else(|| {
            AppError::NotFound(format!("Release {} 缺少本平台安装包", release.tag_name))
        })?;

    let sig_name = format!("{}.sig", installer.name);
    let sig = release
        .assets
        .iter()
        .find(|a| a.name == sig_name)
        .ok_or_else(|| {
            AppError::NotFound(format!(
                "Release {} 的安装包缺少签名文件 {},无法安全校验,拒绝安装",
                release.tag_name, sig_name
            ))
        })?;

    Ok(InstallTarget {
        version: release.tag_name.clone(),
        installer_url: installer.download_url.clone(),
        installer_name: installer.name.clone(),
        sig_url: sig.download_url.clone(),
    })
}

/// 下载小文本资源(签名文件)。
#[cfg(target_os = "windows")]
pub async fn fetch_text(url: &str) -> AppResult<String> {
    let resp = github_client()
        .get(url)
        .send()
        .await
        .map_err(|e| AppError::Network(format!("下载签名失败: {}", e)))?;
    if !resp.status().is_success() {
        return Err(AppError::Network(format!(
            "下载签名失败: HTTP {}",
            resp.status()
        )));
    }
    resp.text()
        .await
        .map_err(|e| AppError::Network(format!("读取签名失败: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migration::run_migrations;
    use crate::models::download::DownloadItemType;
    use sqlx::SqlitePool;

    // ==================== 自更新验签 ====================

    // 下列向量由一次性临时密钥(密码 test)对 b"mailauncher-updater-test-vector" 真实签出
    // (tauri signer),用于证明 verify_tauri_signature 正确处理 Tauri 的 base64 外层与
    // minisign 内层格式。与生产 updater 公钥无关,生产公钥见 UPDATER_PUBKEY_B64。
    const TEST_PUBKEY_B64: &str = "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEU3MzY5NjFBNUNEOTI2NUQKUldSZEp0bGNHcFkyNThPUk5QOHpXbU8zTkVlQm5ONUdvVU1mK2YzQXl5M0JORElVY3AzT0pzcnIK";
    const TEST_SIG_B64: &str = "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVSZEp0bGNHcFkyNS9YQ2kydkNXSnJraDdWS1BqOWJYdGNjV2NiYVo5aHU0T1ArZkwweU5oaXJUR0M5MHMyYkJJakEyV2lPVE9oYlN2QUR6eGlBN2JNL2hoU1Ywczh6cUFZPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzgwNzI3NjIzCWZpbGU6bWxhdW5jaGVyX3ZlYy5iaW4KNlR2dUQ2d2RlbG5VbkNGalVsVnJTYkVyU0xnUDVLZWN5Yy9DT1FKMXdTWnpRQ1N0UlpiZ2s3cHRuOWZXVSsweWV0SEZ1SXI1WmVzUHNiNmVNNlhZQ0E9PQo=";
    const TEST_DATA: &[u8] = b"mailauncher-updater-test-vector";

    #[test]
    fn verify_accepts_valid_signature() {
        verify_tauri_signature(TEST_DATA, TEST_SIG_B64, TEST_PUBKEY_B64).expect("合法签名应通过");
    }

    #[test]
    fn verify_rejects_tampered_data() {
        assert!(verify_tauri_signature(b"tampered-bytes", TEST_SIG_B64, TEST_PUBKEY_B64).is_err());
    }

    #[test]
    fn verify_rejects_wrong_pubkey() {
        // 用另一把公钥(生产 updater 公钥)验这条签名应失败
        assert!(verify_tauri_signature(TEST_DATA, TEST_SIG_B64, UPDATER_PUBKEY_B64).is_err());
    }

    #[test]
    fn verify_rejects_garbage_sig() {
        assert!(
            verify_tauri_signature(TEST_DATA, "not-valid-base64-!!!", TEST_PUBKEY_B64).is_err()
        );
    }

    // ==================== setup ====================

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("创建内存数据库失败");
        run_migrations(&pool).await.expect("迁移失败");
        pool
    }

    /// 插入一条实例行，满足外键约束
    async fn insert_instance_row(pool: &SqlitePool, id: &str) {
        sqlx::query(
            "INSERT INTO instances (id, name, instance_path, bot_type, status, run_time, component_state)
             VALUES (?, ?, ?, 'maibot', 'stopped', 0, '[]')",
        )
        .bind(id)
        .bind(format!("inst-{}", id))
        .bind(format!("inst-{}", id))
        .execute(pool)
        .await
        .expect("插入实例行失败");
    }

    // ==================== get_github_repo ====================

    #[test]
    fn get_github_repo_maibot_returns_correct_owner_and_folder() {
        let repo = get_github_repo(&DownloadItemType::Maibot);
        assert_eq!(repo.owner, "Mai-with-u");
        assert_eq!(repo.name, "MaiBot");
        assert_eq!(repo.folder, "MaiBot");
        assert!(!repo.has_releases);
    }

    #[test]
    fn get_github_repo_napcat_uses_releases() {
        let repo = get_github_repo(&DownloadItemType::Napcat);
        assert_eq!(repo.owner, "NapNeko");
        assert_eq!(repo.name, "NapCatQQ");
        assert_eq!(repo.folder, "NapCat");
        assert!(repo.has_releases);
    }

    #[test]
    fn get_github_repo_napcat_adapter_maps_correctly() {
        let repo = get_github_repo(&DownloadItemType::NapcatAdapter);
        assert_eq!(repo.owner, "Mai-with-u");
        assert_eq!(repo.name, "MaiBot-Napcat-Adapter");
        // 适配器作为插件，本地检出位于 MaiBot/plugins 下。
        assert_eq!(repo.folder, "MaiBot/plugins/MaiBot-Napcat-Adapter");
        assert!(!repo.has_releases);
    }

    #[test]
    fn get_github_repo_lpmm_maps_correctly() {
        let repo = get_github_repo(&DownloadItemType::Lpmm);
        assert_eq!(repo.owner, "Mai-with-u");
        assert_eq!(repo.name, "MaiMBot-LPMM");
        assert_eq!(repo.folder, "MaiMBot-LPMM");
        assert!(!repo.has_releases);
    }

    // ==================== filter_by_channel ====================

    #[test]
    fn filter_by_channel_main_accepts_stable_tags() {
        assert!(filter_by_channel("v1.0.0", "main"));
        assert!(filter_by_channel("v2.3.1", "main"));
        assert!(filter_by_channel("1.0.0", "main"));
    }

    #[test]
    fn filter_by_channel_main_rejects_prerelease_tags() {
        assert!(!filter_by_channel("v1.0.0-dev.1", "main"));
        assert!(!filter_by_channel("v1.0.0-alpha.2", "main"));
        assert!(!filter_by_channel("v1.0.0-rc.1", "main"));
        assert!(!filter_by_channel("v1.0.0-beta.3", "main"));
    }

    #[test]
    fn filter_by_channel_beta_accepts_only_beta_tags() {
        assert!(filter_by_channel("v1.0.0-beta.1", "beta"));
        assert!(filter_by_channel("v2.0.0-beta", "beta"));
        assert!(!filter_by_channel("v1.0.0", "beta"));
        assert!(!filter_by_channel("v1.0.0-dev.1", "beta"));
        assert!(!filter_by_channel("v1.0.0-alpha.1", "beta"));
        assert!(!filter_by_channel("v1.0.0-rc.1", "beta"));
    }

    #[test]
    fn filter_by_channel_develop_accepts_dev_alpha_rc() {
        assert!(filter_by_channel("v1.0.0-dev.1", "develop"));
        assert!(filter_by_channel("v1.0.0-alpha.2", "develop"));
        assert!(filter_by_channel("v1.0.0-rc.1", "develop"));
        assert!(!filter_by_channel("v1.0.0", "develop"));
        assert!(!filter_by_channel("v1.0.0-beta.1", "develop"));
    }

    #[test]
    fn filter_by_channel_unknown_channel_falls_through_to_main_logic() {
        assert!(filter_by_channel("v1.0.0", "stable"));
        assert!(!filter_by_channel("v1.0.0-beta.1", "stable"));
    }

    // ==================== github_client ====================

    #[test]
    fn github_client_builds_without_panicking() {
        let client = github_client();
        // 验证客户端确实是可用的 reqwest::Client 实例（非 default）
        // 如果构建失败会 panic，测试自然失败
        drop(client);
    }

    #[test]
    fn github_client_with_token_env_does_not_panic() {
        // 临时设置 GITHUB_TOKEN 环境变量
        std::env::set_var("GITHUB_TOKEN", "ghp_test_token_1234567890");
        let client = github_client();
        drop(client);
        std::env::remove_var("GITHUB_TOKEN");
    }

    #[test]
    fn github_client_with_empty_token_does_not_panic() {
        std::env::set_var("GITHUB_TOKEN", "");
        let client = github_client();
        drop(client);
        std::env::remove_var("GITHUB_TOKEN");
    }

    // ==================== fs_dir_size ====================

    #[test]
    fn fs_dir_size_returns_zero_for_nonexistent_path() {
        let size = fs_dir_size(Path::new("/tmp/mailauncher_nonexistent_dir_xyz"));
        assert_eq!(size, 0);
    }

    #[test]
    fn fs_dir_size_calculates_correct_total_for_nested_dirs() {
        let tmp = std::env::temp_dir().join("mailauncher_test_fs_dir_size");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(tmp.join("sub")).expect("创建测试目录失败");

        // 写入已知大小的文件
        std::fs::write(tmp.join("a.txt"), "hello").expect("写入失败"); // 5 bytes
        std::fs::write(tmp.join("sub").join("b.txt"), "world!!").expect("写入失败"); // 7 bytes

        let size = fs_dir_size(&tmp);
        assert_eq!(size, 12, "5 + 7 = 12 字节");

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn fs_dir_size_returns_zero_for_empty_directory() {
        let tmp = std::env::temp_dir().join("mailauncher_test_empty_dir");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).expect("创建测试目录失败");

        let size = fs_dir_size(&tmp);
        assert_eq!(size, 0);

        let _ = std::fs::remove_dir_all(&tmp);
    }

    // ==================== get_local_version_from_file ====================

    #[test]
    fn get_local_version_from_file_parses_python_version_double_quotes() {
        let tmp = std::env::temp_dir().join("mailauncher_test_pyver_dq");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).expect("创建测试目录失败");

        std::fs::write(tmp.join("__version__.py"), r#"__version__ = "1.2.3""#).expect("写入失败");

        let version = get_local_version_from_file(&tmp, "TestComponent");
        assert_eq!(version, Some("1.2.3".to_string()));

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn get_local_version_from_file_parses_python_version_single_quotes() {
        let tmp = std::env::temp_dir().join("mailauncher_test_pyver_sq");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).expect("创建测试目录失败");

        std::fs::write(tmp.join("__version__.py"), "__version__ = '0.9.1'\n").expect("写入失败");

        let version = get_local_version_from_file(&tmp, "TestComponent");
        assert_eq!(version, Some("0.9.1".to_string()));

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn get_local_version_from_file_parses_package_json() {
        let tmp = std::env::temp_dir().join("mailauncher_test_pkgjson");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).expect("创建测试目录失败");

        std::fs::write(
            tmp.join("package.json"),
            r#"{"name": "napcat", "version": "4.5.6"}"#,
        )
        .expect("写入失败");

        let version = get_local_version_from_file(&tmp, "napcat");
        assert_eq!(version, Some("4.5.6".to_string()));

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn get_local_version_from_file_prefers_python_over_package_json() {
        let tmp = std::env::temp_dir().join("mailauncher_test_pyver_priority");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).expect("创建测试目录失败");

        std::fs::write(tmp.join("__version__.py"), r#"__version__ = "1.0.0""#).expect("写入失败");
        std::fs::write(tmp.join("package.json"), r#"{"version": "2.0.0"}"#).expect("写入失败");

        let version = get_local_version_from_file(&tmp, "comp");
        assert_eq!(
            version,
            Some("1.0.0".to_string()),
            "Python __version__.py 应优先于 package.json"
        );

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn get_local_version_from_file_returns_none_for_empty_dir() {
        let tmp = std::env::temp_dir().join("mailauncher_test_no_version");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).expect("创建测试目录失败");

        let version = get_local_version_from_file(&tmp, "unknown");
        assert_eq!(version, None);

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn get_local_version_from_file_returns_none_for_nonexistent_path() {
        let version = get_local_version_from_file(
            Path::new("/tmp/mailauncher_nonexistent_component_xyz"),
            "ghost",
        );
        assert_eq!(version, None);
    }

    #[test]
    fn get_local_version_from_file_handles_malformed_package_json() {
        let tmp = std::env::temp_dir().join("mailauncher_test_bad_json");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).expect("创建测试目录失败");

        std::fs::write(tmp.join("package.json"), "not valid json {{{").expect("写入失败");

        let version = get_local_version_from_file(&tmp, "comp");
        assert_eq!(version, None);

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn get_local_version_from_file_handles_package_json_without_version_field() {
        let tmp = std::env::temp_dir().join("mailauncher_test_no_ver_field");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).expect("创建测试目录失败");

        std::fs::write(tmp.join("package.json"), r#"{"name": "test"}"#).expect("写入失败");

        let version = get_local_version_from_file(&tmp, "comp");
        assert_eq!(version, None);

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn get_local_version_from_file_handles_python_file_without_version_line() {
        let tmp = std::env::temp_dir().join("mailauncher_test_py_no_ver");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).expect("创建测试目录失败");

        std::fs::write(
            tmp.join("__version__.py"),
            "# just a comment\nauthor = 'someone'\n",
        )
        .expect("写入失败");

        let version = get_local_version_from_file(&tmp, "comp");
        assert_eq!(version, None);

        let _ = std::fs::remove_dir_all(&tmp);
    }

    // ==================== get_local_commit ====================

    #[test]
    fn get_local_commit_returns_none_for_non_git_directory() {
        let tmp = std::env::temp_dir().join("mailauncher_test_no_git");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).expect("创建测试目录失败");

        let commit = get_local_commit(&tmp);
        assert_eq!(commit, None);

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn get_local_commit_returns_none_for_nonexistent_path() {
        let commit = get_local_commit(Path::new("/tmp/mailauncher_nonexistent_repo_xyz"));
        assert_eq!(commit, None);
    }

    // ==================== DB: get_instance_components_version ====================

    #[tokio::test]
    async fn get_instance_components_version_returns_empty_for_no_records() {
        let pool = setup_test_db().await;
        insert_instance_row(&pool, "inst_ver_empty").await;

        let result = get_instance_components_version(&pool, "inst_ver_empty", Path::new("/tmp"))
            .await
            .expect("查询失败");
        assert!(result.is_empty());
    }

    #[tokio::test]
    async fn get_instance_components_version_returns_matching_records_ordered_by_component() {
        let pool = setup_test_db().await;
        insert_instance_row(&pool, "inst_ver_multi").await;

        sqlx::query(
            "INSERT INTO component_versions (instance_id, component, version, commit_hash, install_method)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind("inst_ver_multi")
        .bind("NapCat")
        .bind("3.0.0")
        .bind("abc1234")
        .bind("release")
        .execute(&pool)
        .await
        .expect("插入失败");

        sqlx::query(
            "INSERT INTO component_versions (instance_id, component, version, commit_hash, install_method)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind("inst_ver_multi")
        .bind("MaiBot")
        .bind("1.0.0")
        .bind("def5678")
        .bind("git")
        .execute(&pool)
        .await
        .expect("插入失败");

        // 另一个实例的记录，不应返回
        insert_instance_row(&pool, "inst_ver_other").await;
        sqlx::query(
            "INSERT INTO component_versions (instance_id, component, version, commit_hash, install_method)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind("inst_ver_other")
        .bind("MaiBot")
        .bind("9.9.9")
        .bind("zzz0000")
        .bind("manual")
        .execute(&pool)
        .await
        .expect("插入失败");

        let result = get_instance_components_version(&pool, "inst_ver_multi", Path::new("/tmp"))
            .await
            .expect("查询失败");

        assert_eq!(result.len(), 2);
        // ORDER BY component: MaiBot < NapCat
        assert_eq!(result[0].component, "MaiBot");
        assert_eq!(result[0].version, Some("1.0.0".to_string()));
        assert_eq!(result[0].commit_hash, Some("def5678".to_string()));
        assert_eq!(result[0].install_method, "git");
        assert_eq!(result[1].component, "NapCat");
        assert_eq!(result[1].version, Some("3.0.0".to_string()));
        assert_eq!(result[1].install_method, "release");
    }

    // ==================== DB: get_backups ====================

    #[tokio::test]
    async fn get_backups_returns_empty_for_no_records() {
        let pool = setup_test_db().await;
        insert_instance_row(&pool, "inst_bk_empty").await;

        let result = get_backups(&pool, "inst_bk_empty", None)
            .await
            .expect("查询失败");
        assert!(result.is_empty());
    }

    #[tokio::test]
    async fn get_backups_filters_by_component_when_specified() {
        let pool = setup_test_db().await;
        insert_instance_row(&pool, "inst_bk_filter").await;

        sqlx::query(
            "INSERT INTO version_backups (id, instance_id, component, backup_path, backup_size)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind("bk_maibot_001")
        .bind("inst_bk_filter")
        .bind("MaiBot")
        .bind("/backups/bk_maibot_001")
        .bind(1024_i64)
        .execute(&pool)
        .await
        .expect("插入失败");

        sqlx::query(
            "INSERT INTO version_backups (id, instance_id, component, backup_path, backup_size)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind("bk_napcat_001")
        .bind("inst_bk_filter")
        .bind("NapCat")
        .bind("/backups/bk_napcat_001")
        .bind(2048_i64)
        .execute(&pool)
        .await
        .expect("插入失败");

        let all = get_backups(&pool, "inst_bk_filter", None)
            .await
            .expect("查询失败");
        assert_eq!(all.len(), 2);

        let maibot_only = get_backups(&pool, "inst_bk_filter", Some("MaiBot"))
            .await
            .expect("查询失败");
        assert_eq!(maibot_only.len(), 1);
        assert_eq!(maibot_only[0].id, "bk_maibot_001");
        assert_eq!(maibot_only[0].component, "MaiBot");
        assert_eq!(maibot_only[0].backup_size, 1024);

        let napcat_only = get_backups(&pool, "inst_bk_filter", Some("NapCat"))
            .await
            .expect("查询失败");
        assert_eq!(napcat_only.len(), 1);
        assert_eq!(napcat_only[0].id, "bk_napcat_001");
        assert_eq!(napcat_only[0].backup_size, 2048);
    }

    #[tokio::test]
    async fn get_backups_does_not_leak_across_instances() {
        let pool = setup_test_db().await;
        insert_instance_row(&pool, "inst_bk_a").await;
        insert_instance_row(&pool, "inst_bk_b").await;

        sqlx::query(
            "INSERT INTO version_backups (id, instance_id, component, backup_path, backup_size)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind("bk_a_001")
        .bind("inst_bk_a")
        .bind("MaiBot")
        .bind("/backups/bk_a_001")
        .bind(512_i64)
        .execute(&pool)
        .await
        .expect("插入失败");

        let result_b = get_backups(&pool, "inst_bk_b", None)
            .await
            .expect("查询失败");
        assert!(result_b.is_empty(), "实例 B 不应看到实例 A 的备份");
    }

    // ==================== 更新前数据备份:快照 / 裁剪 / 恢复 ====================

    #[test]
    fn snapshot_items_copies_dirs_and_files_skips_missing() {
        let tmp = tempfile::tempdir().expect("临时目录");
        let comp = tmp.path().join("MaiBot");
        std::fs::create_dir_all(comp.join("config")).unwrap();
        std::fs::create_dir_all(comp.join("data")).unwrap();
        std::fs::create_dir_all(comp.join("src")).unwrap();
        std::fs::write(comp.join("config").join("bot_config.toml"), b"k=1").unwrap();
        std::fs::write(comp.join("data").join("MaiBot.db"), b"DBDATA").unwrap();
        std::fs::write(comp.join("config.toml"), b"adapter=1").unwrap();
        std::fs::write(comp.join("src").join("main.py"), b"print()").unwrap();

        let dest = tmp.path().join("bak");
        let copied = snapshot_items(&comp, &dest, &["config", "data", "config.toml", "logs"])
            .expect("快照失败");

        // 目录 config/data + 文件 config.toml 都备份;缺失的 logs 跳过;白名单外的 src 不备份
        assert_eq!(
            copied,
            vec![
                "config".to_string(),
                "data".to_string(),
                "config.toml".to_string()
            ]
        );
        assert_eq!(
            std::fs::read(dest.join("config").join("bot_config.toml")).unwrap(),
            b"k=1"
        );
        assert_eq!(
            std::fs::read(dest.join("data").join("MaiBot.db")).unwrap(),
            b"DBDATA"
        );
        assert_eq!(
            std::fs::read(dest.join("config.toml")).unwrap(),
            b"adapter=1"
        );
        assert!(!dest.join("src").exists());
        assert!(!dest.join("logs").exists());
    }

    #[test]
    fn snapshot_items_returns_empty_when_none_present() {
        let tmp = tempfile::tempdir().expect("临时目录");
        let comp = tmp.path().join("MaiBot");
        std::fs::create_dir_all(comp.join("src")).unwrap();
        let dest = tmp.path().join("bak");
        let copied =
            snapshot_items(&comp, &dest, &["config", "data", "config.toml"]).expect("快照失败");
        assert!(copied.is_empty());
    }

    #[test]
    fn restore_data_backup_overlays_only_backed_up_subdirs() {
        let tmp = tempfile::tempdir().expect("临时目录");
        // 备份内容:新的 config/data
        let bak = tmp.path().join("bak");
        std::fs::create_dir_all(bak.join("config")).unwrap();
        std::fs::create_dir_all(bak.join("data")).unwrap();
        std::fs::write(bak.join("config").join("bot_config.toml"), b"NEW").unwrap();
        std::fs::write(bak.join("data").join("MaiBot.db"), b"NEWDB").unwrap();

        // 现状组件目录:旧 config/data + 不该被动的 src
        let comp = tmp.path().join("MaiBot");
        std::fs::create_dir_all(comp.join("config")).unwrap();
        std::fs::create_dir_all(comp.join("data")).unwrap();
        std::fs::create_dir_all(comp.join("src")).unwrap();
        std::fs::write(comp.join("config").join("bot_config.toml"), b"OLD").unwrap();
        std::fs::write(comp.join("data").join("MaiBot.db"), b"OLDDB").unwrap();
        std::fs::write(comp.join("src").join("main.py"), b"CODE").unwrap();

        restore_data_backup(&bak, &comp).expect("恢复失败");

        // config/data 被备份内容覆盖,src(代码)原样保留
        assert_eq!(
            std::fs::read(comp.join("config").join("bot_config.toml")).unwrap(),
            b"NEW"
        );
        assert_eq!(
            std::fs::read(comp.join("data").join("MaiBot.db")).unwrap(),
            b"NEWDB"
        );
        assert_eq!(
            std::fs::read(comp.join("src").join("main.py")).unwrap(),
            b"CODE"
        );
        // 无残留暂存目录
        assert!(!comp.join(".restoring_config").exists());
        assert!(!comp.join(".restoring_data").exists());
    }

    #[test]
    fn restore_data_backup_removes_stale_files_in_target_subdir() {
        // 旧 config 里有备份中不存在的文件,恢复后应消失(子目录整体替换语义)
        let tmp = tempfile::tempdir().expect("临时目录");
        let bak = tmp.path().join("bak");
        std::fs::create_dir_all(bak.join("config")).unwrap();
        std::fs::write(bak.join("config").join("keep.toml"), b"K").unwrap();

        let comp = tmp.path().join("MaiBot");
        std::fs::create_dir_all(comp.join("config")).unwrap();
        std::fs::write(comp.join("config").join("keep.toml"), b"OLD").unwrap();
        std::fs::write(comp.join("config").join("stale.toml"), b"STALE").unwrap();

        restore_data_backup(&bak, &comp).expect("恢复失败");
        assert_eq!(
            std::fs::read(comp.join("config").join("keep.toml")).unwrap(),
            b"K"
        );
        assert!(!comp.join("config").join("stale.toml").exists());
    }

    #[test]
    fn restore_data_backup_overwrites_top_level_file() {
        // 适配器场景:备份里是根下的 config.toml 文件,恢复应覆盖该文件、不动代码。
        let tmp = tempfile::tempdir().expect("临时目录");
        let bak = tmp.path().join("bak");
        std::fs::create_dir_all(&bak).unwrap();
        std::fs::write(bak.join("config.toml"), b"NEW").unwrap();

        let comp = tmp.path().join("MaiBot-Napcat-Adapter");
        std::fs::create_dir_all(comp.join("src")).unwrap();
        std::fs::write(comp.join("config.toml"), b"OLD").unwrap();
        std::fs::write(comp.join("src").join("a.py"), b"CODE").unwrap();

        restore_data_backup(&bak, &comp).expect("恢复失败");
        assert_eq!(std::fs::read(comp.join("config.toml")).unwrap(), b"NEW");
        assert_eq!(
            std::fs::read(comp.join("src").join("a.py")).unwrap(),
            b"CODE"
        );
    }

    #[test]
    fn restore_full_backup_replaces_entire_component_dir() {
        let tmp = tempfile::tempdir().expect("临时目录");
        let bak = tmp.path().join("bak");
        std::fs::create_dir_all(bak.join("config")).unwrap();
        std::fs::write(bak.join("config").join("a.toml"), b"A").unwrap();
        std::fs::write(bak.join("root.txt"), b"R").unwrap();

        let comp = tmp.path().join("MaiBot");
        std::fs::create_dir_all(comp.join("src")).unwrap();
        std::fs::write(comp.join("src").join("old.py"), b"OLD").unwrap();

        restore_full_backup(&bak, &comp).expect("恢复失败");
        // 整目录被替换:备份内容在,旧 src 没了
        assert_eq!(
            std::fs::read(comp.join("config").join("a.toml")).unwrap(),
            b"A"
        );
        assert_eq!(std::fs::read(comp.join("root.txt")).unwrap(), b"R");
        assert!(!comp.join("src").exists());
    }

    #[tokio::test]
    async fn prune_data_backups_keeps_recent_and_deletes_old() {
        let pool = setup_test_db().await;
        insert_instance_row(&pool, "inst_prune").await;
        let tmp = tempfile::tempdir().expect("临时目录");

        // 5 份 databak_ 备份(created_at 递增,各有真实磁盘目录)
        for i in 0..5 {
            let id = format!("databak_{:012}", i);
            let dir = tmp.path().join(&id);
            std::fs::create_dir_all(&dir).unwrap();
            std::fs::write(dir.join("f"), b"x").unwrap();
            sqlx::query(
                "INSERT INTO version_backups (id, instance_id, component, backup_path, backup_size, created_at)
                 VALUES (?, 'inst_prune', 'MaiBot', ?, 1, ?)",
            )
            .bind(&id)
            .bind(dir.to_string_lossy().as_ref())
            .bind(format!("2024-01-0{} 00:00:00", i + 1))
            .execute(&pool)
            .await
            .unwrap();
        }
        // 旧式整目录备份(backup_ 前缀)不应被 databak_ 裁剪触及
        let legacy_dir = tmp.path().join("backup_legacy01");
        std::fs::create_dir_all(&legacy_dir).unwrap();
        sqlx::query(
            "INSERT INTO version_backups (id, instance_id, component, backup_path, backup_size, created_at)
             VALUES ('backup_legacy01', 'inst_prune', 'MaiBot', ?, 1, '2024-01-01 00:00:00')",
        )
        .bind(legacy_dir.to_string_lossy().as_ref())
        .execute(&pool)
        .await
        .unwrap();

        prune_data_backups(&pool, "inst_prune", "MaiBot", 3).await;

        let remaining = get_backups(&pool, "inst_prune", Some("MaiBot"))
            .await
            .unwrap();
        let ids: std::collections::HashSet<String> =
            remaining.iter().map(|b| b.id.clone()).collect();
        // 保留最近 3 份 databak_(i=2,3,4)+ 旧式备份;删最旧 2 份(i=0,1)
        assert!(ids.contains("databak_000000000004"));
        assert!(ids.contains("databak_000000000003"));
        assert!(ids.contains("databak_000000000002"));
        assert!(ids.contains("backup_legacy01"));
        assert!(!ids.contains("databak_000000000001"));
        assert!(!ids.contains("databak_000000000000"));
        // 磁盘目录也删了
        assert!(!tmp.path().join("databak_000000000000").exists());
        assert!(!tmp.path().join("databak_000000000001").exists());
        assert!(tmp.path().join("databak_000000000004").exists());
    }

    // ==================== DB: get_update_history ====================

    #[tokio::test]
    async fn get_update_history_returns_empty_for_no_records() {
        let pool = setup_test_db().await;
        insert_instance_row(&pool, "inst_uh_empty").await;

        let result = get_update_history(&pool, "inst_uh_empty", None, None)
            .await
            .expect("查询失败");
        assert!(result.is_empty());
    }

    #[tokio::test]
    async fn get_update_history_respects_limit_parameter() {
        let pool = setup_test_db().await;
        insert_instance_row(&pool, "inst_uh_limit").await;

        for i in 0..5 {
            sqlx::query(
                "INSERT INTO update_history (instance_id, component, from_version, to_version, status)
                 VALUES (?, ?, ?, ?, ?)",
            )
            .bind("inst_uh_limit")
            .bind("MaiBot")
            .bind(format!("0.{}.0", i))
            .bind(format!("0.{}.0", i + 1))
            .bind("success")
            .execute(&pool)
            .await
            .expect("插入失败");
        }

        let limited = get_update_history(&pool, "inst_uh_limit", None, Some(3))
            .await
            .expect("查询失败");
        assert_eq!(limited.len(), 3);

        let all = get_update_history(&pool, "inst_uh_limit", None, None)
            .await
            .expect("查询失败");
        assert_eq!(all.len(), 5);
    }

    #[tokio::test]
    async fn get_update_history_filters_by_component() {
        let pool = setup_test_db().await;
        insert_instance_row(&pool, "inst_uh_comp").await;

        sqlx::query(
            "INSERT INTO update_history (instance_id, component, from_version, to_version, status)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind("inst_uh_comp")
        .bind("MaiBot")
        .bind("1.0.0")
        .bind("1.1.0")
        .bind("success")
        .execute(&pool)
        .await
        .expect("插入失败");

        sqlx::query(
            "INSERT INTO update_history (instance_id, component, from_version, to_version, status)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind("inst_uh_comp")
        .bind("NapCat")
        .bind("2.0.0")
        .bind("2.1.0")
        .bind("failed")
        .execute(&pool)
        .await
        .expect("插入失败");

        let maibot = get_update_history(&pool, "inst_uh_comp", Some("MaiBot"), None)
            .await
            .expect("查询失败");
        assert_eq!(maibot.len(), 1);
        assert_eq!(maibot[0].component, "MaiBot");
        assert_eq!(maibot[0].from_version, Some("1.0.0".to_string()));
        assert_eq!(maibot[0].to_version, Some("1.1.0".to_string()));
        assert_eq!(maibot[0].status, "success");

        let napcat = get_update_history(&pool, "inst_uh_comp", Some("NapCat"), None)
            .await
            .expect("查询失败");
        assert_eq!(napcat.len(), 1);
        assert_eq!(napcat[0].status, "failed");
    }

    #[tokio::test]
    async fn get_update_history_preserves_commit_and_error_fields() {
        let pool = setup_test_db().await;
        insert_instance_row(&pool, "inst_uh_fields").await;

        sqlx::query(
            "INSERT INTO update_history (instance_id, component, from_commit, to_commit, status, error_message)
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind("inst_uh_fields")
        .bind("MaiBot")
        .bind("aaa1111")
        .bind("bbb2222")
        .bind("failed")
        .bind("Git pull 超时")
        .execute(&pool)
        .await
        .expect("插入失败");

        let result = get_update_history(&pool, "inst_uh_fields", None, None)
            .await
            .expect("查询失败");
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].from_commit, Some("aaa1111".to_string()));
        assert_eq!(result[0].to_commit, Some("bbb2222".to_string()));
        assert_eq!(result[0].error_message, Some("Git pull 超时".to_string()));
    }

    // ==================== DB: record_update_history ====================

    #[tokio::test]
    async fn record_update_history_persists_completed_row() {
        let pool = setup_test_db().await;
        insert_instance_row(&pool, "inst_uh_rec").await;

        // backup_id 有外键约束(REFERENCES version_backups(id)),先落一条真实备份记录。
        sqlx::query(
            "INSERT INTO version_backups (id, instance_id, component, backup_path, backup_size)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind("bak_rec_1")
        .bind("inst_uh_rec")
        .bind("MaiBot")
        .bind("/tmp/bak_rec_1")
        .bind(0i64)
        .execute(&pool)
        .await
        .expect("插入备份记录失败");

        // 若列名写错(如 update_method/created_at),这条 INSERT 会直接失败并让本测试挂掉。
        record_update_history(
            &pool,
            "inst_uh_rec",
            "MaiBot",
            "aaa1111",
            Some("bbb2222"),
            "success",
            Some("bak_rec_1"),
            None,
        )
        .await
        .expect("记录成功历史失败");

        let rows = get_update_history(&pool, "inst_uh_rec", None, None)
            .await
            .expect("查询失败");
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].status, "success");
        assert_eq!(rows[0].from_commit, Some("aaa1111".to_string()));
        assert_eq!(rows[0].to_commit, Some("bbb2222".to_string()));
        assert_eq!(rows[0].backup_id, Some("bak_rec_1".to_string()));
        assert_eq!(rows[0].error_message, None);
    }

    #[tokio::test]
    async fn record_update_history_persists_failed_row_with_error() {
        let pool = setup_test_db().await;
        insert_instance_row(&pool, "inst_uh_fail").await;

        record_update_history(
            &pool,
            "inst_uh_fail",
            "NapCat",
            "ccc3333",
            None,
            "failed",
            None,
            Some("git pull 冲突"),
        )
        .await
        .expect("记录失败历史失败");

        let rows = get_update_history(&pool, "inst_uh_fail", None, None)
            .await
            .expect("查询失败");
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].status, "failed");
        assert_eq!(rows[0].from_commit, Some("ccc3333".to_string()));
        assert_eq!(rows[0].to_commit, None);
        assert_eq!(rows[0].backup_id, None);
        assert_eq!(rows[0].error_message, Some("git pull 冲突".to_string()));
    }
}
