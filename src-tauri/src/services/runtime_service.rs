use sqlx::SqlitePool;

use crate::errors::{AppError, AppResult};
use crate::models::{
    InstanceLifecycleStatus, RuntimeKind, RuntimeProfile, RuntimeProbeIssue, RuntimeProbeResult,
    RuntimeProbeSeverity, WslDistributionInfo,
};
use crate::runtime::PathMapper;

pub async fn set_instance_runtime_profile(
    pool: &SqlitePool,
    instance_id: &str,
    runtime_profile: RuntimeProfile,
) -> AppResult<()> {
    let probe = validate_runtime_profile(&runtime_profile).await?;
    let blocking_errors = probe
        .issues
        .iter()
        .filter(|issue| issue.severity == RuntimeProbeSeverity::Error)
        .map(|issue| issue.message.clone())
        .collect::<Vec<_>>();

    if !blocking_errors.is_empty() {
        return Err(AppError::InvalidInput(blocking_errors.join("；")));
    }

    let runtime_profile_json = serde_json::to_string(&runtime_profile)?;

    let result = sqlx::query(
        r#"UPDATE instances
           SET runtime_profile = ?,
               updated_at = datetime('now')
           WHERE id = ?"#,
    )
    .bind(runtime_profile_json)
    .bind(instance_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("实例 {} 不存在", instance_id)));
    }

    Ok(())
}

