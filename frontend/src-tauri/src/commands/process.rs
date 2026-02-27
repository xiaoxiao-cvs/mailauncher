/// 进程管理与实例启停 Tauri 命令
///
/// 对应前端 `instanceApi.ts` 中的启动/停止/重启/组件控制方法。
/// 实例级别的操作会协调 instance_service（更新 DB 状态）和
/// process_service（管理实际进程），与 Python 行为一致。
use std::io::Read;
use std::path::PathBuf;

use tauri::{AppHandle, Emitter, State};
use tracing::{error, info, warn};

use crate::errors::{AppError, AppResult};
use crate::models::{ComponentStatus, SuccessResponse};
use crate::services::instance_service;
use crate::services::process_service::{self, ProcessManager};
use crate::state::AppState;
use crate::utils::platform;

// ==================== 组件名称映射 ====================

/// 前端组件名 → 内部组件名（与 Python API 路由中的映射一致）
fn map_component_name(frontend_name: &str) -> &str {
    match frontend_name {
        "MaiBot" => "main",
        "NapCat" => "napcat",
        "MaiBot-Napcat-Adapter" => "napcat-ada",
        other => other,
    }
}

// ==================== 输出读取任务 ====================

/// 启动后台任务读取 PTY 输出，并通过 Tauri 事件推送到前端
///
/// 事件名格式: `terminal-output-{instance_id}_{component}`
/// 对应 Python 的 WebSocket 推送 `{"type": "output", "data": text}`
fn spawn_output_reader(
    app_handle: AppHandle,
    process_manager: ProcessManager,
    instance_id: String,
    component: String,
    mut reader: Box<dyn Read + Send>,
) {
    let session_id = format!("{}_{}", instance_id, component);
    let event_name = format!("terminal-output-{}", session_id);

    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    // EOF：进程已关闭输出
                    info!("PTY 输出结束: {}", session_id);
                    break;
                }
                Ok(n) => {
                    let text = String::from_utf8_lossy(&buf[..n]).to_string();

                    // 存入缓冲区
                    let pm = process_manager.clone();
                    let iid = instance_id.clone();
                    let comp = component.clone();
                    let t = text.clone();
                    // 使用 block_on 是因为我们在同步线程中
                    // ProcessManager 内部用 tokio::sync::Mutex，需要异步上下文
                    tokio::runtime::Handle::current().block_on(async {
                        pm.add_output(&iid, &comp, t).await;
                    });

                    // 通过 Tauri 事件推送到前端
                    let _ = app_handle.emit(&event_name, &text);
                }
                Err(e) => {
                    // 读取错误（通常是进程已终止）
                    if e.kind() != std::io::ErrorKind::BrokenPipe {
                        warn!("PTY 读取错误 {}: {}", session_id, e);
                    }
                    break;
                }
            }
        }
    });
}

// ==================== 启动组件的共用逻辑 ====================

/// 启动单个组件进程（内部实现）
async fn start_component_inner(
    app_handle: &AppHandle,
    process_manager: &ProcessManager,
    instance_id: &str,
    instance_path: &PathBuf,
    component: &str,
    python_path: Option<&str>,
    qq_account: Option<&str>,
) -> AppResult<bool> {
    // 构建启动命令
    let (cmd, args, cwd) = process_service::build_component_command(
        instance_path,
        component,
        python_path,
        qq_account,
    )?;

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    // 启动进程
    let reader = process_manager
        .start_process(instance_id, component, &cmd, &arg_refs, &cwd)
        .await?;

    // 如果返回了 reader（新启动的进程），启动输出读取任务
    if let Some(reader) = reader {
        spawn_output_reader(
            app_handle.clone(),
            process_manager.clone(),
            instance_id.to_string(),
            component.to_string(),
            reader,
        );
    }

    Ok(true)
}

// ==================== 实例级命令 ====================

