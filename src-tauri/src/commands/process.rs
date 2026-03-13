/// 进程管理与实例启停 Tauri 命令
///
/// 对应前端 `instanceApi.ts` 中的启动/停止/重启/组件控制方法。
/// 实例级别的操作会协调 instance_service（更新 DB 状态）和
/// process_service（管理实际进程），与 Python 行为一致。
use std::io::Read;
use std::path::PathBuf;

use tauri::{AppHandle, State};
use tokio::runtime::Handle;
use tracing::{error, info, warn};

use crate::components::spec::ComponentSpec;
use crate::errors::{AppError, AppResult};
use crate::models::{ComponentLifecycleStatus, ComponentStatus, RuntimeProfile, SuccessResponse};
use crate::services::instance_service;
use crate::services::lifecycle_service;
use crate::services::process_service::ProcessManager;
use crate::services::terminal_stream_service::{ChannelTerminalStreamPublisher, TerminalStreamPublisher};
use crate::state::AppState;
use crate::utils::platform;

// ==================== 组件名称映射 ====================

fn resolve_component_spec<'a>(state: &'a AppState, component_name: &str) -> AppResult<&'static ComponentSpec> {
    state
        .component_registry
        .get_by_value(component_name)
        .ok_or_else(|| AppError::InvalidInput(format!("未知组件: {}", component_name)))
}

// ==================== 输出读取任务 ====================

