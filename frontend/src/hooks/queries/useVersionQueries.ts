/**
 * 版本管理相关的 React Query Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInstanceComponentsVersion,
  checkComponentUpdate,
  updateComponent,
  getBackups,
  restoreBackup,
  getUpdateHistory,
  getComponentReleases,
} from '@/services/versionApi';

// ==================== Query Keys ====================

export const versionKeys = {
  all: ['versions'] as const,
  components: (instanceId: string) => [...versionKeys.all, 'components', instanceId] as const,
  componentDetail: (instanceId: string, component: string) => 
    [...versionKeys.all, 'component', instanceId, component] as const,
  backups: (instanceId: string, component?: string) => 
    [...versionKeys.all, 'backups', instanceId, component] as const,
  history: (instanceId: string, component?: string) => 
    [...versionKeys.all, 'history', instanceId, component] as const,
  releases: (component: string) => 
    [...versionKeys.all, 'releases', component] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取实例所有组件的版本信息
 */
export function useComponentsVersionQuery(
  instanceId: string | undefined,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: versionKeys.components(instanceId!),
    queryFn: () => getInstanceComponentsVersion(instanceId!),
    enabled: !!instanceId && (options?.enabled ?? true),
    staleTime: 24 * 60 * 60 * 1000, // 24 小时内数据视为新鲜，不会自动重新获取
    refetchOnWindowFocus: false,
  });
}

/**
 * 检查单个组件的更新详情
 */
export function useCheckComponentUpdateQuery(
  instanceId: string | undefined,
  component: string | undefined,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: versionKeys.componentDetail(instanceId!, component!),
    queryFn: () => checkComponentUpdate(instanceId!, component!),
    enabled: !!instanceId && !!component && (options?.enabled ?? true),
    refetchOnWindowFocus: false,
  });
}

/**
 * 获取备份列表
 */
export function useBackupsQuery(
  instanceId: string | undefined,
  component?: string,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: versionKeys.backups(instanceId!, component),
    queryFn: () => getBackups(instanceId!, component),
    enabled: !!instanceId && (options?.enabled ?? true),
    refetchOnWindowFocus: false,
  });
}

/**
 * 获取更新历史
 */
export function useUpdateHistoryQuery(
  instanceId: string | undefined,
  component?: string,
  limit: number = 20,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: versionKeys.history(instanceId!, component),
    queryFn: () => getUpdateHistory(instanceId!, component, limit),
    enabled: !!instanceId && (options?.enabled ?? true),
    refetchOnWindowFocus: false,
  });
}

/**
 * 获取组件 Release 列表
 */
export function useComponentReleasesQuery(
  component: string | undefined,
  limit: number = 10,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: versionKeys.releases(component!),
    queryFn: () => getComponentReleases(component!, limit),
    enabled: !!component && (options?.enabled ?? true),
    refetchOnWindowFocus: false,
  });
}

// ==================== Mutation Hooks ====================

/**
 * 更新组件
 */
export function useUpdateComponentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      instanceId,
      component,
      createBackup = true,
      updateMethod = 'git',
    }: {
      instanceId: string;
      component: string;
      createBackup?: boolean;
      updateMethod?: 'git' | 'release';
    }) => updateComponent(instanceId, component, createBackup, updateMethod),
    
    onSuccess: (_, variables) => {
      // 使更新后的组件版本信息无效，触发重新获取
      queryClient.invalidateQueries({ 
        queryKey: versionKeys.components(variables.instanceId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: versionKeys.componentDetail(variables.instanceId, variables.component) 
      });
      queryClient.invalidateQueries({ 
        queryKey: versionKeys.backups(variables.instanceId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: versionKeys.history(variables.instanceId) 
      });
    },
  });
}

/**
 * 从备份恢复
 */
export function useRestoreBackupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      instanceId,
      backupId,
    }: {
      instanceId: string;
      backupId: string;
    }) => restoreBackup(instanceId, backupId),
    
    onSuccess: (_, variables) => {
      // 恢复后重新获取版本信息
      queryClient.invalidateQueries({ 
        queryKey: versionKeys.components(variables.instanceId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: versionKeys.history(variables.instanceId) 
      });
    },
  });
}

/**
 * 检查所有组件更新
 */
export function useCheckAllUpdates(instanceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!instanceId) throw new Error('实例 ID 不能为空');
      
      // 强制刷新组件版本信息
      await queryClient.invalidateQueries({ 
        queryKey: versionKeys.components(instanceId),
        refetchType: 'all'
      });
      
      // 获取最新数据
      return queryClient.fetchQuery({
        queryKey: versionKeys.components(instanceId),
        queryFn: () => getInstanceComponentsVersion(instanceId),
      });
    },
  });
}
