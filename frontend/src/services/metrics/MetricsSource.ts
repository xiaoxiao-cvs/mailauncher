/**
 * 监控数据层 - 指标来源抽象
 *
 * MetricsSource 把"样本从哪来"与"样本怎么存/怎么用"解耦:
 * - LocalHostMetricsSource 包住本地 Tauri 的 system-stats 事件(启动器所在机器);
 * - 将来管理远程 Linux 服务器时,RemoteMetricsSource 只需实现同一接口,
 *   上层 timeSeriesStore / UI 一行不改即可切换数据源。
 *
 * 当前仅落地本地实现;远程实现待路线明确再补(此处刻意只留接口)。
 */
import { transport } from "@/services/transport";
import type { SystemStats } from "@/services/systemApi";
import { HOST_SCOPE, type MetricSample } from "./types";

/** 指标来源:订阅归一化样本流,返回取消订阅函数。 */
export interface MetricsSource {
  subscribe(handler: (sample: MetricSample) => void): () => void;
}

/** 把后端整机快照(SystemStats)归一化为 host 作用域样本。 */
function toHostSample(stats: SystemStats): MetricSample {
  // total 为 0 时取 0 是除零保护(整机内存/磁盘不会为 0),非业务空值掩盖
  const pct = (used: number, total: number) =>
    total > 0 ? (used / total) * 100 : 0;
  return {
    scope: HOST_SCOPE,
    metrics: {
      cpu: stats.cpu_usage,
      mem: pct(stats.memory_used, stats.memory_total),
      swap: pct(stats.swap_used, stats.swap_total),
      disk: pct(stats.disk_total - stats.disk_available, stats.disk_total),
      netRx: stats.net_rx_rate,
      netTx: stats.net_tx_rate,
      load:
        stats.cpu_core_count > 0
          ? Math.min(100, (stats.load_avg_1 / stats.cpu_core_count) * 100)
          : 0,
    },
    cores: stats.cpu_cores,
  };
}

/** 本地整机指标来源:订阅 Tauri system-stats 事件并归一化为 host 样本。 */
export class LocalHostMetricsSource implements MetricsSource {
  subscribe(handler: (sample: MetricSample) => void): () => void {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    // transport.listen 异步;就绪前若已取消,立即解除避免泄漏(与 useTransportEvent 同策略)
    void transport
      .listen<SystemStats>("system-stats", (stats) =>
        handler(toHostSample(stats)),
      )
      .then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }
}