pub async fn list_wsl_distributions() -> AppResult<Vec<WslDistributionInfo>> {
    if !cfg!(target_os = "windows") {
        return Ok(Vec::new());
    }

    let output = tokio::process::Command::new("wsl.exe")
        .args(["--list", "--verbose"])
        .output()
        .await
        .map_err(|error| AppError::Process(format!("执行 wsl.exe 失败: {}", error)))?;

    if !output.status.success() {
        return Err(AppError::Process(String::from_utf8_lossy(&output.stderr).trim().to_string()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_wsl_distribution_output(&stdout))
}

fn parse_wsl_distribution_output(stdout: &str) -> Vec<WslDistributionInfo> {
    let mut distributions = Vec::new();

    for line in stdout.lines().skip(1) {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let is_default = trimmed.starts_with('*');
        let normalized = trimmed.trim_start_matches('*').trim();
        let parts = normalized.split_whitespace().collect::<Vec<_>>();
        if parts.len() < 3 {
            continue;
        }

        let version = parts
            .last()
            .and_then(|value| value.parse::<u8>().ok())
            .unwrap_or(2);
        let state = parts[parts.len() - 2].to_string();
        let name = parts[..parts.len() - 2].join(" ");

        distributions.push(WslDistributionInfo {
            name,
            state,
            version,
            is_default,
        });
    }

    distributions
}

#[cfg(test)]
mod tests {
    use super::parse_wsl_distribution_output;

    #[test]
    fn parse_wsl_output_with_default_distribution() {
        let output = "  NAME            STATE           VERSION\n* Ubuntu-24.04    Running         2\n  Debian          Stopped         2\n";
        let distributions = parse_wsl_distribution_output(output);

        assert_eq!(distributions.len(), 2);
        assert_eq!(distributions[0].name, "Ubuntu-24.04");
        assert!(distributions[0].is_default);
        assert_eq!(distributions[1].state, "Stopped");
    }
}

pub async fn refresh_instance_runtime_state(
    pool: &SqlitePool,
    registry: &crate::components::ComponentRegistry,
    runtime_resolver: &crate::runtime::RuntimeResolver,
    process_manager: &crate::services::process_service::ProcessManager,
    instance_id: &str,
) -> AppResult<InstanceLifecycleStatus> {
    crate::services::lifecycle_service::refresh_instance_runtime_state(
        pool,
        registry,
        runtime_resolver,
        process_manager,
        instance_id,
    )
    .await
}

pub async fn validate_runtime_profile(profile: &RuntimeProfile) -> AppResult<RuntimeProbeResult> {
    let mut issues = Vec::new();

    match profile.kind {
        RuntimeKind::Local => {
            if profile.distribution.is_some() {
                issues.push(RuntimeProbeIssue {
                    severity: RuntimeProbeSeverity::Warning,
                    code: "local_distribution_ignored".to_string(),
                    message: "Local 运行时会忽略 WSL distribution 配置".to_string(),
                });
            }

            if profile.guest_workspace_root.is_some() {
                issues.push(RuntimeProbeIssue {
                    severity: RuntimeProbeSeverity::Warning,
                    code: "local_guest_workspace_ignored".to_string(),
                    message: "Local 运行时会忽略 guest_workspace_root 配置".to_string(),
                });
            }
        }
        RuntimeKind::Wsl2 => validate_wsl_runtime_profile(profile, &mut issues).await?,
        RuntimeKind::Docker => validate_docker_runtime_profile(profile, &mut issues).await?,
    }

    let ok = issues.iter().all(|issue| issue.severity != RuntimeProbeSeverity::Error);
    Ok(RuntimeProbeResult { ok, issues })
}

async fn validate_wsl_runtime_profile(
    profile: &RuntimeProfile,
    issues: &mut Vec<RuntimeProbeIssue>,
) -> AppResult<()> {
    if !cfg!(target_os = "windows") {
        issues.push(RuntimeProbeIssue {
            severity: RuntimeProbeSeverity::Error,
            code: "wsl_host_unsupported".to_string(),
            message: "WSL2 运行时仅支持 Windows 主机".to_string(),
        });
        return Ok(());
    }

    let Some(distribution) = profile.distribution.as_deref().filter(|value| !value.trim().is_empty()) else {
        issues.push(RuntimeProbeIssue {
            severity: RuntimeProbeSeverity::Error,
            code: "wsl_distribution_missing".to_string(),
            message: "WSL2 运行时缺少 distribution 配置".to_string(),
        });
        return Ok(());
    };

    let mapper = match PathMapper::for_runtime(profile, None) {
        Ok(mapper) => mapper,
        Err(_) => {
            issues.push(RuntimeProbeIssue {
                severity: RuntimeProbeSeverity::Error,
                code: "wsl_workspace_missing".to_string(),
                message: "WSL2 运行时缺少 guest_workspace_root 配置".to_string(),
            });
            return Ok(());
        }
    };
    let guest_workspace_root = mapper.workspace_root().to_string_lossy().to_string();

    if guest_workspace_root.trim().is_empty() {
        issues.push(RuntimeProbeIssue {
            severity: RuntimeProbeSeverity::Error,
            code: "wsl_workspace_missing".to_string(),
            message: "WSL2 运行时缺少 guest_workspace_root 配置".to_string(),
        });
        return Ok(());
    }

    if profile.user.as_deref().unwrap_or_default().trim().is_empty() {
        issues.push(RuntimeProbeIssue {
            severity: RuntimeProbeSeverity::Warning,
            code: "wsl_user_missing".to_string(),
            message: "未指定 WSL 用户，将使用发行版默认用户".to_string(),
        });
    }

    let distributions = list_wsl_distributions().await?;
    let selected = distributions.iter().find(|item| item.name == distribution);
    match selected {
        Some(item) => {
            if item.version != 2 {
                issues.push(RuntimeProbeIssue {
                    severity: RuntimeProbeSeverity::Error,
                    code: "wsl_version_not_supported".to_string(),
                    message: format!("发行版 {} 当前不是 WSL2", distribution),
                });
            }

            if item.state != "Running" {
                issues.push(RuntimeProbeIssue {
                    severity: RuntimeProbeSeverity::Warning,
                    code: "wsl_distribution_stopped".to_string(),
                    message: format!("发行版 {} 当前未运行，首次探测可能较慢", distribution),
                });
            }
        }
        None => {
            issues.push(RuntimeProbeIssue {
                severity: RuntimeProbeSeverity::Error,
                code: "wsl_distribution_not_found".to_string(),
                message: format!("未找到 WSL 发行版 {}", distribution),
            });
            return Ok(());
        }
    }

    if !crate::runtime::wsl::tmux_available(profile).await? {
        issues.push(RuntimeProbeIssue {
            severity: RuntimeProbeSeverity::Warning,
            code: "wsl_tmux_missing".to_string(),
            message: "WSL2 环境中未检测到 tmux，将无法提供跨重启终端重连能力".to_string(),
        });
    }

    if !probe_wsl_directory(profile, &guest_workspace_root).await? {
        issues.push(RuntimeProbeIssue {
            severity: RuntimeProbeSeverity::Error,
            code: "wsl_workspace_not_found".to_string(),
            message: format!("WSL guest 工作区不存在: {}", guest_workspace_root),
        });
    }

    Ok(())
}

async fn validate_docker_runtime_profile(
    profile: &RuntimeProfile,
    issues: &mut Vec<RuntimeProbeIssue>,
) -> AppResult<()> {
    let Some(container_name) = profile.container_name.as_deref().filter(|value| !value.trim().is_empty()) else {
        issues.push(RuntimeProbeIssue {
            severity: RuntimeProbeSeverity::Error,
            code: "docker_container_missing".to_string(),
            message: "Docker 运行时缺少 container_name 配置".to_string(),
        });
        return Ok(());
    };

    let mapper = match PathMapper::for_runtime(profile, None) {
        Ok(mapper) => mapper,
        Err(_) => {
            issues.push(RuntimeProbeIssue {
                severity: RuntimeProbeSeverity::Error,
                code: "docker_workspace_missing".to_string(),
                message: "Docker 运行时缺少 guest_workspace_root 配置".to_string(),
            });
            return Ok(());
        }
    };
    let guest_workspace_root = mapper.workspace_root().to_string_lossy().to_string();

    if guest_workspace_root.trim().is_empty() {
        issues.push(RuntimeProbeIssue {
            severity: RuntimeProbeSeverity::Error,
            code: "docker_workspace_missing".to_string(),
            message: "Docker 运行时缺少 guest_workspace_root 配置".to_string(),
        });
        return Ok(());
    }

    let inspect = tokio::process::Command::new("docker")
        .args(["inspect", "-f", "{{.State.Running}}", container_name])
        .output()
        .await
        .map_err(|error| AppError::Process(format!("执行 Docker inspect 失败: {}", error)))?;

    if !inspect.status.success() {
        issues.push(RuntimeProbeIssue {
            severity: RuntimeProbeSeverity::Error,
            code: "docker_container_not_found".to_string(),
            message: format!("未找到 Docker 容器 {}", container_name),
        });
        return Ok(());
    }

    if String::from_utf8_lossy(&inspect.stdout).trim() != "true" {
        issues.push(RuntimeProbeIssue {
            severity: RuntimeProbeSeverity::Warning,
            code: "docker_container_stopped".to_string(),
            message: format!("Docker 容器 {} 当前未运行", container_name),
        });
    } else if !crate::runtime::docker::tmux_available(profile).await? {
        issues.push(RuntimeProbeIssue {
            severity: RuntimeProbeSeverity::Warning,
            code: "docker_tmux_missing".to_string(),
            message: "Docker 容器中未检测到 tmux，将无法提供跨重启终端重连能力".to_string(),
        });
    }

    if !probe_docker_directory(profile, &guest_workspace_root).await? {
        issues.push(RuntimeProbeIssue {
            severity: RuntimeProbeSeverity::Error,
            code: "docker_workspace_not_found".to_string(),
            message: format!("Docker guest 工作区不存在: {}", guest_workspace_root),
        });
    }

    Ok(())
}

async fn probe_wsl_directory(profile: &RuntimeProfile, guest_workspace_root: &str) -> AppResult<bool> {
    let distribution = profile.distribution.as_deref().unwrap_or_default();
    let escaped = guest_workspace_root.replace('\'', r#"'\''"#);
    let mut command = tokio::process::Command::new("wsl.exe");
    command.args(["--distribution", distribution]);

    if let Some(user) = profile.user.as_deref().filter(|value| !value.trim().is_empty()) {
        command.args(["--user", user]);
    }

    command.args([
        "--exec",
        "bash",
        "-lc",
        &format!("test -d '{}'", escaped),
    ]);

    let output = command
        .output()
        .await
        .map_err(|error| AppError::Process(format!("执行 WSL 工作区探测失败: {}", error)))?;

    Ok(output.status.success())
}

async fn probe_docker_directory(profile: &RuntimeProfile, guest_workspace_root: &str) -> AppResult<bool> {
    let escaped = guest_workspace_root.replace('\'', r#"'\''"#);
    let output = crate::runtime::docker::build_docker_command(profile, &format!("test -d '{}'", escaped))
        .output()
        .await
        .map_err(|error| AppError::Process(format!("执行 Docker 工作区探测失败: {}", error)))?;

    Ok(output.status.success())
}