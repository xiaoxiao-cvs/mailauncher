use std::collections::HashMap;

use tauri::State;

use crate::errors::AppResult;
use crate::models::{
    ComponentType, InstanceLifecycleStatus, RuntimeProfile, RuntimeProbeResult, SuccessResponse,
    WslDistributionInfo,
};
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
        &state.process_manager,
        &instance_id,
    )
    .await
}

#[tauri::command]
pub async fn set_component_runtime_profiles(
    state: State<'_, AppState>,
    instance_id: String,
    component_runtime_profiles: HashMap<ComponentType, RuntimeProfile>,
) -> AppResult<SuccessResponse> {
    runtime_service::set_component_runtime_profiles(&state.db, &instance_id, component_runtime_profiles).await?;
    Ok(SuccessResponse::ok(format!("实例 {} 组件级运行时配置已更新", instance_id)))
}

#[tauri::command]
pub async fn validate_runtime_profile(runtime_profile: RuntimeProfile) -> AppResult<RuntimeProbeResult> {
    runtime_service::validate_runtime_profile(&runtime_profile).await
}