/// 启动实例（启动所有可用组件）
///
/// 与 Python `InstanceService.start_instance` 逻辑一致：
/// 依次启动 main → napcat → napcat-ada 组件。
#[tauri::command]
pub async fn start_instance(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<SuccessResponse> {
    let instance = instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;

    let instance_path_str = instance.instance_path.unwrap_or(instance.name.clone());
    let instance_path = platform::get_instances_dir().join(&instance_path_str);

    if !instance_path.exists() {
        return Err(AppError::NotFound(format!(
            "实例目录不存在: {}",
            instance_path.display()
        )));
    }

    // 更新 DB 状态为 starting
    sqlx::query("UPDATE instances SET status = 'starting', updated_at = datetime('now') WHERE id = ?")
        .bind(&instance_id)
        .execute(&state.db)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;

    info!("启动实例: {} ({})", instance.name, instance_id);

    // 获取可用组件并依次启动
    let components = vec!["main", "napcat", "napcat-ada"];
    let mut any_started = false;

    for component in &components {
        // 检查组件目录是否存在
        let comp_dir = match *component {
            "main" => instance_path.join("MaiBot"),
            "napcat" => instance_path.join("NapCat"),
            "napcat-ada" => instance_path.join("MaiBot-Napcat-Adapter"),
            _ => continue,
        };

        if !comp_dir.exists() {
            continue;
        }

        match start_component_inner(
            &app_handle,
            &state.process_manager,
            &instance_id,
            &instance_path,
            component,
            instance.python_path.as_deref(),
            instance.qq_account.as_deref(),
        )
        .await
        {
            Ok(true) => {
                any_started = true;
                info!("组件 {}/{} 启动成功", instance_id, component);
            }
            Ok(false) => {
                warn!("组件 {}/{} 已在运行", instance_id, component);
            }
            Err(e) => {
                error!("组件 {}/{} 启动失败: {}", instance_id, component, e);
            }
        }
    }

    if any_started {
        // 更新 DB 状态为 running
        sqlx::query("UPDATE instances SET status = 'running', last_run = datetime('now'), updated_at = datetime('now') WHERE id = ?")
            .bind(&instance_id)
            .execute(&state.db)
            .await
            .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;
    }

    Ok(SuccessResponse::ok(format!(
        "实例 {} 启动成功",
        instance_id
    )))
}

/// 停止实例（停止所有组件）
#[tauri::command]
pub async fn stop_instance(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<SuccessResponse> {
    let instance = instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;

    info!("停止实例: {} ({})", instance.name, instance_id);

    // 记录运行时间
    if instance.status == "running" {
        if let Some(last_run) = instance.last_run {
            let run_secs = (chrono::Utc::now().naive_utc() - last_run).num_seconds();
            let new_run_time = instance.run_time + run_secs;
            sqlx::query("UPDATE instances SET run_time = ? WHERE id = ?")
                .bind(new_run_time)
                .execute(&state.db)
                .await
                .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;
        }
    }

    let results = state
        .process_manager
        .stop_all_instance_processes(&instance_id)
        .await;

    // 更新 DB 状态为 stopped
    sqlx::query(
        "UPDATE instances SET status = 'stopped', updated_at = datetime('now') WHERE id = ?",
    )
    .bind(&instance_id)
    .execute(&state.db)
    .await
    .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;

    info!("实例停止结果: {:?}", results);

    Ok(SuccessResponse::ok(format!(
        "实例 {} 已停止",
        instance_id
    )))
}

/// 重启实例
#[tauri::command]
pub async fn restart_instance(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<SuccessResponse> {
    info!("重启实例: {}", instance_id);

    // 先停止
    let _ = state
        .process_manager
        .stop_all_instance_processes(&instance_id)
        .await;

    // 短暂等待
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // 再启动（复用 start_instance 的逻辑）
    start_instance(app_handle, state, instance_id).await
}

// ==================== 组件级命令 ====================

/// 启动实例的指定组件
#[tauri::command]
pub async fn start_component(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    instance_id: String,
    component: String,
) -> AppResult<SuccessResponse> {
    let internal_component = map_component_name(&component);

    let instance = instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;

    let instance_path_str = instance.instance_path.unwrap_or(instance.name.clone());
    let instance_path = platform::get_instances_dir().join(&instance_path_str);

    let success = start_component_inner(
        &app_handle,
        &state.process_manager,
        &instance_id,
        &instance_path,
        internal_component,
        instance.python_path.as_deref(),
        instance.qq_account.as_deref(),
    )
    .await?;

    if success {
        // 如果有组件在运行，确保实例状态为 running
        sqlx::query(
            "UPDATE instances SET status = 'running', updated_at = datetime('now') WHERE id = ?",
        )
        .bind(&instance_id)
        .execute(&state.db)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;
    }

    Ok(SuccessResponse::ok(format!(
        "组件 {} 已启动",
        component
    )))
}

/// 停止实例的指定组件
#[tauri::command]
pub async fn stop_component(
    state: State<'_, AppState>,
    instance_id: String,
    component: String,
) -> AppResult<SuccessResponse> {
    let internal_component = map_component_name(&component);

    let success = state
        .process_manager
        .stop_process(&instance_id, internal_component, false)
        .await?;

    if !success {
        return Err(AppError::Process(format!(
            "组件 {} 停止失败",
            component
        )));
    }

    // 检查实例是否还有组件在运行
    let still_running = state
        .process_manager
        .is_instance_running(&instance_id)
        .await;

    if !still_running {
        sqlx::query(
            "UPDATE instances SET status = 'stopped', updated_at = datetime('now') WHERE id = ?",
        )
        .bind(&instance_id)
        .execute(&state.db)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;

        info!(
            "实例 {} 所有组件已停止，更新状态为 STOPPED",
            instance_id
        );
    }

    Ok(SuccessResponse::ok(format!(
        "组件 {} 已停止",
        component
    )))
}

/// 获取组件运行状态
#[tauri::command]
pub async fn get_component_status(
    state: State<'_, AppState>,
    instance_id: String,
    component: String,
) -> AppResult<ComponentStatus> {
    let internal_component = map_component_name(&component);

    let running = state
        .process_manager
        .is_component_running(&instance_id, internal_component)
        .await;

    let pid = state
        .process_manager
        .get_process_pid(&instance_id, internal_component)
        .await;

    let uptime = state
        .process_manager
        .get_process_uptime(&instance_id, internal_component)
        .await;

    Ok(ComponentStatus {
        component,
        running,
        pid,
        uptime,
    })
}

/// 获取实例可用组件列表
#[tauri::command]
pub async fn get_instance_components(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<Vec<String>> {
    let instance = instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;

    let instance_path_str = instance.instance_path.unwrap_or(instance.name.clone());
    let instance_path = platform::get_instances_dir().join(&instance_path_str);

    let mut components = Vec::new();

    // 检查各组件目录是否存在
    if instance_path.join("MaiBot").exists() {
        components.push("MaiBot".to_string());
    }
    if instance_path.join("NapCat").exists() {
        components.push("NapCat".to_string());
    }
    if instance_path.join("MaiBot-Napcat-Adapter").exists() {
        components.push("MaiBot-Napcat-Adapter".to_string());
    }

    Ok(components)
}

// ==================== 终端交互命令 ====================

/// 向进程终端写入输入
#[tauri::command]
pub async fn terminal_write(
    state: State<'_, AppState>,
    instance_id: String,
    component: String,
    data: String,
) -> AppResult<()> {
    let internal_component = map_component_name(&component);
    state
        .process_manager
        .write_to_process(&instance_id, internal_component, &data)
        .await
}

/// 获取终端历史输出
#[tauri::command]
pub async fn terminal_get_history(
    state: State<'_, AppState>,
    instance_id: String,
    component: String,
    lines: Option<usize>,
) -> AppResult<Vec<String>> {
    let internal_component = map_component_name(&component);
    let history = state
        .process_manager
        .get_output_history(&instance_id, internal_component, lines.unwrap_or(300))
        .await;
    Ok(history)
}

/// 调整 PTY 终端大小
#[tauri::command]
pub async fn terminal_resize(
    state: State<'_, AppState>,
    instance_id: String,
    component: String,
    rows: u16,
    cols: u16,
) -> AppResult<()> {
    let internal_component = map_component_name(&component);
    state
        .process_manager
        .resize_pty(&instance_id, internal_component, rows, cols)
        .await
}
