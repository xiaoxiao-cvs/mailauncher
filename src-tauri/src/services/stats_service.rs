/// 统计服务
///
/// 通过读取 MaiBot 实例的 SQLite 数据库（MaiBot.db）获取 LLM 使用统计。
/// 使用 sqlx 动态连接到各实例的数据库进行只读查询。
use std::collections::HashMap;
use std::path::{Path, PathBuf};

use chrono::{Local, NaiveDateTime};
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::{Row, SqlitePool};
use tracing::warn;

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
        instances_dir
            .join(instance_path)
            .join("MaiBot")
            .join("data")
            .join("MaiBot.db"),
        instances_dir
            .join(instance_path)
            .join("MaiBot")
            .join("data")
            .join("maibot.db"),
        instances_dir
            .join(instance_path)
            .join("data")
            .join("MaiBot.db"),
        instances_dir
            .join(instance_path)
            .join("data")
            .join("maibot.db"),
    ];
    for p in &possible_paths {
        if p.exists() {
            return Some(p.clone());
        }
    }
    None
}

/// 把 `time_range`(如 "24h"/"7d")折算为 [start, end] 起止字符串(格式 "%Y-%m-%d %H:%M:%S",
/// 与 count_messages / query_llm_usage 的边界比较口径一致)。end 取当前本地时刻。
pub(crate) fn time_range_to_bounds(time_range: &str) -> (String, String) {
    let hours = time_range_to_hours(time_range);
    let end = Local::now().naive_local();
    let start = end - chrono::Duration::seconds((hours * 3600.0) as i64);
    (
        start.format("%Y-%m-%d %H:%M:%S").to_string(),
        end.format("%Y-%m-%d %H:%M:%S").to_string(),
    )
}

/// 解析某实例的 MaiBot.db 路径(复用 find_maibot_db 的多候选探测)。无库返回 None。
pub(crate) fn resolve_maibot_db(instance_path: &str) -> Option<PathBuf> {
    find_maibot_db(instance_path)
}

