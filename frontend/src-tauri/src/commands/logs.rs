/// 日志与消息队列命令
///
/// 提供前端日志管理（保存、列表、查看、导出、清理）
/// 以及 MaiBot 实例消息队列查询的 Tauri 命令。
use tauri::State;

use crate::errors::AppResult;
use crate::models::log::*;
use crate::models::message_queue::*;
use crate::services::{log_service, message_queue_service};
use crate::state::AppState;

// ==================== 前端日志命令 ====================

/// 保存前端日志到文件
#[tauri::command]
pub fn save_frontend_logs(entries: Vec<LogEntry>) -> AppResult<()> {
    log_service::save_frontend_logs(entries)
}

/// 列出所有前端日志文件
#[tauri::command]
pub fn list_log_files() -> AppResult<Vec<LogFile>> {
    log_service::list_log_files()
}

/// 读取日志文件内容
#[tauri::command]
pub fn get_log_content(file_name: String) -> AppResult<String> {
    log_service::get_log_content(&file_name)
}

/// 导出日志为压缩包，返回临时文件路径
#[tauri::command]
pub fn export_logs() -> AppResult<String> {
    let bytes = log_service::export_logs()?;
    // 保存到临时文件并返回路径
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let zip_path = std::env::temp_dir().join(format!("mailauncher_logs_{}.zip", timestamp));
    std::fs::write(&zip_path, &bytes)?;
    Ok(zip_path.to_string_lossy().to_string())
}

/// 清空所有前端日志文件
#[tauri::command]
pub fn clear_logs() -> AppResult<()> {
    log_service::clear_logs()
}

// ==================== 消息队列命令 ====================

/// 获取单个实例的消息队列
#[tauri::command]
pub async fn get_instance_message_queue(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<MessageQueueResponse> {
    message_queue_service::get_instance_queue(&state.db, &instance_id).await
}

/// 获取所有实例的消息队列
#[tauri::command]
pub async fn get_all_message_queues(
    state: State<'_, AppState>,
) -> AppResult<Vec<MessageQueueResponse>> {
    message_queue_service::get_all_queues(&state.db).await
}
