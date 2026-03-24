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
        info!("[discover] where/which {} ...", cmd);
        let paths = get_all_command_paths(cmd);
        info!("[discover] where/which {} 返回 {} 条路径: {:?}", cmd, paths.len(), paths);
        for path in paths {
            try_add_python(&path, found, seen);
        }
    }

    // Windows: 使用 py launcher（最可靠的 Windows Python 发现方式）
    #[cfg(target_os = "windows")]
    {
        info!("[discover] 尝试 py launcher...");
        discover_from_py_launcher(found, seen);
    }
}

/// 通过 Windows py launcher 发现 Python（py -0p 列出所有已注册的 Python）
#[cfg(target_os = "windows")]
fn discover_from_py_launcher(found: &mut Vec<DiscoveredPython>, seen: &mut std::collections::HashSet<String>) {
    let output = Command::new("py").args(["-0p"]).output();
    if let Ok(o) = output {
        if o.status.success() {
            let stdout = String::from_utf8_lossy(&o.stdout);
            // 每行格式如: " -3.12-64       D:\Python\python.exe *"
            // 路径从盘符开始（X:\），用正则或简单查找 "X:\" 模式
            for line in stdout.lines() {
                let line = line.trim();
                if line.is_empty() { continue; }
                // 找到路径起始位置：第一个 "X:\" 模式
                if let Some(idx) = find_drive_path_start(line) {
                    let path = line[idx..].trim_end_matches('*').trim();
                    if !path.is_empty() {
                        try_add_python(path, found, seen);
                    }
                }
            }
        }
    }
}

