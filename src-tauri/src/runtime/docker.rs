use std::path::Path;
use std::process::Command as StdCommand;

use crate::components::ComponentSpec;
use crate::errors::{AppError, AppResult};
use crate::models::{ComponentLifecycleStatus, ComponentType, RuntimeKind, RuntimeProfile};
use crate::runtime::{DiscoveredRuntimeProcess, PathMapper, ResolvedCommand, RuntimeAdapter, TerminalSessionInfo};

#[derive(Debug, Clone, Default)]
pub struct DockerRuntimeAdapter;

impl RuntimeAdapter for DockerRuntimeAdapter {
    fn runtime_kind(&self) -> RuntimeKind {
        RuntimeKind::Docker
    }

    fn resolve_component_command(
        &self,
        instance_id: &str,
        instance_root: &Path,
        component: &ComponentSpec,
        profile: &RuntimeProfile,
        qq_account: Option<&str>,
    ) -> AppResult<ResolvedCommand> {
        let container_name = profile.container_name.as_deref().ok_or_else(|| {
            AppError::InvalidInput("Docker 运行时缺少 container_name 配置".to_string())
        })?;
        let mapper = PathMapper::for_runtime(profile, None)?;
        let guest_cwd = mapper.component_dir_string(component);
        let mut args = vec!["exec".to_string(), "-i".to_string()];

        if let Some(user) = profile.user.as_deref().filter(|value| !value.trim().is_empty()) {
            args.push("-u".to_string());
            args.push(user.to_string());
        }

        args.push(container_name.to_string());
        args.push("bash".to_string());
        args.push("-lc".to_string());

        let marker = "__MAI_GUEST_PID__";
        let inner_script = match component.component {
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
        let session_name = terminal_session_name(instance_id, component.component.internal_key());
        args.push(format!(
            "if command -v tmux >/dev/null 2>&1; then SESSION='{session_name}'; tmux has-session -t \"$SESSION\" 2>/dev/null || tmux new-session -d -s \"$SESSION\" \"{inner_script}\"; exec tmux attach-session -t \"$SESSION\"; else {inner_script}; fi"
        ));

        Ok(ResolvedCommand {
            command: "docker".to_string(),
            args,
            cwd: instance_root.to_path_buf(),
        })
    }

    fn discover_processes(
        &self,
        profile: &RuntimeProfile,
        instance_id: &str,
        components: &[&ComponentSpec],
    ) -> AppResult<Vec<DiscoveredRuntimeProcess>> {
        let container_name = profile.container_name.as_deref().ok_or_else(|| {
            AppError::InvalidInput("Docker 运行时缺少 container_name 配置".to_string())
        })?;
        let mapper = PathMapper::for_runtime(profile, None)?;
        let guest_workspace_root = mapper.workspace_root().to_string_lossy().to_string();

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

        parse_docker_discovered_processes(
            profile,
            &String::from_utf8_lossy(&output.stdout),
            &guest_workspace_root,
            instance_id,
            components,
        )
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

pub async fn tmux_available(profile: &RuntimeProfile) -> AppResult<bool> {
    let output = build_docker_command(profile, "command -v tmux >/dev/null 2>&1")
        .output()
        .await
        .map_err(|error| AppError::Process(format!("执行 Docker tmux 探测失败: {}", error)))?;

    Ok(output.status.success())
}

pub async fn capture_tmux_history(
    profile: &RuntimeProfile,
    session_name: &str,
    lines: usize,
) -> AppResult<Vec<String>> {
    let script = format!(
        "tmux capture-pane -pt '{}' -S -{}",
        shell_escape(session_name),
        lines.max(1)
    );
    let output = build_docker_command(profile, &script)
        .output()
        .await
        .map_err(|error| AppError::Process(format!("读取 Docker tmux 历史失败: {}", error)))?;

    if !output.status.success() {
        return Err(AppError::Process(String::from_utf8_lossy(&output.stderr).trim().to_string()));
    }

    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(|line| format!("{}\n", line))
        .collect())
}

pub async fn send_tmux_input(profile: &RuntimeProfile, session_name: &str, data: &str) -> AppResult<()> {
    for token in tmux_key_tokens(data) {
        let script = format!(
            "tmux send-keys -t '{}' {}",
            shell_escape(session_name),
            token
        );
        let output = build_docker_command(profile, &script)
            .output()
            .await
            .map_err(|error| AppError::Process(format!("发送 Docker tmux 输入失败: {}", error)))?;

        if !output.status.success() {
            return Err(AppError::Process(String::from_utf8_lossy(&output.stderr).trim().to_string()));
        }
    }

    Ok(())
}

pub async fn resize_tmux_session(
    profile: &RuntimeProfile,
    session_name: &str,
    rows: u16,
    cols: u16,
) -> AppResult<()> {
    let script = format!(
        "tmux resize-window -t '{}' -x {} -y {}",
        shell_escape(session_name),
        cols,
        rows
    );
    let output = build_docker_command(profile, &script)
        .output()
        .await
        .map_err(|error| AppError::Process(format!("调整 Docker tmux 窗口大小失败: {}", error)))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(AppError::Process(String::from_utf8_lossy(&output.stderr).trim().to_string()))
    }
}

pub fn terminal_session_name(instance_id: &str, component: &str) -> String {
    format!(
        "mailauncher-{}-{}",
        sanitize_session_token(instance_id),
        sanitize_session_token(component)
    )
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
    profile: &RuntimeProfile,
    stdout: &str,
    guest_workspace_root: &str,
    instance_id: &str,
    components: &[&ComponentSpec],
) -> AppResult<Vec<DiscoveredRuntimeProcess>> {
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
                let session_name = terminal_session_name(instance_id, component.component.internal_key());
                let terminal_session = if tmux_session_exists(profile, &session_name)? {
                    Some(TerminalSessionInfo {
                        name: session_name,
                        verified: true,
                    })
                } else {
                    None
                };
                discovered.push(DiscoveredRuntimeProcess {
                    component: component.component,
                    runtime_kind: RuntimeKind::Docker,
                    status: ComponentLifecycleStatus::Running,
                    host_pid: None,
                    guest_pid: Some(pid),
                    terminal_session,
                });
                break;
            }
        }
    }

    Ok(discovered)
}

