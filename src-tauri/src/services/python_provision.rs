/// Python 一键供给服务
///
/// 启动器本体不内置 Python。运行时供给策略为"检测优先，没有则一键安装"：
/// 1. 探测系统是否已有可用的 uv；
/// 2. 若无 uv，则从 astral-sh/uv 的 GitHub Releases 下载对应平台的独立可执行文件，
///    解压到启动器数据目录；
/// 3. 用 `uv python install <version>` 安装 Python，再用 `uv python find` 定位其路径。
///
/// 与 MaiBot 官方一致使用 uv 供给 Python，目标版本默认 3.12（MaiBot
/// `requires-python = ">=3.12"`）。
///
/// 进度通过 Tauri 事件推送（参考 download 的事件模式）。
use std::path::{Path, PathBuf};
use std::process::Command;

use tauri::{AppHandle, Emitter};
use tracing::{info, warn};

use crate::errors::{AppError, AppResult};

/// 进度事件名：结构化 JSON 载荷（PythonProvisionProgress）
pub const PROGRESS_EVENT: &str = "python-provision-progress";
/// 日志事件名：字符串载荷（每行一条）
pub const LOG_EVENT: &str = "python-provision-log";

/// 默认安装的 Python 目标版本（MaiBot 要求 >= 3.12）
pub const DEFAULT_PYTHON_VERSION: &str = "3.12";

/// uv 下载所用的固定发布版本
///
/// 使用固定 tag 而非 `latest`，保证资产 URL 稳定、可复现，避免某次 latest
/// 改名导致拉取失败。可随上游升级。资产命名规则来自 astral-sh/uv Releases。
const UV_RELEASE_TAG: &str = "0.11.18";

/// 结构化进度事件载荷
#[derive(Debug, Clone, serde::Serialize)]
pub struct PythonProvisionProgress {
    /// 阶段标识（detect_uv / download_uv / extract_uv / install_python / locate_python / register / done）
    pub stage: String,
    /// 百分比 0-100
    pub percentage: f64,
    /// 阶段描述文本
    pub message: String,
}

/// 供给结果
#[derive(Debug, Clone, serde::Serialize)]
pub struct ProvisionResult {
    /// 安装/定位到的 Python 可执行文件路径
    pub python_path: String,
    /// 实际使用的 uv 可执行文件路径
    pub uv_path: String,
    /// 安装的 Python 版本（uv 报告的版本字符串，可能为完整版本）
    pub version: String,
}

/// 推送结构化进度事件
fn emit_progress(app: &AppHandle, stage: &str, percentage: f64, message: &str) {
    let _ = app.emit(
        PROGRESS_EVENT,
        PythonProvisionProgress {
            stage: stage.to_string(),
            percentage,
            message: message.to_string(),
        },
    );
    info!(
        "[python-provision][{}] {:.0}% {}",
        stage, percentage, message
    );
}

/// 推送一行日志事件
fn emit_log(app: &AppHandle, line: &str) {
    let _ = app.emit(LOG_EVENT, line);
}

// ==================== uv 探测 ====================

/// 探测系统中可用的 uv 可执行文件
///
/// 查找顺序：
/// 1. PATH 中的 `uv` / `uv.exe`（通过 where/which）；
/// 2. 常见安装位置：
///    - Windows: `%USERPROFILE%\.local\bin\uv.exe`、`%LOCALAPPDATA%\...`、cargo bin；
///    - 类 Unix: `~/.local/bin/uv`、`~/.cargo/bin/uv`。
///
/// 返回首个能成功执行 `uv --version` 的路径。
pub fn find_uv_executable() -> Option<PathBuf> {
    // 1. PATH 查找
    for path in which_all("uv") {
        let pb = PathBuf::from(&path);
        if uv_is_runnable(&pb) {
            info!("[python-provision] 在 PATH 中找到 uv: {}", path);
            return Some(pb);
        }
    }

    // 2. 常见安装位置
    for candidate in common_uv_locations() {
        if candidate.exists() && uv_is_runnable(&candidate) {
            info!("[python-provision] 在常见位置找到 uv: {:?}", candidate);
            return Some(candidate);
        }
    }

    None
}

