/// 统计服务
///
/// 通过读取 MaiBot 实例的 SQLite 数据库（MaiBot.db）获取 LLM 使用统计。
/// 使用 sqlx 动态连接到各实例的数据库进行只读查询。
use std::collections::HashMap;
use std::path::PathBuf;

use chrono::{Local, NaiveDateTime};
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::{Row, SqlitePool};
use tracing::{info, warn};

use crate::errors::{AppError, AppResult};
use crate::models::stats::*;
use crate::utils::platform;

/// 时间范围转换为小时数
fn time_range_to_hours(time_range: &str) -> f64 {
    match time_range {
        "1h" => 1.0,
        "6h" => 6.0,
        "12h" => 12.0,
        "24h" => 24.0,
        "7d" => 168.0,
        "30d" => 720.0,
        _ => 24.0,
    }
}

/// 查找 MaiBot 实例的数据库路径
fn find_maibot_db(instance_path: &str) -> Option<PathBuf> {
    let instances_dir = platform::get_instances_dir();
    let possible_paths = [
        instances_dir.join(instance_path).join("MaiBot").join("data").join("MaiBot.db"),
        instances_dir.join(instance_path).join("MaiBot").join("data").join("maibot.db"),
        instances_dir.join(instance_path).join("data").join("MaiBot.db"),
        instances_dir.join(instance_path).join("data").join("maibot.db"),
    ];
    for p in &possible_paths {
        if p.exists() {
            return Some(p.clone());
        }
    }
    None
}

