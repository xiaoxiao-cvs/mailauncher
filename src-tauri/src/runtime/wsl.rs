use std::path::{Path, PathBuf};

use crate::components::ComponentSpec;
use crate::errors::{AppError, AppResult};
use crate::models::{ComponentType, RuntimeProfile};
use crate::runtime::{ResolvedCommand, RuntimeAdapter};

#[derive(Debug, Clone, Default)]
pub struct Wsl2RuntimeAdapter;

impl RuntimeAdapter for Wsl2RuntimeAdapter {
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

        match component.component {
            ComponentType::Main => {
                let python = profile
                    .python
                    .path
                    .clone()
                    .unwrap_or_else(|| "python3".to_string());
                args.push(python);
                args.push(component.startup_target.to_string());
            }
            ComponentType::NapCat => {
                args.push("bash".to_string());
                args.push("start.sh".to_string());
                if let Some(account) = qq_account {
                    args.push(account.to_string());
                }
            }
            ComponentType::NapCatAdapter => {
                let python = profile
                    .python
                    .path
                    .clone()
                    .unwrap_or_else(|| "python3".to_string());
                args.push(python);
                args.push(component.startup_target.to_string());
            }
        }

        Ok(ResolvedCommand {
            command: "wsl.exe".to_string(),
            args,
            cwd: instance_root.to_path_buf(),
        })
    }
}