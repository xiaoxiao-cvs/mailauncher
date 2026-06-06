/// 版本管理 Tauri 命令
///
/// 对应前端版本查询、组件更新、备份恢复等 API。
use tauri::{AppHandle, Emitter, State};
use tracing::info;

use crate::errors::{AppError, AppResult};
use crate::models::download::DownloadItemType;
use crate::models::update::*;
use crate::models::{SuccessResponse, UpdateHistory, VersionBackup};
use crate::services::version_service;
use crate::state::AppState;

// ==================== 辅助：获取实例基础目录 ====================

/// 从实例 ID 解析出实例基础目录
async fn resolve_instance_base_dir(
    pool: &sqlx::SqlitePool,
    instance_id: &str,
) -> AppResult<std::path::PathBuf> {
    let instance = crate::services::instance_service::get_instance(pool, instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;
    let instance_path = instance
        .instance_path
        .ok_or_else(|| AppError::NotFound("实例路径未设置".to_string()))?;
    Ok(crate::utils::platform::get_instances_dir().join(&instance_path))
}

// ==================== 命令 ====================

/// 获取实例各组件版本信息
///
/// 对应 Python GET `/instances/{id}/components/version`
#[tauri::command]
pub async fn get_instance_components_version(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<Vec<ComponentVersionInfo>> {
    let base_dir = resolve_instance_base_dir(&state.db, &instance_id).await?;
    version_service::get_instance_components_version(&state.db, &instance_id, &base_dir).await
}

/// 检查单个组件是否有更新
///
/// 对应 Python GET `/instances/{id}/components/{component}/check-update`
#[tauri::command]
pub async fn check_component_update(
    state: State<'_, AppState>,
    instance_id: String,
    component: String,
) -> AppResult<ComponentUpdateCheck> {
    let item_type = parse_component_type(&component)?;
    let base_dir = resolve_instance_base_dir(&state.db, &instance_id).await?;
    version_service::check_component_update(&state.db, &instance_id, &item_type, &base_dir).await
}

/// 更新组件到最新版本
///
/// 对应 Python POST `/instances/{id}/components/{component}/update`
#[tauri::command]
pub async fn update_component(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    instance_id: String,
    component: String,
    create_backup: Option<bool>,
    target_version: Option<String>,
) -> AppResult<SuccessResponse> {
    let item_type = parse_component_type(&component)?;
    let base_dir = resolve_instance_base_dir(&state.db, &instance_id).await?;

    let repo = version_service::get_github_repo(&item_type);
    let component_dir = base_dir.join(repo.folder);

    let event_name = format!("update-log-{}-{}", instance_id, component);

    // 更新前自动备份配置与数据(代码由 Git 兜底无需备份);默认开,可显式传 false 关闭。
    // 备份失败直接中止更新——宁可不更新,也不让用户在没有退路的情况下动数据。
    if create_backup.unwrap_or(true) {
        let _ = app_handle.emit(&event_name, "正在备份配置与数据...");
        match version_service::backup_component_data(
            &state.db,
            &instance_id,
            &item_type,
            &component_dir,
        )
        .await?
        {
            Some(id) => {
                let _ = app_handle.emit(&event_name, format!("配置与数据已备份: {}", id));
            }
            None => {
                let _ = app_handle.emit(&event_name, "无配置/数据需备份,跳过");
            }
        }
    }

    // 执行更新 (git pull / checkout)
    let _ = app_handle.emit(&event_name, "正在更新组件...");
    version_service::update_component_git(
        &component_dir,
        target_version.as_deref(),
        &app_handle,
        &event_name,
    )
    .await?;

    // 记录更新历史
    let current_version = version_service::get_local_commit(&component_dir).unwrap_or_default();
    sqlx::query(
        "INSERT INTO update_history (instance_id, component, from_version, to_version, update_method, status, created_at)
         VALUES (?, ?, ?, ?, 'git', 'completed', datetime('now'))",
    )
    .bind(&instance_id)
    .bind(&component)
    .bind("")
    .bind(&current_version)
    .execute(&state.db)
    .await
    .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;

    let _ = app_handle.emit(&event_name, "组件更新完成");
    info!("组件更新完成: {} / {}", instance_id, component);

    Ok(SuccessResponse::ok("组件更新成功"))
}

/// 获取备份列表
///
/// 对应 Python GET `/instances/{id}/backups`
#[tauri::command]
pub async fn get_backups(
    state: State<'_, AppState>,
    instance_id: String,
    component: Option<String>,
) -> AppResult<Vec<VersionBackup>> {
    version_service::get_backups(&state.db, &instance_id, component.as_deref()).await
}

/// 恢复备份
#[tauri::command]
pub async fn restore_backup(
    state: State<'_, AppState>,
    instance_id: String,
    backup_id: String,
) -> AppResult<SuccessResponse> {
    // 查询备份记录
    let backup = sqlx::query_as::<_, VersionBackup>(
        "SELECT * FROM version_backups WHERE id = ? AND instance_id = ?",
    )
    .bind(&backup_id)
    .bind(&instance_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?
    .ok_or_else(|| AppError::NotFound("备份不存在".to_string()))?;

    // 恢复逻辑：将备份目录复制回组件目录
    let backup_path = std::path::PathBuf::from(&backup.backup_path);
    if !backup_path.exists() {
        return Err(AppError::FileSystem("备份文件已丢失".to_string()));
    }

    let base_dir = resolve_instance_base_dir(&state.db, &instance_id).await?;
    let component_dir = base_dir.join(&backup.component);

    // databak_ 前缀 = 更新前的"配置+数据"快照,叠加式恢复(只覆盖 config/data,保住代码);
    // 其它(旧式整目录备份)走整目录原子替换。
    if backup.id.starts_with("databak_") {
        version_service::restore_data_backup(&backup_path, &component_dir)?;
    } else {
        version_service::restore_full_backup(&backup_path, &component_dir)?;
    }

    info!(
        "恢复备份完成: {} / {} ← {}",
        instance_id, backup.component, backup_id
    );

    Ok(SuccessResponse::ok("备份恢复成功"))
}

/// 获取更新历史
///
/// 对应 Python GET `/instances/{id}/update-history`
#[tauri::command]
pub async fn get_update_history(
    state: State<'_, AppState>,
    instance_id: String,
    component: Option<String>,
    limit: Option<i64>,
) -> AppResult<Vec<UpdateHistory>> {
    version_service::get_update_history(&state.db, &instance_id, component.as_deref(), limit).await
}

/// 获取组件 GitHub Releases
///
/// 对应 Python GET `/versions/{component}/releases`
#[tauri::command]
pub async fn get_component_releases(
    component: String,
    limit: Option<usize>,
) -> AppResult<Vec<GitHubRelease>> {
    let item_type = parse_component_type(&component)?;
    let repo = version_service::get_github_repo(&item_type);
    version_service::get_releases(repo.owner, repo.name, limit).await
}

/// 检查启动器自身更新
///
/// 对应 Python GET `/updates/check`
#[tauri::command]
pub async fn check_launcher_update(channel: Option<String>) -> AppResult<UpdateCheckResponse> {
    let ch = channel.unwrap_or_else(|| "main".to_string());
    version_service::check_launcher_update(&ch).await
}

/// 获取启动器某渠道的版本列表
///
/// 对应 Python GET `/updates/versions`
#[tauri::command]
pub async fn get_channel_versions(
    channel: Option<String>,
    limit: Option<usize>,
) -> AppResult<ChannelVersionsResponse> {
    let ch = channel.unwrap_or_else(|| "main".to_string());
    version_service::get_channel_versions(&ch, limit).await
}

/// 安装启动器自更新(选定通道/版本):下载安装包 -> 用 updater 公钥验签 -> 拉起安装器并退出本应用。
///
/// Tauri updater 插件只能更到最新、不支持多通道+选版本,故走此自研路径,但沿用同一套签名校验
/// (与 tauri.conf 同一把公钥)。仅 Windows 支持应用内安装,其它平台引导手动下载。
/// 下载/安装进度经 `launcher-update-progress` 事件推送。
#[tauri::command]
pub async fn install_launcher_update(
    app: AppHandle,
    channel: String,
    version: Option<String>,
) -> AppResult<()> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, channel, version);
        Err(AppError::InvalidInput(
            "当前平台暂不支持应用内自更新,请到 Releases 页面手动下载安装".to_string(),
        ))
    }
    #[cfg(target_os = "windows")]
    {
        let target = version_service::resolve_install_target(&channel, version.as_deref()).await?;
        info!(
            "[自更新] 目标版本 {},下载 {}",
            target.version, target.installer_name
        );
        let bytes = download_installer_with_progress(&app, &target.installer_url).await?;

        // 安全关键:用内置 updater 公钥校验签名,未过不安装
        let sig = version_service::fetch_text(&target.sig_url).await?;
        version_service::verify_launcher_signature(&bytes, &sig)?;
        info!("[自更新] 签名校验通过,准备安装 {}", target.version);

        let installer_path = std::env::temp_dir().join(&target.installer_name);
        std::fs::write(&installer_path, &bytes)?;
        let _ = app.emit(
            "launcher-update-progress",
            serde_json::json!({ "phase": "installing", "version": target.version }),
        );
        std::process::Command::new(&installer_path)
            .spawn()
            .map_err(|e| AppError::Process(format!("启动安装器失败: {}", e)))?;
        // 给安装器拉起的时间,随后退出本进程以便覆盖被占用的文件
        tokio::time::sleep(std::time::Duration::from_millis(800)).await;
        app.exit(0);
        Ok(())
    }
}

