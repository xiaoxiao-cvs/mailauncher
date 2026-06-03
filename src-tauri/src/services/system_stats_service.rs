//! 系统资源实时采样服务
//!
//! 用持久 sysinfo 实例周期采样主机 CPU/内存/磁盘/网络。
//! CPU 使用率与网络速率均需跨两次采样的差值才有效,故 System/Networks 实例必须持久化
//! (与 process_service 中持久 System 用于进程 CPU 采样同理)。

use std::sync::{Arc, Mutex};
use std::time::Instant;

use serde::Serialize;
use sysinfo::{Disks, Networks, System};

/// 主机系统资源快照(一次采样的结果)。字段为字节/秒等原始量,格式化交前端。
#[derive(Debug, Clone, Serialize)]
pub struct SystemStats {
    /// 主机总 CPU 使用率(0-100)
    pub cpu_usage: f32,
    /// 逻辑核心数
    pub cpu_core_count: usize,
    /// 物理内存总量(字节)
    pub memory_total: u64,
    /// 已用物理内存(字节)
    pub memory_used: u64,
    /// 交换区总量(字节)
    pub swap_total: u64,
    /// 已用交换区(字节)
    pub swap_used: u64,
    /// 所有磁盘总容量(字节)
    pub disk_total: u64,
    /// 所有磁盘可用容量(字节)
    pub disk_available: u64,
    /// 网络下行速率(字节/秒)
    pub net_rx_rate: u64,
    /// 网络上行速率(字节/秒)
    pub net_tx_rate: u64,
    /// 主机已运行时长(秒)
    pub uptime_secs: u64,
}

struct MonitorInner {
    system: System,
    networks: Networks,
    disks: Disks,
    last_instant: Option<Instant>,
    latest: Option<SystemStats>,
}

/// 系统监视器:持有持久 sysinfo 实例,作为 Tauri 托管状态在采样任务与命令间共享。
#[derive(Clone)]
pub struct SystemMonitor {
    inner: Arc<Mutex<MonitorInner>>,
}

impl SystemMonitor {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(MonitorInner {
                system: System::new(),
                networks: Networks::new_with_refreshed_list(),
                disks: Disks::new_with_refreshed_list(),
                last_instant: None,
                latest: None,
            })),
        }
    }

    /// 采样一次:刷新 CPU/内存/磁盘/网络,按距上次采样的时间差计算网络速率,
    /// 更新缓存并返回最新快照。首次采样时 CPU 与网络速率为 0(缺少差值基准)。
    pub fn sample(&self) -> SystemStats {
        let mut inner = self.inner.lock().expect("系统监视器互斥锁中毒");

        let now = Instant::now();
        let elapsed = inner
            .last_instant
            .map(|prev| now.duration_since(prev).as_secs_f64())
            .unwrap_or(0.0);
        inner.last_instant = Some(now);

        inner.system.refresh_cpu_usage();
        let cpu_usage = inner.system.global_cpu_usage();
        let cpu_core_count = inner.system.cpus().len();

        inner.system.refresh_memory();
        let memory_total = inner.system.total_memory();
        let memory_used = inner.system.used_memory();
        let swap_total = inner.system.total_swap();
        let swap_used = inner.system.used_swap();

        inner.disks.refresh(false);
        let mut disk_total = 0u64;
        let mut disk_available = 0u64;
        for disk in inner.disks.list() {
            disk_total = disk_total.saturating_add(disk.total_space());
            disk_available = disk_available.saturating_add(disk.available_space());
        }

        inner.networks.refresh(false);
        let mut rx_bytes = 0u64;
        let mut tx_bytes = 0u64;
        for data in inner.networks.list().values() {
            rx_bytes = rx_bytes.saturating_add(data.received());
            tx_bytes = tx_bytes.saturating_add(data.transmitted());
        }
        let (net_rx_rate, net_tx_rate) = if elapsed > 0.0 {
            (
                (rx_bytes as f64 / elapsed).round() as u64,
                (tx_bytes as f64 / elapsed).round() as u64,
            )
        } else {
            (0, 0)
        };

        let stats = SystemStats {
            cpu_usage,
            cpu_core_count,
            memory_total,
            memory_used,
            swap_total,
            swap_used,
            disk_total,
            disk_available,
            net_rx_rate,
            net_tx_rate,
            uptime_secs: System::uptime(),
        };
        inner.latest = Some(stats.clone());
        stats
    }

    /// 返回最近一次采样;若采样任务尚未产出则立即采一次。
    pub fn latest_or_sample(&self) -> SystemStats {
        let cached = self
            .inner
            .lock()
            .ok()
            .and_then(|inner| inner.latest.clone());
        cached.unwrap_or_else(|| self.sample())
    }
}

impl Default for SystemMonitor {
    fn default() -> Self {
        Self::new()
    }
}
