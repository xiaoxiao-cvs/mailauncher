/**
 * WebSocket 集成 - 使用 React Query 更新缓存
 */

import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket, UseWebSocketOptions, WSMessage } from './useWebSocket';
import { instanceKeys } from './queries/useInstanceQueries';

/**
 * 增强的 WebSocket hook，自动更新 React Query 缓存
 */
export function useWebSocketWithQuerySync(
  taskId: string | null,
  options: UseWebSocketOptions = {}
) {
  const queryClient = useQueryClient();

  // 包装原有的回调，添加 query invalidation
  const enhancedOptions: UseWebSocketOptions = {
    ...options,
    onProgress: (message: Parameters<NonNullable<UseWebSocketOptions['onProgress']>>[0]) => {
      options.onProgress?.(message);
      // 进度更新时，可以选择性刷新相关查询
    },
    onComplete: (message: Parameters<NonNullable<UseWebSocketOptions['onComplete']>>[0]) => {
      options.onComplete?.(message);
      // 完成时，失效所有实例相关查询，强制重新获取
      queryClient.invalidateQueries({ queryKey: instanceKeys.all });
    },
    onError: (message: Parameters<NonNullable<UseWebSocketOptions['onError']>>[0]) => {
      options.onError?.(message);
      // 错误时也可能需要刷新状态
      queryClient.invalidateQueries({ queryKey: instanceKeys.all });
    },
  };

  return useWebSocket(taskId, enhancedOptions);
}

/**
 * 为实例相关的 WebSocket 消息提供 query cache 更新
 * 可用于实例终端输出、状态变化等实时消息
 */
export function useInstanceWebSocketSync(
  instanceId: string | null,
  options: Omit<UseWebSocketOptions, 'onStatus'> & {
    onStatus?: (message: WSMessage & { status: string }) => void;
  } = {}
) {
  const queryClient = useQueryClient();

  const enhancedOptions: UseWebSocketOptions = {
    ...options,
    onStatus: (message: Parameters<NonNullable<UseWebSocketOptions['onStatus']>>[0]) => {
      options.onStatus?.(message as any);
      
      // 状态更新时，失效该实例的查询
      if (instanceId) {
        queryClient.invalidateQueries({ queryKey: instanceKeys.detail(instanceId) });
        queryClient.invalidateQueries({ queryKey: instanceKeys.components(instanceId) });
      }
    },
  };

  return useWebSocket(instanceId, enhancedOptions);
}
