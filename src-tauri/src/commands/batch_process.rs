/// 批量启停全部实例的 Tauri 命令(G10-2)
///
/// 复用单实例的 `start_instance` / `stop_instance` 编排(含 PTY Ctrl+C 优雅停止、
/// 生命周期状态同步、run_time 簿记),遍历所有实例逐个执行,聚合成功/失败清单。
/// 单个实例失败不中断其余(继续跑完),把每个失败的原因原文冒泡进 `failed` 供前端汇总。
///
/// 采用顺序执行而非并发:MaiBot + NapCat 均为重进程,同时拉起多套会瞬时打满
/// CPU/内存;且顺序执行让聚合结果的归因确定、可测。G10-1 的端口独立只是消除了
/// 并发运行时的端口冲突,并未要求启动动作必须并发。
use serde::Serialize;
use tauri::{AppHandle, State};
use tracing::info;

use crate::commands::process::{start_instance, stop_instance};
use crate::errors::AppResult;
use crate::services::instance_service;
use crate::state::AppState;

/// 批量操作的目标实例引用(内部用,不出 IPC)。
struct InstanceRef {
    id: String,
    name: String,
}

/// 批量操作中单个成功项(供前端展示成功清单)。
#[derive(Debug, Serialize)]
pub struct BatchItemSuccess {
    pub id: String,
    pub name: String,
}

/// 批量操作中单个失败项;`error` 保留冒泡上来的原始原因,前端据此汇总提示。
#[derive(Debug, Serialize)]
pub struct BatchItemFailure {
    pub id: String,
    pub name: String,
    pub error: String,
}

/// 批量启停的聚合结果:总数 + 成功清单 + 失败清单。
#[derive(Debug, Serialize)]
pub struct BatchOperationResult {
    pub total: usize,
    pub succeeded: Vec<BatchItemSuccess>,
    pub failed: Vec<BatchItemFailure>,
}

/// 逐个执行 `op` 并聚合结果的纯编排核心。
///
/// 与 Tauri/进程无耦合,便于单测:对每个目标调用 `op`,`Ok` 归入成功清单、`Err` 归入
/// 失败清单(保留 `to_string()` 原因),任一失败都不提前返回——continue-on-failure 是本函数的核心不变量。
async fn run_batch<F, Fut>(targets: Vec<InstanceRef>, mut op: F) -> BatchOperationResult
where
    F: FnMut(&InstanceRef) -> Fut,
    Fut: std::future::Future<Output = AppResult<()>>,
{
    let total = targets.len();
    let mut succeeded = Vec::new();
    let mut failed = Vec::new();

    for target in &targets {
        match op(target).await {
            Ok(()) => succeeded.push(BatchItemSuccess {
                id: target.id.clone(),
                name: target.name.clone(),
            }),
            Err(e) => failed.push(BatchItemFailure {
                id: target.id.clone(),
                name: target.name.clone(),
                error: e.to_string(),
            }),
        }
    }

    BatchOperationResult {
        total,
        succeeded,
        failed,
    }
}

/// 从数据库读出全部实例的 (id, name),作为批量操作目标。
async fn collect_targets(state: &AppState) -> AppResult<Vec<InstanceRef>> {
    let list = instance_service::get_all_instances(&state.db).await?;
    Ok(list
        .instances
        .into_iter()
        .map(|inst| InstanceRef {
            id: inst.id,
            name: inst.name,
        })
        .collect())
}

/// 启动全部实例(逐个复用 `start_instance`,单个失败不影响其余)。
#[tauri::command]
pub async fn start_all_instances(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> AppResult<BatchOperationResult> {
    let targets = collect_targets(&state).await?;
    info!("批量启动全部实例: 共 {} 个", targets.len());

    let result = run_batch(targets, |target| {
        let app_handle = app_handle.clone();
        let state = state.clone();
        let id = target.id.clone();
        async move { start_instance(app_handle, state, id).await.map(|_| ()) }
    })
    .await;

    Ok(result)
}

/// 停止全部实例(逐个复用 `stop_instance` 的优雅停止路径,单个失败不影响其余)。
#[tauri::command]
pub async fn stop_all_instances(
    state: State<'_, AppState>,
) -> AppResult<BatchOperationResult> {
    let targets = collect_targets(&state).await?;
    info!("批量停止全部实例: 共 {} 个", targets.len());

    let result = run_batch(targets, |target| {
        let state = state.clone();
        let id = target.id.clone();
        async move { stop_instance(state, id).await.map(|_| ()) }
    })
    .await;

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::errors::AppError;
    use std::cell::RefCell;

    #[tokio::test]
    async fn run_batch_continues_after_failure_and_partitions_results() {
        let targets = vec![
            InstanceRef {
                id: "inst_ok1".to_string(),
                name: "甲".to_string(),
            },
            InstanceRef {
                id: "inst_bad".to_string(),
                name: "乙".to_string(),
            },
            InstanceRef {
                id: "inst_ok2".to_string(),
                name: "丙".to_string(),
            },
        ];
        // 记录每个目标是否真的被尝试:用于证明"单个失败不中断"的核心不变量。
        let attempted = RefCell::new(Vec::<String>::new());

        let result = run_batch(targets, |target| {
            let attempted = &attempted;
            let id = target.id.clone();
            async move {
                attempted.borrow_mut().push(id.clone());
                if id == "inst_bad" {
                    Err(AppError::Process("boom".to_string()))
                } else {
                    Ok::<(), AppError>(())
                }
            }
        })
        .await;

        // 三者都被尝试:中间的失败没有让第三个被跳过(删掉 continue-on-failure 此断言必挂)。
        assert_eq!(
            *attempted.borrow(),
            vec![
                "inst_ok1".to_string(),
                "inst_bad".to_string(),
                "inst_ok2".to_string()
            ]
        );

        assert_eq!(result.total, 3);
        assert_eq!(result.succeeded.len(), 2);
        assert_eq!(result.failed.len(), 1);

        let ok_ids: Vec<&str> = result.succeeded.iter().map(|s| s.id.as_str()).collect();
        assert_eq!(ok_ids, vec!["inst_ok1", "inst_ok2"]);

        let failure = &result.failed[0];
        assert_eq!(failure.id, "inst_bad");
        assert_eq!(failure.name, "乙");
        assert!(
            failure.error.contains("boom"),
            "失败项应保留冒泡的原始原因, 实际: {}",
            failure.error
        );
    }

    #[tokio::test]
    async fn run_batch_empty_targets_yields_empty_result() {
        let result = run_batch(Vec::new(), |_target| async { Ok::<(), AppError>(()) }).await;
        assert_eq!(result.total, 0);
        assert!(result.succeeded.is_empty());
        assert!(result.failed.is_empty());
    }
}