/// 列出常见的 uv 安装位置（按平台）
fn common_uv_locations() -> Vec<PathBuf> {
    let exe_name = uv_binary_name();
    let mut out = Vec::new();

    if cfg!(target_os = "windows") {
        if let Ok(profile) = std::env::var("USERPROFILE") {
            let base = PathBuf::from(&profile);
            // uv 官方安装脚本默认安装到 %USERPROFILE%\.local\bin
            out.push(base.join(".local").join("bin").join(exe_name));
            // cargo install 路径
            out.push(base.join(".cargo").join("bin").join(exe_name));
        }
        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            let base = PathBuf::from(&local);
            // uv 旧版/部分安装会落在 %LOCALAPPDATA%\Programs\uv 或 %LOCALAPPDATA%\uv\bin
            out.push(base.join("Programs").join("uv").join(exe_name));
            out.push(base.join("uv").join("bin").join(exe_name));
        }
    } else if let Ok(home) = std::env::var("HOME") {
        let base = PathBuf::from(&home);
        out.push(base.join(".local").join("bin").join(exe_name));
        out.push(base.join(".cargo").join("bin").join(exe_name));
    }

    out
}

/// uv 可执行文件名（按平台）
fn uv_binary_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "uv.exe"
    } else {
        "uv"
    }
}

/// 检测某个 uv 路径是否可执行（`uv --version` 成功）
fn uv_is_runnable(path: &Path) -> bool {
    matches!(
        Command::new(path).arg("--version").output(),
        Ok(o) if o.status.success()
    )
}

/// 通过 where/which 列出某命令的所有路径
fn which_all(cmd: &str) -> Vec<String> {
    #[cfg(target_os = "windows")]
    let output = Command::new("where").arg(cmd).output();
    #[cfg(not(target_os = "windows"))]
    let output = Command::new("which").arg("-a").arg(cmd).output();

    match output {
        Ok(o) if o.status.success() => String::from_utf8_lossy(&o.stdout)
            .lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect(),
        _ => vec![],
    }
}

// ==================== uv 下载与解压 ====================

/// 返回当前平台对应的 uv 发布资产文件名
///
/// 命名规则来自 astral-sh/uv 的 GitHub Releases（target triple + 归档后缀）：
/// - Windows x64:   `uv-x86_64-pc-windows-msvc.zip`
/// - Windows arm64: `uv-aarch64-pc-windows-msvc.zip`
/// - Linux x64:     `uv-x86_64-unknown-linux-gnu.tar.gz`
/// - Linux arm64:   `uv-aarch64-unknown-linux-gnu.tar.gz`
/// - macOS arm64:   `uv-aarch64-apple-darwin.tar.gz`
/// - macOS x64:     `uv-x86_64-apple-darwin.tar.gz`
///
/// 未覆盖的平台返回 None。
pub fn uv_asset_name() -> Option<&'static str> {
    let asset = match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", "x86_64") => "uv-x86_64-pc-windows-msvc.zip",
        ("windows", "aarch64") => "uv-aarch64-pc-windows-msvc.zip",
        ("linux", "x86_64") => "uv-x86_64-unknown-linux-gnu.tar.gz",
        ("linux", "aarch64") => "uv-aarch64-unknown-linux-gnu.tar.gz",
        ("macos", "aarch64") => "uv-aarch64-apple-darwin.tar.gz",
        ("macos", "x86_64") => "uv-x86_64-apple-darwin.tar.gz",
        _ => return None,
    };
    Some(asset)
}

/// 拼接 uv 资产的下载 URL
fn uv_download_url(asset: &str) -> String {
    format!(
        "https://github.com/astral-sh/uv/releases/download/{}/{}",
        UV_RELEASE_TAG, asset
    )
}

/// 启动器内置 uv 的安装目录（数据目录下 `tools/uv/`）
fn bundled_uv_dir() -> PathBuf {
    crate::utils::platform::get_data_root()
        .join("tools")
        .join("uv")
}

