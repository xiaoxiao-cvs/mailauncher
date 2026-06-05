/**
 * 系统资源 API
 *
 * 通过 Tauri invoke 直接调用 Rust 系统命令。
 * 字段为字节、字节/秒等原始量，格式化交由前端处理。
 */
import { tauriInvoke } from "@/services/tauriInvoke";

// ==================== 类型定义 ====================

/**
 * 主机系统资源实时快照（一次采样的结果）。
 *
 * 与 Rust `system_stats_service::SystemStats` 一一对应，由后台采样任务每约 1.5s
 * 通过 `system-stats` 事件推送，`get_system_stats` 命令返回最近一次采样。
 */
export interface SystemStats {
  /** 主机总 CPU 使用率（0-100） */
  cpu_usage: number;
  /** 逻辑核心数 */
  cpu_core_count: number;
  /** 逐核 CPU 使用率（0-100，顺序与后端 cpus() 一致） */
  cpu_cores: number[];
  /** 实时 CPU 频率（MHz，各核当前频率最大值；0 表示不可得） */
  cpu_freq_mhz: number;
  /** 物理内存总量（字节） */
  memory_total: number;
  /** 已用物理内存（字节） */
  memory_used: number;
  /** 交换区总量（字节） */
  swap_total: number;
  /** 已用交换区（字节） */
  swap_used: number;
  /** 所有磁盘总容量（字节） */
  disk_total: number;
  /** 所有磁盘可用容量（字节） */
  disk_available: number;
  /** 网络下行速率（字节/秒） */
  net_rx_rate: number;
  /** 网络上行速率（字节/秒） */
  net_tx_rate: number;
  /** 本次会话累计下行（字节，自启动器 Networks 实例创建起算） */
  net_rx_total: number;
  /** 本次会话累计上行（字节） */
  net_tx_total: number;
  /** 主机已运行时长（秒） */
  uptime_secs: number;
  /** 系统平均负载（1 分钟，运行队列长度 EWMA；Windows 经 PDH 计算） */
  load_avg_1: number;
  /** 系统平均负载（5 分钟） */
  load_avg_5: number;
  /** 系统平均负载（15 分钟） */
  load_avg_15: number;
}

/**
 * 主机静态系统信息（基本不变，前端一次性获取即可）。
 *
 * 与 Rust `system_stats_service::SystemInfo` 一一对应。
 */
export interface SystemInfo {
  /** 操作系统名（如 Windows） */
  os_name: string;
  /** 操作系统完整版本（如 Windows 11 Pro） */
  os_long_version: string;
  /** 内核版本 */
  kernel_version: string;
  /** 主机名 */
  hostname: string;
  /** CPU 型号（品牌串） */
  cpu_brand: string;
  /** CPU 标称频率（MHz） */
  cpu_frequency: number;
  /** 物理核心数 */
  cpu_physical_cores: number;
  /** 逻辑核心数 */
  cpu_logical_cores: number;
  /** CPU 架构（如 x86_64） */
  arch: string;
  /** 启动器版本 */
  launcher_version: string;
  /** 物理内存总量（字节） */
  memory_total: number;
  /** 内存频率（MT/s；0 表示未知） */
  memory_speed: number;
  /** 内存类型（如 DDR5；未知为 "未知"） */
  memory_type: string;
  /** 显卡名称列表（无独显/云服务器为空） */
  gpus: string[];
}

// ==================== Invoke 包装 ====================

/**
 * 获取主机系统资源实时快照（最近一次采样）。
 *
 * 用于首屏初始化或事件推送的兜底。实时更新应订阅 `system-stats` 事件。
 */
export function getSystemStats(): Promise<SystemStats> {
  return tauriInvoke<SystemStats>("get_system_stats");
}

/**
 * 获取主机静态系统信息（OS / CPU 型号 / 内核 / 主机名 / 架构等）。
 *
 * 数据基本不变，前端一次性获取即可。
 */
export function getSystemInfo(): Promise<SystemInfo> {
  return tauriInvoke<SystemInfo>("get_system_info");
}

/**
 * 单进程 CPU/内存占用（get_top_processes 返回项，对应 Rust ProcessRow）。
 */
export interface ProcessRow {
  /** 进程 PID */
  pid: number;
  /** 进程名 */
  name: string;
  /** CPU 占用（占整机百分比 0-100） */
  cpu: number;
  /** 物理内存占用（字节） */
  memory: number;
}

/**
 * 获取按 CPU 占用降序的 top-N 系统进程。
 *
 * 进程 CPU 占用需跨调用累积，后端持久 System 单例每次调用采样一次；
 * 前端在 CPU 详情打开期间轮询调用即得稳定增量。
 */
export function getTopProcesses(limit: number): Promise<ProcessRow[]> {
  return tauriInvoke<ProcessRow[]>("get_top_processes", { limit });
}
