/**
 * 网络连接性检查相关的 React Query hooks
 *
 * 通过 Tauri invoke 直接调用 Rust 命令。
 */

import { useQuery } from '@tanstack/react-query';
import { tauriInvoke } from '@/services/tauriInvoke';

// ==================== Types ====================

export interface ConnectivityStatus {
  github: boolean;
  pypi: boolean;
}

// ==================== Query Keys ====================

export const connectivityKeys = {
  all: ['connectivity'] as const,
  status: () => [...connectivityKeys.all, 'status'] as const,
};

// ==================== Queries ====================

/**
 * 检查网络连接性
 */
export function useConnectivityQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: connectivityKeys.status(),
    queryFn: async () => {
      return tauriInvoke<ConnectivityStatus>('check_connectivity');
    },
    staleTime: 30 * 1000, // 30秒缓存
    ...options,
  });
}
