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

/// 创建组件备份
///
/// 将组件目录整体复制到备份目录，并记录到数据库。
pub async fn create_backup(
    pool: &SqlitePool,
    instance_id: &str,
    item_type: &crate::models::download::DownloadItemType,
    component_dir: &Path,
) -> AppResult<String> {
    use crate::services::download_service::copy_dir_recursive;
    use uuid::Uuid;

    let repo = get_github_repo(item_type);
    let backup_id = format!(
        "backup_{}",
        &Uuid::new_v4().to_string().replace('-', "")[..12]
    );

    // 备份目录
    let backups_dir = crate::utils::platform::get_data_root().join("backups");
    let backup_path = backups_dir.join(&backup_id);

    std::fs::create_dir_all(&backup_path)
        .map_err(|e| AppError::FileSystem(format!("创建备份目录失败: {}", e)))?;

    copy_dir_recursive(component_dir, &backup_path)
        .map_err(|e| AppError::FileSystem(format!("复制备份数据失败: {}", e)))?;

    // 计算备份大小
    let backup_size = fs_dir_size(&backup_path);

    let commit_hash = get_local_commit(component_dir);
    let version = get_local_version_from_file(component_dir, repo.name);

    sqlx::query(
        "INSERT INTO version_backups (id, instance_id, component, version, commit_hash, backup_path, backup_size, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))",
    )
    .bind(&backup_id)
    .bind(instance_id)
    .bind(repo.folder)
    .bind(&version)
    .bind(&commit_hash)
    .bind(backup_path.to_string_lossy().as_ref())
    .bind(backup_size as i64)
    .execute(pool)
    .await
    .map_err(|e: sqlx::Error| AppError::Database(format!("记录备份失败: {}", e)))?;

    info!("组件备份完成: {} → {}", repo.folder, backup_id);
    Ok(backup_id)
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
}
