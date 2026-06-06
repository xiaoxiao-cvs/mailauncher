//! 计划任务执行器
//!
//! 在后台 tokio 任务中按固定 tick 轮询启用的计划任务,到点即经
//! `commands::process` 触发 start/stop/restart。
//!
//! 触发去重策略(复用 schedule_tasks 表已有的 last_run 列做持久化):
//! - once: 触发后置 enabled=false 持久化,重启不再触发;启动时若已过期则补触发一次再禁用。
//! - daily/weekly: 以 last_run 的日期做当日去重(跨重启仍生效);并要求"今日计划时刻 >= 执行器
//!   启动时刻"才触发,避免应用在计划时刻之后才启动导致的晚点补触发(关机期间错过的视为跳过)。
//! - monitor: 暂无 UI 与语义,跳过(不臆造行为)。

use chrono::{DateTime, Datelike, Local, TimeZone, Utc};
use serde_json::Value;
use tauri::{AppHandle, Manager};
use tracing::{error, info, warn};

use crate::commands::process;
use crate::errors::AppResult;
use crate::models::ScheduleTask;
use crate::services::schedule_service;
use crate::state::AppState;

/// 轮询间隔(秒)
const TICK_SECS: u64 = 60;

/// 单个任务的触发判定结果
#[derive(Debug, PartialEq, Eq)]
enum DueDecision {
    /// 本 tick 不触发
    Skip,
    /// 一次性任务触发(触发后需禁用)
    FireOnce,
    /// 周期任务触发(触发后需写 last_run)
    FireRecurring,
}

/// 启动计划任务执行器后台循环
pub fn spawn_scheduler(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let started_at = Local::now();

        let mut ticker = tokio::time::interval(std::time::Duration::from_secs(TICK_SECS));
        info!("[计划任务] 执行器已启动,tick={}s", TICK_SECS);

        loop {
            ticker.tick().await;

            // 克隆 pool,避免把 State 跨 await 借用 AppHandle
            let pool = {
                let state = app_handle.state::<AppState>();
                state.db.clone()
            };

            let schedules = match schedule_service::get_schedules(&pool, None).await {
                Ok(s) => s,
                Err(e) => {
                    error!("[计划任务] 读取任务失败: {}", e);
                    continue;
                }
            };

            let now_local = Local::now();
            let now_utc = Utc::now();

            for task in schedules {
                if !task.enabled {
                    continue;
                }

                match evaluate_due(&task, now_local, now_utc, started_at) {
                    DueDecision::Skip => {}
                    DueDecision::FireRecurring => {
                        info!(
                            "[计划任务] 触发 {} ({} -> {})",
                            task.name, task.action, task.instance_id
                        );
                        if let Err(e) = fire(&app_handle, &task.action, &task.instance_id).await {
                            error!("[计划任务] {} 执行失败: {}", task.name, e);
                        }
                        if let Err(e) = schedule_service::mark_last_run(
                            &pool,
                            &task.id,
                            now_local.naive_local(),
                        )
                        .await
                        {
                            error!("[计划任务] 记录 last_run {} 失败: {}", task.id, e);
                        }
                    }
                    DueDecision::FireOnce => {
                        info!(
                            "[计划任务] 触发一次性 {} ({} -> {})",
                            task.name, task.action, task.instance_id
                        );
                        if let Err(e) = fire(&app_handle, &task.action, &task.instance_id).await {
                            error!("[计划任务] {} 执行失败: {}", task.name, e);
                        }
                        let _ = schedule_service::mark_last_run(
                            &pool,
                            &task.id,
                            now_local.naive_local(),
                        )
                        .await;
                        // 一次性任务无论成败都禁用,避免重启后重复补触发
                        if let Err(e) =
                            schedule_service::toggle_schedule(&pool, &task.id, false).await
                        {
                            error!("[计划任务] 禁用一次性任务 {} 失败: {}", task.id, e);
                        }
                    }
                }
            }
        }
    });
}

