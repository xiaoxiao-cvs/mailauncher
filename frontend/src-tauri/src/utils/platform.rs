/// 平台相关工具函数
///
/// 包含数据目录策略，与 Python 后端 `data_dir.py` 保持一致，
/// 确保双轨运行期间 Rust 和 Python 访问同一个 SQLite 数据库文件。
use std::path::PathBuf;
use tracing::info;

/// 获取数据根目录
///
/// 目录策略（与 Python data_dir.py 同步）：
/// - Windows 打包: 可执行文件同级 `mailauncher-data/`
/// - Windows 开发: 项目根目录的上级同级 `mailauncher-data/`
///   例: `E:\Repo\mailauncher` → `E:\Repo\mailauncher-data`
/// - macOS 打包: .app 同级 `mailauncher-data/`
/// - macOS 开发: `~/mailauncher-data/`
/// - Linux 打包: 可执行文件同级 `mailauncher-data/`
/// - Linux 开发: 项目根目录的上级同级 `mailauncher-data/`
pub fn get_data_root() -> PathBuf {
    let is_packaged = !cfg!(debug_assertions);

    if cfg!(target_os = "macos") {
        if is_packaged {
            // macOS 打包: 从可执行文件路径推算 .app 的父目录
            let exe_path = std::env::current_exe().expect("无法获取可执行文件路径");
            let exe_str = exe_path.to_string_lossy();
            if exe_str.contains(".app/Contents/MacOS/") {
                // /path/to/MAILauncher.app/Contents/MacOS/mailauncher
                // → /path/to/mailauncher-data
                let app_bundle = exe_path
                    .parent().unwrap()  // MacOS/
                    .parent().unwrap()  // Contents/
                    .parent().unwrap(); // MAILauncher.app
                app_bundle.parent().unwrap().join("mailauncher-data")
            } else {
                exe_path.parent().unwrap().join("mailauncher-data")
            }
        } else {
            // macOS 开发: ~/mailauncher-data/
            dirs::home_dir()
                .expect("无法获取用户主目录")
                .join("mailauncher-data")
        }
    } else if cfg!(target_os = "windows") {
        if is_packaged {
            // Windows 打包: 可执行文件同级目录
            let exe_path = std::env::current_exe().expect("无法获取可执行文件路径");
            exe_path.parent().unwrap().join("mailauncher-data")
        } else {
            // Windows 开发: 项目根目录的上级同级目录
            // CARGO_MANIFEST_DIR = frontend/src-tauri
            // 项目根 = frontend/src-tauri/../../ = mailauncher/
            // 数据根 = mailauncher/../mailauncher-data
            let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
            let project_root = manifest_dir
                .parent().unwrap()  // frontend/
                .parent().unwrap(); // mailauncher/
            project_root.parent().unwrap().join("mailauncher-data")
        }
    } else {
        // Linux 及其他
        if is_packaged {
            let exe_path = std::env::current_exe().expect("无法获取可执行文件路径");
            exe_path.parent().unwrap().join("mailauncher-data")
        } else {
            let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
            let project_root = manifest_dir
                .parent().unwrap()
                .parent().unwrap();
            project_root.parent().unwrap().join("mailauncher-data")
        }
    }
}

/// 获取数据库目录
pub fn get_database_dir() -> PathBuf {
    let dir = get_data_root().join("data").join("database");
    std::fs::create_dir_all(&dir).expect("无法创建数据库目录");
    dir
}

/// 获取数据库文件路径
pub fn get_database_path() -> PathBuf {
    get_database_dir().join("mailauncher.db")
}

/// 获取部署目录
pub fn get_deployments_dir() -> PathBuf {
    let dir = get_data_root().join("deployments");
    std::fs::create_dir_all(&dir).expect("无法创建部署目录");
    dir
}

/// 获取日志目录
pub fn get_log_dir() -> PathBuf {
    let dir = get_data_root().join("data").join("Log").join("backend");
    std::fs::create_dir_all(&dir).expect("无法创建日志目录");
    dir
}

/// 初始化所有数据目录
pub fn init_data_directories() {
    let data_root = get_data_root();
    std::fs::create_dir_all(&data_root).expect("无法创建数据根目录");

    info!("[数据目录] 初始化数据目录: {}", data_root.display());

    let db_dir = get_database_dir();
    let deploy_dir = get_deployments_dir();
    let log_dir = get_log_dir();

    info!("  - 数据库目录: {}", db_dir.display());
    info!("  - 部署目录: {}", deploy_dir.display());
    info!("  - 日志目录: {}", log_dir.display());
}