/// 在字符串中查找 Windows 驱动器路径的起始位置（如 "C:\"）
#[cfg(target_os = "windows")]
fn find_drive_path_start(s: &str) -> Option<usize> {
    let bytes = s.as_bytes();
    for i in 0..bytes.len().saturating_sub(2) {
        if bytes[i].is_ascii_alphabetic() && bytes[i + 1] == b':' && bytes[i + 2] == b'\\' {
            return Some(i);
        }
    }
    None
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
            // 扫描驱动器根目录一级子目录：匹配包含 "python" 的目录名
            if let Ok(entries) = std::fs::read_dir(format!("{}\\", drive)) {
                for entry in entries.flatten() {
                    if !entry.file_type().map(|t| t.is_dir()).unwrap_or(false) { continue; }
                    let name = entry.file_name().to_string_lossy().to_lowercase();
                    if name.contains("python") {
                        dirs.push(entry.path());
                    }
                }
            }
        }

        // 深度扫描：在 PATH 环境变量的每个目录中查找 python.exe
        if let Ok(path_var) = std::env::var("PATH") {
            for dir in path_var.split(';') {
                let exe = std::path::PathBuf::from(dir).join("python.exe");
                if exe.exists() {
                    try_add_python(&exe.to_string_lossy(), found, seen);
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
    info!("[discover] try_add_python: {}", path);
    // 过滤 Microsoft Store 重定向存根（WindowsApps 下的 python.exe 无法创建虚拟环境）
    #[cfg(target_os = "windows")]
    {
        let path_lower = path.to_lowercase();
        if path_lower.contains("windowsapps") {
            info!("[discover]   跳过 Microsoft Store 存根: {}", path);
            return;
        }
    }
    // 规范化路径
    let canonical = match std::fs::canonicalize(path) {
        Ok(p) => p.to_string_lossy().to_string(),
        Err(e) => {
            info!("[discover]   canonicalize 失败 ({}), 使用原始路径", e);
            path.to_string()
        }
    };

    if seen.contains(&canonical) {
        info!("[discover]   已存在，跳过");
        return;
    }

    let output = Command::new(path)
        .arg("--version")
        .output();

    match &output {
        Ok(o) if o.status.success() => {
            let version_str = String::from_utf8_lossy(&o.stdout).trim().to_string();
            let version = version_str
                .strip_prefix("Python ")
                .unwrap_or(&version_str)
                .trim()
                .to_string();

            if !version.is_empty() {
                // 验证 venv 模块可用（某些 Linux 发行版拆包后缺少 ensurepip）
                let venv_check = Command::new(path)
                    .args(["-c", "import venv"])
                    .output();
                let has_venv = matches!(&venv_check, Ok(o) if o.status.success());

                if has_venv {
                    info!("[discover]   ✓ 发现 Python {} at {} (venv 可用)", version, path);
                } else {
                    info!("[discover]   ⚠ 发现 Python {} at {} (venv 不可用)", version, path);
                }

                seen.insert(canonical);
                found.push(DiscoveredPython {
                    path: path.to_string(),
                    version,
                });
            } else {
                info!("[discover]   版本字符串为空: {:?}", version_str);
            }
        }
        Ok(o) => {
            let stderr = String::from_utf8_lossy(&o.stderr);
            info!("[discover]   执行失败 (exit={}): {}", o.status, stderr.trim());
        }
        Err(e) => {
            info!("[discover]   无法执行: {}", e);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    // ==================== find_drive_path_start (Windows-only) ====================

    #[cfg(target_os = "windows")]
    mod find_drive_path_start_tests {
        use super::super::find_drive_path_start;

        #[test]
        fn finds_path_in_py_launcher_output() {
            let line = " -3.12-64       D:\\Python312\\python.exe *";
            let idx = find_drive_path_start(line).expect("应找到驱动器路径");
            assert_eq!(&line[idx..idx + 3], "D:\\");
        }

        #[test]
        fn finds_path_starting_at_beginning() {
            let line = "C:\\Users\\test\\python.exe";
            let idx = find_drive_path_start(line).expect("应找到驱动器路径");
            assert_eq!(idx, 0);
        }

        #[test]
        fn handles_various_drive_letters() {
            for letter in ['A', 'C', 'D', 'E', 'Z', 'a', 'c', 'z'] {
                let line = format!("prefix {}:\\some\\path", letter);
                let idx = find_drive_path_start(&line).expect(&format!("应找到盘符 {}", letter));
                assert_eq!(line.as_bytes()[idx] as char, letter);
            }
        }

        #[test]
        fn returns_none_for_empty_string() {
            assert!(find_drive_path_start("").is_none());
        }

        #[test]
        fn returns_none_for_no_drive_pattern() {
            assert!(find_drive_path_start("no drive path here").is_none());
            assert!(find_drive_path_start("/usr/bin/python3").is_none());
        }

        #[test]
        fn returns_none_for_colon_without_backslash() {
            assert!(find_drive_path_start("C:/forward/slash").is_none());
            assert!(find_drive_path_start("C:noslash").is_none());
        }

        #[test]
        fn returns_none_for_too_short_input() {
            assert!(find_drive_path_start("C:").is_none());
            assert!(find_drive_path_start("C").is_none());
        }

        #[test]
        fn finds_first_occurrence_with_multiple_drive_paths() {
            let line = "text D:\\first E:\\second";
            let idx = find_drive_path_start(line).expect("应找到第一个驱动器路径");
            assert_eq!(&line[idx..idx + 3], "D:\\");
        }

        #[test]
        fn ignores_digit_colon_backslash() {
            // '1:\' should not match - only alphabetic chars are drive letters
            assert!(find_drive_path_start("1:\\path").is_none());
        }
    }

    // ==================== get_all_command_paths ====================

    #[test]
    fn get_all_command_paths_returns_nonempty_for_known_command() {
        // 'git' should be available on any dev/CI machine
        let paths = get_all_command_paths("git");
        assert!(!paths.is_empty(), "git 应在 PATH 中");
        for path in &paths {
            assert!(
                path.contains("git"),
                "返回的路径 '{}' 应包含 'git'",
                path
            );
        }
    }

    #[test]
    fn get_all_command_paths_returns_empty_for_nonexistent_command() {
        let paths = get_all_command_paths("__mai_nonexistent_command_xyz__");
        assert!(paths.is_empty());
    }

    // ==================== check_git_environment ====================

    #[test]
    fn check_git_environment_finds_git() {
        let info = check_git_environment().expect("check_git_environment 不应返回 Err");
        assert!(info.is_available, "开发机/CI 应有 Git");
        assert!(
            info.version.contains("git version"),
            "version 应包含 'git version', 实际: '{}'",
            info.version
        );
        assert!(!info.path.is_empty(), "Git 路径不应为空");
    }

    // ==================== discover_python_environments ====================

    #[test]
    fn discover_python_environments_finds_at_least_one() {
        let envs = discover_python_environments();
        assert!(
            !envs.is_empty(),
            "开发机/CI 应至少有一个 Python 环境"
        );
        for env in &envs {
            assert!(!env.path.is_empty(), "Python 路径不应为空");
            assert!(!env.version.is_empty(), "Python 版本不应为空");
            // 版本格式: 主版本号.次版本号.补丁号
            let parts: Vec<&str> = env.version.split('.').collect();
            assert!(
                parts.len() >= 2,
                "版本 '{}' 应至少包含主版本号和次版本号",
                env.version
            );
            let major: u32 = parts[0].parse().expect("主版本号应为数字");
            assert!(
                major >= 3,
                "发现的 Python 主版本号应 >= 3, 实际: {}",
                major
            );
        }
    }

    #[test]
    fn discover_python_environments_no_duplicates() {
        let envs = discover_python_environments();
        let mut seen = HashSet::new();
        for env in &envs {
            let canonical = std::fs::canonicalize(&env.path)
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| env.path.clone());
            assert!(
                seen.insert(canonical.clone()),
                "发现重复的 Python 环境: {} (canonical: {})",
                env.path,
                canonical
            );
        }
    }

    // ==================== try_add_python ====================

    #[test]
    fn try_add_python_adds_valid_python() {
        let mut found = Vec::new();
        let mut seen = HashSet::new();

        // 找到一个已知的 python 路径
        let paths = get_all_command_paths(if cfg!(target_os = "windows") {
            "python"
        } else {
            "python3"
        });
        assert!(!paths.is_empty(), "应至少有一个 python 路径");

        try_add_python(&paths[0], &mut found, &mut seen);

        assert_eq!(found.len(), 1, "应添加一个 Python 环境");
        assert_eq!(found[0].path, paths[0]);
        assert!(!found[0].version.is_empty());
        let major: u32 = found[0]
            .version
            .split('.')
            .next()
            .expect("版本应有主版本号")
            .parse()
            .expect("主版本号应为数字");
        assert!(major >= 3);
    }

    #[test]
    fn try_add_python_skips_nonexistent_path() {
        let mut found = Vec::new();
        let mut seen = HashSet::new();

        try_add_python("/nonexistent/path/to/python", &mut found, &mut seen);

        assert!(found.is_empty(), "不应添加不存在的 Python");
    }

    #[test]
    fn try_add_python_deduplicates_same_path() {
        let mut found = Vec::new();
        let mut seen = HashSet::new();

        let paths = get_all_command_paths(if cfg!(target_os = "windows") {
            "python"
        } else {
            "python3"
        });
        if paths.is_empty() {
            return; // 无可用 python，跳过
        }

        try_add_python(&paths[0], &mut found, &mut seen);
        try_add_python(&paths[0], &mut found, &mut seen);

        assert_eq!(found.len(), 1, "相同路径不应重复添加");
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn try_add_python_skips_windowsapps_stub() {
        let mut found = Vec::new();
        let mut seen = HashSet::new();

        try_add_python(
            r"C:\Users\test\AppData\Local\Microsoft\WindowsApps\python.exe",
            &mut found,
            &mut seen,
        );

        assert!(found.is_empty(), "应跳过 WindowsApps 存根");
    }

    // ==================== GitInfo 结构体字段验证 ====================

    #[test]
    fn git_info_unavailable_has_empty_fields() {
        let info = GitInfo {
            is_available: false,
            path: String::new(),
            version: String::new(),
        };
        assert!(!info.is_available);
        assert!(info.path.is_empty());
        assert!(info.version.is_empty());
    }

    // ==================== GitInfo / DiscoveredPython 可序列化 ====================

    #[test]
    fn git_info_serializes_to_json() {
        let info = GitInfo {
            is_available: true,
            path: "/usr/bin/git".to_string(),
            version: "git version 2.40.0".to_string(),
        };
        let json = serde_json::to_string(&info).expect("GitInfo 应可序列化");
        assert!(json.contains("\"is_available\":true"));
        assert!(json.contains("\"path\":\"/usr/bin/git\""));
        assert!(json.contains("\"version\":\"git version 2.40.0\""));
    }

    #[test]
    fn discovered_python_serializes_to_json() {
        let python = DiscoveredPython {
            path: "C:\\Python312\\python.exe".to_string(),
            version: "3.12.0".to_string(),
        };
        let json = serde_json::to_string(&python).expect("DiscoveredPython 应可序列化");
        let parsed: serde_json::Value =
            serde_json::from_str(&json).expect("JSON 应可反序列化");
        assert_eq!(parsed["version"], "3.12.0");
        assert_eq!(parsed["path"], "C:\\Python312\\python.exe");
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
