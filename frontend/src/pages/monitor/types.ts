/**
 * 监控 hub 各 deep tab 的统一契约。
 *
 * 所有 tab(系统总览 / CPU / 内存 / 硬盘 / 网络)接收同一组 props:静态系统信息 info +
 * 实时资源快照 stats,二者均来自 MonitorPage 顶层的一次 useSystemMonitor() 调用,逐个透传。
 * 首屏数据就绪前两者皆为 undefined,tab 内须自行处理"未就绪"占位(参见 home/HomeView 的 PLACEHOLDER 用法)。
 *
 * SystemInfo / SystemStats 的字段事实源在 @/services/systemApi(与 Rust 端一一对应),
 * 此处 re-export 仅为给 tab 提供"就近一处导入"的便利,不复制/不偏离原定义。
 */
import type { SystemInfo, SystemStats } from "@/services/systemApi";

export type { SystemInfo, SystemStats };

export interface MonitorTabProps {
  /** 静态系统信息(OS / CPU 型号 / 内核 / 内存规格 / GPU 等);首屏完成前为 undefined。 */
  info: SystemInfo | undefined;
  /** 实时资源快照(CPU / 内存 / 交换 / 磁盘 / 网络 / 负载 / 运行时长);首屏完成前为 undefined。 */
  stats: SystemStats | undefined;
}
