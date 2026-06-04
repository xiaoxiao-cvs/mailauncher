/**
 * 网络历史滚动缓冲(全局持久化单例)
 *
 * 把 system-stats 事件里的网络收发速率累积成滚动缓冲,供系统卡网络波形 / 峰值读取。
 * 之所以提到模块级单例(而非在 SystemPanel 内逐帧累积):
 * - 监测需跨页面持续——切到别的页面后仍累积,切回主页即见完整历史,而非冷启动的稀疏缓冲;
 * - 缓冲预填满 CAP 个 0,默认即一条贴中轴的平直基线("没数据前的曲线"),真实样本从右滚入,
 *   始终是密集 CAP 点——避免稀疏点被平滑曲线连成大波浪。
 *
 * 由 App 挂载时调用一次 startNetHistory() 启动;订阅在应用生命周期内常驻,刻意不解除。
 */
import { useSyncExternalStore } from "react";
import { transport } from "@/services/transport";
import type { SystemStats } from "@/services/systemApi";

/** 滚动缓冲容量:每约 1.5s 一帧,48 帧约 72s 走势。 */
export const NET_HIST_CAP = 48;

export interface NetHistory {
  /** 下行速率序列(字节/秒) */
  down: number[];
  /** 上行速率序列(字节/秒) */
  up: number[];
}

let down: number[] = new Array(NET_HIST_CAP).fill(0);
let up: number[] = new Array(NET_HIST_CAP).fill(0);
let snapshot: NetHistory = { down, up };

const listeners = new Set<() => void>();
let started = false;

function emit() {
  // 每次更新换新引用,满足 useSyncExternalStore 的不可变快照约定。
  snapshot = { down, up };
  for (const l of listeners) l();
}

function push(stats: SystemStats) {
  down = [...down, stats.net_rx_rate].slice(-NET_HIST_CAP);
  up = [...up, stats.net_tx_rate].slice(-NET_HIST_CAP);
  emit();
}

/** 启动全局网络历史累积(幂等)。订阅常驻应用生命周期,不保存 unlisten。 */
export function startNetHistory(): void {
  if (started) return;
  started = true;
  void transport.listen<SystemStats>("system-stats", push);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): NetHistory {
  return snapshot;
}

/** 读取全局网络历史(随每帧更新触发重渲染)。 */
export function useNetHistory(): NetHistory {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
