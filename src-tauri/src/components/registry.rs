use std::path::Path;

use crate::components::spec::{ComponentSpec, StartupKind, StopStrategy};
use crate::models::{component_exists, ComponentType};

const MAIN_DEPS: &[ComponentType] = &[];
const NAPCAT_DEPS: &[ComponentType] = &[];
const ADAPTER_DEPS: &[ComponentType] = &[ComponentType::Main, ComponentType::NapCat];

const COMPONENT_SPECS: [ComponentSpec; 3] = [
    ComponentSpec {
        component: ComponentType::Main,
        startup_kind: StartupKind::PythonScript,
        stop_strategy: StopStrategy::CtrlCThenKill,
        startup_target: "bot.py",
        depends_on: MAIN_DEPS,
    },
    ComponentSpec {
        component: ComponentType::NapCat,
        startup_kind: StartupKind::Shell,
        stop_strategy: StopStrategy::CtrlCThenKill,
        startup_target: "launcher",
        depends_on: NAPCAT_DEPS,
    },
    ComponentSpec {
        component: ComponentType::NapCatAdapter,
        startup_kind: StartupKind::PythonScript,
        stop_strategy: StopStrategy::CtrlCThenKill,
        startup_target: "main.py",
        depends_on: ADAPTER_DEPS,
    },
];

#[derive(Debug, Clone, Default)]
pub struct ComponentRegistry;

impl ComponentRegistry {
    pub fn new() -> Self {
        Self
    }

    pub fn all(&self) -> &'static [ComponentSpec] {
        &COMPONENT_SPECS
    }

    pub fn get_by_value(&self, value: &str) -> Option<&'static ComponentSpec> {
        let component = ComponentType::from_value(value)?;
        self.get(component)
    }

    pub fn get(&self, component: ComponentType) -> Option<&'static ComponentSpec> {
        self.all().iter().find(|spec| spec.component == component)
    }

    pub fn available_for_path(&self, instance_root: &Path) -> Vec<&'static ComponentSpec> {
        self.all()
            .iter()
            .filter(|spec| component_exists(instance_root, spec.component))
            .collect()
    }
}