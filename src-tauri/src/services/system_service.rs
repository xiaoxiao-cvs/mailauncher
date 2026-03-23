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

/// 发现的 Python 环境
#[derive(Debug, Clone, serde::Serialize)]
pub struct DiscoveredPython {
    pub path: String,
    pub version: String,
}

/// 自动发现系统中安装的 Python 环境
pub fn discover_python_environments() -> Vec<DiscoveredPython> {
    let mut found: Vec<DiscoveredPython> = Vec::new();
    let mut seen_paths: std::collections::HashSet<String> = std::collections::HashSet::new();

    // 1. 从 PATH 中查找
    discover_from_path(&mut found, &mut seen_paths);

    // 2. 扫描常见安装目录
    discover_from_common_paths(&mut found, &mut seen_paths);

    // 3. Windows 注册表
    #[cfg(target_os = "windows")]
    discover_from_registry(&mut found, &mut seen_paths);

    info!("Python 自动发现: 找到 {} 个环境", found.len());
    for p in &found {
        info!("  - {} ({})", p.path, p.version);
    }

    found
}

/// 通过 where/which 从 PATH 中查找 Python
fn discover_from_path(found: &mut Vec<DiscoveredPython>, seen: &mut std::collections::HashSet<String>) {
    let candidates = if cfg!(target_os = "windows") {
        vec!["python", "python3"]
    } else {
        vec!["python3", "python"]
    };

    for cmd in candidates {
        // 获取所有匹配路径
        let paths = get_all_command_paths(cmd);
        for path in paths {
            try_add_python(&path, found, seen);
        }
    }
}

/// 获取某个命令的所有路径（where 返回多行）
fn get_all_command_paths(cmd: &str) -> Vec<String> {
    #[cfg(target_os = "windows")]
    let output = Command::new("where").arg(cmd).output();
    #[cfg(not(target_os = "windows"))]
    let output = Command::new("which").arg("-a").arg(cmd).output();

    match output {
        Ok(o) if o.status.success() => {
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty())
                .collect()
        }
        _ => vec![],
    }
}

/// 扫描常见 Python 安装目录
fn discover_from_common_paths(found: &mut Vec<DiscoveredPython>, seen: &mut std::collections::HashSet<String>) {
    let mut dirs: Vec<std::path::PathBuf> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        // 标准安装路径
        for drive in &["C:", "D:", "E:"] {
            dirs.push(std::path::PathBuf::from(format!("{}\\Python", drive)));
            dirs.push(std::path::PathBuf::from(format!("{}\\Python3", drive)));
            // 扫描 C:\PythonXX 风格
            if let Ok(entries) = std::fs::read_dir(format!("{}\\", drive)) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.starts_with("Python3") || name.starts_with("python") {
                        dirs.push(entry.path());
                    }
                }
            }
        }

        // %LOCALAPPDATA%\Programs\Python\PythonXXX
        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            let python_dir = std::path::PathBuf::from(&local).join("Programs").join("Python");
            if let Ok(entries) = std::fs::read_dir(&python_dir) {
                for entry in entries.flatten() {
                    dirs.push(entry.path());
                }
            }
        }

        // %USERPROFILE%\AppData\Local\Programs\Python
        if let Ok(profile) = std::env::var("USERPROFILE") {
            let python_dir = std::path::PathBuf::from(&profile)
                .join("AppData").join("Local").join("Programs").join("Python");
            if let Ok(entries) = std::fs::read_dir(&python_dir) {
                for entry in entries.flatten() {
                    dirs.push(entry.path());
                }
            }
        }

        // 检查每个目录下的 python.exe
        for dir in &dirs {
            let exe = dir.join("python.exe");
            if exe.exists() {
                try_add_python(&exe.to_string_lossy(), found, seen);
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Unix 常见路径
        let unix_paths = [
            "/usr/bin/python3",
            "/usr/local/bin/python3",
            "/opt/homebrew/bin/python3",
        ];
        for p in &unix_paths {
            try_add_python(p, found, seen);
        }
        // pyenv
        if let Ok(home) = std::env::var("HOME") {
            let pyenv_root = std::path::PathBuf::from(&home).join(".pyenv").join("versions");
            if let Ok(entries) = std::fs::read_dir(&pyenv_root) {
                for entry in entries.flatten() {
                    let exe = entry.path().join("bin").join("python3");
                    if exe.exists() {
                        try_add_python(&exe.to_string_lossy(), found, seen);
                    }
                }
            }
        }
    }
}

/// 从 Windows 注册表发现 Python
#[cfg(target_os = "windows")]
fn discover_from_registry(found: &mut Vec<DiscoveredPython>, seen: &mut std::collections::HashSet<String>) {
    // 通过 reg query 查询注册表，避免引入 winreg 依赖
    let hives = [
        r"HKLM\SOFTWARE\Python\PythonCore",
        r"HKCU\SOFTWARE\Python\PythonCore",
        r"HKLM\SOFTWARE\WOW6432Node\Python\PythonCore",
    ];

    for hive in &hives {
        // 列出子键（版本号）
        let output = Command::new("reg")
            .args(["query", hive])
            .output();

        if let Ok(o) = output {
            if o.status.success() {
                let stdout = String::from_utf8_lossy(&o.stdout);
                for line in stdout.lines() {
                    let line = line.trim();
                    if line.contains("PythonCore\\") {
                        // 查询 InstallPath 的默认值
                        let install_key = format!("{}\\InstallPath", line);
                        if let Ok(val_output) = Command::new("reg")
                            .args(["query", &install_key, "/ve"])
                            .output()
                        {
                            if val_output.status.success() {
                                let val_str = String::from_utf8_lossy(&val_output.stdout);
                                // 解析 REG_SZ 值
                                for val_line in val_str.lines() {
                                    if val_line.contains("REG_SZ") {
                                        if let Some(path) = val_line.split("REG_SZ").nth(1) {
                                            let install_dir = path.trim();
                                            let exe = std::path::PathBuf::from(install_dir).join("python.exe");
                                            if exe.exists() {
                                                try_add_python(&exe.to_string_lossy(), found, seen);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/// 尝试运行 python --version 并加入结果
fn try_add_python(path: &str, found: &mut Vec<DiscoveredPython>, seen: &mut std::collections::HashSet<String>) {
    // 规范化路径
    let canonical = match std::fs::canonicalize(path) {
        Ok(p) => p.to_string_lossy().to_string(),
        Err(_) => path.to_string(),
    };

    if seen.contains(&canonical) {
        return;
    }

    let output = Command::new(path)
        .arg("--version")
        .output();

    if let Ok(o) = output {
        if o.status.success() {
            let version_str = String::from_utf8_lossy(&o.stdout).trim().to_string();
            // "Python 3.12.0" → "3.12.0"
            let version = version_str
                .strip_prefix("Python ")
                .unwrap_or(&version_str)
                .trim()
                .to_string();

            if !version.is_empty() {
                seen.insert(canonical);
                found.push(DiscoveredPython {
                    path: path.to_string(),
                    version,
                });
            }
        }
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
