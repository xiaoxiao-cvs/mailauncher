/**
 * 网络连接性检查相关的 React Query hooks
 */

import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '@/config/api';

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
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/environment/connectivity-check`);
      const data = await response.json();

      if (!data.success) {
        throw new Error('连接性检查失败');
      }

      return data.data as ConnectivityStatus;
    },
    staleTime: 30 * 1000, // 30秒缓存
    ...options,
  });
}
