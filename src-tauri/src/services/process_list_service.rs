//! 进程列表采样 —— 按 CPU 占用排序的 top-N 系统进程
//!
//! sysinfo 计算进程 CPU 占用需跨调用累积(至少两次 refresh 的间隔),故用一个持久 System
//! 单例,每次命令调用 refresh 一次,得到自上次调用以来的占用率。首次调用基线缺失返回 0,
//! 之后随前端轮询稳定。CPU 归一为"占整机的百分比":sysinfo 的 cpu_usage 是单核百分比
//! (满一核=100,占两核=200),除以逻辑核数得整机占比,与整机 CPU 条同量纲、便于横向理解。

use std::sync::OnceLock;

use serde::Serialize;
use sysinfo::{ProcessesToUpdate, System};
use tokio::sync::Mutex;

/// 单进程占用行(供 CPU 详情进程表)
#[derive(Debug, Clone, Serialize)]
pub struct ProcessRow {
    pub pid: u32,
    pub name: String,
    /// CPU 占用(占整机百分比,0-100)
    pub cpu: f32,
    /// 物理内存占用(字节)
    pub memory: u64,
}

/// 持久进程采样器:CPU 占用需跨调用累积,故 System 复用同一实例。
fn sampler() -> &'static Mutex<System> {
    static SAMPLER: OnceLock<Mutex<System>> = OnceLock::new();
    SAMPLER.get_or_init(|| Mutex::new(System::new()))
}

/// 采样并返回按 CPU 占用降序的 top-N 进程。limit 为 0 时返回空。
pub async fn top_processes(limit: usize) -> Vec<ProcessRow> {
    let cores = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(1) as f32;

    let mut system = sampler().lock().await;
    // 刷新全部进程(含 CPU/内存);进程 CPU 占用 = 自上次刷新以来的增量
    system.refresh_processes(ProcessesToUpdate::All, true);

    let mut rows: Vec<ProcessRow> = system
        .processes()
        .values()
        .map(|p| ProcessRow {
            pid: p.pid().as_u32(),
            name: p.name().to_string_lossy().to_string(),
            // 单核百分比 -> 整机百分比,钳 0-100
            cpu: (p.cpu_usage() / cores).min(100.0),
            memory: p.memory(),
        })
        .collect();

    rows.sort_by(|a, b| {
        b.cpu
            .partial_cmp(&a.cpu)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    rows.truncate(limit);
    rows
}
