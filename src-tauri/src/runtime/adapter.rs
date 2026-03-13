use std::path::{Path, PathBuf};

use crate::components::ComponentSpec;
use crate::errors::AppResult;
use crate::models::{ComponentLifecycleStatus, ComponentType, RuntimeKind, RuntimeProfile};

#[derive(Debug, Clone)]
pub struct ResolvedCommand {
    pub command: String,
    pub args: Vec<String>,
    pub cwd: PathBuf,
}

#[derive(Debug, Clone)]
pub struct TerminalSessionInfo {
    pub name: String,
    pub verified: bool,
}

#[derive(Debug, Clone)]
pub struct DiscoveredRuntimeProcess {
    pub component: ComponentType,
    pub runtime_kind: RuntimeKind,
    pub status: ComponentLifecycleStatus,
    pub host_pid: Option<u32>,
    pub guest_pid: Option<u32>,
    pub terminal_session: Option<TerminalSessionInfo>,
}

pub trait RuntimeAdapter: Send + Sync {
    fn runtime_kind(&self) -> RuntimeKind;

    fn resolve_component_command(
        &self,
        instance_id: &str,
        instance_root: &Path,
        component: &ComponentSpec,
        profile: &RuntimeProfile,
        qq_account: Option<&str>,
    ) -> AppResult<ResolvedCommand>;

    fn discover_processes(
        &self,
        _profile: &RuntimeProfile,
        _instance_id: &str,
        _components: &[&ComponentSpec],
    ) -> AppResult<Vec<DiscoveredRuntimeProcess>> {
        Ok(Vec::new())
    }
}