/// 计算某任务在当前时刻是否应触发(纯函数,便于单测)
fn evaluate_due(
    task: &ScheduleTask,
    now_local: DateTime<Local>,
    now_utc: DateTime<Utc>,
    started_at: DateTime<Local>,
) -> DueDecision {
    let config: Value = serde_json::from_str(&task.schedule_config).unwrap_or(Value::Null);

    match task.schedule_type.as_str() {
        "once" => {
            let Some(date_str) = config.get("date").and_then(|v| v.as_str()) else {
                return DueDecision::Skip;
            };
            match DateTime::parse_from_rfc3339(date_str) {
                Ok(scheduled) if now_utc >= scheduled.with_timezone(&Utc) => DueDecision::FireOnce,
                _ => DueDecision::Skip,
            }
        }
        "daily" => {
            if fired_today(task, now_local) {
                return DueDecision::Skip;
            }
            let Some((h, m)) = read_hm(&config) else {
                return DueDecision::Skip;
            };
            decide_recurring(now_local, started_at, h, m)
        }
        "weekly" => {
            if fired_today(task, now_local) {
                return DueDecision::Skip;
            }
            // 前端 weekdays 约定: 0=周一 .. 6=周日,对齐 chrono num_days_from_monday
            let wd = now_local.weekday().num_days_from_monday() as u64;
            let matches_day = config
                .get("weekdays")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().any(|x| x.as_u64() == Some(wd)))
                .unwrap_or(false);
            if !matches_day {
                return DueDecision::Skip;
            }
            let Some((h, m)) = read_hm(&config) else {
                return DueDecision::Skip;
            };
            decide_recurring(now_local, started_at, h, m)
        }
        "monitor" => DueDecision::Skip,
        other => {
            warn!("[计划任务] 未知调度类型: {} (任务 {})", other, task.id);
            DueDecision::Skip
        }
    }
}

/// last_run 落在今天则视为今日已触发(跨重启去重)
fn fired_today(task: &ScheduleTask, now_local: DateTime<Local>) -> bool {
    task.last_run.map(|lr| lr.date()) == Some(now_local.naive_local().date())
}

/// 周期任务:今日计划时刻已到、且该时刻不早于执行器启动时刻则触发
fn decide_recurring(
    now_local: DateTime<Local>,
    started_at: DateTime<Local>,
    hour: u32,
    minute: u32,
) -> DueDecision {
    match scheduled_today(now_local, hour, minute) {
        Some(scheduled) if now_local >= scheduled && scheduled >= started_at => {
            DueDecision::FireRecurring
        }
        _ => DueDecision::Skip,
    }
}

/// 从配置读取 hour/minute(越界视为无效)
fn read_hm(config: &Value) -> Option<(u32, u32)> {
    let h = config.get("hour").and_then(|v| v.as_u64())?;
    let m = config.get("minute").and_then(|v| v.as_u64())?;
    if h > 23 || m > 59 {
        return None;
    }
    Some((h as u32, m as u32))
}

/// 构造"今天的 h:m"对应的本地时刻
fn scheduled_today(now_local: DateTime<Local>, hour: u32, minute: u32) -> Option<DateTime<Local>> {
    let naive = now_local.date_naive().and_hms_opt(hour, minute, 0)?;
    match Local.from_local_datetime(&naive) {
        chrono::LocalResult::Single(dt) => Some(dt),
        chrono::LocalResult::Ambiguous(dt, _) => Some(dt),
        chrono::LocalResult::None => None,
    }
}

