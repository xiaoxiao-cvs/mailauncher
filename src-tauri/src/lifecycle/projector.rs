use crate::components::ComponentRegistry;
use crate::models::{
    ComponentLifecycleStatus, InstanceComponentState, InstanceLifecycleStatus,
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
        let pid = process_manager
            .get_process_pid(instance_id, spec.component.internal_key())
            .await;
        let uptime = process_manager
            .get_process_uptime(instance_id, spec.component.internal_key())
            .await;
        let running = process_manager
            .is_component_running(instance_id, spec.component.internal_key())
            .await;

        let status = if running {
            ComponentLifecycleStatus::Running
        } else {
            ComponentLifecycleStatus::Stopped
        };

        states.push(InstanceComponentState {
            component: spec.component,
            status,
            running,
            pid,
            uptime,
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