/// 计划任务命令
///
/// 提供计划任务的 CRUD 和启用/禁用操作。
use serde::Deserialize;
use tauri::State;

use crate::errors::AppResult;
use crate::models::{ScheduleTask, SuccessResponse};
use crate::services::schedule_service;
use crate::state::AppState;

/// 创建计划任务的请求体
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleCreateRequest {
    pub instance_id: String,
    pub name: String,
    pub action: String,
    pub schedule_type: String,
    pub schedule_config: serde_json::Value,
    pub enabled: Option<bool>,
}

/// 更新计划任务的请求体
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleUpdateRequest {
    pub name: Option<String>,
    pub action: Option<String>,
    pub schedule_type: Option<String>,
    pub schedule_config: Option<serde_json::Value>,
    pub enabled: Option<bool>,
}

#[tauri::command]
pub async fn list_schedules(
    state: State<'_, AppState>,
    instance_id: Option<String>,
) -> AppResult<Vec<ScheduleTask>> {
    schedule_service::get_schedules(&state.db, instance_id.as_deref()).await
}

#[tauri::command]
pub async fn get_schedule(
    state: State<'_, AppState>,
    schedule_id: String,
) -> AppResult<ScheduleTask> {
    schedule_service::get_schedule(&state.db, &schedule_id).await
}

#[tauri::command]
pub async fn create_schedule(
    state: State<'_, AppState>,
    data: ScheduleCreateRequest,
) -> AppResult<ScheduleTask> {
    let config_str = serde_json::to_string(&data.schedule_config)
        .unwrap_or_else(|_| "{}".to_string());
    schedule_service::create_schedule(
        &state.db,
        &data.instance_id,
        &data.name,
        &data.action,
        &data.schedule_type,
        &config_str,
        data.enabled.unwrap_or(true),
    )
    .await
}

#[tauri::command]
pub async fn update_schedule(
    state: State<'_, AppState>,
    schedule_id: String,
    data: ScheduleUpdateRequest,
) -> AppResult<ScheduleTask> {
    let config_str = data.schedule_config.as_ref().map(|v| {
        serde_json::to_string(v).unwrap_or_else(|_| "{}".to_string())
    });
    schedule_service::update_schedule(
        &state.db,
        &schedule_id,
        data.name.as_deref(),
        data.action.as_deref(),
        data.schedule_type.as_deref(),
        config_str.as_deref(),
        data.enabled,
    )
    .await
}

#[tauri::command]
pub async fn delete_schedule(
    state: State<'_, AppState>,
    schedule_id: String,
) -> AppResult<SuccessResponse> {
    schedule_service::delete_schedule(&state.db, &schedule_id).await?;
    Ok(SuccessResponse::ok("计划任务已删除"))
}

#[tauri::command]
pub async fn toggle_schedule(
    state: State<'_, AppState>,
    schedule_id: String,
    enabled: bool,
) -> AppResult<ScheduleTask> {
    schedule_service::toggle_schedule(&state.db, &schedule_id, enabled).await
}
