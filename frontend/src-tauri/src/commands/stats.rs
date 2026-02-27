/// 统计数据命令
///
/// 提供 MaiBot 实例统计数据的查询接口。
/// 统计数据来源于各 MaiBot 实例自身的 SQLite 数据库。
use tauri::State;

use crate::errors::AppResult;
use crate::models::stats::*;
use crate::services::stats_service;
use crate::state::AppState;

#[tauri::command]
pub async fn get_stats_overview(
    state: State<'_, AppState>,
    time_range: Option<String>,
) -> AppResult<StatsOverview> {
    let tr = time_range.as_deref().unwrap_or("24h");
    stats_service::get_stats_overview(&state.db, tr).await
}

#[tauri::command]
pub async fn get_aggregated_stats(
    state: State<'_, AppState>,
    time_range: Option<String>,
    instance_ids: Option<String>,
) -> AppResult<AggregatedStats> {
    let tr = time_range.as_deref().unwrap_or("24h");
    let ids = instance_ids.map(|s| {
        s.split(',').map(|id| id.trim().to_string()).collect::<Vec<_>>()
    });
    stats_service::get_aggregated_stats(&state.db, tr, ids).await
}

#[tauri::command]
pub async fn get_instance_stats(
    state: State<'_, AppState>,
    instance_id: String,
    time_range: Option<String>,
) -> AppResult<Option<InstanceStats>> {
    let tr = time_range.as_deref().unwrap_or("24h");
    stats_service::get_instance_stats(&state.db, &instance_id, tr).await
}

#[tauri::command]
pub async fn get_instance_model_stats(
    state: State<'_, AppState>,
    instance_id: String,
    time_range: Option<String>,
    limit: Option<usize>,
) -> AppResult<InstanceModelStatsResponse> {
    let tr = time_range.as_deref().unwrap_or("24h");
    let lim = limit.unwrap_or(10);
    stats_service::get_instance_model_stats(&state.db, &instance_id, tr, lim).await
}
