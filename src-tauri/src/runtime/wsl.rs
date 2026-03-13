use std::path::{Path, PathBuf};
use std::process::Command as StdCommand;

use crate::components::ComponentSpec;
use crate::errors::{AppError, AppResult};
use crate::models::{ComponentLifecycleStatus, ComponentType, RuntimeKind, RuntimeProfile};
use crate::runtime::{DiscoveredRuntimeProcess, ResolvedCommand, RuntimeAdapter, TerminalSessionInfo};

#[derive(Debug, Clone, Default)]
pub struct Wsl2RuntimeAdapter;

impl RuntimeAdapter for Wsl2RuntimeAdapter {
    fn runtime_kind(&self) -> RuntimeKind {
        RuntimeKind::Wsl2
    }

    fn resolve_component_command(
        &self,
        instance_id: &str,
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
        args.push(guest_cwd.clone());
        args.push("--exec".to_string());
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
                format!("cd '{guest_cwd}' && echo {marker}=$$; exec {python} {}", component.startup_target)
            }
            ComponentType::NapCat => {
                let account_suffix = qq_account
                    .map(|account| format!(" {}", shell_escape(account)))
                    .unwrap_or_default();
                format!("cd '{guest_cwd}' && echo {marker}=$$; exec bash start.sh{account_suffix}")
            }
            ComponentType::NapCatAdapter => {
                let python = profile
                    .python
                    .path
                    .clone()
                    .unwrap_or_else(|| "python3".to_string());
                format!("cd '{guest_cwd}' && echo {marker}=$$; exec {python} {}", component.startup_target)
            }
        };
        let session_name = terminal_session_name(instance_id, component.component.internal_key());
        args.push(format!(
            "if command -v tmux >/dev/null 2>&1; then SESSION='{session_name}'; tmux has-session -t \"$SESSION\" 2>/dev/null || tmux new-session -d -s \"$SESSION\" \"{inner_script}\"; exec tmux attach-session -t \"$SESSION\"; else {inner_script}; fi"
        ));

        Ok(ResolvedCommand {
            command: "wsl.exe".to_string(),
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
        parse_wsl_discovered_processes(profile, &stdout, guest_workspace_root, instance_id, components)
    }
}

fn parse_wsl_discovered_processes(
    profile: &RuntimeProfile,
    stdout: &str,
    guest_workspace_root: &str,
    instance_id: &str,
    components: &[&ComponentSpec],
) -> AppResult<Vec<DiscoveredRuntimeProcess>> {
    parse_wsl_discovered_processes_with_verifier(
        profile,
        stdout,
        guest_workspace_root,
        instance_id,
        components,
        |session_name| tmux_session_exists(profile, session_name).unwrap_or(false),
    )
}

#[cfg(test)]
mod tests {
    use crate::components::ComponentRegistry;
    use crate::models::ComponentType;

    use super::parse_wsl_discovered_processes_with_verifier;

    #[test]
    fn parse_wsl_processes_matches_component_by_cwd_and_cmdline() {
        let registry = ComponentRegistry::new();
        let components = vec![
            registry.get(ComponentType::Main).expect("缺少 main spec"),
            registry.get(ComponentType::NapCatAdapter).expect("缺少 adapter spec"),
        ];

        let stdout = "123\t/home/mai/demo/MaiBot\tpython3 bot.py\n456\t/home/mai/demo/MaiBot-Napcat-Adapter\tpython3 main.py\n";
        let mut profile = crate::models::RuntimeProfile::local("demo", None);
        profile.kind = crate::models::RuntimeKind::Wsl2;
        let discovered = parse_wsl_discovered_processes_with_verifier(
            &profile,
            stdout,
            "/home/mai/demo",
            "inst-1",
            &components,
            |_| true,
        )
        .expect("解析 WSL 进程失败");

        assert_eq!(discovered.len(), 2);
        assert_eq!(discovered[0].component, ComponentType::Main);
        assert_eq!(discovered[0].guest_pid, Some(123));
        assert_eq!(discovered[1].component, ComponentType::NapCatAdapter);
        assert_eq!(discovered[0].terminal_session.as_ref().map(|session| session.name.as_str()), Some("mailauncher-inst-1-main"));
        assert_eq!(discovered[0].terminal_session.as_ref().map(|session| session.verified), Some(true));
    }

    #[test]
    fn parse_wsl_processes_without_verified_session_keeps_process_only() {
        let registry = ComponentRegistry::new();
        let components = vec![registry.get(ComponentType::Main).expect("缺少 main spec")];

        let stdout = "123\t/home/mai/demo/MaiBot\tpython3 bot.py\n";
        let mut profile = crate::models::RuntimeProfile::local("demo", None);
        profile.kind = crate::models::RuntimeKind::Wsl2;
        let discovered = parse_wsl_discovered_processes_with_verifier(
            &profile,
            stdout,
            "/home/mai/demo",
            "inst-1",
            &components,
            |_| false,
        )
        .expect("解析 WSL 进程失败");

        assert_eq!(discovered.len(), 1);
        assert_eq!(discovered[0].guest_pid, Some(123));
        assert!(discovered[0].terminal_session.is_none());
    }
}

fn parse_wsl_discovered_processes_with_verifier<F>(
    profile: &RuntimeProfile,
    stdout: &str,
    guest_workspace_root: &str,
    instance_id: &str,
    components: &[&ComponentSpec],
    session_exists: F,
) -> AppResult<Vec<DiscoveredRuntimeProcess>>
where
    F: Fn(&str) -> bool,
{
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
                let session_name = terminal_session_name(instance_id, component.component.internal_key());
                let terminal_session = if session_exists(&session_name) {
                    Some(TerminalSessionInfo {
                        name: session_name,
                        verified: true,
                    })
                } else {
                    None
                };

                discovered.push(DiscoveredRuntimeProcess {
                    component: component.component,
                    runtime_kind: profile.kind,
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
    let distribution = profile.distribution.as_deref().unwrap_or_default();
    let mut command = StdCommand::new("wsl.exe");
    command.args(["--distribution", distribution]);

    if let Some(user) = profile.user.as_deref().filter(|value| !value.trim().is_empty()) {
        command.args(["--user", user]);
    }

    let output = command
    .args([
        "--exec",
        "bash",
        "-lc",
        &format!("tmux has-session -t '{}' >/dev/null 2>&1", shell_escape(session_name)),
    ])
    .output()
    .map_err(|error| AppError::Process(format!("执行 WSL tmux 会话探测失败: {}", error)))?;

    Ok(output.status.success())
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

pub async fn tmux_available(profile: &RuntimeProfile) -> AppResult<bool> {
    let output = build_wsl_command(profile, "command -v tmux >/dev/null 2>&1")
        .output()
        .await
        .map_err(|error| AppError::Process(format!("执行 tmux 探测失败: {}", error)))?;

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
    let output = build_wsl_command(profile, &script)
        .output()
        .await
        .map_err(|error| AppError::Process(format!("读取 tmux 历史失败: {}", error)))?;

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
        let output = build_wsl_command(profile, &script)
            .output()
            .await
            .map_err(|error| AppError::Process(format!("发送 tmux 输入失败: {}", error)))?;

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
    let output = build_wsl_command(profile, &script)
        .output()
        .await
        .map_err(|error| AppError::Process(format!("调整 tmux 窗口大小失败: {}", error)))?;

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

fn sanitize_session_token(value: &str) -> String {
    value
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' })
        .collect()
}

fn shell_escape(value: &str) -> String {
    value.replace('\'', r#"'\''"#)
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