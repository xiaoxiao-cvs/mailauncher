/// 网络代理与下载源管理 Tauri 命令
///
/// 薄封装 source_proxy_service：读写存于 config KV 的代理 / 源配置。
/// 注入逻辑（git/pip/reqwest）在各自的 service 内自取配置，命令层只负责读写。
use tauri::State;

use crate::errors::AppResult;
use crate::models::SuccessResponse;
use crate::services::source_proxy_service::{self, NetworkProxy, SourceConfig};
use crate::state::AppState;

/// 获取网络代理配置（无配置时返回默认）
#[tauri::command]
pub async fn get_network_proxy(state: State<'_, AppState>) -> AppResult<NetworkProxy> {
    source_proxy_service::get_network_proxy(&state.db).await
}

/// 保存网络代理配置
#[tauri::command]
pub async fn set_network_proxy(
    state: State<'_, AppState>,
    proxy: NetworkProxy,
) -> AppResult<SuccessResponse> {
    source_proxy_service::save_network_proxy(&state.db, &proxy).await?;
    Ok(SuccessResponse::ok("网络代理已保存"))
}

/// 获取下载源配置（无配置时返回种子默认）
#[tauri::command]
pub async fn get_source_config(state: State<'_, AppState>) -> AppResult<SourceConfig> {
    source_proxy_service::get_source_config(&state.db).await
}

/// 保存下载源配置
#[tauri::command]
pub async fn save_source_config(
    state: State<'_, AppState>,
    config: SourceConfig,
) -> AppResult<SuccessResponse> {
    source_proxy_service::save_source_config(&state.db, &config).await?;
    Ok(SuccessResponse::ok("下载源配置已保存"))
}
