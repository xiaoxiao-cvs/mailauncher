/// 下载管理 Tauri 命令
///
/// 对应前端下载相关 API 调用。
/// 任务创建后异步执行，通过 Tauri 事件推送进度。
///
/// 事件名格式：
/// - `download-log-{taskId}` — 日志消息（字符串载荷）
/// - `download-status-{taskId}` — 状态变更（字符串载荷）
/// - `download-progress-{taskId}` — 结构化进度（JSON 载荷）
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use tracing::{error, info, warn};

use crate::errors::{AppError, AppResult};
use crate::models::download::*;
use crate::services::{config_service, download_service, install_service, instance_service};
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
    let deploy_path = data
        .deployment_path
        .as_deref()
        .unwrap_or(&data.instance_name);
    validate_deployment_path(deploy_path)?;

    let task = state.download_manager.create_task(data).await;
    let task_id = task.id.clone();

    info!("创建下载任务: {}", task_id);

    // 后台异步执行
    let dm = state.download_manager.clone();
    let pool = state.db.clone();
    let app = app_handle.clone();
    let cancel_token = state.download_manager.create_cancel_token(&task_id).await;

    tokio::spawn(async move {
        if let Err(e) = execute_download_task(&app, &dm, &pool, &task_id, &cancel_token).await {
            error!("下载任务 {} 执行失败: {}", task_id, e);

            // 清理失败任务的整个实例目录（避免残留不完整文件）
            if let Some(task) = dm.get_task(&task_id).await {
                let instances_dir = match config_service::get_path(&pool, "instances_dir").await {
                    Ok(Some(config)) => std::path::PathBuf::from(&config.path),
                    _ => platform::get_instances_dir(),
                };
                let instance_dir = instances_dir.join(&task.deployment_path);
                if instance_dir.exists() {
                    info!("清理失败任务的残留实例目录: {:?}", instance_dir);
                    if let Err(cleanup_err) = std::fs::remove_dir_all(&instance_dir) {
                        warn!("清理残留目录失败 ({:?}): {}", instance_dir, cleanup_err);
                    }
                }
            }

            dm.mark_failed(&task_id, e.to_string()).await;
            emit_progress(&app, &task_id, 0.0, &e.to_string(), "failed");
            let _ = app.emit(&format!("download-status-{}", task_id), "failed");
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
pub async fn get_all_download_tasks(state: State<'_, AppState>) -> AppResult<Vec<DownloadTask>> {
    Ok(state.download_manager.get_all_tasks().await)
}

/// 取消下载任务
#[tauri::command]
pub async fn cancel_download_task(state: State<'_, AppState>, task_id: String) -> AppResult<()> {
    // 触发取消信号，后台任务会在下一个检查点中止
    state.download_manager.cancel_task(&task_id).await;
    state
        .download_manager
        .mark_failed(&task_id, "用户取消".to_string())
        .await;
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

// ==================== QQ 号直连（P2-21） ====================

/// 下载期间用户可选录入的 QQ 号缓存（task_id -> qq_account）。
///
/// 创建下载任务时实例尚未落库（`create_instance` 要等组件全部装完才跑），此时还没有
/// 实例 ID 可供 `update_instance` 使用；故借 task_id 作跨请求桥接键，在 `execute_download_task`
/// 建好实例记录那一刻取用并清空，避免常驻内存泄漏。`DownloadTaskCreate` 本身不收 qq 字段。
fn pending_qq_accounts() -> &'static Mutex<HashMap<String, String>> {
    static MAP: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();
    MAP.get_or_init(|| Mutex::new(HashMap::new()))
}

/// 校验 QQ 号格式：5~11 位纯数字（QQ 号实际取值范围）。
fn validate_qq_account(qq: &str) -> AppResult<()> {
    let qq = qq.trim();
    if qq.is_empty() {
        return Err(AppError::InvalidInput("QQ 号不能为空".to_string()));
    }
    if qq.len() < 5 || qq.len() > 11 || !qq.bytes().all(|b| b.is_ascii_digit()) {
        return Err(AppError::InvalidInput(
            "QQ 号格式不正确（应为 5~11 位纯数字）".to_string(),
        ));
    }
    Ok(())
}

/// 为一个下载任务登记首启直连的 QQ 号。
///
/// 前端在拿到 `create_download_task` 返回的 task_id 后立即调用。任务实际跑到
/// "创建实例记录"那一步时会取用该值写入 `instances.qq_account`，届时首次启动
/// NapCat 就会带 `-q <qq>` 直连，免去用户在配置面板二次手填。
/// 这是尽力而为的可选增强：QQ 号留空则跳过，格式校验失败不影响装机主流程之外的部分。
#[tauri::command]
pub async fn set_download_task_qq_account(task_id: String, qq_account: String) -> AppResult<()> {
    validate_qq_account(&qq_account)?;
    pending_qq_accounts()
        .lock()
        .map_err(|_| AppError::Internal("QQ 号缓存锁中毒".to_string()))?
        .insert(task_id, qq_account.trim().to_string());
    Ok(())
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
        return Err(AppError::InvalidInput(
            "部署路径不允许包含 '..'".to_string(),
        ));
    }

    // 检查绝对路径（部署路径应是相对于 instances_dir 的相对路径）
    if path.starts_with('/')
        || path.starts_with('\\')
        || (path.len() >= 2 && path.as_bytes()[1] == b':')
    {
        return Err(AppError::InvalidInput(
            "部署路径不允许使用绝对路径".to_string(),
        ));
    }

    // 检查路径长度（Windows MAX_PATH 限制为 260，预留空间给 instances_dir 和子文件）
    if path.len() > 100 {
        return Err(AppError::InvalidInput(
            "部署路径过长（最大 100 字符）".to_string(),
        ));
    }

    // 检查 Windows 保留名
    let reserved_names = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
        "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
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
    cancel_token: &std::sync::Arc<std::sync::atomic::AtomicBool>,
) -> AppResult<()> {
    let task = dm
        .get_task(task_id)
        .await
        .ok_or_else(|| AppError::NotFound("任务不存在".to_string()))?;

    let task_start = std::time::Instant::now();
    let event_name = format!("download-log-{}", task_id);
    let status_event = format!("download-status-{}", task_id);

    dm.mark_started(task_id).await;
    let _ = app_handle.emit(&status_event, "downloading");
    emit_progress(app_handle, task_id, 0.0, "开始下载...", "downloading");

    // 1. 创建实例目录（优先使用用户配置的 instances_dir，回退到默认值）
    let instances_dir = match config_service::get_path(pool, "instances_dir").await {
        Ok(Some(config)) => std::path::PathBuf::from(&config.path),
        _ => platform::get_instances_dir(),
    };
    let instance_dir = instances_dir.join(&task.deployment_path);
    std::fs::create_dir_all(&instance_dir).map_err(|e| {
        AppError::FileSystem(format!("创建实例目录失败 ({:?}): {}", instance_dir, e))
    })?;

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
        if !checked {
            warn!(
                "无法确定实例目录所在磁盘，跳过磁盘空间检查: {:?}",
                instance_dir
            );
            let _ = app_handle.emit(&event_name, "[警告] 无法检测磁盘空间，跳过检查");
        }
    }

    // Python 预检:选了需要 Python 的组件(MaiBot/适配器/LPMM)时,克隆前先确认有可用的
    // Python 3.12+,fail-fast 给出清晰报错——避免克隆完才在建 venv 时炸、也不再因逐组件重试刷屏。
    let needs_python = task
        .selected_items
        .iter()
        .any(|item| !matches!(item, DownloadItemType::Napcat));
    if needs_python {
        if let Err(e) = install_service::resolve_python(task.python_path.as_deref()).await {
            let _ = app_handle.emit(&event_name, format!("[预检] {}", e));
            return Err(e);
        }
        let _ = app_handle.emit(&event_name, "Python 预检通过");
    }

    // 2. 计算总步骤
    let total_items = task.selected_items.len();
    let mut current_step = 0;

    // 3. 按顺序下载各组件
    for item_type in &task.selected_items {
        // 取消检查点
        if download_service::DownloadManager::is_cancelled(cancel_token) {
            return Err(AppError::Process("任务已被用户取消".to_string()));
        }

        current_step += 1;
        let progress = (current_step as f64 / (total_items as f64 + 2.0)) * 100.0;

        let repo = download_service::get_repo_config(item_type);
        let component_dir = instance_dir.join(repo.folder);

        match item_type {
            DownloadItemType::Maibot => {
                dm.update_task_progress(task_id, progress, "正在下载 MaiBot...".to_string())
                    .await;
                emit_progress(
                    app_handle,
                    task_id,
                    progress,
                    "正在下载 MaiBot...",
                    "downloading",
                );
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
                emit_progress(
                    app_handle,
                    task_id,
                    progress + 5.0,
                    "正在安装 MaiBot 依赖...",
                    "installing",
                );

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
                emit_progress(
                    app_handle,
                    task_id,
                    progress + 10.0,
                    "正在配置 MaiBot...",
                    "configuring",
                );
                // qq_account 在安装阶段尚不可知（实例记录稍后创建），写空占位，
                // 由 MaiBot 首启自生成完整配置后，用户在配置面板填写。
                install_service::setup_maibot_config(&component_dir, None, app_handle, &event_name)
                    .await?;
            }

            DownloadItemType::NapcatAdapter => {
                // 适配器为插件，安装到 MaiBot/plugins 下，依赖 MaiBot 已先安装。
                let maibot_dir = instance_dir.join("MaiBot");
                if !maibot_dir.exists() {
                    return Err(AppError::InvalidInput(
                        "安装 NapCat 适配器前必须先安装 MaiBot（未找到 MaiBot 目录）".to_string(),
                    ));
                }
                // git clone 需要 plugins 父目录已存在。
                if let Some(parent) = component_dir.parent() {
                    std::fs::create_dir_all(parent).map_err(|e| {
                        AppError::FileSystem(format!("创建插件目录失败 ({:?}): {}", parent, e))
                    })?;
                }

                dm.update_task_progress(
                    task_id,
                    progress,
                    "正在下载 NapCat Adapter...".to_string(),
                )
                .await;
                emit_progress(
                    app_handle,
                    task_id,
                    progress,
                    "正在下载 NapCat Adapter...",
                    "downloading",
                );
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
                let _ = app_handle.emit(&status_event, "installing");
                emit_progress(
                    app_handle,
                    task_id,
                    progress + 5.0,
                    "正在安装 NapCat Adapter 依赖...",
                    "installing",
                );
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
                let _ = app_handle.emit(&status_event, "configuring");
                emit_progress(
                    app_handle,
                    task_id,
                    progress + 10.0,
                    "正在配置 NapCat Adapter...",
                    "configuring",
                );
                install_service::setup_adapter_config(
                    &component_dir,
                    &instance_dir,
                    app_handle,
                    &event_name,
                )
                .await?;
            }

            DownloadItemType::Napcat => {
                dm.update_task_progress(task_id, progress, "正在安装 NapCat...".to_string())
                    .await;
                dm.update_task_status(task_id, DownloadStatus::Installing)
                    .await;
                let _ = app_handle.emit(&status_event, "installing");
                emit_progress(
                    app_handle,
                    task_id,
                    progress,
                    "正在安装 NapCat...",
                    "installing",
                );
                let _ = app_handle.emit(&event_name, "正在下载安装 NapCat...");

                download_service::download_napcat(&instance_dir, app_handle, &event_name).await?;
            }

            DownloadItemType::Lpmm => {
                // LPMM 仅 macOS
                if cfg!(target_os = "macos") {
                    dm.update_task_progress(task_id, progress, "正在下载 LPMM...".to_string())
                        .await;
                    emit_progress(
                        app_handle,
                        task_id,
                        progress,
                        "正在下载 LPMM...",
                        "downloading",
                    );
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
                    let _ = app_handle.emit(&status_event, "installing");
                    emit_progress(
                        app_handle,
                        task_id,
                        progress + 5.0,
                        "正在安装 LPMM 依赖...",
                        "installing",
                    );
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

    // 取消检查点
    if download_service::DownloadManager::is_cancelled(cancel_token) {
        return Err(AppError::Process("任务已被用户取消".to_string()));
    }

    // 4. 创建实例 DB 记录
    dm.update_task_progress(task_id, 95.0, "正在创建实例记录...".to_string())
        .await;
    emit_progress(
        app_handle,
        task_id,
        95.0,
        "正在创建实例记录...",
        "configuring",
    );

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

    // 若用户为本次安装录入了 QQ 号，幂等取出并写入实例记录，首启 NapCat 即可 -q 直连该账号。
    let pending_qq = pending_qq_accounts()
        .lock()
        .map_err(|_| AppError::Internal("QQ 号缓存锁中毒".to_string()))?
        .remove(task_id);
    if let Some(qq_account) = pending_qq {
        sqlx::query("UPDATE instances SET qq_account = ? WHERE id = ?")
            .bind(&qq_account)
            .bind(&instance.id)
            .execute(pool)
            .await
            .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;
        dm.add_log(
            task_id,
            format!("已绑定 QQ 号 {} 用于首启直连", qq_account),
        )
        .await;
    }

    // 5. 标记完成
    dm.mark_completed(task_id, Some(instance.id.clone())).await;
    let _ = app_handle.emit(&status_event, "completed");
    emit_progress(app_handle, task_id, 100.0, "安装完成", "completed");
    let _ = app_handle.emit(&event_name, format!("安装完成！实例 ID: {}", instance.id));

    let elapsed = task_start.elapsed();
    info!(
        "下载任务完成: {} → 实例 {} (耗时 {:.1}s)",
        task_id,
        instance.id,
        elapsed.as_secs_f64()
    );
    let _ = app_handle.emit(
        &event_name,
        format!("全部安装完成，总耗时 {:.1} 秒", elapsed.as_secs_f64()),
    );
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

    // ==================== validate_qq_account（P2-21） ====================

    #[test]
    fn validate_qq_account_accepts_valid_lengths() {
        assert!(validate_qq_account("10001").is_ok()); // 5 位下限
        assert!(validate_qq_account("123456789").is_ok());
        assert!(validate_qq_account("12345678901").is_ok()); // 11 位上限
        assert!(validate_qq_account("  10001  ").is_ok(), "首尾空白应被 trim 后再校验");
    }

    #[test]
    fn validate_qq_account_rejects_empty_or_blank() {
        assert!(validate_qq_account("").is_err());
        assert!(validate_qq_account("   ").is_err());
    }

    #[test]
    fn validate_qq_account_rejects_wrong_length() {
        assert!(validate_qq_account("1234").is_err(), "4 位过短");
        assert!(validate_qq_account("123456789012").is_err(), "12 位过长");
    }

    #[test]
    fn validate_qq_account_rejects_non_digits() {
        assert!(validate_qq_account("abc12345").is_err());
        assert!(validate_qq_account("1234-5678").is_err());
        assert!(validate_qq_account("１２３４５６７").is_err(), "全角数字非 ASCII 数字应拒绝");
    }

    // ==================== set_download_task_qq_account / pending_qq_accounts 桥接（P2-21） ====================

    #[tokio::test]
    async fn set_download_task_qq_account_rejects_invalid_format_without_caching() {
        let task_id = format!("test_task_invalid_{}", uuid::Uuid::new_v4());
        let result = set_download_task_qq_account(task_id.clone(), "abc".to_string()).await;
        assert!(result.is_err(), "非法 QQ 号格式必须报错");

        // 校验失败不应留下缓存条目，避免脏数据被后续安装误消费
        assert!(
            !pending_qq_accounts().lock().unwrap().contains_key(&task_id),
            "校验失败的 QQ 号不应写入缓存"
        );
    }

    #[tokio::test]
    async fn set_download_task_qq_account_caches_trimmed_value_and_is_consumed_once() {
        let task_id = format!("test_task_valid_{}", uuid::Uuid::new_v4());
        set_download_task_qq_account(task_id.clone(), "  10086  ".to_string())
            .await
            .expect("合法 QQ 号应写入成功");

        // 缓存应保存 trim 后的值
        {
            let map = pending_qq_accounts().lock().unwrap();
            assert_eq!(map.get(&task_id).map(String::as_str), Some("10086"));
        }

        // 模拟 execute_download_task 消费该值：remove 之后必须不可再取到（幂等清空，防内存泄漏）
        let consumed = pending_qq_accounts().lock().unwrap().remove(&task_id);
        assert_eq!(consumed, Some("10086".to_string()));
        assert!(
            !pending_qq_accounts().lock().unwrap().contains_key(&task_id),
            "消费后缓存必须清空"
        );
    }
}
