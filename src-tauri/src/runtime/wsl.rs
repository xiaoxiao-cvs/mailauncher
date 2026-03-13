use std::path::{Path, PathBuf};
use std::process::Command as StdCommand;

use crate::components::ComponentSpec;
use crate::errors::{AppError, AppResult};
use crate::models::{ComponentLifecycleStatus, ComponentType, RuntimeKind, RuntimeProfile};
use crate::runtime::{DiscoveredRuntimeProcess, ResolvedCommand, RuntimeAdapter};

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

    fn discover_processes(
        &self,
        profile: &RuntimeProfile,
        components: &[&ComponentSpec],
    ) -> AppResult<Vec<DiscoveredRuntimeProcess>> {
        if !cfg!(target_os = "windows") {
            return Ok(Vec::new());
        }

        let distribution = profile.distribution.as_deref().ok_or_else(|| {
            AppError::InvalidInput("WSL2 运行时缺少 distribution 配置".to_string())
        })?;
        let guest_workspace_root = profile.guest_workspace_root.as_deref().ok_or_else(|| {
            AppError::InvalidInput("WSL2 运行时缺少 guest_workspace_root 配置".to_string())
        })?;

        let mut args = vec!["--distribution".to_string(), distribution.to_string()];
        if let Some(user) = profile.user.as_deref() {
            args.push("--user".to_string());
            args.push(user.to_string());
        }

        args.push("--exec".to_string());
        args.push("bash".to_string());
        args.push("-lc".to_string());
        args.push(
            "for pid in $(pgrep -f 'bot.py|main.py|start.sh' 2>/dev/null || true); do cmd=$(tr '\0' ' ' < /proc/$pid/cmdline 2>/dev/null || true); cwd=$(readlink -f /proc/$pid/cwd 2>/dev/null || true); printf '%s\t%s\t%s\n' \"$pid\" \"$cwd\" \"$cmd\"; done".to_string(),
        );

        let output = StdCommand::new("wsl.exe")
            .args(args)
            .output()
            .map_err(|error| AppError::Process(format!("执行 WSL 进程探测失败: {}", error)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return Err(AppError::Process(format!("WSL 进程探测失败: {}", stderr)));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(parse_wsl_discovered_processes(&stdout, guest_workspace_root, components))
    }
}

fn parse_wsl_discovered_processes(
    stdout: &str,
    guest_workspace_root: &str,
    components: &[&ComponentSpec],
) -> Vec<DiscoveredRuntimeProcess> {
    let root = guest_workspace_root.trim_end_matches('/');
    let mut discovered = Vec::new();

    for line in stdout.lines() {
        if line.trim().is_empty() {
            continue;
        }

        let mut parts = line.splitn(3, '\t');
        let pid = parts.next().and_then(|value| value.trim().parse::<u32>().ok());
        let cwd = parts.next().unwrap_or("").trim().trim_end_matches('/');
        let cmd = parts.next().unwrap_or("").trim();

        let Some(pid) = pid else {
            continue;
        };

        for component in components {
            let expected_dir = format!("{}/{}", root, component.relative_dir());
            if cwd != expected_dir {
                continue;
            }

            let matches_target = match component.component {
                ComponentType::Main => cmd.contains("bot.py"),
                ComponentType::NapCat => cmd.contains("start.sh"),
                ComponentType::NapCatAdapter => cmd.contains("main.py"),
            };

            if matches_target {
                discovered.push(DiscoveredRuntimeProcess {
                    component: component.component,
                    runtime_kind: RuntimeKind::Wsl2,
                    status: ComponentLifecycleStatus::Running,
                    host_pid: None,
                    guest_pid: Some(pid),
                });
                break;
            }
        }
    }

    discovered
}

#[cfg(test)]
mod tests {
    use crate::components::ComponentRegistry;
    use crate::models::ComponentType;

    use super::parse_wsl_discovered_processes;

    #[test]
    fn parse_wsl_processes_matches_component_by_cwd_and_cmdline() {
        let registry = ComponentRegistry::new();
        let components = vec![
            registry.get(ComponentType::Main).expect("缺少 main spec"),
            registry.get(ComponentType::NapCatAdapter).expect("缺少 adapter spec"),
        ];

        let stdout = "123\t/home/mai/demo/MaiBot\tpython3 bot.py\n456\t/home/mai/demo/MaiBot-Napcat-Adapter\tpython3 main.py\n";
        let discovered = parse_wsl_discovered_processes(stdout, "/home/mai/demo", &components);

        assert_eq!(discovered.len(), 2);
        assert_eq!(discovered[0].component, ComponentType::Main);
        assert_eq!(discovered[0].guest_pid, Some(123));
        assert_eq!(discovered[1].component, ComponentType::NapCatAdapter);
    }
}

pub async fn probe_guest_process_alive(profile: &RuntimeProfile, pid: u32) -> AppResult<bool> {
    let script = format!("kill -0 {pid} >/dev/null 2>&1");
    let output = build_wsl_command(profile, &script)
        .output()
        .await
        .map_err(|error| AppError::Process(format!("执行 WSL 进程存活探测失败: {}", error)))?;

    Ok(output.status.success())
}

pub async fn signal_guest_process(profile: &RuntimeProfile, pid: u32, signal: &str) -> AppResult<()> {
    let script = format!("kill -{signal} {pid} >/dev/null 2>&1");
    let output = build_wsl_command(profile, &script)
        .output()
        .await
        .map_err(|error| AppError::Process(format!("执行 WSL 信号发送失败: {}", error)))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(AppError::Process(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ))
    }
}

fn build_wsl_command(profile: &RuntimeProfile, script: &str) -> tokio::process::Command {
    let distribution = profile.distribution.as_deref().unwrap_or_default();
    let mut command = tokio::process::Command::new("wsl.exe");
    command.args(["--distribution", distribution]);

    if let Some(user) = profile.user.as_deref().filter(|value| !value.trim().is_empty()) {
        command.args(["--user", user]);
    }

    command.args(["--exec", "bash", "-lc", script]);
    command
}