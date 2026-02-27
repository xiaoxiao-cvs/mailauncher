/**
 * 下载管理相关的 React Query hooks
 *
 * 通过 Tauri invoke 直接调用 Rust 命令。
 */

import { useMutation } from '@tanstack/react-query';
import { tauriInvoke } from '@/services/tauriInvoke';

// ==================== Types ====================

export interface DownloadTaskRequest {
  deployment_path: string;
  instance_name: string;
  items: Array<{
    type: string;
    version?: string;
  }>;
}

export interface DownloadTask {
  id: string;
  [key: string]: any;
}

// ==================== Mutations ====================

/**
 * 创建下载任务
 */
export function useCreateDownloadTaskMutation() {
  return useMutation({
    mutationFn: async (request: DownloadTaskRequest) => {
      const task = await tauriInvoke<DownloadTask>('create_download_task', {
        data: request,
      });
      return task.id;
    },
    onSuccess: () => {
      // 下载任务创建后，由 Tauri 事件更新状态
    },
  });
}
