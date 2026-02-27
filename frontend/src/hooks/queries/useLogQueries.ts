/**
 * 日志查看相关的 React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from '@/services/tauriInvoke';

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
      return tauriInvoke<LogFile[]>('list_log_files');
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

      const result = await tauriInvoke<{ content: string }>('get_log_content', {
        fileName: filePath,
      });

      return result.content;
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
      const zipPath = await tauriInvoke<string>('export_logs');
      return { success: true, path: zipPath };
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
      await tauriInvoke<void>('clear_logs');
      return { success: true };
    },
    onSuccess: () => {
      // 清理成功后，失效日志相关查询
      queryClient.invalidateQueries({ queryKey: logKeys.all });
    },
  });
}
