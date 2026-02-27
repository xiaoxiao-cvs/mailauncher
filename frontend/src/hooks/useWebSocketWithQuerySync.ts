/**
 * Tauri 事件集成 - 使用 React Query 更新缓存
 *
 * 基于 useWebSocket（已迁移为 Tauri 事件监听）的增强 hook，
 * 在任务完成/出错时自动失效 React Query 缓存。
 */

import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket, UseWebSocketOptions } from './useWebSocket';
import { instanceKeys } from './queries/useInstanceQueries';

/**
 * 增强的下载任务监听 hook，自动更新 React Query 缓存
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
