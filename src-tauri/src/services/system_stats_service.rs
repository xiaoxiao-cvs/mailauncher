//! 系统资源实时采样服务
//!
//! 用持久 sysinfo 实例周期采样主机 CPU/内存/磁盘/网络。
//! CPU 使用率与网络速率均需跨两次采样的差值才有效,故 System/Networks 实例必须持久化
//! (与 process_service 中持久 System 用于进程 CPU 采样同理)。

use std::sync::{Arc, Mutex};
use std::time::Instant;

use serde::Serialize;
use sysinfo::{Disks, Networks, System};

use crate::services::load_average::LoadSampler;

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
    /// 本次会话累计下行(字节,自启动器 Networks 实例创建起算)
    pub net_rx_total: u64,
    /// 本次会话累计上行(字节)
    pub net_tx_total: u64,
    /// 主机已运行时长(秒)
    pub uptime_secs: u64,
    /// 系统平均负载(1 分钟,运行队列长度的 EWMA;Windows 经 PDH 计算,Unix 取 sysinfo 原生)
    pub load_avg_1: f64,
    /// 系统平均负载(5 分钟)
    pub load_avg_5: f64,
    /// 系统平均负载(15 分钟)
    pub load_avg_15: f64,
}

struct MonitorInner {
    system: System,
    networks: Networks,
    disks: Disks,
    load: LoadSampler,
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
                load: LoadSampler::new(),
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
        let mut rx_total = 0u64;
        let mut tx_total = 0u64;
        for data in inner.networks.list().values() {
            rx_bytes = rx_bytes.saturating_add(data.received());
            tx_bytes = tx_bytes.saturating_add(data.transmitted());
            rx_total = rx_total.saturating_add(data.total_received());
            tx_total = tx_total.saturating_add(data.total_transmitted());
        }
        let (net_rx_rate, net_tx_rate) = if elapsed > 0.0 {
            (
                (rx_bytes as f64 / elapsed).round() as u64,
                (tx_bytes as f64 / elapsed).round() as u64,
            )
        } else {
            (0, 0)
        };

        // 活跃线程估算:全局 CPU 占用比 × 逻辑核数(运行)+ 队列(等待),对齐任务管理器负载口径。
        let cpu_running = (cpu_usage as f64 / 100.0) * cpu_core_count as f64;
        let (load_avg_1, load_avg_5, load_avg_15) = inner.load.sample(elapsed, cpu_running);

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
            net_rx_total: rx_total,
            net_tx_total: tx_total,
            uptime_secs: System::uptime(),
            load_avg_1,
            load_avg_5,
            load_avg_15,
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

/// 主机静态系统信息(基本不变,前端一次性获取即可)。
#[derive(Debug, Clone, Serialize)]
pub struct SystemInfo {
    /// 操作系统名(如 Windows）
    pub os_name: String,
    /// 操作系统完整版本(如 Windows 11 Pro）
    pub os_long_version: String,
    /// 内核版本
    pub kernel_version: String,
    /// 主机名
    pub hostname: String,
    /// CPU 型号(品牌串)
    pub cpu_brand: String,
    /// CPU 标称频率(MHz)
    pub cpu_frequency: u64,
    /// 物理核心数
    pub cpu_physical_cores: usize,
    /// 逻辑核心数
    pub cpu_logical_cores: usize,
    /// CPU 架构(如 x86_64)
    pub arch: String,
    /// 启动器版本
    pub launcher_version: String,
    /// 物理内存总量(字节)
    pub memory_total: u64,
}

/// 采集一次主机静态系统信息。
pub fn gather_system_info() -> SystemInfo {
    let mut system = System::new();
    system.refresh_cpu_all();
    system.refresh_memory();

    let cpus = system.cpus();
    let (cpu_brand, cpu_frequency) = cpus
        .first()
        .map(|cpu| (cpu.brand().trim().to_string(), cpu.frequency()))
        .unwrap_or_else(|| ("未知".to_string(), 0));

    SystemInfo {
        os_name: System::name().unwrap_or_else(|| "未知".to_string()),
        os_long_version: System::long_os_version().unwrap_or_else(|| "未知".to_string()),
        kernel_version: System::kernel_version().unwrap_or_else(|| "未知".to_string()),
        hostname: System::host_name().unwrap_or_else(|| "未知".to_string()),
        cpu_brand,
        cpu_frequency,
        cpu_physical_cores: system.physical_core_count().unwrap_or(0),
        cpu_logical_cores: cpus.len(),
        arch: System::cpu_arch(),
        launcher_version: env!("CARGO_PKG_VERSION").to_string(),
        memory_total: system.total_memory(),
    }
}
