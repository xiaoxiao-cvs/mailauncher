/**
 * 日志查看相关的 React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl } from '@/config/api';

// ==================== Types ====================

export interface LogFile {
  name: string;
  path: string;
  size: number;
  modified: string;
}

// ==================== Query Keys ====================

export const logKeys = {
  all: ['logs'] as const,
  files: () => [...logKeys.all, 'files'] as const,
  content: (filePath: string) => [...logKeys.all, 'content', filePath] as const,
};

// ==================== Queries ====================

/**
 * 获取日志文件列表
 */
export function useLogFilesQuery() {
  return useQuery({
    queryKey: logKeys.files(),
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/logger/frontend/files`);
      const data = await response.json();

      if (!data.success) {
        throw new Error('获取日志文件列表失败');
      }

      return data.data.files as LogFile[];
    },
    staleTime: 10000, // 日志文件列表缓存 10 秒
  });
}

/**
 * 获取日志文件内容
 */
export function useLogContentQuery(filePath: string | null) {
  return useQuery({
    queryKey: logKeys.content(filePath || ''),
    queryFn: async () => {
      if (!filePath) return null;

      const apiUrl = getApiUrl();
      const response = await fetch(
        `${apiUrl}/logger/frontend/content?path=${encodeURIComponent(filePath)}`
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error('读取日志内容失败');
      }

      return data.data.content as string;
    },
    enabled: !!filePath,
    staleTime: 5000, // 日志内容缓存 5 秒
  });
}

// ==================== Mutations ====================

/**
 * 导出日志
 */
export function useExportLogsMutation() {
  return useMutation({
    mutationFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/logger/frontend/export`);
      const blob = await response.blob();

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mailauncher-logs-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    },
  });
}

/**
 * 清理日志
 */
export function useClearLogsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/logger/frontend/clear`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error('清理日志失败');
      }

      return data;
    },
    onSuccess: () => {
      // 清理成功后，失效日志相关查询
      queryClient.invalidateQueries({ queryKey: logKeys.all });
    },
  });
}
