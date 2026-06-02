/// Python 供给 Tauri 命令
///
/// 提供"检测优先，没有则一键安装"的 Python 运行时供给。
///
/// 事件名（供前端对接）：
/// - `python-provision-progress` — 结构化进度（JSON: { stage, percentage, message }）
/// - `python-provision-log` — 日志消息（字符串载荷，每行一条）
use tauri::{AppHandle, Emitter, State};
use tracing::{error, info};

use crate::errors::AppResult;
use crate::services::python_provision::ProvisionResult;
use crate::services::{config_service, python_provision};
use crate::state::AppState;

/// 一键供给 Python
///
/// 流程：探测系统 uv → 若无则下载 uv → `uv python install <version>` →
/// `uv python find <version>` 定位路径 → 写入 python_environments 并选中。
///
/// `version` 省略时默认安装满足 MaiBot 要求的 3.12。
/// 进度通过 `python-provision-progress` / `python-provision-log` 事件推送。
#[tauri::command]
pub async fn provision_python(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    version: Option<String>,
) -> AppResult<ProvisionResult> {
    let version = version.unwrap_or_else(|| python_provision::DEFAULT_PYTHON_VERSION.to_string());
    info!("[provision_python] 开始供给 Python {}", version);

    let result = match python_provision::provision_python(&app_handle, &version).await {
        Ok(r) => r,
        Err(e) => {
            error!("[provision_python] 供给失败: {}", e);
            let _ = app_handle.emit(
                python_provision::PROGRESS_EVENT,
                python_provision::PythonProvisionProgress {
                    stage: "error".to_string(),
                    percentage: 0.0,
                    message: e.to_string(),
                },
            );
            return Err(e);
        }
    };

    // 登记进现有体系：保存并选中，使后续安装/启动可直接使用
    config_service::save_python_environment(&state.db, &result.python_path, &result.version)
        .await?;
    config_service::select_python(&state.db, &result.python_path).await?;
    info!(
        "[provision_python] 已登记并选中 Python: {} ({})",
        result.python_path, result.version
    );

    let _ = app_handle.emit(
        python_provision::PROGRESS_EVENT,
        python_provision::PythonProvisionProgress {
            stage: "done".to_string(),
            percentage: 100.0,
            message: format!("Python {} 已就绪", result.version),
        },
    );

    Ok(result)
}