/// 查询 MaiBot 数据库的 LLM 使用统计
async fn query_llm_usage(
    db_path: &PathBuf,
    start_time: &str,
    end_time: &str,
) -> AppResult<(StatsSummary, Vec<ModelStats>, Vec<RequestTypeStats>)> {
    let db_url = format!("sqlite:{}?mode=ro", db_path.display());
    let options: SqliteConnectOptions = db_url.parse()
        .map_err(|e| AppError::Database(format!("无法解析 MaiBot 数据库路径: {}", e)))?;

    let pool = sqlx::SqlitePool::connect_with(options)
        .await
        .map_err(|e| AppError::Database(format!("无法连接 MaiBot 数据库: {}", e)))?;

    // 检查 llm_usage 表是否存在
    let table_check: Option<(String,)> = sqlx::query_as(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='llm_usage'"
    )
    .fetch_optional(&pool)
    .await?;

    if table_check.is_none() {
        pool.close().await;
        return Ok((StatsSummary::default(), vec![], vec![]));
    }

    // 查询 LLM 使用数据
    let rows = sqlx::query(
        "SELECT model_name, model_assign_name, request_type, prompt_tokens, \
         completion_tokens, total_tokens, cost, time_cost, timestamp \
         FROM llm_usage WHERE timestamp >= ? AND timestamp <= ?"
    )
    .bind(start_time)
    .bind(end_time)
    .fetch_all(&pool)
    .await?;

    let mut summary = StatsSummary::default();
    let mut model_map: HashMap<String, (Option<String>, i64, i64, i64, i64, f64, f64)> = HashMap::new();
    let mut type_map: HashMap<String, (i64, i64, f64)> = HashMap::new();
    let mut total_time = 0.0f64;

    for row in &rows {
        let model_name: String = row.try_get("model_name").unwrap_or_default();
        let display_name: Option<String> = row.try_get("model_assign_name").ok();
        let request_type: String = row.try_get("request_type").unwrap_or_else(|_| "unknown".into());
        let prompt_tokens: i64 = row.try_get("prompt_tokens").unwrap_or(0);
        let completion_tokens: i64 = row.try_get("completion_tokens").unwrap_or(0);
        let total_tokens: i64 = row.try_get("total_tokens").unwrap_or(0);
        let cost: f64 = row.try_get("cost").unwrap_or(0.0);
        let time_cost: f64 = row.try_get("time_cost").unwrap_or(0.0);

        summary.total_requests += 1;
        summary.total_cost += cost;
        summary.total_tokens += total_tokens;
        summary.input_tokens += prompt_tokens;
        summary.output_tokens += completion_tokens;
        total_time += time_cost;

        let entry = model_map.entry(model_name).or_insert((display_name.clone(), 0, 0, 0, 0, 0.0, 0.0));
        if entry.0.is_none() && display_name.is_some() {
            entry.0 = display_name;
        }
        entry.1 += 1;
        entry.2 += total_tokens;
        entry.3 += prompt_tokens;
        entry.4 += completion_tokens;
        entry.5 += cost;
        entry.6 += time_cost;

        let te = type_map.entry(request_type).or_insert((0, 0, 0.0));
        te.0 += 1;
        te.1 += total_tokens;
        te.2 += cost;
    }

    if summary.total_requests > 0 {
        summary.avg_response_time = (total_time / summary.total_requests as f64 * 1000.0).round() / 1000.0;
    }
    summary.total_cost = (summary.total_cost * 10000.0).round() / 10000.0;

    // 查询消息数
    let msg_table: Option<(String,)> = sqlx::query_as(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='messages'"
    )
    .fetch_optional(&pool)
    .await?;

    if msg_table.is_some() {
        // messages 表使用 unix timestamp
        let start_ts: f64 = chrono::NaiveDateTime::parse_from_str(start_time, "%Y-%m-%d %H:%M:%S")
            .map(|d| d.and_utc().timestamp() as f64)
            .unwrap_or(0.0);
        let end_ts: f64 = chrono::NaiveDateTime::parse_from_str(end_time, "%Y-%m-%d %H:%M:%S")
            .map(|d| d.and_utc().timestamp() as f64)
            .unwrap_or(0.0);

        let msg_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM messages WHERE time >= ? AND time <= ?"
        )
        .bind(start_ts)
        .bind(end_ts)
        .fetch_one(&pool)
        .await
        .unwrap_or((0,));

        let reply_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM messages WHERE time >= ? AND time <= ? AND reply_to IS NOT NULL"
        )
        .bind(start_ts)
        .bind(end_ts)
        .fetch_one(&pool)
        .await
        .unwrap_or((0,));

        summary.total_messages = msg_count.0;
        summary.total_replies = reply_count.0;
    }

    pool.close().await;

    let mut model_stats: Vec<ModelStats> = model_map.into_iter().map(|(name, (dn, cnt, tok, inp, out, cost, time))| {
        ModelStats {
            model_name: name,
            display_name: dn,
            request_count: cnt,
            total_tokens: tok,
            input_tokens: inp,
            output_tokens: out,
            total_cost: (cost * 10000.0).round() / 10000.0,
            avg_response_time: if cnt > 0 { (time / cnt as f64 * 1000.0).round() / 1000.0 } else { 0.0 },
        }
    }).collect();
    model_stats.sort_by(|a, b| b.request_count.cmp(&a.request_count));

    let mut request_type_stats: Vec<RequestTypeStats> = type_map.into_iter().map(|(rt, (cnt, tok, cost))| {
        RequestTypeStats {
            request_type: rt,
            request_count: cnt,
            total_tokens: tok,
            total_cost: (cost * 10000.0).round() / 10000.0,
        }
    }).collect();
    request_type_stats.sort_by(|a, b| b.request_count.cmp(&a.request_count));

    Ok((summary, model_stats, request_type_stats))
}

/// 获取实例在线时间
fn get_instance_online_time(status: &str, run_time: i64, last_run: Option<NaiveDateTime>) -> f64 {
    let mut total = run_time as f64;
    if status == "running" {
        if let Some(lr) = last_run {
            let now = Local::now().naive_local();
            let uptime = (now - lr).num_seconds() as f64;
            total += uptime;
        }
    }
    total
}

