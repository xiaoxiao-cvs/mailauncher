/**
 * 下载管理相关的 React Query hooks
 */

import { useMutation } from '@tanstack/react-query';
import { getApiUrl } from '@/config/api';

// ==================== Types ====================

export interface DownloadTaskRequest {
  deployment_path: string;
  instance_name: string;
  items: Array<{
    type: string;
    version?: string;
  }>;
}

export interface DownloadTaskResponse {
  success: boolean;
  data: {
    task_id: string;
  };
  message?: string;
}

// ==================== Mutations ====================

/**
 * 创建下载任务
 */
export function useCreateDownloadTaskMutation() {
  return useMutation({
    mutationFn: async (request: DownloadTaskRequest) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/downloads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data: DownloadTaskResponse = await response.json();

      if (!data.success) {
        throw new Error(data.message || '创建下载任务失败');
      }

      return data.data.task_id;
    },
    onSuccess: () => {
      // 下载任务创建后，可能需要刷新实例列表
      // 这里暂时不做处理，由 WebSocket 消息更新
    },
  });
}