/// 下载并解压 uv 到启动器数据目录，返回 uv 可执行文件路径
///
/// Windows 资产为 .zip（用 `zip` crate 解压）；类 Unix 资产为 .tar.gz
/// （用系统 `tar` 解压，现代 macOS/Linux 均自带 tar）。解压后在目录树中
/// 定位 uv 可执行文件。
pub async fn download_and_extract_uv(app: &AppHandle) -> AppResult<PathBuf> {
    let asset = uv_asset_name().ok_or_else(|| {
        AppError::Internal(format!(
            "当前平台 {}/{} 暂不支持自动安装 uv",
            std::env::consts::OS,
            std::env::consts::ARCH
        ))
    })?;
    // uv 也是 GitHub Release 资产,经当前启用的镜像前缀重写(与 git clone / NapCat 走同一套源配置)
    let url = {
        use tauri::Manager;
        let raw = uv_download_url(asset);
        let prefix = crate::services::source_proxy_service::resolve_active_github_prefix(
            &app.state::<crate::state::AppState>().db,
        )
        .await;
        crate::services::source_proxy_service::apply_github_mirror(&raw, &prefix)
    };

    let target_dir = bundled_uv_dir();
    std::fs::create_dir_all(&target_dir)
        .map_err(|e| AppError::FileSystem(format!("创建 uv 安装目录失败: {}", e)))?;

    // 若数据目录中已有可用的 uv，直接复用
    let existing = target_dir.join(uv_binary_name());
    if existing.exists() && uv_is_runnable(&existing) {
        info!("[python-provision] 复用数据目录已有 uv: {:?}", existing);
        return Ok(existing);
    }

    emit_progress(
        app,
        "download_uv",
        15.0,
        &format!("正在下载 uv ({})...", asset),
    );
    let archive_path = target_dir.join(asset);
    download_file(&url, &archive_path, app).await?;

    emit_progress(app, "extract_uv", 35.0, "正在解压 uv...");
    if asset.ends_with(".zip") {
        extract_zip(&archive_path, &target_dir)?;
    } else if asset.ends_with(".tar.gz") {
        extract_tar_gz(&archive_path, &target_dir)?;
    } else {
        return Err(AppError::Internal(format!("未知的 uv 归档格式: {}", asset)));
    }
    // 解压完成后清理归档
    let _ = std::fs::remove_file(&archive_path);

    let uv_path = locate_uv_in_dir(&target_dir).ok_or_else(|| {
        AppError::Internal("解压后未在 uv 安装目录中找到 uv 可执行文件".to_string())
    })?;

    // 类 Unix 平台确保可执行位
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = std::fs::metadata(&uv_path) {
            let mut perms = meta.permissions();
            perms.set_mode(0o755);
            let _ = std::fs::set_permissions(&uv_path, perms);
        }
    }

    if !uv_is_runnable(&uv_path) {
        return Err(AppError::Internal(format!(
            "下载的 uv 无法执行: {:?}",
            uv_path
        )));
    }

    emit_log(app, &format!("uv 已就绪: {}", uv_path.to_string_lossy()));
    Ok(uv_path)
}

/// 在目录树中查找 uv 可执行文件（uv 归档解压后可能位于子目录）
fn locate_uv_in_dir(dir: &Path) -> Option<PathBuf> {
    let target_name = uv_binary_name();

    // 先查根目录
    let direct = dir.join(target_name);
    if direct.exists() {
        return Some(direct);
    }

    // 再递归一层子目录（uv 的 tar.gz 会解出 uv-<triple>/uv 这样的子目录）
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let nested = path.join(target_name);
                if nested.exists() {
                    return Some(nested);
                }
            }
        }
    }
    None
}

/// 解压 zip 归档到目标目录
fn extract_zip(archive: &Path, dest: &Path) -> AppResult<()> {
    let file = std::fs::File::open(archive)
        .map_err(|e| AppError::FileSystem(format!("打开 uv zip 失败: {}", e)))?;
    let mut zip = zip::ZipArchive::new(file)
        .map_err(|e| AppError::FileSystem(format!("解析 uv zip 失败: {}", e)))?;
    zip.extract(dest)
        .map_err(|e| AppError::FileSystem(format!("解压 uv zip 失败: {}", e)))?;
    Ok(())
}