/// 流式下载安装包,经 launcher-update-progress 事件回报下载进度。
#[cfg(target_os = "windows")]
async fn download_installer_with_progress(app: &AppHandle, url: &str) -> AppResult<Vec<u8>> {
    use futures_util::StreamExt;

    let resp = version_service::github_client()
        .get(url)
        .send()
        .await
        .map_err(|e| AppError::Network(format!("下载安装包失败: {}", e)))?;
    if !resp.status().is_success() {
        return Err(AppError::Network(format!(
            "下载安装包失败: HTTP {}",
            resp.status()
        )));
    }
    let total = resp.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut buf: Vec<u8> = Vec::with_capacity(total as usize);
    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::Network(format!("下载中断: {}", e)))?;
        downloaded += chunk.len() as u64;
        buf.extend_from_slice(&chunk);
        let percent = if total > 0 {
            (downloaded as f64 / total as f64 * 100.0) as u32
        } else {
            0
        };
        let _ = app.emit(
            "launcher-update-progress",
            serde_json::json!({
                "phase": "downloading",
                "downloaded": downloaded,
                "total": total,
                "percent": percent
            }),
        );
    }
    Ok(buf)
}

// ==================== 工具函数 ====================

/// 解析组件类型字符串
fn parse_component_type(component: &str) -> AppResult<DownloadItemType> {
    match component.to_lowercase().as_str() {
        "maibot" | "mai-bot" => Ok(DownloadItemType::Maibot),
        "napcat" => Ok(DownloadItemType::Napcat),
        "napcat-adapter" | "napcatadapter" | "adapter" => Ok(DownloadItemType::NapcatAdapter),
        "lpmm" => Ok(DownloadItemType::Lpmm),
        _ => Err(AppError::InvalidInput(format!(
            "未知组件类型: {}",
            component
        ))),
    }
}
