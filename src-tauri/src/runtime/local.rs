use std::path::Path;

use tracing::info;

use crate::components::ComponentSpec;
use crate::errors::{AppError, AppResult};
use crate::models::{ComponentType, HostOs, PythonMode, RuntimeKind, RuntimeProfile};
use crate::runtime::{ResolvedCommand, RuntimeAdapter};

#[derive(Debug, Clone, Default)]
pub struct LocalRuntimeAdapter;

impl LocalRuntimeAdapter {
    fn resolve_python(&self, instance_root: &Path, profile: &RuntimeProfile) -> String {
        if let Some(path) = profile.python.path.as_deref() {
            return path.to_string();
        }

        let venv_python = match HostOs::current() {
            HostOs::Windows => instance_root.join(".venv").join("Scripts").join("python.exe"),
            _ => instance_root.join(".venv").join("bin").join("python"),
        };

        if venv_python.exists() {
            info!("使用虚拟环境 Python: {}", venv_python.display());
            return venv_python.to_string_lossy().to_string();
        }

        match profile.python.mode {
            PythonMode::System | PythonMode::Explicit | PythonMode::Venv => match HostOs::current() {
                HostOs::Windows => "python".to_string(),
                _ => "python3".to_string(),
            },
        }
    }

    fn build_napcat_command(
        &self,
        instance_root: &Path,
        qq_account: Option<&str>,
    ) -> AppResult<ResolvedCommand> {
        let napcat_dir = instance_root.join(ComponentType::NapCat.relative_dir());
        let cwd = napcat_dir.clone();

        match HostOs::current() {
            HostOs::Windows => {
                let launcher = if napcat_dir.join("launcher-user.bat").exists() {
                    "launcher-user.bat"
                } else if napcat_dir.join("launcher.bat").exists() {
                    "launcher.bat"
                } else {
                    return Err(AppError::NotFound(format!(
                        "NapCat 启动脚本不存在: {}",
                        napcat_dir.join("launcher-user.bat").display()
                    )));
                };

                let mut args = vec!["/c".to_string(), launcher.to_string()];
                if let Some(account) = qq_account {
                    args.push("-q".to_string());
                    args.push(account.to_string());
                }

                Ok(ResolvedCommand {
                    command: "cmd".to_string(),
                    args,
                    cwd,
                })
            }
            _ => {
                let start_sh = napcat_dir.join("start.sh");
                if !start_sh.exists() {
                    return Err(AppError::NotFound(format!(
                        "NapCat 启动脚本不存在: {}",
                        start_sh.display()
                    )));
                }

                let mut args = vec!["start.sh".to_string()];
                if let Some(account) = qq_account {
                    args.push(account.to_string());
                }

                Ok(ResolvedCommand {
                    command: "bash".to_string(),
                    args,
                    cwd,
                })
            }
        }
    }
}

impl RuntimeAdapter for LocalRuntimeAdapter {
    fn runtime_kind(&self) -> RuntimeKind {
        RuntimeKind::Local
    }

    fn resolve_component_command(
        &self,
        _instance_id: &str,
        instance_root: &Path,
        component: &ComponentSpec,
        profile: &RuntimeProfile,
        qq_account: Option<&str>,
    ) -> AppResult<ResolvedCommand> {
        match component.component {
            ComponentType::Main => {
                let cwd = instance_root.join(component.relative_dir());
                let script = cwd.join(component.startup_target);
                if !script.exists() {
                    return Err(AppError::NotFound(format!(
                        "MaiBot 启动脚本不存在: {}",
                        script.display()
                    )));
                }

                Ok(ResolvedCommand {
                    command: self.resolve_python(instance_root, profile),
                    args: vec![component.startup_target.to_string()],
                    cwd,
                })
            }
            ComponentType::NapCat => self.build_napcat_command(instance_root, qq_account),
            ComponentType::NapCatAdapter => {
                let cwd = instance_root.join(component.relative_dir());
                let script = cwd.join(component.startup_target);
                if !script.exists() {
                    return Err(AppError::NotFound(format!(
                        "NapCat 适配器启动脚本不存在: {}",
                        script.display()
                    )));
                }

                Ok(ResolvedCommand {
                    command: self.resolve_python(instance_root, profile),
                    args: vec![component.startup_target.to_string()],
                    cwd,
                })
            }
        }
    }
}