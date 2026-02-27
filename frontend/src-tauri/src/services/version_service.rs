/// 版本管理服务
///
/// 对应 Python 的 version_service.py + component_update_service.py + update_service.py。
/// 负责 GitHub API 版本检查、组件更新、备份/恢复、启动器自身更新检查。
use std::path::Path;

use sqlx::SqlitePool;
use tauri::AppHandle;
use tracing::{error, info, warn};

use crate::errors::{AppError, AppResult};
use crate::models::update::*;
use crate::models::version::*;

// ==================== GitHub 仓库配置 ====================

/// 组件对应的 GitHub 仓库
pub struct GitHubRepo {
    pub owner: &'static str,
    pub repo: &'static str,
    /// 是否使用 Release（为 false 时对比 commit）
    pub has_releases: bool,
}

/// 获取组件的 GitHub 仓库信息
pub fn get_github_repo(component: &str) -> Option<GitHubRepo> {
    match component {
        "main" | "MaiBot" => Some(GitHubRepo {
            owner: "MaiM-with-u",
            repo: "MaiBot",
            has_releases: false,
        }),
        "napcat-ada" | "MaiBot-Napcat-Adapter" => Some(GitHubRepo {
            owner: "MaiM-with-u",
            repo: "MaiBot-Napcat-Adapter",
            has_releases: false,
        }),
        "napcat" | "NapCat" => Some(GitHubRepo {
            owner: "NapNeko",
            repo: "NapCatQQ",
            has_releases: true,
        }),
        _ => None,
    }
}

/// 启动器自身仓库
const LAUNCHER_OWNER: &str = "xiaoxiao-cvs";
const LAUNCHER_REPO: &str = "mailauncher";

// ==================== GitHub API 客户端 ====================

/// 创建 HTTP 客户端（带 User-Agent）
fn github_client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent("mailauncher/1.0")
        .build()
        .unwrap_or_default()
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
    limit: usize,
) -> AppResult<Vec<GitHubRelease>> {
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
                            content_type: a["content_type"]
                                .as_str()
                                .unwrap_or("")
                                .to_string(),
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
        Some(
            String::from_utf8_lossy(&output.stdout)
                .trim()
                .to_string(),
        )
    } else {
        None
    }
}

/// 从文件读取本地版本号
///
/// 尝试从 `__version__.py` 或 `package.json` 读取版本信息。
pub fn get_local_version_from_file(component_path: &Path, component: &str) -> Option<String> {
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
    component: &str,
    component_path: &Path,
) -> AppResult<ComponentUpdateCheck> {
    let repo = get_github_repo(component).ok_or_else(|| {
        AppError::NotFound(format!("未知组件: {}", component))
    })?;

    let local_commit = get_local_commit(component_path);
    let local_version = get_local_version_from_file(component_path, component);

    let latest_commit = get_latest_commit(repo.owner, repo.repo).await?;

    let has_update = match (&local_commit, &latest_commit) {
        (Some(local), Some(latest)) => local != latest,
        _ => false,
    };

    let commits_behind = if has_update {
        if let (Some(local), Some(latest)) = (&local_commit, &latest_commit) {
            compare_commits(repo.owner, repo.repo, local, latest).await?
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
        latest_commit: latest_commit,
        has_update,
        update_notes: None,
        commits_behind,
    })
}

/// 获取实例所有组件的版本信息
pub async fn get_instance_components_version(
    pool: &SqlitePool,
    instance_id: &str,
) -> AppResult<Vec<ComponentVersionInfo>> {
    let rows: Vec<ComponentVersion> = sqlx::query_as(
        "SELECT * FROM component_versions WHERE instance_id = ? ORDER BY component",
    )
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
    limit: i64,
) -> AppResult<Vec<UpdateHistory>> {
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
pub async fn check_launcher_update(
    current_version: &str,
    channel: &str,
) -> AppResult<UpdateCheckResponse> {
    let releases = get_releases(LAUNCHER_OWNER, LAUNCHER_REPO, 20).await?;

    // 按通道分类
    let channel_releases: Vec<&GitHubRelease> = releases
        .iter()
        .filter(|r| {
            let tag = &r.tag_name;
            match channel {
                "develop" => {
                    tag.contains("-dev") || tag.contains("-alpha") || tag.contains("-rc")
                }
                "beta" => tag.contains("-beta"),
                "main" | _ => {
                    !tag.contains("-dev")
                        && !tag.contains("-alpha")
                        && !tag.contains("-rc")
                        && !tag.contains("-beta")
                }
            }
        })
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

/// 获取通道版本列表
pub async fn get_channel_versions(
    channel: &str,
    limit: usize,
) -> AppResult<ChannelVersionsResponse> {
    let releases = get_releases(LAUNCHER_OWNER, LAUNCHER_REPO, 50).await?;

    let versions: Vec<VersionInfo> = releases
        .iter()
        .filter(|r| {
            let tag = &r.tag_name;
            match channel {
                "develop" => {
                    tag.contains("-dev") || tag.contains("-alpha") || tag.contains("-rc")
                }
                "beta" => tag.contains("-beta"),
                "main" | _ => {
                    !tag.contains("-dev")
                        && !tag.contains("-alpha")
                        && !tag.contains("-rc")
                        && !tag.contains("-beta")
                }
            }
        })
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
