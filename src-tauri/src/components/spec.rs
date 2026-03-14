use crate::models::ComponentType;

#[derive(Debug, Clone, Copy)]
#[allow(dead_code)]
pub enum StartupKind {
    PythonScript,
    Shell,
}

#[derive(Debug, Clone, Copy)]
#[allow(dead_code)]
pub enum StopStrategy {
    CtrlCThenKill,
}

#[derive(Debug, Clone, Copy)]
#[allow(dead_code)]
pub struct ComponentSpec {
    pub component: ComponentType,
    pub startup_kind: StartupKind,
    pub stop_strategy: StopStrategy,
    pub startup_target: &'static str,
    pub depends_on: &'static [ComponentType],
}

impl ComponentSpec {
    pub fn relative_dir(&self) -> &'static str {
        self.component.relative_dir()
    }
}