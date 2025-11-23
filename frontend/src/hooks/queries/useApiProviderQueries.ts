/**
 * API 提供商配置相关的 React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl } from '@/config/api';

// ==================== Types ====================

export interface ApiProvider {
  id?: number;
  name: string;
  base_url: string;
  api_key: string;
  is_enabled: boolean;
  balance?: string;
  model_count?: number;
  models_updated_at?: string;
}

export interface ApiProviderCreate {
  name: string;
  base_url: string;
  api_key: string;
  is_enabled: boolean;
}

export interface ApiProviderUpdate {
  name?: string;
  base_url?: string;
  api_key?: string;
  is_enabled?: boolean;
}

export interface FetchModelsResponse {
  success: boolean;
  data: {
    models: string[];
    count: number;
  };
}

// ==================== Query Keys ====================

export const apiProviderKeys = {
  all: ['api-providers'] as const,
  list: () => [...apiProviderKeys.all, 'list'] as const,
  detail: (id: number) => [...apiProviderKeys.all, 'detail', id] as const,
  models: (id: number) => [...apiProviderKeys.all, 'models', id] as const,
};

// ==================== Queries ====================

/**
 * 获取所有 API 提供商
 */
export function useApiProvidersQuery() {
  return useQuery({
    queryKey: apiProviderKeys.list(),
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/config/api-providers`);
      const data = await response.json();

      if (!data.success) {
        throw new Error('加载 API 供应商失败');
      }

      return (data.data.providers || []) as ApiProvider[];
    },
  });
}

// ==================== Mutations ====================

/**
 * 创建 API 提供商
 */
export function useCreateApiProviderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: ApiProviderCreate) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/config/api-providers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(provider),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '创建供应商失败');
      }

      return data.data as ApiProvider;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiProviderKeys.list() });
    },
  });
}

/**
 * 更新 API 提供商
 */
export function useUpdateApiProviderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ApiProviderUpdate }) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/config/api-providers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '更新供应商失败');
      }

      return result.data as ApiProvider;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: apiProviderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: apiProviderKeys.list() });
    },
  });
}

/**
 * 删除 API 提供商
 */
export function useDeleteApiProviderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/config/api-providers/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '删除供应商失败');
      }

      return data;
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: apiProviderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: apiProviderKeys.list() });
    },
  });
}

/**
 * 获取供应商的模型列表
 */
export function useFetchProviderModelsMutation() {
  return useMutation({
    mutationFn: async (provider: ApiProvider) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/config/api-providers/${provider.id}/fetch-models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: FetchModelsResponse = await response.json();

      if (!data.success) {
        throw new Error('获取模型列表失败');
      }

      return data.data;
    },
  });
}

/**
 * 批量保存所有提供商
 */
export function useSaveAllProvidersMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (providers: ApiProviderCreate[]) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/config/api-providers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providers }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '保存供应商失败');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiProviderKeys.list() });
    },
  });
}