/// 执行实例动作,复用 process 命令层(单一事实来源)
async fn fire(app_handle: &AppHandle, action: &str, instance_id: &str) -> AppResult<()> {
    let state = app_handle.state::<AppState>();
    match action {
        "start" => {
            process::start_instance(app_handle.clone(), state, instance_id.to_string()).await?;
        }
        "stop" => {
            process::stop_instance(state, instance_id.to_string()).await?;
        }
        "restart" => {
            process::restart_instance(app_handle.clone(), state, instance_id.to_string()).await?;
        }
        other => {
            warn!("[计划任务] 未知动作: {}", other);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{NaiveDate, NaiveDateTime};

    fn epoch() -> NaiveDateTime {
        NaiveDate::from_ymd_opt(2026, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap()
    }

    fn task_with(
        schedule_type: &str,
        config: serde_json::Value,
        last_run: Option<NaiveDateTime>,
    ) -> ScheduleTask {
        ScheduleTask {
            id: "task_test".to_string(),
            instance_id: "inst_test".to_string(),
            name: "测试任务".to_string(),
            action: "start".to_string(),
            schedule_type: schedule_type.to_string(),
            schedule_config: config.to_string(),
            enabled: true,
            last_run,
            next_run: None,
            created_at: epoch(),
            updated_at: epoch(),
        }
    }

    fn local(y: i32, mo: u32, d: u32, h: u32, mi: u32) -> DateTime<Local> {
        Local.with_ymd_and_hms(y, mo, d, h, mi, 0).single().unwrap()
    }

    #[test]
    fn once_past_fires() {
        let t = task_with(
            "once",
            serde_json::json!({ "date": "2026-06-06T12:00:00.000Z" }),
            None,
        );
        let now_utc = Utc.with_ymd_and_hms(2026, 6, 6, 12, 0, 1).unwrap();
        let now_local = local(2026, 6, 6, 20, 0);
        let started = local(2026, 6, 6, 8, 0);
        assert_eq!(
            evaluate_due(&t, now_local, now_utc, started),
            DueDecision::FireOnce
        );
    }

    #[test]
    fn once_future_skips() {
        let t = task_with(
            "once",
            serde_json::json!({ "date": "2026-06-06T12:00:00.000Z" }),
            None,
        );
        let now_utc = Utc.with_ymd_and_hms(2026, 6, 6, 11, 59, 0).unwrap();
        let now_local = local(2026, 6, 6, 19, 59);
        let started = local(2026, 6, 6, 8, 0);
        assert_eq!(
            evaluate_due(&t, now_local, now_utc, started),
            DueDecision::Skip
        );
    }

    #[test]
    fn daily_due_and_after_start_fires() {
        let t = task_with(
            "daily",
            serde_json::json!({ "hour": 12, "minute": 30 }),
            None,
        );
        let now = local(2026, 6, 6, 12, 30);
        let started = local(2026, 6, 6, 8, 0);
        assert_eq!(
            evaluate_due(&t, now, Utc::now(), started),
            DueDecision::FireRecurring
        );
    }

    #[test]
    fn daily_already_fired_today_skips() {
        // last_run 落在今天 -> 当日去重
        let now = local(2026, 6, 6, 12, 31);
        let t = task_with(
            "daily",
            serde_json::json!({ "hour": 12, "minute": 30 }),
            Some(now.naive_local()),
        );
        let started = local(2026, 6, 6, 8, 0);
        assert_eq!(
            evaluate_due(&t, now, Utc::now(), started),
            DueDecision::Skip
        );
    }

    #[test]
    fn daily_fired_yesterday_fires_again() {
        let now = local(2026, 6, 6, 12, 30);
        let yesterday = local(2026, 6, 5, 12, 30).naive_local();
        let t = task_with(
            "daily",
            serde_json::json!({ "hour": 12, "minute": 30 }),
            Some(yesterday),
        );
        let started = local(2026, 6, 6, 8, 0);
        assert_eq!(
            evaluate_due(&t, now, Utc::now(), started),
            DueDecision::FireRecurring
        );
    }

    #[test]
    fn daily_before_scheduled_skips() {
        let t = task_with(
            "daily",
            serde_json::json!({ "hour": 12, "minute": 30 }),
            None,
        );
        let now = local(2026, 6, 6, 12, 29);
        let started = local(2026, 6, 6, 8, 0);
        assert_eq!(
            evaluate_due(&t, now, Utc::now(), started),
            DueDecision::Skip
        );
    }

    #[test]
    fn daily_scheduled_before_executor_start_skips() {
        // 执行器 15:00 才启动,而计划是 12:30 -> 当天不补触发(避免重启重复触发)
        let t = task_with(
            "daily",
            serde_json::json!({ "hour": 12, "minute": 30 }),
            None,
        );
        let now = local(2026, 6, 6, 15, 0);
        let started = local(2026, 6, 6, 15, 0);
        assert_eq!(
            evaluate_due(&t, now, Utc::now(), started),
            DueDecision::Skip
        );
    }

    #[test]
    fn weekly_matching_weekday_fires() {
        let now = local(2026, 6, 6, 12, 30);
        let wd = now.weekday().num_days_from_monday() as u64;
        let t = task_with(
            "weekly",
            serde_json::json!({ "hour": 12, "minute": 30, "weekdays": [wd] }),
            None,
        );
        let started = local(2026, 6, 6, 8, 0);
        assert_eq!(
            evaluate_due(&t, now, Utc::now(), started),
            DueDecision::FireRecurring
        );
    }

    #[test]
    fn weekly_non_matching_weekday_skips() {
        let now = local(2026, 6, 6, 12, 30);
        let wd = now.weekday().num_days_from_monday() as u64;
        let other_wd = (wd + 1) % 7;
        let t = task_with(
            "weekly",
            serde_json::json!({ "hour": 12, "minute": 30, "weekdays": [other_wd] }),
            None,
        );
        let started = local(2026, 6, 6, 8, 0);
        assert_eq!(
            evaluate_due(&t, now, Utc::now(), started),
            DueDecision::Skip
        );
    }

    #[test]
    fn monitor_and_unknown_skip() {
        let started = local(2026, 6, 6, 8, 0);
        let now = local(2026, 6, 6, 12, 30);
        assert_eq!(
            evaluate_due(
                &task_with("monitor", serde_json::json!({}), None),
                now,
                Utc::now(),
                started
            ),
            DueDecision::Skip
        );
        assert_eq!(
            evaluate_due(
                &task_with("bogus", serde_json::json!({}), None),
                now,
                Utc::now(),
                started
            ),
            DueDecision::Skip
        );
    }
}
