use sqlx::SqlitePool;

use crate::errors::{AppError, AppResult};
use crate::models::{RuntimeProfile, WslDistributionInfo};

pub async fn set_instance_runtime_profile(
    pool: &SqlitePool,
    instance_id: &str,
    runtime_profile: RuntimeProfile,
) -> AppResult<()> {
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

    Ok(distributions)
}