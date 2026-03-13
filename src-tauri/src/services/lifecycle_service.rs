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