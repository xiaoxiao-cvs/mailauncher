/// 下载管理 Tauri 命令
///
/// 对应前端下载相关 API 调用。
/// 任务创建后异步执行，通过 Tauri 事件推送进度。
use tauri::{AppHandle, Emitter, State};
use tracing::{error, info};

use crate::errors::{AppError, AppResult};
use crate::models::download::*;
use crate::services::{download_service, install_service, instance_service};
use crate::state::AppState;
use crate::utils::platform;

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
            dm.mark_failed(&task_id, e.to_string()).await;
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

/// 获取 MaiBot 可用版本
///
/// 对应 Python GET `/versions/maibot`。
#[tauri::command]
pub async fn get_maibot_versions() -> AppResult<VersionsResponse> {
    let repo = download_service::get_repo_config(&DownloadItemType::Maibot);
    download_service::get_available_versions(repo.url).await
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

    // 1. 创建实例目录
    let instances_dir = platform::get_instances_dir();
    let instance_dir = instances_dir.join(&task.deployment_path);
    std::fs::create_dir_all(&instance_dir)
        .map_err(|e| AppError::FileSystem(format!("创建实例目录失败: {}", e)))?;

    dm.add_log(task_id, format!("创建实例目录: {:?}", instance_dir))
        .await;
    let _ = app_handle.emit(&event_name, "创建实例目录...");

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
                let _ = app_handle.emit(&event_name, "正在下载安装 NapCat...");

                download_service::download_napcat(&instance_dir, app_handle, &event_name).await?;
            }

            DownloadItemType::Lpmm => {
                // LPMM 仅 macOS
                if cfg!(target_os = "macos") {
                    dm.update_task_progress(task_id, progress, "正在下载 LPMM...".to_string())
                        .await;
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
    let _ = app_handle.emit(&event_name, format!("安装完成！实例 ID: {}", instance.id));

    info!("下载任务完成: {} → 实例 {}", task_id, instance.id);
    Ok(())
}