/// 启动后台任务读取 PTY 输出，并通过 Tauri 事件推送到前端
///
/// 事件名格式: `terminal-output-{instance_id}::{component}`
fn spawn_output_reader(
    app_handle: AppHandle,
    process_manager: ProcessManager,
    publisher: ChannelTerminalStreamPublisher,
    instance_id: String,
    component: String,
    mut reader: Box<dyn Read + Send>,
) {
    let session_id = format!("{}::{}", instance_id, component);
    let runtime_handle = Handle::current();

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
                    let sanitized = runtime_handle.block_on(async { pm.add_output(&iid, &comp, t).await });

                    // 通过 Tauri 事件推送到前端
                    if let Some(sanitized) = sanitized {
                        let _ = publisher.publish_output(&app_handle, &instance_id, &component, &sanitized);
                    }
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

enum StartOutcome {
    Started,
    AlreadyRunning,
}

async fn stop_components_in_order(
    process_manager: &ProcessManager,
    instance_id: &str,
    components: &[&ComponentSpec],
) -> AppResult<Vec<(String, bool)>> {
    let mut results = Vec::new();

    for component in components {
        let success = process_manager
            .stop_process(instance_id, component.component.internal_key(), false)
            .await?;
        results.push((component.component.display_name().to_string(), success));
    }

    Ok(results)
}

// ==================== 启动组件的共用逻辑 ====================

/// 启动单个组件进程（内部实现）
async fn start_component_inner(
    app_handle: &AppHandle,
    state: &AppState,
    process_manager: &ProcessManager,
    instance_id: &str,
    instance_path: &PathBuf,
    component_spec: &ComponentSpec,
    runtime_profile: &RuntimeProfile,
    qq_account: Option<&str>,
) -> AppResult<StartOutcome> {
    let adapter = state.runtime_resolver.resolve(runtime_profile);
    let runtime_kind = adapter.runtime_kind();
    let resolved = adapter.resolve_component_command(
        instance_id,
        instance_path,
        component_spec,
        runtime_profile,
        qq_account,
    )?;
    let cmd = resolved.command;
    let args = resolved.args;
    let cwd = resolved.cwd;

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    // 启动进程
    let reader = process_manager
        .start_process(
            instance_id,
            component_spec.component.internal_key(),
            runtime_kind,
            &cmd,
            &arg_refs,
            &cwd,
        )
        .await?;

    // 如果返回了 reader（新启动的进程），启动输出读取任务
    if let Some(reader) = reader {
        spawn_output_reader(
            app_handle.clone(),
            process_manager.clone(),
            state.terminal_stream_publisher.clone(),
            instance_id.to_string(),
            component_spec.component.display_name().to_string(),
            reader,
        );

        return Ok(StartOutcome::Started);
    }

    Ok(StartOutcome::AlreadyRunning)
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

    lifecycle_service::sync_instance_state(
        &state.db,
        &state.process_manager,
        &state.component_registry,
        &instance_id,
        &instance_path,
        &instance.runtime_profile,
        None,
        Some("准备启动实例".to_string()),
    )
    .await?;

    info!("启动实例: {} ({})", instance.name, instance_id);

    // 获取可用组件并依次启动
    let components = state
        .component_registry
        .startup_order_for_path(&instance_path)?;
    let mut any_active = false;
    let mut last_error = None;

    for component in components {
        match start_component_inner(
            &app_handle,
            &state,
            &state.process_manager,
            &instance_id,
            &instance_path,
            component,
            &instance.runtime_profile,
            instance.qq_account.as_deref(),
        )
        .await
        {
            Ok(StartOutcome::Started) => {
                any_active = true;
                info!("组件 {}/{} 启动成功", instance_id, component.component.display_name());
            }
            Ok(StartOutcome::AlreadyRunning) => {
                any_active = true;
                warn!("组件 {}/{} 已在运行", instance_id, component.component.display_name());
            }
            Err(e) => {
                last_error = Some(e.to_string());
                error!("组件 {}/{} 启动失败: {}", instance_id, component.component.display_name(), e);
            }
        }
    }

    if any_active {
        let _ = sqlx::query("UPDATE instances SET last_run = datetime('now') WHERE id = ?")
            .bind(&instance_id)
            .execute(&state.db)
            .await;
        lifecycle_service::sync_instance_state(
            &state.db,
            &state.process_manager,
            &state.component_registry,
            &instance_id,
            &instance_path,
            &instance.runtime_profile,
            last_error,
            Some("实例启动完成".to_string()),
        )
        .await?;
    } else {
        lifecycle_service::sync_instance_state(
            &state.db,
            &state.process_manager,
            &state.component_registry,
            &instance_id,
            &instance_path,
            &instance.runtime_profile,
            last_error,
            Some("没有可成功启动的组件".to_string()),
        )
        .await?;
        return Err(AppError::Process(format!(
            "实例 {} 没有可启动的组件",
            instance_id
        )));
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
    let instance_path = platform::get_instances_dir().join(instance.instance_path.clone().unwrap_or(instance.name.clone()));
    let shutdown_order = state
        .component_registry
        .shutdown_order_for_path(&instance_path)?;

    // 记录运行时间
    if matches!(instance.status, crate::models::InstanceLifecycleStatus::Running | crate::models::InstanceLifecycleStatus::Partial) {
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

    let results = stop_components_in_order(&state.process_manager, &instance_id, &shutdown_order).await?;

    lifecycle_service::sync_instance_state(
        &state.db,
        &state.process_manager,
        &state.component_registry,
        &instance_id,
        &instance_path,
        &instance.runtime_profile,
        None,
        Some("实例已停止".to_string()),
    )
    .await?;

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

    let instance = instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;
    let instance_path = platform::get_instances_dir().join(instance.instance_path.unwrap_or(instance.name.clone()));
    let shutdown_order = state
        .component_registry
        .shutdown_order_for_path(&instance_path)?;

    // 先停止
    let _ = stop_components_in_order(&state.process_manager, &instance_id, &shutdown_order).await?;

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
    let component_spec = resolve_component_spec(&state, &component)?;

    let instance = instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;

    let instance_path_str = instance.instance_path.unwrap_or(instance.name.clone());
    let instance_path = platform::get_instances_dir().join(&instance_path_str);

    let startup_chain = state
        .component_registry
        .startup_chain_for_component(&instance_path, component_spec.component)?;
    let mut final_outcome = StartOutcome::AlreadyRunning;

    for spec in startup_chain {
        let outcome = start_component_inner(
            &app_handle,
            &state,
            &state.process_manager,
            &instance_id,
            &instance_path,
            spec,
            &instance.runtime_profile,
            instance.qq_account.as_deref(),
        )
        .await?;

        if spec.component == component_spec.component {
            final_outcome = outcome;
        }
    }

    lifecycle_service::sync_instance_state(
        &state.db,
        &state.process_manager,
        &state.component_registry,
        &instance_id,
        &instance_path,
        &instance.runtime_profile,
        None,
        Some(format!("组件 {} 已启动", component)),
    )
    .await?;

    let message = match final_outcome {
        StartOutcome::Started => format!("组件 {} 已启动", component),
        StartOutcome::AlreadyRunning => format!("组件 {} 已在运行", component),
    };

    Ok(SuccessResponse::ok(message))
}

/// 停止实例的指定组件
#[tauri::command]
pub async fn stop_component(
    state: State<'_, AppState>,
    instance_id: String,
    component: String,
) -> AppResult<SuccessResponse> {
    let component_spec = resolve_component_spec(&state, &component)?;

    let instance = instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;
    let instance_path = platform::get_instances_dir().join(instance.instance_path.clone().unwrap_or(instance.name.clone()));
    let shutdown_chain = state
        .component_registry
        .shutdown_chain_for_component(&instance_path, component_spec.component)?;
    let results = stop_components_in_order(&state.process_manager, &instance_id, &shutdown_chain).await?;

    if !results.iter().all(|(_, success)| *success) {
        return Err(AppError::Process(format!(
            "组件 {} 停止失败",
            component
        )));
    }

    // 检查实例是否还有组件在运行
    lifecycle_service::sync_instance_state(
        &state.db,
        &state.process_manager,
        &state.component_registry,
        &instance_id,
        &instance_path,
        &instance.runtime_profile,
        None,
        Some(format!("组件 {} 已停止", component)),
    )
    .await?;

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
    let component_spec = resolve_component_spec(&state, &component)?;
    let instance = instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;

    let running = state
        .process_manager
        .is_component_running(&instance_id, component_spec.component.internal_key())
        .await;

    let pid = state
        .process_manager
        .get_process_pid(&instance_id, component_spec.component.internal_key())
        .await;
    let guest_pid = state
        .process_manager
        .get_process_guest_pid(&instance_id, component_spec.component.internal_key())
        .await;

    let uptime = state
        .process_manager
        .get_process_uptime(&instance_id, component_spec.component.internal_key())
        .await;

    Ok(ComponentStatus {
        component: component_spec.component,
        runtime_kind: instance.runtime_profile.kind,
        status: if running {
            ComponentLifecycleStatus::Running
        } else {
            ComponentLifecycleStatus::Stopped
        },
        running,
        pid: if running { pid.or(guest_pid) } else { None },
        host_pid: if running { pid } else { None },
        guest_pid: if running { guest_pid } else { None },
        uptime: if running { uptime } else { None },
        last_error: None,
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

    let components = lifecycle_service::available_components(&state.component_registry, &instance_path)
        .into_iter()
        .map(|component| component.display_name().to_string())
        .collect();

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
    let component_spec = resolve_component_spec(&state, &component)?;
    state
        .process_manager
        .write_to_process(&instance_id, component_spec.component.internal_key(), &data)
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
    let component_spec = resolve_component_spec(&state, &component)?;
    let history = state
        .process_manager
        .get_output_history(&instance_id, component_spec.component.internal_key(), lines.unwrap_or(300))
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
    let component_spec = resolve_component_spec(&state, &component)?;
    state
        .process_manager
        .resize_pty(&instance_id, component_spec.component.internal_key(), rows, cols)
        .await
}
