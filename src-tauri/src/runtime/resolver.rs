use std::sync::Arc;

use crate::models::{RuntimeKind, RuntimeProfile};
use crate::runtime::{DockerRuntimeAdapter, LocalRuntimeAdapter, RuntimeAdapter, Wsl2RuntimeAdapter};

#[derive(Clone)]
pub struct RuntimeResolver {
    local: Arc<LocalRuntimeAdapter>,
    wsl2: Arc<Wsl2RuntimeAdapter>,
    docker: Arc<DockerRuntimeAdapter>,
}

impl RuntimeResolver {
    pub fn new() -> Self {
        Self {
            local: Arc::new(LocalRuntimeAdapter),
            wsl2: Arc::new(Wsl2RuntimeAdapter),
            docker: Arc::new(DockerRuntimeAdapter),
        }
    }

    pub fn resolve(&self, profile: &RuntimeProfile) -> Arc<dyn RuntimeAdapter> {
        match profile.kind {
            RuntimeKind::Local => self.local.clone(),
            RuntimeKind::Wsl2 => self.wsl2.clone(),
            RuntimeKind::Docker => self.docker.clone(),
        }
    }
}

impl Default for RuntimeResolver {
    fn default() -> Self {
        Self::new()
    }
}