/**
 * 看门狗只读状态 React Query hook
 *
 * 对每个"期望运行"的本地托管组件,给出自动重启偏好与实时存活态(纯查询、无副作用)。
 * 后端命令 get_watchdog_status 实时探测进程存活,故短轮询即可;空列表为正常态(无看护中组件)。
 */

import { useQuery } from "@tanstack/react-query";

import { tauriInvoke } from "@/services/tauriInvoke";

// ==================== Types ====================

/**
 * 单个看护中组件的状态快照。与后端 Rust `WatchdogInstanceStatus`(serde 默认命名)对齐。
 * autorestart_enabled:自动重启偏好(缺省视为开启,仅显式关闭为 false)。
 * is_alive:进程当前是否存活(实时探测)。
 */
export interface WatchdogInstanceStatus {
  instance_id: string;
  instance_name: string;
  component: string;
  autorestart_enabled: boolean;
  is_alive: boolean;
}

// ==================== Queries ====================

/**
 * 获取看门狗状态全量快照。
 * refetchInterval 5s 匹配看门狗探测节奏;staleTime 3s 抑制窗口聚焦等抖动重拉。
 */
export function useWatchdogStatusQuery() {
  return useQuery({
    queryKey: ["watchdog", "status"] as const,
    queryFn: () => tauriInvoke<WatchdogInstanceStatus[]>("get_watchdog_status"),
    refetchInterval: 5000,
    staleTime: 3000,
  });
}