/// 解压 tar.gz 归档到目标目录（调用系统 tar）
fn extract_tar_gz(archive: &Path, dest: &Path) -> AppResult<()> {
    // tar -xzf <archive> -C <dest>；现代 macOS/Linux 默认带 tar（含 gzip 支持）
    let output = Command::new("tar")
        .arg("-xzf")
        .arg(archive)
        .arg("-C")
        .arg(dest)
        .output()
        .map_err(|e| AppError::Process(format!("执行 tar 解压 uv 失败: {}", e)))?;
    if !output.status.success() {
        return Err(AppError::Process(format!(
            "tar 解压 uv 失败: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        )));
    }
    Ok(())
}

/// 下载文件（带进度日志推送）
///
/// 独立实现，不依赖 download_service（本任务约束不改 download_service）。
async fn download_file(url: &str, dest: &Path, app: &AppHandle) -> AppResult<()> {
    info!("[python-provision] 下载 uv: {} → {:?}", url, dest);
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| AppError::Network(format!("创建 HTTP 客户端失败: {}", e)))?;

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| AppError::Network(format!("HTTP 请求失败 ({}): {}", url, e)))?;

    if !response.status().is_success() {
        return Err(AppError::Network(format!(
            "下载 uv 失败 ({}): 状态码 {}",
            url,
            response.status()
        )));
    }

    let total = response.content_length();
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::FileSystem(format!("创建下载目录失败: {}", e)))?;
    }

    let mut file = tokio::fs::File::create(dest)
        .await
        .map_err(|e| AppError::FileSystem(format!("创建下载文件失败: {}", e)))?;

    use futures_util::StreamExt;
    use tokio::io::AsyncWriteExt;
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::Network(format!("下载数据块失败: {}", e)))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| AppError::FileSystem(format!("写入文件失败: {}", e)))?;
        downloaded += chunk.len() as u64;
        if let Some(total) = total {
            let pct = (downloaded as f64 / total as f64 * 100.0).min(100.0);
            emit_log(
                app,
                &format!(
                    "uv 下载中... {:.1}MB / {:.1}MB ({:.0}%)",
                    downloaded as f64 / 1_048_576.0,
                    total as f64 / 1_048_576.0,
                    pct
                ),
            );
        }
    }
    file.flush()
        .await
        .map_err(|e| AppError::FileSystem(format!("刷新文件失败: {}", e)))?;
    Ok(())
}

// ==================== uv 安装/定位 Python ====================

/// 用 uv 安装指定版本的 Python
///
/// 执行 `uv python install <version>`（uv 官方命令）。同步阻塞执行，逐行推送输出。
fn uv_python_install(uv: &Path, version: &str, app: &AppHandle) -> AppResult<()> {
    info!("[python-provision] uv python install {}", version);
    let output = Command::new(uv)
        .args(["python", "install", version])
        .output()
        .map_err(|e| AppError::Process(format!("执行 uv python install 失败: {}", e)))?;

    for line in String::from_utf8_lossy(&output.stdout).lines() {
        emit_log(app, line);
    }
    for line in String::from_utf8_lossy(&output.stderr).lines() {
        // uv 将进度信息打印到 stderr，这里同样作为日志推送
        emit_log(app, line);
    }

    if !output.status.success() {
        return Err(AppError::Process(format!(
            "uv python install {} 失败: {}",
            version,
            String::from_utf8_lossy(&output.stderr).trim()
        )));
    }
    Ok(())
}

/// 用 uv 定位已安装的 Python 可执行文件路径
///
/// 执行 `uv python find <version>`（uv 官方命令），stdout 为 python 可执行文件路径。
fn uv_python_find(uv: &Path, version: &str) -> AppResult<String> {
    info!("[python-provision] uv python find {}", version);
    let output = Command::new(uv)
        .args(["python", "find", version])
        .output()
        .map_err(|e| AppError::Process(format!("执行 uv python find 失败: {}", e)))?;

    if !output.status.success() {
        return Err(AppError::Process(format!(
            "uv python find {} 失败: {}",
            version,
            String::from_utf8_lossy(&output.stderr).trim()
        )));
    }

    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() {
        return Err(AppError::NotFound(format!(
            "uv python find {} 未返回路径",
            version
        )));
    }
    Ok(path)
}