/// 统计指定时间区间内的消息数(mai_messages)与回复数(tool_records 中 tool_name='reply')
///
/// MaiBot 现代 schema:消息表 `mai_messages`、工具调用表 `tool_records`,时间列均为 `timestamp`
/// (DateTime 字符串形如 'YYYY-MM-DD HH:MM:SS...'),与 llm_usage 一致按字符串边界比较。
/// 回复数对齐 MaiBot 控制台口径——取工具调用 reply(而非 mai_messages.reply_to,该列在现代库
/// 几乎恒空)。两表分别探测存在性,缺失时各自回退 0,兼容尚未产生记录的实例数据库。
async fn count_messages(pool: &SqlitePool, start_time: &str, end_time: &str) -> (i64, i64) {
    let msg_table: Option<(String,)> =
        sqlx::query_as("SELECT name FROM sqlite_master WHERE type='table' AND name='mai_messages'")
            .fetch_optional(pool)
            .await
            .unwrap_or(None);

    if msg_table.is_none() {
        return (0, 0);
    }

    let msg_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM mai_messages WHERE timestamp >= ? AND timestamp <= ?")
            .bind(start_time)
            .bind(end_time)
            .fetch_one(pool)
            .await
            .unwrap_or((0,));

    // 回复数:对齐 MaiBot 控制台口径——回复来自 tool_records 中 tool_name='reply' 的工具调用,
    // 而非 mai_messages.reply_to(现代库该列几乎恒空:真实库 100+ 行仅 1 行非空)。
    // tool_records 表不存在(旧库/空库)时回退 0。
    let tool_table: Option<(String,)> =
        sqlx::query_as("SELECT name FROM sqlite_master WHERE type='table' AND name='tool_records'")
            .fetch_optional(pool)
            .await
            .unwrap_or(None);
    let reply_count: (i64,) = if tool_table.is_some() {
        sqlx::query_as(
            "SELECT COUNT(*) FROM tool_records WHERE timestamp >= ? AND timestamp <= ? AND tool_name = 'reply'"
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_one(pool)
        .await
        .unwrap_or((0,))
    } else {
        (0,)
    };

    (msg_count.0, reply_count.0)
}

/// 统计某实例近 `time_range` 窗口内的消息数与回复数(供消息队列"已处理"等跨服务复用,
/// 口径与首页统计卡一致)。实例无 DB / 表缺失 / 连接失败时安全返回 (0, 0)。
pub(crate) async fn count_instance_messages(instance_path: &str, time_range: &str) -> (i64, i64) {
    let Some(db_path) = find_maibot_db(instance_path) else {
        return (0, 0);
    };
    let db_url = format!("sqlite:{}?mode=ro", db_path.display());
    let Ok(options) = db_url.parse::<SqliteConnectOptions>() else {
        return (0, 0);
    };
    let Ok(pool) = sqlx::SqlitePool::connect_with(options).await else {
        return (0, 0);
    };
    let hours = time_range_to_hours(time_range);
    let end = Local::now().naive_local();
    let start = end - chrono::Duration::seconds((hours * 3600.0) as i64);
    let result = count_messages(
        &pool,
        &start.format("%Y-%m-%d %H:%M:%S").to_string(),
        &end.format("%Y-%m-%d %H:%M:%S").to_string(),
    )
    .await;
    pool.close().await;
    result
}

/// 对实例 MaiBot.db 按小时分桶统计消息数与回复数(首页趋势线供数)。
///
/// message_count 取 mai_messages 行数;reply_count 复用本项目"回复=tool_records.tool_name='reply'"
/// 口径(与 count_messages 一致)。两表分别按 `strftime('%Y-%m-%d %H:00:00', timestamp)` GROUP BY
/// 聚合,再在 Rust 端按 hour_ts 合并(避免跨表 JOIN 的笛卡尔放大)。表不存在则该维度回退空,
/// 整体安全返回(可能为空 Vec)。结果按 hour_ts 升序。
pub async fn query_hourly_message_count(
    db_path: &Path,
    start: &str,
    end: &str,
) -> AppResult<Vec<HourlyMessageCount>> {
    let db_url = format!("sqlite:{}?mode=ro", db_path.display());
    let options: SqliteConnectOptions = db_url
        .parse()
        .map_err(|e| AppError::Database(format!("无法解析 MaiBot 数据库路径: {}", e)))?;
    let pool = sqlx::SqlitePool::connect_with(options)
        .await
        .map_err(|e| AppError::Database(format!("无法连接 MaiBot 数据库: {}", e)))?;

    // hour_ts -> (message_count, reply_count),按 hour_ts 合并两表桶聚合结果
    let mut buckets: HashMap<String, (i64, i64)> = HashMap::new();

    let msg_table: Option<(String,)> =
        sqlx::query_as("SELECT name FROM sqlite_master WHERE type='table' AND name='mai_messages'")
            .fetch_optional(&pool)
            .await?;
    if msg_table.is_some() {
        let rows = sqlx::query(
            "SELECT strftime('%Y-%m-%d %H:00:00', timestamp) AS hour_ts, COUNT(*) AS cnt \
             FROM mai_messages WHERE timestamp >= ? AND timestamp <= ? \
             GROUP BY hour_ts",
        )
        .bind(start)
        .bind(end)
        .fetch_all(&pool)
        .await?;
        for row in &rows {
            let hour_ts: String = row.try_get("hour_ts").unwrap_or_default();
            if hour_ts.is_empty() {
                continue;
            }
            let cnt: i64 = row.try_get("cnt").unwrap_or(0);
            buckets.entry(hour_ts).or_insert((0, 0)).0 += cnt;
        }
    }

    let tool_table: Option<(String,)> =
        sqlx::query_as("SELECT name FROM sqlite_master WHERE type='table' AND name='tool_records'")
            .fetch_optional(&pool)
            .await?;
    if tool_table.is_some() {
        let rows = sqlx::query(
            "SELECT strftime('%Y-%m-%d %H:00:00', timestamp) AS hour_ts, COUNT(*) AS cnt \
             FROM tool_records WHERE timestamp >= ? AND timestamp <= ? AND tool_name = 'reply' \
             GROUP BY hour_ts",
        )
        .bind(start)
        .bind(end)
        .fetch_all(&pool)
        .await?;
        for row in &rows {
            let hour_ts: String = row.try_get("hour_ts").unwrap_or_default();
            if hour_ts.is_empty() {
                continue;
            }
            let cnt: i64 = row.try_get("cnt").unwrap_or(0);
            buckets.entry(hour_ts).or_insert((0, 0)).1 += cnt;
        }
    }

    pool.close().await;

    let mut result: Vec<HourlyMessageCount> = buckets
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

/// 按天聚合单实例 llm_usage 的请求数/花费/token(仪表盘"日粒度"卡供数,P2-29)。
///
/// 口径与 query_hourly_message_count 一致:llm_usage 表不存在时安全返回空 Vec,
/// 而非报错(兼容尚未产生 LLM 调用记录的实例数据库)。结果按 date 升序。
pub async fn query_daily_stats(
    db_path: &Path,
    start: &str,
    end: &str,
) -> AppResult<Vec<DailyStatsPoint>> {
    let db_url = format!("sqlite:{}?mode=ro", db_path.display());
    let options: SqliteConnectOptions = db_url
        .parse()
        .map_err(|e| AppError::Database(format!("无法解析 MaiBot 数据库路径: {}", e)))?;
    let pool = sqlx::SqlitePool::connect_with(options)
        .await
        .map_err(|e| AppError::Database(format!("无法连接 MaiBot 数据库: {}", e)))?;

    let table: Option<(String,)> =
        sqlx::query_as("SELECT name FROM sqlite_master WHERE type='table' AND name='llm_usage'")
            .fetch_optional(&pool)
            .await?;
    if table.is_none() {
        pool.close().await;
        return Ok(Vec::new());
    }

    let rows = sqlx::query(
        "SELECT strftime('%Y-%m-%d', timestamp) AS date, COUNT(*) AS cnt, \
         COALESCE(SUM(cost), 0.0) AS day_cost, COALESCE(SUM(total_tokens), 0) AS day_tokens \
         FROM llm_usage WHERE timestamp >= ? AND timestamp <= ? GROUP BY date",
    )
    .bind(start)
    .bind(end)
    .fetch_all(&pool)
    .await?;
    pool.close().await;

    let mut result: Vec<DailyStatsPoint> = rows
        .iter()
        .filter_map(|row| {
            let date: String = row.try_get("date").unwrap_or_default();
            if date.is_empty() {
                return None;
            }
            Some(DailyStatsPoint {
                date,
                requests: row.try_get("cnt").unwrap_or(0),
                cost: row.try_get("day_cost").unwrap_or(0.0),
                tokens: row.try_get("day_tokens").unwrap_or(0),
            })
        })
        .collect();
    result.sort_by(|a, b| a.date.cmp(&b.date));
    Ok(result)
}

/// 取单实例最近 `limit` 条 LLM 调用活动(仪表盘"最近活动流"卡供数,P2-29)。
///
/// 附带调用方传入的 instance_id/instance_name(单实例数据库本身不含这两个字段),
/// 供命令层跨实例合并后仍可区分来源。llm_usage 表不存在时返回空 Vec。
pub async fn query_recent_activity(
    db_path: &Path,
    instance_id: &str,
    instance_name: &str,
    limit: i64,
) -> AppResult<Vec<RecentActivityItem>> {
    let db_url = format!("sqlite:{}?mode=ro", db_path.display());
    let options: SqliteConnectOptions = db_url
        .parse()
        .map_err(|e| AppError::Database(format!("无法解析 MaiBot 数据库路径: {}", e)))?;
    let pool = sqlx::SqlitePool::connect_with(options)
        .await
        .map_err(|e| AppError::Database(format!("无法连接 MaiBot 数据库: {}", e)))?;

    let table: Option<(String,)> =
        sqlx::query_as("SELECT name FROM sqlite_master WHERE type='table' AND name='llm_usage'")
            .fetch_optional(&pool)
            .await?;
    if table.is_none() {
        pool.close().await;
        return Ok(Vec::new());
    }

    let rows = sqlx::query(
        "SELECT timestamp, model_name, model_assign_name, request_type, total_tokens, cost, time_cost \
         FROM llm_usage ORDER BY timestamp DESC LIMIT ?",
    )
    .bind(limit)
    .fetch_all(&pool)
    .await?;
    pool.close().await;

    Ok(rows
        .iter()
        .map(|row| {
            let model_name: String = row.try_get("model_name").unwrap_or_default();
            let display_name: Option<String> = row
                .try_get::<String, _>("model_assign_name")
                .ok()
                .filter(|s| !s.is_empty());
            let model = display_name.or(if model_name.is_empty() {
                None
            } else {
                Some(model_name)
            });
            RecentActivityItem {
                timestamp: row.try_get("timestamp").unwrap_or_default(),
                instance_id: instance_id.to_string(),
                instance_name: instance_name.to_string(),
                model,
                request_type: row
                    .try_get("request_type")
                    .unwrap_or_else(|_| "unknown".into()),
                tokens: row.try_get("total_tokens").unwrap_or(0),
                cost: row.try_get("cost").unwrap_or(0.0),
                time_cost: row.try_get("time_cost").unwrap_or(0.0),
            }
        })
        .collect())
}

/// query_llm_usage 按模型聚合的累加值:
/// (展示名, 请求数, 总 token, 输入 token, 输出 token, 累计花费, 累计耗时)
type ModelAccumulator = (Option<String>, i64, i64, i64, i64, f64, f64);

/// 查询 MaiBot 数据库的 LLM 使用统计
async fn query_llm_usage(
    db_path: &Path,
    start_time: &str,
    end_time: &str,
) -> AppResult<(StatsSummary, Vec<ModelStats>, Vec<RequestTypeStats>)> {
    let db_url = format!("sqlite:{}?mode=ro", db_path.display());
    let options: SqliteConnectOptions = db_url
        .parse()
        .map_err(|e| AppError::Database(format!("无法解析 MaiBot 数据库路径: {}", e)))?;

    let pool = sqlx::SqlitePool::connect_with(options)
        .await
        .map_err(|e| AppError::Database(format!("无法连接 MaiBot 数据库: {}", e)))?;

    // 检查 llm_usage 表是否存在
    let table_check: Option<(String,)> =
        sqlx::query_as("SELECT name FROM sqlite_master WHERE type='table' AND name='llm_usage'")
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
         FROM llm_usage WHERE timestamp >= ? AND timestamp <= ?",
    )
    .bind(start_time)
    .bind(end_time)
    .fetch_all(&pool)
    .await?;

    let mut summary = StatsSummary::default();
    let mut model_map: HashMap<String, ModelAccumulator> = HashMap::new();
    let mut type_map: HashMap<String, (i64, i64, f64)> = HashMap::new();
    let mut total_time = 0.0f64;

    for row in &rows {
        let model_name: String = row.try_get("model_name").unwrap_or_default();
        let display_name: Option<String> = row.try_get("model_assign_name").ok();
        let request_type: String = row
            .try_get("request_type")
            .unwrap_or_else(|_| "unknown".into());
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

        let entry =
            model_map
                .entry(model_name)
                .or_insert((display_name.clone(), 0, 0, 0, 0, 0.0, 0.0));
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
        summary.avg_response_time =
            (total_time / summary.total_requests as f64 * 1000.0).round() / 1000.0;
    }
    summary.total_cost = (summary.total_cost * 10000.0).round() / 10000.0;

    // 查询消息数
    let (total_messages, total_replies) = count_messages(&pool, start_time, end_time).await;
    summary.total_messages = total_messages;
    summary.total_replies = total_replies;

    pool.close().await;

    let mut model_stats: Vec<ModelStats> = model_map
        .into_iter()
        .map(|(name, (dn, cnt, tok, inp, out, cost, time))| ModelStats {
            model_name: name,
            display_name: dn,
            request_count: cnt,
            total_tokens: tok,
            input_tokens: inp,
            output_tokens: out,
            total_cost: (cost * 10000.0).round() / 10000.0,
            avg_response_time: if cnt > 0 {
                (time / cnt as f64 * 1000.0).round() / 1000.0
            } else {
                0.0
            },
        })
        .collect();
    model_stats.sort_by_key(|b| std::cmp::Reverse(b.request_count));

    let mut request_type_stats: Vec<RequestTypeStats> = type_map
        .into_iter()
        .map(|(rt, (cnt, tok, cost))| RequestTypeStats {
            request_type: rt,
            request_count: cnt,
            total_tokens: tok,
            total_cost: (cost * 10000.0).round() / 10000.0,
        })
        .collect();
    request_type_stats.sort_by_key(|b| std::cmp::Reverse(b.request_count));

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
        "SELECT id, name, instance_path, status, run_time, last_run FROM instances WHERE id = ?",
    )
    .bind(instance_id)
    .fetch_optional(pool)
    .await?;

    let instance = match instance {
        Some(i) => i,
        None => return Ok(None),
    };

    let online_time =
        get_instance_online_time(&instance.status, instance.run_time, instance.last_run);
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
        summary.tokens_per_hour =
            (summary.total_tokens as f64 / effective_hours * 10.0).round() / 10.0;
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
                let entry = all_models
                    .entry(ms.model_name.clone())
                    .or_insert(ModelStats {
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
    top_models.sort_by_key(|b| std::cmp::Reverse(b.request_count));
    top_models.truncate(5);

    let now_str = Local::now()
        .naive_local()
        .format("%Y-%m-%dT%H:%M:%S")
        .to_string();

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
                let entry = all_models
                    .entry(ms.model_name.clone())
                    .or_insert(ModelStats {
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
    model_stats.sort_by_key(|b| std::cmp::Reverse(b.request_count));

    let now_str = Local::now()
        .naive_local()
        .format("%Y-%m-%dT%H:%M:%S")
        .to_string();

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

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;

    /// 构造一个仅含 mai_messages 表的内存数据库，列布局对齐 MaiBot 真实 schema
    /// （timestamp 为 DateTime 字符串，reply_to 可空）。
    async fn setup_messages_db() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("创建内存数据库失败");
        sqlx::query(
            "CREATE TABLE mai_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id VARCHAR(255) NOT NULL,
                timestamp DATETIME NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                reply_to VARCHAR(255)
            )",
        )
        .execute(&pool)
        .await
        .expect("建表失败");
        sqlx::query(
            "CREATE TABLE tool_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tool_id VARCHAR(255),
                timestamp DATETIME NOT NULL,
                tool_name VARCHAR(255) NOT NULL
            )",
        )
        .execute(&pool)
        .await
        .expect("建 tool_records 表失败");
        pool
    }

    async fn insert_message(
        pool: &SqlitePool,
        message_id: &str,
        timestamp: &str,
        reply_to: Option<&str>,
    ) {
        sqlx::query(
            "INSERT INTO mai_messages (message_id, timestamp, user_id, reply_to) VALUES (?, ?, ?, ?)"
        )
        .bind(message_id)
        .bind(timestamp)
        .bind("u1")
        .bind(reply_to)
        .execute(pool)
        .await
        .expect("插入消息失败");
    }

    async fn insert_tool_record(pool: &SqlitePool, timestamp: &str, tool_name: &str) {
        sqlx::query("INSERT INTO tool_records (timestamp, tool_name) VALUES (?, ?)")
            .bind(timestamp)
            .bind(tool_name)
            .execute(pool)
            .await
            .expect("插入工具记录失败");
    }

    #[tokio::test]
    async fn count_messages_filters_by_timestamp_window_and_counts_replies() {
        let pool = setup_messages_db().await;
        // 窗口内：3 条消息
        insert_message(&pool, "m1", "2026-06-03 10:00:00", None).await;
        insert_message(&pool, "m2", "2026-06-03 10:30:00", None).await;
        insert_message(&pool, "m3", "2026-06-03 11:00:00", None).await;
        // 窗口外（早于起点 / 晚于终点）：均不应计入
        insert_message(&pool, "m0", "2026-06-03 09:59:59", None).await;
        insert_message(&pool, "m4", "2026-06-03 12:00:01", None).await;
        // 回复=tool_records.tool_name='reply'：窗口内 2 条 reply、1 条非 reply、窗口外 1 条 reply
        insert_tool_record(&pool, "2026-06-03 10:15:00", "reply").await;
        insert_tool_record(&pool, "2026-06-03 11:30:00", "reply").await;
        insert_tool_record(&pool, "2026-06-03 10:45:00", "no_action").await;
        insert_tool_record(&pool, "2026-06-03 09:00:00", "reply").await;

        let (total, replies) =
            count_messages(&pool, "2026-06-03 10:00:00", "2026-06-03 12:00:00").await;

        assert_eq!(total, 3, "仅应统计 timestamp 落在区间内的消息");
        assert_eq!(
            replies, 2,
            "回复仅统计窗口内 tool_records.tool_name='reply'"
        );
    }

    #[tokio::test]
    async fn count_messages_boundaries_are_inclusive() {
        let pool = setup_messages_db().await;
        // 恰好落在区间两端，闭区间应计入
        insert_message(&pool, "start", "2026-06-03 10:00:00", None).await;
        insert_message(&pool, "end", "2026-06-03 12:00:00", None).await;
        // 边界处的 reply 工具记录(取终点端验证闭区间)
        insert_tool_record(&pool, "2026-06-03 12:00:00", "reply").await;

        let (total, replies) =
            count_messages(&pool, "2026-06-03 10:00:00", "2026-06-03 12:00:00").await;

        assert_eq!(total, 2, ">= 与 <= 边界应包含端点消息");
        assert_eq!(replies, 1, "边界处的 reply 工具记录应计入");
    }

    #[tokio::test]
    async fn count_messages_returns_zero_when_table_absent() {
        // 不创建 mai_messages 表，模拟旧表名/空库场景：应安全返回 (0, 0)
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("创建内存数据库失败");
        // 仅存在旧表名 messages，新查询应因 mai_messages 缺失而返回零值
        sqlx::query("CREATE TABLE messages (id INTEGER PRIMARY KEY, time REAL)")
            .execute(&pool)
            .await
            .expect("建表失败");

        let (total, replies) =
            count_messages(&pool, "2026-06-03 10:00:00", "2026-06-03 12:00:00").await;

        assert_eq!(total, 0, "mai_messages 不存在时不应回落到旧 messages 表");
        assert_eq!(replies, 0);
    }

    #[test]
    fn time_range_to_hours_maps_known_ranges() {
        assert_eq!(time_range_to_hours("1h"), 1.0);
        assert_eq!(time_range_to_hours("24h"), 24.0);
        assert_eq!(time_range_to_hours("7d"), 168.0);
        assert_eq!(time_range_to_hours("30d"), 720.0);
        // 未知取值回落到 24 小时
        assert_eq!(time_range_to_hours("unknown"), 24.0);
    }

    /// query_daily_stats / query_recent_activity 按文件路径打开数据库(供多连接场景复用),
    /// 内存库 "sqlite::memory:" 每条连接各自独立、无法跨连接共享，须落地到临时文件。
    async fn setup_llm_usage_db(dir: &std::path::Path) -> PathBuf {
        let db_path = dir.join("MaiBot.db");
        let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
        let pool = SqlitePool::connect(&db_url)
            .await
            .expect("创建文件数据库失败");
        sqlx::query(
            "CREATE TABLE llm_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_name VARCHAR(255) NOT NULL,
                model_assign_name VARCHAR(255),
                request_type VARCHAR(255) NOT NULL,
                prompt_tokens INTEGER NOT NULL DEFAULT 0,
                completion_tokens INTEGER NOT NULL DEFAULT 0,
                total_tokens INTEGER NOT NULL DEFAULT 0,
                cost REAL NOT NULL DEFAULT 0.0,
                time_cost REAL NOT NULL DEFAULT 0.0,
                timestamp DATETIME NOT NULL
            )",
        )
        .execute(&pool)
        .await
        .expect("建 llm_usage 表失败");
        pool.close().await;
        db_path
    }

    #[allow(clippy::too_many_arguments)]
    async fn insert_llm_usage(
        db_path: &Path,
        model_name: &str,
        model_assign_name: Option<&str>,
        request_type: &str,
        total_tokens: i64,
        cost: f64,
        time_cost: f64,
        timestamp: &str,
    ) {
        let db_url = format!("sqlite:{}?mode=rw", db_path.display());
        let pool = SqlitePool::connect(&db_url)
            .await
            .expect("连接文件数据库失败");
        sqlx::query(
            "INSERT INTO llm_usage \
             (model_name, model_assign_name, request_type, prompt_tokens, completion_tokens, \
              total_tokens, cost, time_cost, timestamp) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(model_name)
        .bind(model_assign_name)
        .bind(request_type)
        .bind(total_tokens / 2)
        .bind(total_tokens - total_tokens / 2)
        .bind(total_tokens)
        .bind(cost)
        .bind(time_cost)
        .bind(timestamp)
        .execute(&pool)
        .await
        .expect("插入 llm_usage 失败");
        pool.close().await;
    }

    #[tokio::test]
    async fn query_daily_stats_groups_by_date_and_sums_cost_tokens() {
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let db_path = setup_llm_usage_db(dir.path()).await;

        // 同一天两条、次日一条、窗口外一条(不应计入)
        insert_llm_usage(
            &db_path,
            "gpt-4",
            None,
            "chat",
            100,
            0.01,
            0.5,
            "2026-06-03 09:00:00",
        )
        .await;
        insert_llm_usage(
            &db_path,
            "gpt-4",
            None,
            "chat",
            200,
            0.02,
            0.5,
            "2026-06-03 15:00:00",
        )
        .await;
        insert_llm_usage(
            &db_path,
            "gpt-4",
            None,
            "chat",
            50,
            0.005,
            0.5,
            "2026-06-04 08:00:00",
        )
        .await;
        insert_llm_usage(
            &db_path,
            "gpt-4",
            None,
            "chat",
            9999,
            9.99,
            0.5,
            "2026-05-01 00:00:00",
        )
        .await;

        let points = query_daily_stats(&db_path, "2026-06-03 00:00:00", "2026-06-04 23:59:59")
            .await
            .expect("查询日粒度统计失败");

        assert_eq!(points.len(), 2, "应仅产出窗口内的两天");
        assert_eq!(points[0].date, "2026-06-03");
        assert_eq!(points[0].requests, 2);
        assert_eq!(points[0].tokens, 300);
        assert!((points[0].cost - 0.03).abs() < 1e-9);
        assert_eq!(points[1].date, "2026-06-04");
        assert_eq!(points[1].requests, 1);
        assert_eq!(points[1].tokens, 50);
    }

    #[tokio::test]
    async fn query_daily_stats_returns_empty_when_table_absent() {
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let db_path = dir.path().join("empty.db");
        let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
        let pool = SqlitePool::connect(&db_url)
            .await
            .expect("创建空数据库失败");
        pool.close().await;

        let points = query_daily_stats(&db_path, "2026-06-03 00:00:00", "2026-06-04 23:59:59")
            .await
            .expect("llm_usage 表缺失时不应报错");
        assert!(points.is_empty());
    }

    #[tokio::test]
    async fn query_recent_activity_orders_desc_and_respects_limit() {
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let db_path = setup_llm_usage_db(dir.path()).await;

        insert_llm_usage(
            &db_path,
            "gpt-4",
            Some("主模型"),
            "chat",
            100,
            0.01,
            0.5,
            "2026-06-03 09:00:00",
        )
        .await;
        insert_llm_usage(
            &db_path,
            "gpt-4",
            Some("主模型"),
            "chat",
            200,
            0.02,
            0.6,
            "2026-06-03 11:00:00",
        )
        .await;
        insert_llm_usage(
            &db_path,
            "gpt-3.5",
            None,
            "tool",
            50,
            0.005,
            0.2,
            "2026-06-03 10:00:00",
        )
        .await;

        let items = query_recent_activity(&db_path, "inst-1", "实例A", 2)
            .await
            .expect("查询最近活动失败");

        assert_eq!(items.len(), 2, "limit=2 应仅返回最新两条");
        assert_eq!(items[0].timestamp, "2026-06-03 11:00:00");
        assert_eq!(items[0].model.as_deref(), Some("主模型"));
        assert_eq!(items[0].instance_id, "inst-1");
        assert_eq!(items[0].instance_name, "实例A");
        assert_eq!(items[1].timestamp, "2026-06-03 10:00:00");
        // model_assign_name 为空时应回退到 model_name
        assert_eq!(items[1].model.as_deref(), Some("gpt-3.5"));
    }

    #[tokio::test]
    async fn query_recent_activity_returns_empty_when_table_absent() {
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let db_path = dir.path().join("empty2.db");
        let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
        let pool = SqlitePool::connect(&db_url)
            .await
            .expect("创建空数据库失败");
        pool.close().await;

        let items = query_recent_activity(&db_path, "inst-1", "实例A", 10)
            .await
            .expect("llm_usage 表缺失时不应报错");
        assert!(items.is_empty());
    }
}
