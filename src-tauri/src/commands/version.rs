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

    // 可选备份
    if create_backup.unwrap_or(false) {
        let _ = app_handle.emit(&event_name, "正在创建备份...");
        version_service::create_backup(&state.db, &instance_id, &item_type, &component_dir)
            .await?;
        let _ = app_handle.emit(&event_name, "备份创建完成");
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
    let current_version =
        version_service::get_local_commit(&component_dir).unwrap_or_default();
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

    // 删除现有目录然后复制备份
    if component_dir.exists() {
        std::fs::remove_dir_all(&component_dir)
            .map_err(|e| AppError::FileSystem(format!("删除组件目录失败: {}", e)))?;
    }
    crate::services::download_service::copy_dir_recursive(&backup_path, &component_dir)
        .map_err(|e| AppError::FileSystem(format!("恢复备份数据失败: {}", e)))?;

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
pub async fn check_launcher_update(
    channel: Option<String>,
) -> AppResult<UpdateCheckResponse> {
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
