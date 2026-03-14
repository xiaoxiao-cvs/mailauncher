/// 系统工具服务
///
/// 提供系统环境检测（Git、网络连通性等）。
use std::process::Command;
use tracing::info;

use crate::errors::{AppError, AppResult};

/// Git 环境信息
#[derive(Debug, serde::Serialize)]
pub struct GitInfo {
    pub is_available: bool,
    pub path: String,
    pub version: String,
}

/// 检测系统 Git 环境
pub fn check_git_environment() -> AppResult<GitInfo> {
    // 尝试运行 git --version
    let output = Command::new("git")
        .arg("--version")
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let version_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            // 获取 git 可执行文件路径
            let path = get_git_path().unwrap_or_else(|| "git".to_string());
            info!("Git 环境检测成功: {} ({})", version_str, path);
            Ok(GitInfo {
                is_available: true,
                path,
                version: version_str,
            })
        }
        _ => {
            Ok(GitInfo {
                is_available: false,
                path: String::new(),
                version: String::new(),
            })
        }
    }
}

/// 获取 git 可执行文件的完整路径
fn get_git_path() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("where")
            .arg("git")
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).lines().next().unwrap_or("").trim().to_string())
            .filter(|s| !s.is_empty())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Command::new("which")
            .arg("git")
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
            .filter(|s| !s.is_empty())
    }
}

/// 网络连通性检查结果
#[derive(Debug, serde::Serialize)]
pub struct ConnectivityStatus {
    pub github: bool,
    pub pypi: bool,
}

/// 检查网络连通性（GitHub + PyPI）
pub async fn check_connectivity() -> AppResult<ConnectivityStatus> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Network(format!("创建 HTTP 客户端失败: {}", e)))?;

    // 并行检查 GitHub 和 PyPI
    let (github_result, pypi_result) = tokio::join!(
        client.head("https://github.com").send(),
        client.head("https://pypi.org").send(),
    );

    let github = github_result.is_ok();
    let pypi = pypi_result.is_ok();

    info!("网络连通性: GitHub={}, PyPI={}", github, pypi);

    Ok(ConnectivityStatus { github, pypi })
}
