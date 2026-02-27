/**
 * API 提供商配置相关的 React Query hooks
 *
 * 通过 Tauri invoke 直接调用 Rust 命令。
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from '@/services/tauriInvoke';

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
  models: string[];
  models_count: number;
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
      return tauriInvoke<ApiProvider[]>('get_api_providers');
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
      return tauriInvoke<ApiProvider>('create_api_provider', {
        name: provider.name,
        baseUrl: provider.base_url,
        apiKey: provider.api_key,
        isEnabled: provider.is_enabled,
      });
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
      return tauriInvoke<ApiProvider>('update_api_provider', {
        id,
        name: data.name ?? null,
        baseUrl: data.base_url ?? null,
        apiKey: data.api_key ?? null,
        isEnabled: data.is_enabled ?? null,
      });
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
      await tauriInvoke('delete_api_provider', { id });
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
      return tauriInvoke<FetchModelsResponse>('fetch_provider_models', {
        providerId: provider.id,
      });
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
      return tauriInvoke<ApiProvider[]>('save_all_providers', { providers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiProviderKeys.list() });
    },
  });
}
