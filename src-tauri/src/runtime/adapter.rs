use std::path::{Path, PathBuf};

use crate::components::ComponentSpec;
use crate::errors::AppResult;
use crate::models::{RuntimeKind, RuntimeProfile};

#[derive(Debug, Clone)]
pub struct ResolvedCommand {
    pub command: String,
    pub args: Vec<String>,
    pub cwd: PathBuf,
}

pub trait RuntimeAdapter: Send + Sync {
    fn runtime_kind(&self) -> RuntimeKind;

    fn resolve_component_command(
        &self,
        instance_root: &Path,
        component: &ComponentSpec,
        profile: &RuntimeProfile,
        qq_account: Option<&str>,
    ) -> AppResult<ResolvedCommand>;
}