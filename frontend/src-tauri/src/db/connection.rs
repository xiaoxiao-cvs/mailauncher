/// 数据库连接管理
///
/// 使用 sqlx 的 SQLite 连接池，与 Python 后端共享同一个数据库文件。
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::str::FromStr;
use tracing::info;

use crate::errors::AppError;
use crate::utils::platform;

/// 创建 SQLite 连接池
///
/// 连接到与 Python 后端相同的数据库文件 `mailauncher.db`，
/// 使用 WAL 模式以支持并发读写。
pub async fn create_pool() -> Result<SqlitePool, AppError> {
    let db_path = platform::get_database_path();
    info!("[数据库] 连接到: {}", db_path.display());

    // 构建连接字符串
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let options = SqliteConnectOptions::from_str(&db_url)
        .map_err(|e| AppError::Database(format!("数据库连接选项解析失败: {}", e)))?
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .busy_timeout(std::time::Duration::from_secs(30));

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(|e| AppError::Database(format!("数据库连接失败: {}", e)))?;

    info!("[数据库] 连接池创建成功");
    Ok(pool)
}
