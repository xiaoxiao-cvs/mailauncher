/// 下载管理 Tauri 命令
///
/// 对应前端下载相关 API 调用。
/// 任务创建后异步执行，通过 Tauri 事件推送进度。
///
/// 事件名格式：
/// - `download-log-{taskId}` — 日志消息（字符串载荷）
/// - `download-status-{taskId}` — 状态变更（字符串载荷）
/// - `download-progress-{taskId}` — 结构化进度（JSON 载荷）
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use tracing::{error, info};

use crate::errors::{AppError, AppResult};
use crate::models::download::*;
use crate::services::{download_service, install_service, instance_service};
use crate::state::AppState;
use crate::utils::platform;

/// 前端进度事件载荷
#[derive(Debug, Clone, Serialize)]
struct DownloadProgressEvent {
    /// 百分比 0-100
    percentage: f64,
    /// 描述消息
    message: String,
    /// 当前状态
    status: String,
}

/// 向前端推送结构化进度事件
fn emit_progress(app: &AppHandle, task_id: &str, percentage: f64, message: &str, status: &str) {
    let event_name = format!("download-progress-{}", task_id);
    let _ = app.emit(
        &event_name,
        DownloadProgressEvent {
            percentage,
            message: message.to_string(),
            status: status.to_string(),
        },
    );
}

/// 创建并执行下载任务
///
/// 对应 Python POST `/downloads` 端点。
/// 创建任务后立即返回任务 ID，后台异步执行安装流程。
#[tauri::command]
pub async fn create_download_task(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    data: DownloadTaskCreate,
) -> AppResult<DownloadTask> {
    // 验证部署路径安全性
    let deploy_path = data.deployment_path.as_deref().unwrap_or(&data.instance_name);
    validate_deployment_path(deploy_path)?;

    let task = state.download_manager.create_task(data).await;
    let task_id = task.id.clone();

    info!("创建下载任务: {}", task_id);

    // 后台异步执行
    let dm = state.download_manager.clone();
    let pool = state.db.clone();
    let app = app_handle.clone();

    tokio::spawn(async move {
        if let Err(e) = execute_download_task(&app, &dm, &pool, &task_id).await {
            error!("下载任务 {} 执行失败: {}", task_id, e);

            // 清理失败任务的整个实例目录（避免残留不完整文件）
            if let Some(task) = dm.get_task(&task_id).await {
                let instances_dir = platform::get_instances_dir();
                let instance_dir = instances_dir.join(&task.deployment_path);
                if instance_dir.exists() {
                    info!("清理失败任务的残留实例目录: {:?}", instance_dir);
                    let _ = std::fs::remove_dir_all(&instance_dir);
                }
            }

            dm.mark_failed(&task_id, e.to_string()).await;
            emit_progress(&app, &task_id, 0.0, &e.to_string(), "failed");
            let _ = app.emit(
                &format!("download-status-{}", task_id),
                "failed",
            );
        }
    });

    Ok(task)
}

/// 获取下载任务详情
#[tauri::command]
pub async fn get_download_task(
    state: State<'_, AppState>,
    task_id: String,
) -> AppResult<DownloadTask> {
    state
        .download_manager
        .get_task(&task_id)
        .await
        .ok_or_else(|| AppError::NotFound(format!("任务 {} 不存在", task_id)))
}

/// 获取所有下载任务
#[tauri::command]
pub async fn get_all_download_tasks(
    state: State<'_, AppState>,
) -> AppResult<Vec<DownloadTask>> {
    Ok(state.download_manager.get_all_tasks().await)
}

/// 取消下载任务
#[tauri::command]
pub async fn cancel_download_task(
    state: State<'_, AppState>,
    task_id: String,
) -> AppResult<()> {
    state.download_manager.mark_failed(&task_id, "用户取消".to_string()).await;
    info!("下载任务已取消: {}", task_id);
    Ok(())
}

/// 获取 MaiBot 可用版本
///
/// 对应 Python GET `/versions/maibot`。
#[tauri::command]
pub async fn get_maibot_versions() -> AppResult<VersionsResponse> {
    let repo = download_service::get_repo_config(&DownloadItemType::Maibot);
    download_service::get_available_versions(repo.url).await
}

