use sqlx::SqlitePool;

use crate::components::ComponentRegistry;
use crate::errors::{AppError, AppResult};
use crate::lifecycle::{aggregate_instance_status, collect_component_states};
use crate::models::{
    ComponentLifecycleStatus, ComponentType, DbInstanceRecord, InstanceComponentState,
    InstanceLifecycleStatus, RuntimeKind, RuntimeProfile,
};
use crate::runtime::RuntimeResolver;
use crate::services::process_service::ProcessManager;
use crate::utils::platform;

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

pub async fn recover_instance_states_on_startup(
    pool: &SqlitePool,
    registry: &ComponentRegistry,
    runtime_resolver: &RuntimeResolver,
    process_manager: &ProcessManager,
) -> AppResult<u64> {
    let rows = sqlx::query_as::<_, DbInstanceRecord>("SELECT * FROM instances ORDER BY created_at DESC")
        .fetch_all(pool)
        .await?;

    let mut recovered = 0;

    for row in rows {
        if recover_single_instance_state(pool, registry, runtime_resolver, process_manager, row.into_instance()).await? {
            recovered += 1;
        }
    }

    Ok(recovered)
}

pub async fn refresh_instance_runtime_state(
    pool: &SqlitePool,
    registry: &ComponentRegistry,
    runtime_resolver: &RuntimeResolver,
    process_manager: &ProcessManager,
    instance_id: &str,
) -> AppResult<InstanceLifecycleStatus> {
    let row = sqlx::query_as::<_, DbInstanceRecord>("SELECT * FROM instances WHERE id = ?")
        .bind(instance_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;

    let instance = row.into_instance();
    let recovered = evaluate_recovered_instance_state(registry, runtime_resolver, &instance);
    let status = recovered.status;
    process_manager
        .sync_external_processes(
            &instance.id,
            &instance.runtime_profile,
            &recovered.available_components,
            &recovered.discovered_processes,
        )
        .await;
    persist_recovered_instance_state(pool, &instance, recovered).await?;
    Ok(status)
}

struct RecoveredInstanceState {
    status: InstanceLifecycleStatus,
    component_states: Vec<InstanceComponentState>,
    last_error: Option<String>,
    last_status_reason: Option<String>,
    discovered_processes: Vec<crate::runtime::DiscoveredRuntimeProcess>,
    available_components: Vec<ComponentType>,
}

fn evaluate_recovered_instance_state(
    registry: &ComponentRegistry,
    runtime_resolver: &RuntimeResolver,
    instance: &crate::models::Instance,
) -> RecoveredInstanceState {
    let instance_path_str = instance.instance_path.clone().unwrap_or_else(|| instance.name.clone());
    let instance_root = platform::get_instances_dir().join(&instance_path_str);
    let available = registry.available_for_path(&instance_root);
    let available_components = available.iter().map(|component| component.component).collect::<Vec<_>>();

    let mut last_error = instance.last_error.clone();
    let mut last_status_reason = instance.last_status_reason.clone();
    let mut discovered_processes = Vec::new();

    let component_states = match instance.runtime_profile.kind {
        RuntimeKind::Wsl2 => {
            let adapter = runtime_resolver.resolve(&instance.runtime_profile);
            match adapter.discover_processes(&instance.runtime_profile, &instance.id, &available) {
                Ok(discovered) => {
                    discovered_processes = discovered;
                    hydrate_discovered_component_states(
                        &available,
                        &discovered_processes,
                        instance.runtime_profile.kind,
                    )
                }
                Err(error) => {
                    last_error = Some(error.to_string());
                    last_status_reason = Some("WSL2 冷启动探测失败，保留 unknown 状态".to_string());
                    Vec::new()
                }
            }
        }
        RuntimeKind::Docker => {
            let adapter = runtime_resolver.resolve(&instance.runtime_profile);
            match adapter.discover_processes(&instance.runtime_profile, &instance.id, &available) {
                Ok(discovered) => {
                    discovered_processes = discovered;
                    hydrate_discovered_component_states(
                        &available,
                        &discovered_processes,
                        instance.runtime_profile.kind,
                    )
                }
                Err(error) => {
                    last_error = Some(error.to_string());
                    last_status_reason = Some("Docker 冷启动探测失败，保留 unknown 状态".to_string());
                    Vec::new()
                }
            }
        }
        _ => hydrate_stopped_component_states(&available, instance.runtime_profile.kind),
    };

    let status = if instance.runtime_profile.kind == RuntimeKind::Wsl2
        && component_states.is_empty()
        && last_error.is_some()
    {
        InstanceLifecycleStatus::Unknown
    } else {
        aggregate_instance_status(&component_states, last_error.as_deref())
    };

    let last_status_reason = match status {
        InstanceLifecycleStatus::Running => Some("冷启动重建为运行中".to_string()),
        InstanceLifecycleStatus::Partial => Some("冷启动重建为部分运行".to_string()),
        InstanceLifecycleStatus::Stopped if instance.runtime_profile.kind == RuntimeKind::Local => {
            Some("应用重启后本地托管进程已视为停止".to_string())
        }
        _ => last_status_reason,
    };

    RecoveredInstanceState {
        status,
        component_states,
        last_error,
        last_status_reason,
        discovered_processes,
        available_components,
    }
}

async fn persist_recovered_instance_state(
    pool: &SqlitePool,
    instance: &crate::models::Instance,
    recovered: RecoveredInstanceState,
) -> AppResult<()> {
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
    .bind(recovered.status.as_str())
    .bind(serde_json::to_string(&instance.runtime_profile)?)
    .bind(recovered.last_error)
    .bind(recovered.last_status_reason)
    .bind(serde_json::to_string(&recovered.component_states)?)
    .bind(&instance.id)
    .execute(pool)
    .await?;

    Ok(())
}

async fn recover_single_instance_state(
    pool: &SqlitePool,
    registry: &ComponentRegistry,
    runtime_resolver: &RuntimeResolver,
    process_manager: &ProcessManager,
    instance: crate::models::Instance,
) -> AppResult<bool> {
    let previous_status = instance.status;
    let previous_reason = instance.last_status_reason.clone();
    let recovered = evaluate_recovered_instance_state(registry, runtime_resolver, &instance);
    process_manager
        .sync_external_processes(
            &instance.id,
            &instance.runtime_profile,
            &recovered.available_components,
            &recovered.discovered_processes,
        )
        .await;
    let changed = previous_status != recovered.status
        || previous_reason != recovered.last_status_reason
        || !recovered.component_states.is_empty();

    if changed {
        persist_recovered_instance_state(pool, &instance, recovered).await?;
    }

    Ok(changed)
}

fn hydrate_stopped_component_states(
    available: &[&crate::components::ComponentSpec],
    runtime_kind: RuntimeKind,
) -> Vec<InstanceComponentState> {
    available
        .iter()
        .map(|component| InstanceComponentState {
            component: component.component,
            runtime_kind,
            status: ComponentLifecycleStatus::Stopped,
            running: false,
            pid: None,
            host_pid: None,
            guest_pid: None,
            uptime: None,
            last_error: None,
        })
        .collect()
}

fn hydrate_discovered_component_states(
    available: &[&crate::components::ComponentSpec],
    discovered: &[crate::runtime::DiscoveredRuntimeProcess],
    runtime_kind: RuntimeKind,
) -> Vec<InstanceComponentState> {
    available
        .iter()
        .map(|component| {
            if let Some(process) = discovered.iter().find(|process| process.component == component.component) {
                InstanceComponentState {
                    component: component.component,
                    runtime_kind: process.runtime_kind,
                    status: process.status,
                    running: matches!(process.status, ComponentLifecycleStatus::Running),
                    pid: process.host_pid.or(process.guest_pid),
                    host_pid: process.host_pid,
                    guest_pid: process.guest_pid,
                    uptime: None,
                    last_error: None,
                }
            } else {
                InstanceComponentState {
                    component: component.component,
                    runtime_kind,
                    status: ComponentLifecycleStatus::Stopped,
                    running: false,
                    pid: None,
                    host_pid: None,
                    guest_pid: None,
                    uptime: None,
                    last_error: None,
                }
            }
        })
        .collect()
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

    use super::{hydrate_discovered_component_states, reconcile_instance_states_on_startup};
    use crate::components::ComponentRegistry;
    use crate::models::{ComponentLifecycleStatus, ComponentType, RuntimeKind};
    use crate::runtime::DiscoveredRuntimeProcess;

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

    #[test]
    fn hydrate_discovered_states_marks_missing_components_stopped() {
        let registry = ComponentRegistry::new();
        let available = vec![
            registry.get(ComponentType::Main).expect("缺少 main spec"),
            registry.get(ComponentType::NapCat).expect("缺少 napcat spec"),
        ];
        let discovered = vec![DiscoveredRuntimeProcess {
            component: ComponentType::Main,
            runtime_kind: RuntimeKind::Wsl2,
            status: ComponentLifecycleStatus::Running,
            host_pid: None,
            guest_pid: Some(321),
            terminal_session_name: Some("mailauncher-inst-test-main".to_string()),
        }];

        let states = hydrate_discovered_component_states(&available, &discovered, RuntimeKind::Wsl2);
        assert_eq!(states.len(), 2);
        assert!(states[0].running);
        assert_eq!(states[0].guest_pid, Some(321));
        assert_eq!(states[1].status, ComponentLifecycleStatus::Stopped);
    }
}