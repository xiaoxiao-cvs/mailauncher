/**
 * 环境配置相关的 React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl } from '@/config/api';

// ==================== Types ====================

export interface GitInfo {
  is_available: boolean;
  path: string;
  version: string;
}

export interface EnvironmentConfig {
  instances_dir: string;
}

export interface PathConfig {
  name: string;
  path: string;
  path_type: 'directory' | 'file';
  is_verified: boolean;
  description: string;
}

export interface PythonVersion {
  version: string;
  path: string;
  is_default?: boolean;
}

// ==================== Query Keys ====================

export const environmentKeys = {
  all: ['environment'] as const,
  git: () => [...environmentKeys.all, 'git'] as const,
  config: () => [...environmentKeys.all, 'config'] as const,
  python: () => [...environmentKeys.all, 'python'] as const,
  pythonVersions: () => [...environmentKeys.python(), 'versions'] as const,
  pythonDefault: () => [...environmentKeys.python(), 'default'] as const,
  venvType: () => [...environmentKeys.all, 'venv-type'] as const,
};

// ==================== Queries ====================

/**
 * 获取 Git 环境信息
 */
export function useGitEnvironmentQuery() {
  return useQuery({
    queryKey: environmentKeys.git(),
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/environment/git`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('无法获取 Git 信息');
      }
      
      return data.data as GitInfo;
    },
    staleTime: 60000, // Git 环境变化不频繁，缓存 1 分钟
  });
}

/**
 * 获取环境配置（部署路径等）
 */
export function useEnvironmentConfigQuery() {
  return useQuery({
    queryKey: environmentKeys.config(),
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/environment/config`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('加载部署路径失败');
      }
      
      return data.data as EnvironmentConfig;
    },
  });
}

/**
 * 获取 Python 版本列表
 */
export function usePythonVersionsQuery() {
  return useQuery({
    queryKey: environmentKeys.pythonVersions(),
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/environment/python/versions`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('获取 Python 版本失败');
      }
      
      return data.data.versions as PythonVersion[];
    },
    staleTime: 300000, // Python 安装变化不频繁，缓存 5 分钟
  });
}

/**
 * 获取默认 Python 版本
 */
export function usePythonDefaultQuery() {
  return useQuery({
    queryKey: environmentKeys.pythonDefault(),
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/environment/python/default`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('获取默认 Python 版本失败');
      }
      
      return data.data as { version: string; path: string };
    },
  });
}

/**
 * 获取虚拟环境类型
 */
export function useVenvTypeQuery() {
  return useQuery({
    queryKey: environmentKeys.venvType(),
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/environment/venv/type`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('获取虚拟环境类型失败');
      }
      
      return data.data.venv_type as string;
    },
  });
}

// ==================== Mutations ====================

/**
 * 保存部署路径
 */
export function useSavePathMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pathConfig: PathConfig) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/config/paths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pathConfig),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error('保存路径失败');
      }

      return data;
    },
    onSuccess: () => {
      // 保存成功后，失效环境配置缓存
      queryClient.invalidateQueries({ queryKey: environmentKeys.config() });
    },
  });
}

/**
 * 设置默认 Python 版本
 */
export function useSetPythonDefaultMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ version, path }: { version: string; path: string }) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/environment/python/default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ version, path }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error('设置默认 Python 版本失败');
      }

      return data;
    },
    onSuccess: () => {
      // 更新成功后，失效相关查询
      queryClient.invalidateQueries({ queryKey: environmentKeys.pythonDefault() });
      queryClient.invalidateQueries({ queryKey: environmentKeys.pythonVersions() });
    },
  });
}

/**
 * 设置虚拟环境类型
 */
export function useSetVenvTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (venvType: string) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/environment/venv/type`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ venv_type: venvType }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error('设置虚拟环境类型失败');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: environmentKeys.venvType() });
    },
  });
}
