/// MaiBot data 存储分类统计与按类清理命令(G8-3)
///
/// 对应前端"数据管理"面板:先 get_maibot_data_stats 展示各类别占用,再对可清理的缓存类
/// 调用 clear_maibot_data_category。清理是危险操作,前端会用 useConfirm 二次确认;后端在此
/// 强制要求实例已停止,并只放行 cleanable 类别(见 maibot_data_service)。
use std::path::PathBuf;

use tauri::State;

use crate::errors::{AppError, AppResult};
use crate::services::maibot_data_service::{self, ClearDataResult, MaiBotDataStats};
use crate::state::AppState;

/// 从实例 id 解析出其 `MaiBot/data` 目录绝对路径。
///
/// 与 commands/version.rs 的 resolve_instance_base_dir 同源:实例不存在 / 未设路径时报
/// NotFound,自然冒泡。
async fn resolve_data_dir(pool: &sqlx::SqlitePool, instance_id: &str) -> AppResult<PathBuf> {
    let instance = crate::services::instance_service::get_instance(pool, instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;
    let instance_path = instance
        .instance_path
        .ok_or_else(|| AppError::NotFound("实例路径未设置".to_string()))?;
    Ok(crate::utils::platform::get_instances_dir()
        .join(&instance_path)
        .join("MaiBot")
        .join("data"))
}

/// 获取实例 MaiBot/data 的分类占用统计(只读)。
#[tauri::command]
pub async fn get_maibot_data_stats(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<MaiBotDataStats> {
    let data_dir = resolve_data_dir(&state.db, &instance_id).await?;
    maibot_data_service::scan_data_stats(&instance_id, &data_dir)
}

/// 清空指定类别的 data 数据(危险操作)。
///
/// 要求实例已停止——停机判定在此从 ProcessManager 求得后传入服务层统一把关。运行中 /
/// 类别不可清理 / 未知类别均由服务层拒绝并自然冒泡。
#[tauri::command]
pub async fn clear_maibot_data_category(
    state: State<'_, AppState>,
    instance_id: String,
    category: String,
) -> AppResult<ClearDataResult> {
    let is_running = state.process_manager.is_instance_running(&instance_id).await;
    let data_dir = resolve_data_dir(&state.db, &instance_id).await?;
    maibot_data_service::clear_maibot_data_category(&data_dir, &category, is_running)
}
