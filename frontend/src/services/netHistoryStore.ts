/**
 * 网络历史 - timeSeriesStore 上的选择器
 *
 * 网络上/下行历史已并入通用 timeSeriesStore(host 作用域的 netRx/netTx 序列)。
 * 本模块仅保留 useNetHistory 选择器,兼容既有调用方(首页系统卡网络波形)。
 * 全局累积的启动改由 timeSeriesStore.startMetrics() 负责(App 挂载时一次)。
 */
import { useTimeSeries } from "@/services/metrics/timeSeriesStore";
import { HOST_SCOPE } from "@/services/metrics/types";

export interface NetHistory {
  /** 下行速率序列(字节/秒) */
  down: number[];
  /** 上行速率序列(字节/秒) */
  up: number[];
}

/** 读取整机网络上/下行历史(随每帧更新触发重渲染)。 */
export function useNetHistory(): NetHistory {
  const down = useTimeSeries(HOST_SCOPE, "netRx");
  const up = useTimeSeries(HOST_SCOPE, "netTx");
  return { down, up };
}
