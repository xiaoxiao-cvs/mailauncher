/// 应用全局状态
///
/// 通过 `app.manage()` 注册到 Tauri，
/// 命令函数通过 `State<'_, AppState>` 参数注入访问。
use sqlx::SqlitePool;

use crate::services::download_service::DownloadManager;
use crate::services::process_service::ProcessManager;

/// 应用状态，持有数据库连接池和进程管理器等共享资源
pub struct AppState {
    /// SQLite 连接池
    pub db: SqlitePool,
    /// 进程管理器（管理所有实例组件的进程生命周期）
    pub process_manager: ProcessManager,
    /// 下载管理器（管理下载任务的生命周期和进度）
    pub download_manager: DownloadManager,
}
