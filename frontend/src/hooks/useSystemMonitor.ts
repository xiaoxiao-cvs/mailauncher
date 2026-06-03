/**
 * 系统资源监控 Hook
 *
 * 组合两类数据：
 * (a) 静态系统信息：`get_system_info` 用 useQuery 一次性获取，staleTime 设为 Infinity 不轮询；
 * (b) 实时资源快照：订阅后端 `system-stats` 事件（每约 1.5s 推送）写入本地 state，
 *     并以 `get_system_stats` 的最近一次采样作为首屏初值/兜底（事件到达前的占位）。
 *
 * 数据流：事件是实时数据的唯一真相源。兜底查询仅在首个事件到达前提供初值——
 * 一旦收到事件，本地 state 即由事件驱动，兜底查询的后续结果不再覆盖它。
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getSystemInfo,
  getSystemStats,
  type SystemInfo,
  type SystemStats,
} from "@/services/systemApi";
import { useTransportEvent } from "@/hooks/useTransportEvent";

const systemMonitorKeys = {
  info: ["system", "info"] as const,
  statsSeed: ["system", "stats", "seed"] as const,
};

export interface SystemMonitorState {
  /** 静态系统信息；首次获取完成前为 undefined */
  info: SystemInfo | undefined;
  /** 实时资源快照；首个事件或兜底查询完成前为 undefined */
  stats: SystemStats | undefined;
  /** 静态信息与实时快照均尚未就绪（首屏无可渲染数据） */
  loading: boolean;
}

export function useSystemMonitor(): SystemMonitorState {
  // (a) 静态系统信息：一次性获取，永不过期、不轮询、不在聚焦/重连时重取
  const infoQuery = useQuery({
    queryKey: systemMonitorKeys.info,
    queryFn: getSystemInfo,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // (b) 实时快照本地 state；初值由下方兜底查询填充，之后由 `system-stats` 事件驱动
  const [stats, setStats] = useState<SystemStats | undefined>(undefined);
  // 标记是否已收到过事件：一旦为真，兜底查询的结果不再回填，避免覆盖更新的事件数据
  const [hasLiveStats, setHasLiveStats] = useState(false);

  // 首屏初值/兜底：取最近一次采样。仅用于事件到达前的占位，故不轮询。
  useQuery({
    queryKey: systemMonitorKeys.statsSeed,
    queryFn: async () => {
      const seed = await getSystemStats();
      // 事件尚未到达时用采样初值占位；已到达则保留事件数据为最新真相
      setStats((current) => (current === undefined ? seed : current));
      return seed;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !hasLiveStats,
  });

  // 订阅实时推送：每个事件直接覆盖本地 state，并关闭兜底查询
  useTransportEvent<SystemStats>("system-stats", (payload) => {
    setStats(payload);
    setHasLiveStats(true);
  });

  return {
    info: infoQuery.data,
    stats,
    loading: infoQuery.data === undefined && stats === undefined,
  };
}