// ==================== 路径验证 ====================

/// 验证部署路径的安全性
///
/// 防止路径遍历攻击、Windows保留名冲突和过长路径。
fn validate_deployment_path(path: &str) -> AppResult<()> {
    if path.is_empty() {
        return Err(AppError::InvalidInput("部署路径不能为空".to_string()));
    }

    // 检查路径遍历
    if path.contains("..") {
        return Err(AppError::InvalidInput("部署路径不允许包含 '..'".to_string()));
    }

    // 检查绝对路径（部署路径应是相对于 instances_dir 的相对路径）
    if path.starts_with('/') || path.starts_with('\\') || (path.len() >= 2 && path.as_bytes()[1] == b':') {
        return Err(AppError::InvalidInput("部署路径不允许使用绝对路径".to_string()));
    }

    // 检查路径长度（Windows MAX_PATH 限制为 260，预留空间给 instances_dir 和子文件）
    if path.len() > 100 {
        return Err(AppError::InvalidInput("部署路径过长（最大 100 字符）".to_string()));
    }

    // 检查 Windows 保留名
    let reserved_names = [
        "CON", "PRN", "AUX", "NUL",
        "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
        "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];
    let name_upper = path.to_uppercase();
    for reserved in &reserved_names {
        if name_upper == *reserved || name_upper.starts_with(&format!("{}.", reserved)) {
            return Err(AppError::InvalidInput(format!(
                "部署路径不能使用 Windows 保留名: {}",
                reserved
            )));
        }
    }

    // 检查非法字符
    let illegal_chars = ['<', '>', ':', '"', '|', '?', '*'];
    for ch in &illegal_chars {
        if path.contains(*ch) {
            return Err(AppError::InvalidInput(format!(
                "部署路径包含非法字符: '{}'",
                ch
            )));
        }
    }

    Ok(())
}

// ==================== 内部执行逻辑 ====================

/// 执行下载任务的完整流程
///
/// 对应 Python `DownloadManager.execute_task`。
/// 流程：创建目录 → 创建虚拟环境 → 下载各组件 → 安装依赖 → 配置 → 创建实例记录。
async fn execute_download_task(
    app_handle: &AppHandle,
    dm: &download_service::DownloadManager,
    pool: &sqlx::SqlitePool,
    task_id: &str,
) -> AppResult<()> {
    let task = dm
        .get_task(task_id)
        .await
        .ok_or_else(|| AppError::NotFound("任务不存在".to_string()))?;

    let event_name = format!("download-log-{}", task_id);
    let status_event = format!("download-status-{}", task_id);

    dm.mark_started(task_id).await;
    let _ = app_handle.emit(&status_event, "downloading");
    emit_progress(app_handle, task_id, 0.0, "开始下载...", "downloading");

    // 1. 创建实例目录
    let instances_dir = platform::get_instances_dir();
    let instance_dir = instances_dir.join(&task.deployment_path);
    std::fs::create_dir_all(&instance_dir)
        .map_err(|e| AppError::FileSystem(format!("创建实例目录失败: {}", e)))?;

    dm.add_log(task_id, format!("创建实例目录: {:?}", instance_dir))
        .await;
    let _ = app_handle.emit(&event_name, "创建实例目录...");

    // 磁盘空间预检（至少需要 2GB）
    {
        use sysinfo::Disks;
        let disks = Disks::new_with_refreshed_list();
        let instance_path_str = instance_dir.to_string_lossy().to_string();
        let mut checked = false;
        for disk in disks.list() {
            let mount = disk.mount_point().to_string_lossy().to_string();
            if instance_path_str.starts_with(&mount) {
                checked = true;
                let available = disk.available_space();
                const MIN_SPACE: u64 = 2 * 1024 * 1024 * 1024; // 2 GB
                if available < MIN_SPACE {
                    let available_mb = available / 1024 / 1024;
                    return Err(AppError::FileSystem(format!(
                        "磁盘空间不足：可用 {}MB，至少需要 2048MB",
                        available_mb
                    )));
                }
                break;
            }
        }
        if checked {
            let _ = app_handle.emit(&event_name, "磁盘空间检查通过");
        }
    }

    // 2. 计算总步骤
    let total_items = task.selected_items.len();
    let mut current_step = 0;

    // 3. 按顺序下载各组件
    for item_type in &task.selected_items {
        current_step += 1;
        let progress = (current_step as f64 / (total_items as f64 + 2.0)) * 100.0;

        let repo = download_service::get_repo_config(item_type);
        let component_dir = instance_dir.join(repo.folder);

        match item_type {
            DownloadItemType::Maibot => {
                dm.update_task_progress(task_id, progress, "正在下载 MaiBot...".to_string())
                    .await;
                emit_progress(app_handle, task_id, progress, "正在下载 MaiBot...", "downloading");
                let _ = app_handle.emit(&event_name, "正在克隆 MaiBot 仓库...");

                // 确定分支
                let branch = match &task.maibot_version_source {
                    Some(MaibotVersionSource::Tag) | Some(MaibotVersionSource::Branch) => {
                        task.maibot_version_value.as_deref()
                    }
                    _ => None,
                };

                download_service::clone_repository(
                    repo.url,
                    &component_dir,
                    branch,
                    app_handle,
                    &event_name,
                )
                .await?;

                // 安装依赖
                dm.update_task_status(task_id, DownloadStatus::Installing)
                    .await;
                let _ = app_handle.emit(&status_event, "installing");
                emit_progress(app_handle, task_id, progress + 5.0, "正在安装 MaiBot 依赖...", "installing");

                let venv_dir = instance_dir.join(".venv");
                if !venv_dir.exists() {
                    install_service::create_virtual_environment(
                        &component_dir,
                        task.python_path.as_deref(),
                        app_handle,
                        &event_name,
                    )
                    .await?;

                    install_service::upgrade_pip(&venv_dir, app_handle, &event_name).await?;
                }

                install_service::install_dependencies(
                    &component_dir,
                    &venv_dir,
                    app_handle,
                    &event_name,
                )
                .await?;

                // 配置
                dm.update_task_status(task_id, DownloadStatus::Configuring)
                    .await;
                let _ = app_handle.emit(&status_event, "configuring");
                emit_progress(app_handle, task_id, progress + 10.0, "正在配置 MaiBot...", "configuring");
                install_service::setup_maibot_config(&component_dir, app_handle, &event_name)
                    .await?;
            }

            DownloadItemType::NapcatAdapter => {
                dm.update_task_progress(
                    task_id,
                    progress,
                    "正在下载 NapCat Adapter...".to_string(),
                )
                .await;
                emit_progress(app_handle, task_id, progress, "正在下载 NapCat Adapter...", "downloading");
                let _ = app_handle.emit(&event_name, "正在克隆 NapCat Adapter 仓库...");

                download_service::clone_repository(
                    repo.url,
                    &component_dir,
                    None,
                    app_handle,
                    &event_name,
                )
                .await?;

                // 安装依赖
                dm.update_task_status(task_id, DownloadStatus::Installing)
                    .await;
                let venv_dir = instance_dir.join(".venv");
                install_service::install_dependencies(
                    &component_dir,
                    &venv_dir,
                    app_handle,
                    &event_name,
                )
                .await?;

                // 配置
                dm.update_task_status(task_id, DownloadStatus::Configuring)
                    .await;
                install_service::setup_adapter_config(&component_dir, app_handle, &event_name)
                    .await?;
            }

            DownloadItemType::Napcat => {
                dm.update_task_progress(task_id, progress, "正在安装 NapCat...".to_string())
                    .await;
                emit_progress(app_handle, task_id, progress, "正在安装 NapCat...", "downloading");
                let _ = app_handle.emit(&event_name, "正在下载安装 NapCat...");

                download_service::download_napcat(&instance_dir, app_handle, &event_name).await?;
            }

            DownloadItemType::Lpmm => {
                // LPMM 仅 macOS
                if cfg!(target_os = "macos") {
                    dm.update_task_progress(task_id, progress, "正在下载 LPMM...".to_string())
                        .await;
                    emit_progress(app_handle, task_id, progress, "正在下载 LPMM...", "downloading");
                    let _ = app_handle.emit(&event_name, "正在克隆 LPMM 仓库...");

                    download_service::clone_repository(
                        repo.url,
                        &component_dir,
                        None,
                        app_handle,
                        &event_name,
                    )
                    .await?;

                    // 安装依赖
                    dm.update_task_status(task_id, DownloadStatus::Installing)
                        .await;
                    let venv_dir = instance_dir.join(".venv");
                    install_service::install_dependencies(
                        &component_dir,
                        &venv_dir,
                        app_handle,
                        &event_name,
                    )
                    .await?;
                }
            }
        }
    }

    // 4. 创建实例 DB 记录
    dm.update_task_progress(task_id, 95.0, "正在创建实例记录...".to_string())
        .await;
    emit_progress(app_handle, task_id, 95.0, "正在创建实例记录...", "configuring");

    let instance = instance_service::create_instance(
        pool,
        crate::models::CreateInstanceRequest {
            name: task.instance_name.clone(),
            bot_type: Some("maibot".to_string()),
            bot_version: task.maibot_version_value.clone(),
            description: None,
            python_path: task.python_path.clone(),
            config_path: None,
        },
    )
    .await?;

    // 更新实例路径
    sqlx::query("UPDATE instances SET instance_path = ? WHERE id = ?")
        .bind(&task.deployment_path)
        .bind(&instance.id)
        .execute(pool)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;

    // 5. 标记完成
    dm.mark_completed(task_id, Some(instance.id.clone())).await;
    let _ = app_handle.emit(&status_event, "completed");
    emit_progress(app_handle, task_id, 100.0, "安装完成", "completed");
    let _ = app_handle.emit(&event_name, format!("安装完成！实例 ID: {}", instance.id));

    info!("下载任务完成: {} → 实例 {}", task_id, instance.id);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_deployment_path_accepts_valid_names() {
        assert!(validate_deployment_path("my-instance").is_ok());
        assert!(validate_deployment_path("bot_v2").is_ok());
        assert!(validate_deployment_path("MaiBot-Production").is_ok());
    }

    #[test]
    fn validate_deployment_path_rejects_empty() {
        assert!(validate_deployment_path("").is_err());
    }

    #[test]
    fn validate_deployment_path_rejects_traversal() {
        assert!(validate_deployment_path("../etc/passwd").is_err());
        assert!(validate_deployment_path("foo/../../bar").is_err());
        assert!(validate_deployment_path("..").is_err());
    }

    #[test]
    fn validate_deployment_path_rejects_absolute() {
        assert!(validate_deployment_path("/root/hack").is_err());
        assert!(validate_deployment_path("\\Windows\\System32").is_err());
        assert!(validate_deployment_path("C:\\Users").is_err());
    }

    #[test]
    fn validate_deployment_path_rejects_too_long() {
        let long_name = "a".repeat(101);
        assert!(validate_deployment_path(&long_name).is_err());
        let ok_name = "a".repeat(100);
        assert!(validate_deployment_path(&ok_name).is_ok());
    }

    #[test]
    fn validate_deployment_path_rejects_windows_reserved_names() {
        assert!(validate_deployment_path("CON").is_err());
        assert!(validate_deployment_path("con").is_err());
        assert!(validate_deployment_path("NUL").is_err());
        assert!(validate_deployment_path("COM1").is_err());
        assert!(validate_deployment_path("LPT3").is_err());
        assert!(validate_deployment_path("AUX.txt").is_err());
    }

    #[test]
    fn validate_deployment_path_rejects_illegal_chars() {
        assert!(validate_deployment_path("foo<bar").is_err());
        assert!(validate_deployment_path("foo>bar").is_err());
        assert!(validate_deployment_path("foo:bar").is_err());
        assert!(validate_deployment_path("foo\"bar").is_err());
        assert!(validate_deployment_path("foo|bar").is_err());
        assert!(validate_deployment_path("foo?bar").is_err());
        assert!(validate_deployment_path("foo*bar").is_err());
    }
}
