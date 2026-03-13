use std::path::{Path, PathBuf};
use std::process::Command as StdCommand;

use crate::components::ComponentSpec;
use crate::errors::{AppError, AppResult};
use crate::models::{ComponentLifecycleStatus, ComponentType, RuntimeKind, RuntimeProfile};
use crate::runtime::{DiscoveredRuntimeProcess, ResolvedCommand, RuntimeAdapter};

#[derive(Debug, Clone, Default)]
pub struct DockerRuntimeAdapter;

impl RuntimeAdapter for DockerRuntimeAdapter {
    fn runtime_kind(&self) -> RuntimeKind {
        RuntimeKind::Docker
    }

    fn resolve_component_command(
        &self,
        _instance_id: &str,
        instance_root: &Path,
        component: &ComponentSpec,
        profile: &RuntimeProfile,
        qq_account: Option<&str>,
    ) -> AppResult<ResolvedCommand> {
        let container_name = profile.container_name.as_deref().ok_or_else(|| {
            AppError::InvalidInput("Docker 运行时缺少 container_name 配置".to_string())
        })?;
        let guest_workspace_root = profile.guest_workspace_root.as_deref().ok_or_else(|| {
            AppError::InvalidInput("Docker 运行时缺少 guest_workspace_root 配置".to_string())
        })?;

        let guest_component_dir = PathBuf::from(guest_workspace_root).join(component.relative_dir());
        let guest_cwd = guest_component_dir.to_string_lossy().replace('\\', "/");
        let mut args = vec!["exec".to_string(), "-i".to_string()];

        if let Some(user) = profile.user.as_deref().filter(|value| !value.trim().is_empty()) {
            args.push("-u".to_string());
            args.push(user.to_string());
        }

        args.push(container_name.to_string());
        args.push("bash".to_string());
        args.push("-lc".to_string());

        let marker = "__MAI_GUEST_PID__";
        let command = match component.component {
            ComponentType::Main => {
                let python = profile
                    .python
                    .path
                    .clone()
                    .unwrap_or_else(|| "python3".to_string());
                format!("cd '{guest_cwd}' && echo {marker}=$$ && exec {python} {}", component.startup_target)
            }
            ComponentType::NapCat => {
                let account_suffix = qq_account
                    .map(|account| format!(" {}", shell_escape(account)))
                    .unwrap_or_default();
                format!("cd '{guest_cwd}' && echo {marker}=$$ && exec bash start.sh{account_suffix}")
            }
            ComponentType::NapCatAdapter => {
                let python = profile
                    .python
                    .path
                    .clone()
                    .unwrap_or_else(|| "python3".to_string());
                format!("cd '{guest_cwd}' && echo {marker}=$$ && exec {python} {}", component.startup_target)
            }
        };
        args.push(command);

        Ok(ResolvedCommand {
            command: "docker".to_string(),
            args,
            cwd: instance_root.to_path_buf(),
        })
    }

    fn discover_processes(
        &self,
        profile: &RuntimeProfile,
        _instance_id: &str,
        components: &[&ComponentSpec],
    ) -> AppResult<Vec<DiscoveredRuntimeProcess>> {
        let container_name = profile.container_name.as_deref().ok_or_else(|| {
            AppError::InvalidInput("Docker 运行时缺少 container_name 配置".to_string())
        })?;
        let guest_workspace_root = profile.guest_workspace_root.as_deref().ok_or_else(|| {
            AppError::InvalidInput("Docker 运行时缺少 guest_workspace_root 配置".to_string())
        })?;

        let output = StdCommand::new("docker")
            .args([
                "exec",
                container_name,
                "bash",
                "-lc",
                "for pid in $(pgrep -f 'bot.py|main.py|start.sh' 2>/dev/null || true); do cmd=$(tr '\0' ' ' < /proc/$pid/cmdline 2>/dev/null || true); cwd=$(readlink -f /proc/$pid/cwd 2>/dev/null || true); printf '%s\t%s\t%s\n' \"$pid\" \"$cwd\" \"$cmd\"; done",
            ])
            .output()
            .map_err(|error| AppError::Process(format!("执行 Docker 进程探测失败: {}", error)))?;

        if !output.status.success() {
            return Err(AppError::Process(String::from_utf8_lossy(&output.stderr).trim().to_string()));
        }

        Ok(parse_docker_discovered_processes(
            &String::from_utf8_lossy(&output.stdout),
            guest_workspace_root,
            components,
        ))
    }
}

pub async fn probe_guest_process_alive(profile: &RuntimeProfile, pid: u32) -> AppResult<bool> {
    let output = build_docker_command(profile, &format!("kill -0 {pid} >/dev/null 2>&1"))
        .output()
        .await
        .map_err(|error| AppError::Process(format!("执行 Docker 进程存活探测失败: {}", error)))?;

    Ok(output.status.success())
}

pub async fn signal_guest_process(profile: &RuntimeProfile, pid: u32, signal: &str) -> AppResult<()> {
    let output = build_docker_command(profile, &format!("kill -{signal} {pid} >/dev/null 2>&1"))
        .output()
        .await
        .map_err(|error| AppError::Process(format!("执行 Docker 信号发送失败: {}", error)))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(AppError::Process(String::from_utf8_lossy(&output.stderr).trim().to_string()))
    }
}

pub fn build_docker_command(profile: &RuntimeProfile, script: &str) -> tokio::process::Command {
    let container_name = profile.container_name.as_deref().unwrap_or_default();
    let mut command = tokio::process::Command::new("docker");
    command.args(["exec", "-i"]);

    if let Some(user) = profile.user.as_deref().filter(|value| !value.trim().is_empty()) {
        command.args(["-u", user]);
    }

    command.args([container_name, "bash", "-lc", script]);
    command
}

fn parse_docker_discovered_processes(
    stdout: &str,
    guest_workspace_root: &str,
    components: &[&ComponentSpec],
) -> Vec<DiscoveredRuntimeProcess> {
    let root = guest_workspace_root.trim_end_matches('/');
    let mut discovered = Vec::new();

    for line in stdout.lines() {
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
                    runtime_kind: RuntimeKind::Docker,
                    status: ComponentLifecycleStatus::Running,
                    host_pid: None,
                    guest_pid: Some(pid),
                    terminal_session_name: None,
                });
                break;
            }
        }
    }

    discovered
}

fn shell_escape(value: &str) -> String {
    value.replace('\'', r#"'\''"#)
}