/// 获取单实例统计
pub async fn get_instance_stats(
    pool: &SqlitePool,
    instance_id: &str,
    time_range: &str,
) -> AppResult<Option<InstanceStats>> {
    #[derive(sqlx::FromRow)]
    struct InstanceRow {
        id: String,
        name: String,
        instance_path: Option<String>,
        status: String,
        run_time: i64,
        last_run: Option<NaiveDateTime>,
    }

    let instance = sqlx::query_as::<_, InstanceRow>(
        "SELECT id, name, instance_path, status, run_time, last_run FROM instances WHERE id = ?"
    )
    .bind(instance_id)
    .fetch_optional(pool)
    .await?;

    let instance = match instance {
        Some(i) => i,
        None => return Ok(None),
    };

    let online_time = get_instance_online_time(&instance.status, instance.run_time, instance.last_run);
    let hours = time_range_to_hours(time_range);
    let end = Local::now().naive_local();
    let start = end - chrono::Duration::seconds((hours * 3600.0) as i64);
    let start_str = start.format("%Y-%m-%d %H:%M:%S").to_string();
    let end_str = end.format("%Y-%m-%d %H:%M:%S").to_string();
    let now_str = end.format("%Y-%m-%dT%H:%M:%S").to_string();

    let (mut summary, model_stats, request_type_stats) =
        if let Some(ref path) = instance.instance_path {
            if let Some(db_path) = find_maibot_db(path) {
                match query_llm_usage(&db_path, &start_str, &end_str).await {
                    Ok(r) => r,
                    Err(e) => {
                        warn!("[统计] 查询 MaiBot 数据库失败 ({}): {}", instance_id, e);
                        (StatsSummary::default(), vec![], vec![])
                    }
                }
            } else {
                (StatsSummary::default(), vec![], vec![])
            }
        } else {
            (StatsSummary::default(), vec![], vec![])
        };

    summary.online_time = online_time;
    let effective_hours = if online_time > 0.0 {
        (hours * 3600.0).min(online_time) / 3600.0
    } else {
        hours
    };
    if effective_hours > 0.0 {
        summary.cost_per_hour = (summary.total_cost / effective_hours * 10000.0).round() / 10000.0;
        summary.tokens_per_hour = (summary.total_tokens as f64 / effective_hours * 10.0).round() / 10.0;
    }

    Ok(Some(InstanceStats {
        instance_id: instance.id,
        instance_name: instance.name,
        time_range: time_range.to_string(),
        query_time: now_str,
        summary,
        model_stats,
        request_type_stats,
    }))
}

/// 获取统计概览
pub async fn get_stats_overview(pool: &SqlitePool, time_range: &str) -> AppResult<StatsOverview> {
    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM instances")
        .fetch_one(pool)
        .await?;

    let running: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM instances WHERE status = 'running'")
        .fetch_one(pool)
        .await?;

    // 获取所有实例ID
    let instance_ids: Vec<(String,)> = sqlx::query_as("SELECT id FROM instances")
        .fetch_all(pool)
        .await?;

    let mut agg_summary = StatsSummary::default();
    let mut all_models: HashMap<String, ModelStats> = HashMap::new();

    for (iid,) in &instance_ids {
        if let Some(stats) = get_instance_stats(pool, iid, time_range).await? {
            agg_summary.total_requests += stats.summary.total_requests;
            agg_summary.total_cost += stats.summary.total_cost;
            agg_summary.total_tokens += stats.summary.total_tokens;
            agg_summary.input_tokens += stats.summary.input_tokens;
            agg_summary.output_tokens += stats.summary.output_tokens;
            agg_summary.online_time += stats.summary.online_time;
            agg_summary.total_messages += stats.summary.total_messages;
            agg_summary.total_replies += stats.summary.total_replies;
            agg_summary.cost_per_hour += stats.summary.cost_per_hour;
            agg_summary.tokens_per_hour += stats.summary.tokens_per_hour;

            for ms in stats.model_stats {
                let entry = all_models.entry(ms.model_name.clone()).or_insert(ModelStats {
                    model_name: ms.model_name.clone(),
                    display_name: ms.display_name.clone(),
                    request_count: 0,
                    total_tokens: 0,
                    input_tokens: 0,
                    output_tokens: 0,
                    total_cost: 0.0,
                    avg_response_time: 0.0,
                });
                entry.request_count += ms.request_count;
                entry.total_tokens += ms.total_tokens;
                entry.input_tokens += ms.input_tokens;
                entry.output_tokens += ms.output_tokens;
                entry.total_cost += ms.total_cost;
            }
        }
    }

    agg_summary.total_cost = (agg_summary.total_cost * 10000.0).round() / 10000.0;
    agg_summary.cost_per_hour = (agg_summary.cost_per_hour * 10000.0).round() / 10000.0;
    agg_summary.tokens_per_hour = (agg_summary.tokens_per_hour * 10.0).round() / 10.0;

    let mut top_models: Vec<ModelStats> = all_models.into_values().collect();
    top_models.sort_by(|a, b| b.request_count.cmp(&a.request_count));
    top_models.truncate(5);

    let now_str = Local::now().naive_local().format("%Y-%m-%dT%H:%M:%S").to_string();

    Ok(StatsOverview {
        total_instances: total.0,
        running_instances: running.0,
        time_range: time_range.to_string(),
        query_time: now_str,
        summary: agg_summary,
        top_models,
    })
}

