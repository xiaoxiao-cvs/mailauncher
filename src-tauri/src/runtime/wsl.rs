use std::path::Path;

use crate::components::ComponentSpec;
use crate::errors::{AppError, AppResult};
use crate::models::RuntimeProfile;
use crate::runtime::{ResolvedCommand, RuntimeAdapter};

#[derive(Debug, Clone, Default)]
pub struct Wsl2RuntimeAdapter;

impl RuntimeAdapter for Wsl2RuntimeAdapter {
    fn resolve_component_command(
        &self,
        _instance_root: &Path,
        _component: &ComponentSpec,
        profile: &RuntimeProfile,
        _qq_account: Option<&str>,
    ) -> AppResult<ResolvedCommand> {
        Err(AppError::Process(format!(
            "WSL2RuntimeAdapter 尚未完成执行链路，请先完成发行版与 guest 工作区配置: {:?}",
            profile.distribution
        )))
    }
}