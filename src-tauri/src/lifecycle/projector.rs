use crate::components::ComponentRegistry;
use crate::models::{
    ComponentLifecycleStatus, InstanceComponentState, InstanceLifecycleStatus, RuntimeKind,
};
use crate::services::process_service::ProcessManager;

pub async fn collect_component_states(
    process_manager: &ProcessManager,
    instance_id: &str,
    registry: &ComponentRegistry,
    instance_root: &std::path::Path,
) -> Vec<InstanceComponentState> {
    let mut states = Vec::new();

    for spec in registry.available_for_path(instance_root) {
        let running = process_manager
            .is_component_running(instance_id, spec.component.internal_key())
            .await;
        let pid = process_manager
            .get_process_pid(instance_id, spec.component.internal_key())
            .await;
        let guest_pid = process_manager
            .get_process_guest_pid(instance_id, spec.component.internal_key())
            .await;
        let uptime = process_manager
            .get_process_uptime(instance_id, spec.component.internal_key())
            .await;
        let runtime_kind = process_manager
            .get_process_runtime_kind(instance_id, spec.component.internal_key())
            .await
            .unwrap_or(RuntimeKind::Local);
        let externally_managed = process_manager
            .is_process_external(instance_id, spec.component.internal_key())
            .await;
        let terminal_reconnectable = process_manager
            .is_terminal_reconnectable(instance_id, spec.component.internal_key())
            .await;

        let status = if running {
            ComponentLifecycleStatus::Running
        } else {
            ComponentLifecycleStatus::Stopped
        };

        states.push(InstanceComponentState {
            component: spec.component,
            runtime_kind,
            status,
            running,
            externally_managed,
            terminal_reconnectable,
            pid: if running { pid.or(guest_pid) } else { None },
            host_pid: if running { pid } else { None },
            guest_pid: if running { guest_pid } else { None },
            uptime: if running { uptime } else { None },
            last_error: None,
        });
    }

    states
}

pub fn aggregate_instance_status(
    states: &[InstanceComponentState],
    last_error: Option<&str>,
) -> InstanceLifecycleStatus {
    if states.is_empty() {
        return if last_error.is_some() {
            InstanceLifecycleStatus::Failed
        } else {
            InstanceLifecycleStatus::Stopped
        };
    }

    let running = states.iter().filter(|state| state.status.is_running()).count();
    let failed = states
        .iter()
        .filter(|state| matches!(state.status, ComponentLifecycleStatus::Failed))
        .count();
    let starting = states
        .iter()
        .filter(|state| matches!(state.status, ComponentLifecycleStatus::Starting))
        .count();
    let stopping = states
        .iter()
        .filter(|state| matches!(state.status, ComponentLifecycleStatus::Stopping))
        .count();

    if stopping > 0 {
        return InstanceLifecycleStatus::Stopping;
    }

    if starting > 0 && running == 0 {
        return InstanceLifecycleStatus::Starting;
    }

    if failed > 0 && running == 0 {
        return InstanceLifecycleStatus::Failed;
    }

    if running == states.len() {
        return InstanceLifecycleStatus::Running;
    }

    if running > 0 {
        return InstanceLifecycleStatus::Partial;
    }

    if last_error.is_some() {
        InstanceLifecycleStatus::Failed
    } else {
        InstanceLifecycleStatus::Stopped
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::aggregate_instance_status;
    use crate::models::{
        ComponentLifecycleStatus, ComponentType, InstanceComponentState, InstanceLifecycleStatus,
        RuntimeKind,
    };
    use crate::services::process_service::ProcessManager;
    use crate::{components::ComponentRegistry, lifecycle::collect_component_states};

    fn component_state(
        component: ComponentType,
        status: ComponentLifecycleStatus,
    ) -> InstanceComponentState {
        InstanceComponentState {
            component,
            runtime_kind: RuntimeKind::Local,
            running: matches!(status, ComponentLifecycleStatus::Running),
            status,
            externally_managed: false,
            terminal_reconnectable: matches!(status, ComponentLifecycleStatus::Running),
            pid: None,
            host_pid: None,
            guest_pid: None,
            uptime: None,
            last_error: None,
        }
    }

    #[test]
    fn all_running_projects_running_status() {
        let states = vec![
            component_state(ComponentType::Main, ComponentLifecycleStatus::Running),
            component_state(ComponentType::NapCat, ComponentLifecycleStatus::Running),
        ];

        assert_eq!(
            aggregate_instance_status(&states, None),
            InstanceLifecycleStatus::Running
        );
    }

    #[test]
    fn partial_running_projects_partial_status() {
        let states = vec![
            component_state(ComponentType::Main, ComponentLifecycleStatus::Running),
            component_state(ComponentType::NapCat, ComponentLifecycleStatus::Stopped),
        ];

        assert_eq!(
            aggregate_instance_status(&states, None),
            InstanceLifecycleStatus::Partial
        );
    }

    #[test]
    fn stopped_with_error_projects_failed_status() {
        let states = vec![component_state(ComponentType::Main, ComponentLifecycleStatus::Stopped)];

        assert_eq!(
            aggregate_instance_status(&states, Some("boom")),
            InstanceLifecycleStatus::Failed
        );
    }

    fn create_component_dirs(root: &std::path::Path, components: &[ComponentType]) {
        for component in components {
            fs::create_dir_all(root.join(component.relative_dir())).expect("创建测试组件目录失败");
        }
    }

    #[tokio::test]
    async fn collect_component_states_projects_managed_runtime_capabilities() {
        let registry = ComponentRegistry::new();
        let manager = ProcessManager::new();
        let temp_root = std::env::temp_dir().join(format!(
            "mailauncher-projector-test-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&temp_root);
        create_component_dirs(&temp_root, &[ComponentType::Main, ComponentType::NapCat]);

        manager
            .start_process(
                "inst_test",
                "main",
                RuntimeKind::Local,
                if cfg!(windows) { "cmd" } else { "sh" },
                if cfg!(windows) {
                    &["/C", "ping", "127.0.0.1", "-n", "4"]
                } else {
                    &["-c", "sleep 2"]
                },
                &temp_root,
            )
            .await
            .expect("启动托管测试进程失败");

        let states = collect_component_states(&manager, "inst_test", &registry, &temp_root).await;
        let main_state = states
            .iter()
            .find(|state| state.component == ComponentType::Main)
            .expect("缺少 main 状态");
        let napcat_state = states
            .iter()
            .find(|state| state.component == ComponentType::NapCat)
            .expect("缺少 napcat 状态");

        assert!(main_state.running);
        assert!(!main_state.externally_managed);
        assert!(main_state.terminal_reconnectable);
        assert_eq!(main_state.runtime_kind, RuntimeKind::Local);
        assert!(main_state.host_pid.is_some());

        assert!(!napcat_state.running);
        assert!(!napcat_state.externally_managed);
        assert!(!napcat_state.terminal_reconnectable);
        assert_eq!(napcat_state.runtime_kind, RuntimeKind::Local);
        assert_eq!(napcat_state.status, ComponentLifecycleStatus::Stopped);

        manager
            .stop_process("inst_test", "main", true)
            .await
            .expect("停止托管测试进程失败");

        let _ = fs::remove_dir_all(&temp_root);
    }
}