/// 获取聚合统计
pub async fn get_aggregated_stats(
    pool: &SqlitePool,
    time_range: &str,
    instance_ids: Option<Vec<String>>,
) -> AppResult<AggregatedStats> {
    let ids: Vec<(String,)> = if let Some(ref ids) = instance_ids {
        ids.iter().map(|id| (id.clone(),)).collect()
    } else {
        sqlx::query_as("SELECT id FROM instances")
            .fetch_all(pool)
            .await?
    };

    let mut by_instance = Vec::new();
    let mut agg_summary = StatsSummary::default();
    let mut all_models: HashMap<String, ModelStats> = HashMap::new();

    for (iid,) in &ids {
        if let Some(stats) = get_instance_stats(pool, iid, time_range).await? {
            agg_summary.total_requests += stats.summary.total_requests;
            agg_summary.total_cost += stats.summary.total_cost;
            agg_summary.total_tokens += stats.summary.total_tokens;
            agg_summary.input_tokens += stats.summary.input_tokens;
            agg_summary.output_tokens += stats.summary.output_tokens;
            agg_summary.online_time += stats.summary.online_time;
            agg_summary.total_messages += stats.summary.total_messages;
            agg_summary.total_replies += stats.summary.total_replies;
            agg_summary.cost_per_hour += stats.summary.cost_per_hour;
            agg_summary.tokens_per_hour += stats.summary.tokens_per_hour;

            for ms in &stats.model_stats {
                let entry = all_models.entry(ms.model_name.clone()).or_insert(ModelStats {
                    model_name: ms.model_name.clone(),
                    display_name: ms.display_name.clone(),
                    request_count: 0,
                    total_tokens: 0,
                    input_tokens: 0,
                    output_tokens: 0,
                    total_cost: 0.0,
                    avg_response_time: 0.0,
                });
                entry.request_count += ms.request_count;
                entry.total_tokens += ms.total_tokens;
                entry.input_tokens += ms.input_tokens;
                entry.output_tokens += ms.output_tokens;
                entry.total_cost += ms.total_cost;
            }

            by_instance.push(stats);
        }
    }

    agg_summary.total_cost = (agg_summary.total_cost * 10000.0).round() / 10000.0;

    let mut model_stats: Vec<ModelStats> = all_models.into_values().collect();
    model_stats.sort_by(|a, b| b.request_count.cmp(&a.request_count));

    let now_str = Local::now().naive_local().format("%Y-%m-%dT%H:%M:%S").to_string();

    Ok(AggregatedStats {
        instance_count: by_instance.len() as i64,
        time_range: time_range.to_string(),
        query_time: now_str,
        summary: agg_summary,
        by_instance,
        model_stats,
    })
}

/// 获取实例模型统计
pub async fn get_instance_model_stats(
    pool: &SqlitePool,
    instance_id: &str,
    time_range: &str,
    limit: usize,
) -> AppResult<InstanceModelStatsResponse> {
    let stats = get_instance_stats(pool, instance_id, time_range).await?;

    let mut models = stats.map(|s| s.model_stats).unwrap_or_default();
    models.truncate(limit);

    Ok(InstanceModelStatsResponse {
        instance_id: instance_id.to_string(),
        time_range: time_range.to_string(),
        models,
    })
}
