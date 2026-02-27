/// 系统工具 Tauri 命令
///
/// 提供环境检测、网络连通性检查等系统级功能。
use tauri::State;

use crate::errors::AppResult;
use crate::models::SuccessResponse;
use crate::services::{api_provider_service, system_service};
use crate::state::AppState;

// ==================== 系统环境 ====================

/// 检测 Git 环境
#[tauri::command]
pub async fn check_git_environment() -> AppResult<system_service::GitInfo> {
    system_service::check_git_environment()
}

/// 网络连通性检查
#[tauri::command]
pub async fn check_connectivity() -> AppResult<system_service::ConnectivityStatus> {
    system_service::check_connectivity().await
}

// ==================== API 供应商管理 ====================

/// 获取所有 API 供应商
#[tauri::command]
pub async fn get_api_providers(
    state: State<'_, AppState>,
) -> AppResult<Vec<crate::models::ApiProvider>> {
    api_provider_service::get_all_providers(&state.db).await
}

/// 创建 API 供应商
#[tauri::command]
pub async fn create_api_provider(
    state: State<'_, AppState>,
    name: String,
    base_url: String,
    api_key: String,
    is_enabled: bool,
) -> AppResult<crate::models::ApiProvider> {
    api_provider_service::create_provider(&state.db, &name, &base_url, &api_key, is_enabled).await
}

/// 更新 API 供应商
#[tauri::command]
pub async fn update_api_provider(
    state: State<'_, AppState>,
    id: i64,
    name: Option<String>,
    base_url: Option<String>,
    api_key: Option<String>,
    is_enabled: Option<bool>,
) -> AppResult<crate::models::ApiProvider> {
    api_provider_service::update_provider(
        &state.db,
        id,
        name.as_deref(),
        base_url.as_deref(),
        api_key.as_deref(),
        is_enabled,
    )
    .await
}

/// 删除 API 供应商
#[tauri::command]
pub async fn delete_api_provider(
    state: State<'_, AppState>,
    id: i64,
) -> AppResult<SuccessResponse> {
    api_provider_service::delete_provider(&state.db, id).await?;
    Ok(SuccessResponse::ok("API 供应商已删除"))
}

/// 批量保存 API 供应商
#[tauri::command]
pub async fn save_all_providers(
    state: State<'_, AppState>,
    providers: Vec<api_provider_service::ProviderInput>,
) -> AppResult<Vec<crate::models::ApiProvider>> {
    api_provider_service::save_all_providers(&state.db, providers).await
}

/// 远程获取供应商模型列表
#[tauri::command]
pub async fn fetch_provider_models(
    state: State<'_, AppState>,
    provider_id: i64,
) -> AppResult<FetchModelsResponse> {
    let models = api_provider_service::fetch_and_cache_models(&state.db, provider_id).await?;
    Ok(FetchModelsResponse {
        models_count: models.len(),
        models,
    })
}

/// 模型获取响应
#[derive(serde::Serialize)]
pub struct FetchModelsResponse {
    pub models: Vec<String>,
    pub models_count: usize,
}
