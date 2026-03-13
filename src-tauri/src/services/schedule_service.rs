/// 计划任务服务
///
/// 提供计划任务的 CRUD 操作，数据存储在 schedule_tasks 表中。
/// Phase 1 仅实现基础 CRUD，实际调度执行将在后续阶段通过 tokio 定时器实现。
use chrono::Local;
use sqlx::SqlitePool;
use tracing::info;
use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::models::ScheduleTask;

/// 生成计划任务 ID
fn generate_task_id() -> String {
    let hex = Uuid::new_v4().to_string().replace("-", "");
    format!("task_{}", &hex[..12])
}

/// 获取计划任务列表（可按实例过滤）
pub async fn get_schedules(pool: &SqlitePool, instance_id: Option<&str>) -> AppResult<Vec<ScheduleTask>> {
    let tasks = if let Some(iid) = instance_id {
        sqlx::query_as::<_, ScheduleTask>(
            "SELECT * FROM schedule_tasks WHERE instance_id = ? ORDER BY created_at DESC"
        )
        .bind(iid)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, ScheduleTask>(
            "SELECT * FROM schedule_tasks ORDER BY created_at DESC"
        )
        .fetch_all(pool)
        .await?
    };
    Ok(tasks)
}

/// 获取单个计划任务
pub async fn get_schedule(pool: &SqlitePool, schedule_id: &str) -> AppResult<ScheduleTask> {
    sqlx::query_as::<_, ScheduleTask>("SELECT * FROM schedule_tasks WHERE id = ?")
        .bind(schedule_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("计划任务不存在: {}", schedule_id)))
}

/// 创建计划任务
pub async fn create_schedule(
    pool: &SqlitePool,
    instance_id: &str,
    name: &str,
    action: &str,
    schedule_type: &str,
    schedule_config: &str,
    enabled: bool,
) -> AppResult<ScheduleTask> {
    // 验证实例存在
    let instance_exists: Option<(String,)> =
        sqlx::query_as("SELECT id FROM instances WHERE id = ?")
            .bind(instance_id)
            .fetch_optional(pool)
            .await?;
    if instance_exists.is_none() {
        return Err(AppError::NotFound(format!("实例不存在: {}", instance_id)));
    }

    let id = generate_task_id();
    let now = Local::now().naive_local();

    sqlx::query(
        "INSERT INTO schedule_tasks (id, instance_id, name, action, schedule_type, schedule_config, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(instance_id)
    .bind(name)
    .bind(action)
    .bind(schedule_type)
    .bind(schedule_config)
    .bind(enabled)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    info!("[计划任务] 已创建: {} ({})", name, id);
    get_schedule(pool, &id).await
}

/// 更新计划任务
pub async fn update_schedule(
    pool: &SqlitePool,
    schedule_id: &str,
    name: Option<&str>,
    action: Option<&str>,
    schedule_type: Option<&str>,
    schedule_config: Option<&str>,
    enabled: Option<bool>,
) -> AppResult<ScheduleTask> {
    // 验证任务存在
    let _existing = get_schedule(pool, schedule_id).await?;
    let now = Local::now().naive_local();

    // 动态构建更新语句
    let mut sets = vec!["updated_at = ?".to_string()];
    let mut params: Vec<String> = vec![now.to_string()];

    if let Some(v) = name {
        sets.push("name = ?".to_string());
        params.push(v.to_string());
    }
    if let Some(v) = action {
        sets.push("action = ?".to_string());
        params.push(v.to_string());
    }
    if let Some(v) = schedule_type {
        sets.push("schedule_type = ?".to_string());
        params.push(v.to_string());
    }
    if let Some(v) = schedule_config {
        sets.push("schedule_config = ?".to_string());
        params.push(v.to_string());
    }
    if let Some(v) = enabled {
        sets.push("enabled = ?".to_string());
        params.push(if v { "1".to_string() } else { "0".to_string() });
    }

    let sql = format!("UPDATE schedule_tasks SET {} WHERE id = ?", sets.join(", "));
    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(schedule_id);
    query.execute(pool).await?;

    info!("[计划任务] 已更新: {}", schedule_id);
    get_schedule(pool, schedule_id).await
}

/// 删除计划任务
pub async fn delete_schedule(pool: &SqlitePool, schedule_id: &str) -> AppResult<()> {
    let result = sqlx::query("DELETE FROM schedule_tasks WHERE id = ?")
        .bind(schedule_id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("计划任务不存在: {}", schedule_id)));
    }

    info!("[计划任务] 已删除: {}", schedule_id);
    Ok(())
}

/// 切换计划任务启用状态
pub async fn toggle_schedule(pool: &SqlitePool, schedule_id: &str, enabled: bool) -> AppResult<ScheduleTask> {
    let now = Local::now().naive_local();

    let result = sqlx::query(
        "UPDATE schedule_tasks SET enabled = ?, updated_at = ? WHERE id = ?"
    )
    .bind(enabled)
    .bind(now)
    .bind(schedule_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("计划任务不存在: {}", schedule_id)));
    }

    info!("[计划任务] {} 已{}", schedule_id, if enabled { "启用" } else { "禁用" });
    get_schedule(pool, schedule_id).await
}
