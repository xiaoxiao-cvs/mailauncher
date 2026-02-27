/**
 * 环境配置相关的 React Query hooks
 *
 * 通过 Tauri invoke 直接调用 Rust 命令。
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from '@/services/tauriInvoke';

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
  deploymentPath: () => [...environmentKeys.all, 'deployment-path'] as const,
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
      return tauriInvoke<GitInfo>('check_git_environment');
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
      const pathConfig = await tauriInvoke<PathConfig | null>('get_path', { name: 'instances_dir' });
      return { instances_dir: pathConfig?.path ?? '' } as EnvironmentConfig;
    },
  });
}

/**
 * 获取部署路径
 */
export function useDeploymentPathQuery() {
  return useQuery({
    queryKey: environmentKeys.deploymentPath(),
    queryFn: async () => {
      const pathConfig = await tauriInvoke<PathConfig | null>('get_path', { name: 'instances_dir' });
      return pathConfig?.path ?? '';
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
      const envs = await tauriInvoke<Array<{ path: string; version: string; is_selected: boolean }>>('get_python_environments');
      return envs.map(e => ({
        version: e.version,
        path: e.path,
        is_default: e.is_selected,
      })) as PythonVersion[];
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
      const env = await tauriInvoke<{ path: string; version: string } | null>('get_selected_python');
      if (!env) {
        throw new Error('未设置默认 Python 版本');
      }
      return { version: env.version, path: env.path };
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
      const value = await tauriInvoke<string | null>('get_config', { key: 'venv_type' });
      return value ?? 'venv';
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
    mutationFn: async (path: string) => {
      await tauriInvoke('set_path', {
        name: 'instances_dir',
        path,
        pathType: 'directory',
        isVerified: false,
        description: 'Bot实例部署目录',
      });
    },
    onSuccess: () => {
      // 保存成功后，失效环境配置缓存
      queryClient.invalidateQueries({ queryKey: environmentKeys.config() });
      queryClient.invalidateQueries({ queryKey: environmentKeys.deploymentPath() });
    },
  });
}

/**
 * 设置默认 Python 版本
 */
export function useSetPythonDefaultMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (path: string) => {
      await tauriInvoke('select_python', { path });
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
      await tauriInvoke('set_config', { key: 'venv_type', value: venvType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: environmentKeys.venvType() });
    },
  });
}
