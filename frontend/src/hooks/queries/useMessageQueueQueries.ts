/**
 * 消息队列相关的 React Query hooks
 */

import { useQuery } from '@tanstack/react-query';
import { messageQueueApi } from '@/services/messageQueueApi';

// ==================== Query Keys ====================

export const messageQueueKeys = {
  all: ['messageQueue'] as const,
  instance: (instanceId: string) => [...messageQueueKeys.all, 'instance', instanceId] as const,
  allQueues: () => [...messageQueueKeys.all, 'all'] as const,
};

// ==================== Queries ====================

/**
 * 获取单个实例的消息队列
 * 默认 3 秒轮询
 */
export function useInstanceMessageQueueQuery(
  instanceId: string | null,
  options?: { 
    refetchInterval?: number | false;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: messageQueueKeys.instance(instanceId || ''),
    queryFn: async () => {
      if (!instanceId) {
        return null;
      }
      return messageQueueApi.getInstanceQueue(instanceId);
    },
    enabled: !!instanceId && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval ?? 3000, // 默认 3 秒
    staleTime: 1000, // 1 秒内数据视为新鲜
  });
}

/**
 * 获取所有实例的消息队列
 * 默认 3 秒轮询
 */
export function useAllMessageQueuesQuery(
  options?: { 
    refetchInterval?: number | false;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: messageQueueKeys.allQueues(),
    queryFn: async () => {
      return messageQueueApi.getAllQueues();
    },
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval ?? 3000,
    staleTime: 1000,
  });
}

// Re-export types
export type { MessageQueueResponse, MessageQueueItem, MessageStatus } from '@/services/messageQueueApi';
