use std::path::{Path, PathBuf};

use crate::components::ComponentSpec;
use crate::errors::{AppError, AppResult};
use crate::models::{ComponentType, RuntimeKind, RuntimeProfile};
use crate::runtime::{ResolvedCommand, RuntimeAdapter};

#[derive(Debug, Clone, Default)]
pub struct Wsl2RuntimeAdapter;

impl RuntimeAdapter for Wsl2RuntimeAdapter {
    fn runtime_kind(&self) -> RuntimeKind {
        RuntimeKind::Wsl2
    }

    fn resolve_component_command(
        &self,
        instance_root: &Path,
        component: &ComponentSpec,
        profile: &RuntimeProfile,
        qq_account: Option<&str>,
    ) -> AppResult<ResolvedCommand> {
        let distribution = profile.distribution.as_deref().ok_or_else(|| {
            AppError::InvalidInput("WSL2 运行时缺少 distribution 配置".to_string())
        })?;

        let guest_workspace_root = profile.guest_workspace_root.as_deref().ok_or_else(|| {
            AppError::InvalidInput("WSL2 运行时缺少 guest_workspace_root 配置".to_string())
        })?;

        let guest_component_dir = PathBuf::from(guest_workspace_root).join(component.relative_dir());
        let guest_cwd = guest_component_dir.to_string_lossy().replace('\\', "/");
        let mut args = vec!["--distribution".to_string(), distribution.to_string()];

        if let Some(user) = profile.user.as_deref() {
            args.push("--user".to_string());
            args.push(user.to_string());
        }

        args.push("--cd".to_string());
        args.push(guest_cwd);
        args.push("--exec".to_string());
        args.push("bash".to_string());
        args.push("-lc".to_string());

        let marker = "__MAI_GUEST_PID__";
        let script = match component.component {
            ComponentType::Main => {
                let python = profile
                    .python
                    .path
                    .clone()
                    .unwrap_or_else(|| "python3".to_string());
                format!("echo {marker}=$$; exec {python} {}", component.startup_target)
            }
            ComponentType::NapCat => {
                let account_suffix = qq_account
                    .map(|account| format!(" {}", account))
                    .unwrap_or_default();
                format!("echo {marker}=$$; exec bash start.sh{account_suffix}")
            }
            ComponentType::NapCatAdapter => {
                let python = profile
                    .python
                    .path
                    .clone()
                    .unwrap_or_else(|| "python3".to_string());
                format!("echo {marker}=$$; exec {python} {}", component.startup_target)
            }
        };
        args.push(script);

        Ok(ResolvedCommand {
            command: "wsl.exe".to_string(),
            args,
            cwd: instance_root.to_path_buf(),
        })
    }
}