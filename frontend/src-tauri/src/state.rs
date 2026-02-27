/// 应用全局状态
///
/// 通过 `app.manage()` 注册到 Tauri，
/// 命令函数通过 `State<'_, AppState>` 参数注入访问。
use sqlx::SqlitePool;

/// 应用状态，持有数据库连接池等共享资源
pub struct AppState {
    /// SQLite 连接池
    pub db: SqlitePool,
}
