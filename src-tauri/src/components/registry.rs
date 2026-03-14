use std::collections::{HashMap, HashSet};
use std::path::Path;

use crate::components::spec::{ComponentSpec, StartupKind, StopStrategy};
use crate::errors::{AppError, AppResult};
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

    pub fn startup_order_for_path(&self, instance_root: &Path) -> AppResult<Vec<&'static ComponentSpec>> {
        self.topological_order(self.available_for_path(instance_root))
    }

    pub fn shutdown_order_for_path(&self, instance_root: &Path) -> AppResult<Vec<&'static ComponentSpec>> {
        let mut ordered = self.startup_order_for_path(instance_root)?;
        ordered.reverse();
        Ok(ordered)
    }

    pub fn startup_chain_for_component(
        &self,
        instance_root: &Path,
        target: ComponentType,
    ) -> AppResult<Vec<&'static ComponentSpec>> {
        let available = self.available_for_path(instance_root);
        let available_map = available
            .iter()
            .map(|spec| (spec.component, *spec))
            .collect::<HashMap<_, _>>();
        let mut selected = HashSet::new();
        self.collect_dependencies(target, &available_map, &mut selected);
        let subset = available
            .into_iter()
            .filter(|spec| selected.contains(&spec.component))
            .collect();
        self.topological_order(subset)
    }

    pub fn shutdown_chain_for_component(
        &self,
        instance_root: &Path,
        target: ComponentType,
    ) -> AppResult<Vec<&'static ComponentSpec>> {
        let available = self.available_for_path(instance_root);
        let mut selected = HashSet::from([target]);

        loop {
            let mut changed = false;
            for spec in &available {
                if spec.depends_on.iter().any(|dependency| selected.contains(dependency))
                    && selected.insert(spec.component)
                {
                    changed = true;
                }
            }

            if !changed {
                break;
            }
        }

        let subset = available
            .into_iter()
            .filter(|spec| selected.contains(&spec.component))
            .collect::<Vec<_>>();
        let mut ordered = self.topological_order(subset)?;
        ordered.reverse();
        Ok(ordered)
    }

    fn collect_dependencies(
        &self,
        target: ComponentType,
        available: &HashMap<ComponentType, &'static ComponentSpec>,
        selected: &mut HashSet<ComponentType>,
    ) {
        if !selected.insert(target) {
            return;
        }

        if let Some(spec) = available.get(&target) {
            for dependency in spec.depends_on {
                self.collect_dependencies(*dependency, available, selected);
            }
        }
    }

    fn topological_order(
        &self,
        specs: Vec<&'static ComponentSpec>,
    ) -> AppResult<Vec<&'static ComponentSpec>> {
        let spec_map = specs
            .iter()
            .map(|spec| (spec.component, *spec))
            .collect::<HashMap<_, _>>();
        let mut ordered = Vec::new();
        let mut temporary = HashSet::new();
        let mut permanent = HashSet::new();

        for spec in &specs {
            self.visit_component(
                spec.component,
                &spec_map,
                &mut temporary,
                &mut permanent,
                &mut ordered,
            )?;
        }

        Ok(ordered)
    }

    fn visit_component(
        &self,
        component: ComponentType,
        spec_map: &HashMap<ComponentType, &'static ComponentSpec>,
        temporary: &mut HashSet<ComponentType>,
        permanent: &mut HashSet<ComponentType>,
        ordered: &mut Vec<&'static ComponentSpec>,
    ) -> AppResult<()> {
        if permanent.contains(&component) {
            return Ok(());
        }

        if !temporary.insert(component) {
            return Err(AppError::InvalidInput(format!(
                "组件依赖图中存在循环依赖: {}",
                component.display_name()
            )));
        }

        if let Some(spec) = spec_map.get(&component) {
            for dependency in spec.depends_on {
                if spec_map.contains_key(dependency) {
                    self.visit_component(*dependency, spec_map, temporary, permanent, ordered)?;
                }
            }
            ordered.push(*spec);
        }

        temporary.remove(&component);
        permanent.insert(component);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::ComponentRegistry;
    use crate::models::ComponentType;

    fn create_component_dirs(root: &std::path::Path, components: &[ComponentType]) {
        for component in components {
            fs::create_dir_all(root.join(component.relative_dir())).expect("创建测试组件目录失败");
        }
    }

    #[test]
    fn startup_order_respects_dependencies() {
        let registry = ComponentRegistry::new();
        let temp_root = std::env::temp_dir().join(format!("mailauncher-registry-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&temp_root);
        create_component_dirs(
            &temp_root,
            &[ComponentType::NapCatAdapter, ComponentType::Main, ComponentType::NapCat],
        );

        let ordered = registry
            .startup_order_for_path(&temp_root)
            .expect("生成启动顺序失败");
        let display = ordered.iter().map(|spec| spec.component).collect::<Vec<_>>();

        assert_eq!(display, vec![ComponentType::Main, ComponentType::NapCat, ComponentType::NapCatAdapter]);

        let _ = fs::remove_dir_all(&temp_root);
    }

    #[test]
    fn shutdown_chain_stops_dependents_before_dependency() {
        let registry = ComponentRegistry::new();
        let temp_root = std::env::temp_dir().join(format!("mailauncher-registry-stop-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&temp_root);
        create_component_dirs(
            &temp_root,
            &[ComponentType::NapCatAdapter, ComponentType::Main, ComponentType::NapCat],
        );

        let ordered = registry
            .shutdown_chain_for_component(&temp_root, ComponentType::Main)
            .expect("生成停止链路失败");
        let display = ordered.iter().map(|spec| spec.component).collect::<Vec<_>>();

        assert_eq!(display, vec![ComponentType::NapCatAdapter, ComponentType::Main]);

        let _ = fs::remove_dir_all(&temp_root);
    }
}