fn tmux_session_exists(profile: &RuntimeProfile, session_name: &str) -> AppResult<bool> {
    let container_name = profile.container_name.as_deref().unwrap_or_default();
    let mut command = StdCommand::new("docker");
    command.args(["exec", "-i"]);

    if let Some(user) = profile.user.as_deref().filter(|value| !value.trim().is_empty()) {
        command.args(["-u", user]);
    }

    let output = command
    .args([
        container_name,
        "bash",
        "-lc",
        &format!("tmux has-session -t '{}' >/dev/null 2>&1", shell_escape(session_name)),
    ])
    .output()
    .map_err(|error| AppError::Process(format!("执行 Docker tmux 会话探测失败: {}", error)))?;

    Ok(output.status.success())
}

fn shell_escape(value: &str) -> String {
    value.replace('\'', r#"'\''"#)
}

fn sanitize_session_token(value: &str) -> String {
    value
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' })
        .collect()
}

fn tmux_key_tokens(data: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let bytes = data.as_bytes();
    let mut index = 0;

    while index < bytes.len() {
        match bytes[index] {
            b'\r' => tokens.push("Enter".to_string()),
            0x7f => tokens.push("BSpace".to_string()),
            0x03 => tokens.push("C-c".to_string()),
            0x1b if bytes.get(index + 1) == Some(&b'[') && bytes.len() > index + 2 => {
                let token = match bytes[index + 2] {
                    b'A' => Some("Up"),
                    b'B' => Some("Down"),
                    b'C' => Some("Right"),
                    b'D' => Some("Left"),
                    _ => None,
                };
                if let Some(token) = token {
                    tokens.push(token.to_string());
                    index += 2;
                }
            }
            byte if byte.is_ascii_control() => {}
            _ => {
                let ch = data[index..].chars().next().unwrap_or_default();
                tokens.push(format!("-l '{}'", shell_escape(&ch.to_string())));
                index += ch.len_utf8() - 1;
            }
        }

        index += 1;
    }

    tokens
}