/// 查询 python 可执行文件的版本字符串（如 "3.12.7"）
fn query_python_version(python: &str) -> AppResult<String> {
    let output = Command::new(python)
        .arg("--version")
        .output()
        .map_err(|e| AppError::Process(format!("执行 python --version 失败: {}", e)))?;
    if !output.status.success() {
        return Err(AppError::Process(format!(
            "python --version 失败: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        )));
    }
    // Python 3.x 起版本号统一输出到 stdout
    let raw = String::from_utf8_lossy(&output.stdout);
    let version = raw
        .trim()
        .strip_prefix("Python ")
        .unwrap_or(raw.trim())
        .trim()
        .to_string();
    Ok(version)
}

// ==================== 编排入口 ====================

/// 一键供给 Python：探测 uv → (按需下载 uv) → 安装 Python → 定位路径 → 查询版本
///
/// 返回安装/定位到的 Python 路径、所用 uv 路径与版本。登记进数据库由命令层负责
/// （命令层持有 DB 连接，复用 config_service 的 save/select 逻辑）。
pub async fn provision_python(app: &AppHandle, version: &str) -> AppResult<ProvisionResult> {
    emit_progress(app, "detect_uv", 5.0, "正在探测 uv...");

    let uv_path = match find_uv_executable() {
        Some(p) => {
            emit_log(app, &format!("已检测到 uv: {}", p.to_string_lossy()));
            p
        }
        None => {
            emit_log(app, "未检测到 uv，开始下载 uv...");
            download_and_extract_uv(app).await?
        }
    };

    emit_progress(
        app,
        "install_python",
        50.0,
        &format!("正在用 uv 安装 Python {}...", version),
    );
    uv_python_install(&uv_path, version, app)?;

    emit_progress(app, "locate_python", 80.0, "正在定位已安装的 Python...");
    let python_path = uv_python_find(&uv_path, version)?;
    emit_log(app, &format!("已定位 Python: {}", python_path));

    let py_version = match query_python_version(&python_path) {
        Ok(v) => v,
        Err(e) => {
            // 定位成功但版本查询失败时，退回到请求的版本号，不掩盖路径成功的事实
            warn!("[python-provision] 查询 Python 版本失败: {}", e);
            version.to_string()
        }
    };

    emit_progress(app, "register", 95.0, "正在登记 Python 环境...");

    Ok(ProvisionResult {
        python_path,
        uv_path: uv_path.to_string_lossy().to_string(),
        version: py_version,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uv_binary_name_matches_platform() {
        let name = uv_binary_name();
        if cfg!(target_os = "windows") {
            assert_eq!(name, "uv.exe");
        } else {
            assert_eq!(name, "uv");
        }
    }

    #[test]
    fn uv_asset_name_for_known_platforms() {
        // 当前测试运行平台应当被覆盖（开发/CI 为 win/linux/macos）
        let asset = uv_asset_name();
        if cfg!(all(target_os = "windows", target_arch = "x86_64")) {
            assert_eq!(asset, Some("uv-x86_64-pc-windows-msvc.zip"));
        } else if cfg!(all(target_os = "linux", target_arch = "x86_64")) {
            assert_eq!(asset, Some("uv-x86_64-unknown-linux-gnu.tar.gz"));
        } else if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
            assert_eq!(asset, Some("uv-aarch64-apple-darwin.tar.gz"));
        } else if cfg!(all(target_os = "macos", target_arch = "x86_64")) {
            assert_eq!(asset, Some("uv-x86_64-apple-darwin.tar.gz"));
        }
        // 其余平台不强制断言，但已知平台资产名必须符合 astral-sh/uv 命名规则
    }

    #[test]
    fn uv_asset_names_follow_target_triple_convention() {
        // 资产命名硬约束：uv-<arch>-<triple>.<ext>
        let cases = [
            ("uv-x86_64-pc-windows-msvc.zip", ".zip"),
            ("uv-aarch64-pc-windows-msvc.zip", ".zip"),
            ("uv-x86_64-unknown-linux-gnu.tar.gz", ".tar.gz"),
            ("uv-aarch64-unknown-linux-gnu.tar.gz", ".tar.gz"),
            ("uv-aarch64-apple-darwin.tar.gz", ".tar.gz"),
            ("uv-x86_64-apple-darwin.tar.gz", ".tar.gz"),
        ];
        for (name, ext) in cases {
            assert!(name.starts_with("uv-"), "{} 应以 uv- 开头", name);
            assert!(name.ends_with(ext), "{} 应以 {} 结尾", name, ext);
        }
    }

    #[test]
    fn uv_download_url_uses_pinned_tag_and_asset() {
        let url = uv_download_url("uv-x86_64-pc-windows-msvc.zip");
        assert_eq!(
            url,
            "https://github.com/astral-sh/uv/releases/download/0.11.18/uv-x86_64-pc-windows-msvc.zip"
        );
        assert!(url.contains(UV_RELEASE_TAG));
    }

    #[test]
    fn default_python_version_meets_maibot_requirement() {
        // 默认目标版本必须满足 MaiBot 的 >= 3.12 要求
        assert!(
            crate::services::system_service::version_meets_maibot_requirement(
                DEFAULT_PYTHON_VERSION
            )
        );
    }

    #[test]
    fn common_uv_locations_end_with_uv_binary() {
        // 不依赖真实文件，仅验证候选路径以正确的可执行文件名结尾
        for path in common_uv_locations() {
            assert_eq!(
                path.file_name().and_then(|n| n.to_str()),
                Some(uv_binary_name()),
                "候选路径 {:?} 应以 uv 可执行名结尾",
                path
            );
        }
    }
}
