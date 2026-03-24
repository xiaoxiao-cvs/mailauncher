use std::path::{Path, PathBuf};

use crate::components::ComponentSpec;
use crate::errors::{AppError, AppResult};
use crate::models::{RuntimeKind, RuntimeProfile};

pub enum PathMapper<'a> {
    Local {
        instance_root: &'a Path,
    },
    Guest {
        guest_workspace_root: &'a str,
    },
}

impl<'a> PathMapper<'a> {
    pub fn for_runtime(profile: &'a RuntimeProfile, instance_root: Option<&'a Path>) -> AppResult<Self> {
        match profile.kind {
            RuntimeKind::Local => instance_root
                .map(|instance_root| Self::Local { instance_root })
                .ok_or_else(|| AppError::InvalidInput("Local 运行时缺少实例根目录，无法建立路径映射".to_string())),
            RuntimeKind::Wsl2 => profile
                .guest_workspace_root
                .as_deref()
                .filter(|value| !value.trim().is_empty())
                .map(|guest_workspace_root| Self::Guest {
                    guest_workspace_root,
                })
                .ok_or_else(|| AppError::InvalidInput(format!("{:?} 运行时缺少 guest_workspace_root 配置", profile.kind))),
        }
    }

    pub fn workspace_root(&self) -> PathBuf {
        match self {
            Self::Local { instance_root } => (*instance_root).to_path_buf(),
            Self::Guest {
                guest_workspace_root,
                ..
            } => PathBuf::from(guest_workspace_root),
        }
    }

    pub fn component_dir(&self, component: &ComponentSpec) -> PathBuf {
        self.workspace_root().join(component.relative_dir())
    }

    pub fn component_dir_string(&self, component: &ComponentSpec) -> String {
        self.component_dir(component).to_string_lossy().replace('\\', "/")
    }
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use crate::components::ComponentRegistry;
    use crate::models::{RuntimeKind, RuntimeProfile};

    use super::PathMapper;

    #[test]
    fn local_mapper_resolves_component_dir_from_instance_root() {
        let profile = RuntimeProfile::local("demo", None);
        let registry = ComponentRegistry::new();
        let component = registry.get(crate::models::ComponentType::Main).expect("缺少 main spec");
        let mapper = PathMapper::for_runtime(&profile, Some(Path::new("E:/Repo/mailauncher/demo")))
            .expect("创建本地 PathMapper 失败");

        assert!(mapper.component_dir(component).ends_with("demo/MaiBot"));
    }

    #[test]
    fn guest_mapper_resolves_component_dir_from_guest_workspace_root() {
        let mut profile = RuntimeProfile::local("demo", None);
        profile.kind = RuntimeKind::Wsl2;
        profile.guest_workspace_root = Some("/home/mai/demo".to_string());
        let registry = ComponentRegistry::new();
        let component = registry.get(crate::models::ComponentType::NapCatAdapter).expect("缺少 adapter spec");
        let mapper = PathMapper::for_runtime(&profile, None).expect("创建 guest PathMapper 失败");

        assert_eq!(mapper.component_dir_string(component), "/home/mai/demo/MaiBot-Napcat-Adapter");
    }
}