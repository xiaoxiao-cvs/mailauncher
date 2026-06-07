/// 统计数据命令
///
/// 提供 MaiBot 实例统计数据的查询接口。
/// 统计数据来源于各 MaiBot 实例自身的 SQLite 数据库。
use std::collections::HashMap;

use tauri::State;

use crate::errors::AppResult;
use crate::models::stats::*;
use crate::services::{instance_service, stats_service};
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
        s.split(',')
            .map(|id| id.trim().to_string())
            .collect::<Vec<_>>()
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

/// 按小时聚合的消息/回复趋势(首页"英雄/KPI 趋势线"供数)。
///
/// 遍历所有实例,逐实例解析其 MaiBot.db 并按整点小时桶统计,再跨实例按 hour_ts 求和合并,
/// 升序返回。无库的实例跳过(不报错)。
#[tauri::command]
pub async fn get_hourly_message_stats(
    state: State<'_, AppState>,
    time_range: String,
) -> AppResult<Vec<HourlyMessageCount>> {
    let (start, end) = stats_service::time_range_to_bounds(&time_range);

    let instances = instance_service::get_all_instances(&state.db)
        .await?
        .instances;

    // hour_ts -> (message_count, reply_count),跨实例求和
    let mut merged: HashMap<String, (i64, i64)> = HashMap::new();
    for instance in &instances {
        let path = instance
            .instance_path
            .clone()
            .unwrap_or_else(|| instance.name.clone());
        let Some(db_path) = stats_service::resolve_maibot_db(&path) else {
            continue;
        };
        let buckets = stats_service::query_hourly_message_count(&db_path, &start, &end).await?;
        for b in buckets {
            let entry = merged.entry(b.hour_ts).or_insert((0, 0));
            entry.0 += b.message_count;
            entry.1 += b.reply_count;
        }
    }

    let mut result: Vec<HourlyMessageCount> = merged
        .into_iter()
        .map(
            |(hour_ts, (message_count, reply_count))| HourlyMessageCount {
                hour_ts,
                message_count,
                reply_count,
            },
        )
        .collect();
    result.sort_by(|a, b| a.hour_ts.cmp(&b.hour_ts));
    Ok(result)
}
