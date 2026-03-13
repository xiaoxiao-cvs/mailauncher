use tauri::State;

use crate::errors::AppResult;
use crate::models::{InstanceLifecycleStatus, RuntimeProfile, SuccessResponse, WslDistributionInfo};
use crate::services::runtime_service;
use crate::state::AppState;

#[tauri::command]
pub async fn list_wsl_distributions() -> AppResult<Vec<WslDistributionInfo>> {
    runtime_service::list_wsl_distributions().await
}

#[tauri::command]
pub async fn set_instance_runtime_profile(
    state: State<'_, AppState>,
    instance_id: String,
    runtime_profile: RuntimeProfile,
) -> AppResult<SuccessResponse> {
    runtime_service::set_instance_runtime_profile(&state.db, &instance_id, runtime_profile).await?;
    Ok(SuccessResponse::ok(format!("实例 {} 运行时配置已更新", instance_id)))
}

#[tauri::command]
pub async fn refresh_instance_runtime_state(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<InstanceLifecycleStatus> {
    runtime_service::refresh_instance_runtime_state(
        &state.db,
        &state.component_registry,
        &state.runtime_resolver,
        &instance_id,
    )
    .await
}