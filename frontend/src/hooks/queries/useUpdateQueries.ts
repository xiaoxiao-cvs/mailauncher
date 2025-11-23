/**
 * 更新管理相关的 React Query hooks
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import {
  checkUpdateFromBackend,
  checkUpdateWithTauri,
  getChannelVersions,
  getCurrentVersion,
} from '@/services/updateService';

// ==================== Query Keys ====================

export const updateKeys = {
  all: ['updates'] as const,
  currentVersion: () => [...updateKeys.all, 'current'] as const,
  channelVersions: (channel: string) => [...updateKeys.all, 'channel', channel] as const,
  checkUpdate: (channel: string) => [...updateKeys.all, 'check', channel] as const,
};

// ==================== Queries ====================

/**
 * 获取当前版本
 */
export function useCurrentVersionQuery() {
  return useQuery({
    queryKey: updateKeys.currentVersion(),
    queryFn: getCurrentVersion,
    staleTime: Infinity, // 当前版本在会话期间不变
  });
}

/**
 * 获取指定通道的版本列表
 */
export function useChannelVersionsQuery(channel: string, limit = 20) {
  return useQuery({
    queryKey: updateKeys.channelVersions(channel),
    queryFn: () => getChannelVersions(channel, limit),
    staleTime: 300000, // 版本列表缓存 5 分钟
  });
}

/**
 * 检查更新（后端）
 */
export function useCheckUpdateQuery(channel: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: updateKeys.checkUpdate(channel),
    queryFn: () => checkUpdateFromBackend(channel),
    staleTime: 60000, // 更新检查缓存 1 分钟
    enabled: options?.enabled,
  });
}

// ==================== Mutations ====================

/**
 * 检查更新（Tauri）
 */
export function useCheckTauriUpdateMutation() {
  return useMutation({
    mutationFn: checkUpdateWithTauri,
  });
}

/**
 * 安装更新（Tauri）
 */
export function useInstallTauriUpdateMutation() {
  return useMutation({
    mutationFn: async (update: any) => {
      // Tauri updater API
      await update.downloadAndInstall();
      return { success: true };
    },
  });
}

/**
 * 打开下载页面
 */
export function useOpenDownloadPageMutation() {
  return useMutation({
    mutationFn: async (url: string) => {
      window.open(url, '_blank');
      return { success: true };
    },
  });
}
