use sqlx::SqlitePool;

use crate::components::ComponentRegistry;
use crate::errors::AppResult;
use crate::lifecycle::{aggregate_instance_status, collect_component_states};
use crate::models::{ComponentType, InstanceLifecycleStatus, RuntimeProfile};
use crate::services::process_service::ProcessManager;

pub async fn reconcile_instance_states_on_startup(pool: &SqlitePool) -> AppResult<u64> {
    let result = sqlx::query(
        r#"UPDATE instances
           SET status = 'unknown',
               last_status_reason = '应用重启后需要重新探测运行态',
               component_state = '[]',
               updated_at = datetime('now')
           WHERE status IN ('pending', 'starting', 'running', 'partial', 'stopping')"#,
    )
    .execute(pool)
    .await?;

    Ok(result.rows_affected())
}

pub async fn sync_instance_state(
    pool: &SqlitePool,
    process_manager: &ProcessManager,
    registry: &ComponentRegistry,
    instance_id: &str,
    instance_root: &std::path::Path,
    runtime_profile: &RuntimeProfile,
    last_error: Option<String>,
    last_status_reason: Option<String>,
) -> AppResult<InstanceLifecycleStatus> {
    let component_states = collect_component_states(process_manager, instance_id, registry, instance_root).await;
    let status = aggregate_instance_status(&component_states, last_error.as_deref());
    let component_state_json = serde_json::to_string(&component_states)?;
    let runtime_profile_json = serde_json::to_string(runtime_profile)?;

    sqlx::query(
        r#"UPDATE instances
           SET status = ?,
               runtime_profile = ?,
               last_error = ?,
               last_status_reason = ?,
               component_state = ?,
               updated_at = datetime('now')
           WHERE id = ?"#,
    )
    .bind(status.as_str())
    .bind(runtime_profile_json)
    .bind(last_error)
    .bind(last_status_reason)
    .bind(component_state_json)
    .bind(instance_id)
    .execute(pool)
    .await?;

    Ok(status)
}

pub fn available_components(
    registry: &ComponentRegistry,
    instance_root: &std::path::Path,
) -> Vec<ComponentType> {
    registry
        .available_for_path(instance_root)
        .into_iter()
        .map(|spec| spec.component)
        .collect()
}

#[cfg(test)]
mod tests {
    use sqlx::SqlitePool;

    use super::reconcile_instance_states_on_startup;

    #[tokio::test]
    async fn reconcile_marks_active_instances_unknown() {
        let pool = SqlitePool::connect("sqlite::memory:").await.expect("创建内存数据库失败");

        sqlx::query(
            r#"CREATE TABLE instances (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                last_status_reason TEXT,
                component_state TEXT,
                updated_at TEXT
            )"#,
        )
        .execute(&pool)
        .await
        .expect("建表失败");

        sqlx::query(
            r#"INSERT INTO instances (id, status, component_state) VALUES
                ('inst_running', 'running', '[1]'),
                ('inst_partial', 'partial', '[1]'),
                ('inst_stopped', 'stopped', '[1]')"#,
        )
        .execute(&pool)
        .await
        .expect("插入数据失败");

        let affected = reconcile_instance_states_on_startup(&pool)
            .await
            .expect("状态收敛失败");

        assert_eq!(affected, 2);

        let rows: Vec<(String, String, Option<String>, Option<String>)> = sqlx::query_as(
            "SELECT id, status, last_status_reason, component_state FROM instances ORDER BY id",
        )
        .fetch_all(&pool)
        .await
        .expect("查询失败");

        let partial = rows.iter().find(|row| row.0 == "inst_partial").expect("缺少 partial 实例");
        let running = rows.iter().find(|row| row.0 == "inst_running").expect("缺少 running 实例");
        let stopped = rows.iter().find(|row| row.0 == "inst_stopped").expect("缺少 stopped 实例");

        assert_eq!(partial.1, "unknown");
        assert_eq!(partial.2.as_deref(), Some("应用重启后需要重新探测运行态"));
        assert_eq!(partial.3.as_deref(), Some("[]"));
        assert_eq!(running.1, "unknown");
        assert_eq!(stopped.1, "stopped");
    }
}