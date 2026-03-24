/// 系统工具 Tauri 命令
///
/// 提供环境检测、网络连通性检查等系统级功能。
use tauri::State;

use crate::errors::AppResult;
use crate::models::SuccessResponse;
use crate::services::{api_provider_service, system_service};
use crate::state::AppState;

// ==================== 系统环境 ====================

/// 后端健康检查（轻量，仅验证 Rust 后端存活）
#[tauri::command]
pub async fn ping() -> AppResult<String> {
    Ok("pong".to_string())
}

/// 检测 Git 环境
#[tauri::command]
pub async fn check_git_environment() -> AppResult<system_service::GitInfo> {
    system_service::check_git_environment()
}

/// 自动发现 Python 环境并保存到数据库
#[tauri::command]
pub async fn discover_python(state: State<'_, AppState>) -> AppResult<Vec<system_service::DiscoveredPython>> {
    tracing::info!("[discover_python] 命令被调用");
    let found = system_service::discover_python_environments();
    tracing::info!("[discover_python] 发现 {} 个 Python 环境", found.len());

    // 将发现的环境写入数据库
    for env in &found {
        tracing::info!("[discover_python] 写入数据库: {} ({})", env.path, env.version);
        if let Err(e) = crate::services::config_service::save_python_environment(
            &state.db, &env.path, &env.version
        ).await {
            tracing::error!("[discover_python] 写入数据库失败: {} - {:?}", env.path, e);
        }
    }

    Ok(found)
}

/// 网络连通性检查（GitHub/PyPI，用于下载和更新场景）
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
