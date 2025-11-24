/**
 * 实例相关的 React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instanceApi, ComponentType, InstanceCreate, InstanceUpdate } from '@/services/instanceApi';

// ==================== Query Keys ====================

export const instanceKeys = {
  all: ['instances'] as const,
  lists: () => [...instanceKeys.all, 'list'] as const,
  list: () => [...instanceKeys.lists()] as const,
  details: () => [...instanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...instanceKeys.details(), id] as const,
  components: (id: string) => [...instanceKeys.detail(id), 'components'] as const,
  componentStatus: (id: string, component: ComponentType) => 
    [...instanceKeys.components(id), component, 'status'] as const,
};

// ==================== Queries ====================

/**
 * 获取所有实例列表
 */
export function useInstancesQuery(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: instanceKeys.list(),
    queryFn: () => instanceApi.getAllInstances(),
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * 获取单个实例详情
 */
export function useInstanceQuery(instanceId: string | undefined, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: instanceKeys.detail(instanceId!),
    queryFn: () => instanceApi.getInstance(instanceId!),
    enabled: !!instanceId,
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * 获取实例的组件列表
 */
export function useInstanceComponentsQuery(instanceId: string | undefined) {
  return useQuery({
    queryKey: instanceKeys.components(instanceId!),
    queryFn: () => instanceApi.getInstanceComponents(instanceId!),
    enabled: !!instanceId,
    staleTime: 60000, // 组件列表变化不频繁，缓存1分钟
  });
}

/**
 * 获取组件状态
 */
export function useComponentStatusQuery(
  instanceId: string | undefined,
  component: ComponentType,
  options?: { refetchInterval?: number; enabled?: boolean }
) {
  return useQuery({
    queryKey: instanceKeys.componentStatus(instanceId!, component),
    queryFn: () => instanceApi.getComponentStatus(instanceId!, component),
    enabled: !!instanceId && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval,
  });
}

// ==================== Mutations ====================

/**
 * 创建实例
 */
export function useCreateInstanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InstanceCreate) => instanceApi.createInstance(data),
    onSuccess: () => {
      // 创建成功后，失效实例列表缓存
      queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
    },
  });
}

/**
 * 更新实例
 */
export function useUpdateInstanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InstanceUpdate }) =>
      instanceApi.updateInstance(id, data),
    onSuccess: (_, { id }) => {
      // 更新成功后，失效该实例和列表缓存
      queryClient.invalidateQueries({ queryKey: instanceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
    },
  });
}

/**
 * 删除实例
 */
export function useDeleteInstanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (instanceId: string) => instanceApi.deleteInstance(instanceId),
    onSuccess: (_, instanceId) => {
      // 删除成功后，移除该实例缓存并失效列表
      queryClient.removeQueries({ queryKey: instanceKeys.detail(instanceId) });
      queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
    },
  });
}

/**
 * 启动实例（所有组件）
 */
export function useStartInstanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (instanceId: string) => instanceApi.startInstance(instanceId),
    onMutate: async (instanceId) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: instanceKeys.detail(instanceId) });
      await queryClient.cancelQueries({ queryKey: instanceKeys.lists() });

      // 获取当前数据
      const previousInstance = queryClient.getQueryData(instanceKeys.detail(instanceId));
      const previousList = queryClient.getQueryData(instanceKeys.list());

      // 乐观更新详情：将状态设置为 starting
      queryClient.setQueryData(instanceKeys.detail(instanceId), (old: any) => {
        if (!old) return old;
        return { ...old, status: 'starting' };
      });

      // 乐观更新列表：将状态设置为 starting
      queryClient.setQueryData(instanceKeys.list(), (old: any) => {
        if (!old || !old.instances) return old;
        return {
          ...old,
          instances: old.instances.map((inst: any) =>
            inst.id === instanceId ? { ...inst, status: 'starting' } : inst
          ),
        };
      });

      return { previousInstance, previousList };
    },
    onError: (_err, instanceId, context) => {
      // 错误时回滚
      if (context?.previousInstance) {
        queryClient.setQueryData(instanceKeys.detail(instanceId), context.previousInstance);
      }
      if (context?.previousList) {
        queryClient.setQueryData(instanceKeys.list(), context.previousList);
      }
    },
    onSettled: (_, __, instanceId) => {
      // 完成后立即重新获取数据
      queryClient.invalidateQueries({ queryKey: instanceKeys.detail(instanceId) });
      queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: instanceKeys.components(instanceId) });
    },
  });
}

/**
 * 停止实例（所有组件）
 */
export function useStopInstanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (instanceId: string) => instanceApi.stopInstance(instanceId),
    onMutate: async (instanceId) => {
      await queryClient.cancelQueries({ queryKey: instanceKeys.detail(instanceId) });
      await queryClient.cancelQueries({ queryKey: instanceKeys.lists() });
      
      const previousInstance = queryClient.getQueryData(instanceKeys.detail(instanceId));
      const previousList = queryClient.getQueryData(instanceKeys.list());

      queryClient.setQueryData(instanceKeys.detail(instanceId), (old: any) => {
        if (!old) return old;
        return { ...old, status: 'stopping' };
      });

      queryClient.setQueryData(instanceKeys.list(), (old: any) => {
        if (!old || !old.instances) return old;
        return {
          ...old,
          instances: old.instances.map((inst: any) =>
            inst.id === instanceId ? { ...inst, status: 'stopping' } : inst
          ),
        };
      });

      return { previousInstance, previousList };
    },
    onError: (_err, instanceId, context) => {
      if (context?.previousInstance) {
        queryClient.setQueryData(instanceKeys.detail(instanceId), context.previousInstance);
      }
      if (context?.previousList) {
        queryClient.setQueryData(instanceKeys.list(), context.previousList);
      }
    },
    onSettled: (_, __, instanceId) => {
      queryClient.invalidateQueries({ queryKey: instanceKeys.detail(instanceId) });
      queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: instanceKeys.components(instanceId) });
    },
  });
}

/**
 * 重启实例（所有组件）
 */
export function useRestartInstanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (instanceId: string) => instanceApi.restartInstance(instanceId),
    onMutate: async (instanceId) => {
      await queryClient.cancelQueries({ queryKey: instanceKeys.detail(instanceId) });
      const previousInstance = queryClient.getQueryData(instanceKeys.detail(instanceId));

      queryClient.setQueryData(instanceKeys.detail(instanceId), (old: any) => {
        if (!old) return old;
        return { ...old, status: 'stopping' };
      });

      return { previousInstance };
    },
    onError: (_err, instanceId, context) => {
      if (context?.previousInstance) {
        queryClient.setQueryData(instanceKeys.detail(instanceId), context.previousInstance);
      }
    },
    onSettled: (_, __, instanceId) => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: instanceKeys.detail(instanceId) });
        queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
        queryClient.invalidateQueries({ queryKey: instanceKeys.components(instanceId) });
      }, 1000);
    },
  });
}

/**
 * 启动单个组件
 */
export function useStartComponentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ instanceId, component }: { instanceId: string; component: ComponentType }) =>
      instanceApi.startComponent(instanceId, component),
    onMutate: async ({ instanceId, component }) => {
      await queryClient.cancelQueries({ queryKey: instanceKeys.componentStatus(instanceId, component) });
      const previousStatus = queryClient.getQueryData(instanceKeys.componentStatus(instanceId, component));

      // 乐观更新组件状态
      queryClient.setQueryData(instanceKeys.componentStatus(instanceId, component), (old: any) => {
        if (!old) return { component, running: true };
        return { ...old, running: true };
      });

      return { previousStatus };
    },
    onError: (_err, { instanceId, component }, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(instanceKeys.componentStatus(instanceId, component), context.previousStatus);
      }
    },
    onSettled: (_, __, { instanceId, component }) => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: instanceKeys.componentStatus(instanceId, component) });
        queryClient.invalidateQueries({ queryKey: instanceKeys.detail(instanceId) });
        queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
      }, 500);
    },
  });
}

/**
 * 停止单个组件
 */
export function useStopComponentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ instanceId, component }: { instanceId: string; component: ComponentType }) =>
      instanceApi.stopComponent(instanceId, component),
    onMutate: async ({ instanceId, component }) => {
      await queryClient.cancelQueries({ queryKey: instanceKeys.componentStatus(instanceId, component) });
      const previousStatus = queryClient.getQueryData(instanceKeys.componentStatus(instanceId, component));

      queryClient.setQueryData(instanceKeys.componentStatus(instanceId, component), (old: any) => {
        if (!old) return { component, running: false };
        return { ...old, running: false };
      });

      return { previousStatus };
    },
    onError: (_err, { instanceId, component }, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(instanceKeys.componentStatus(instanceId, component), context.previousStatus);
      }
    },
    onSettled: (_, __, { instanceId, component }) => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: instanceKeys.componentStatus(instanceId, component) });
        queryClient.invalidateQueries({ queryKey: instanceKeys.detail(instanceId) });
        queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
      }, 500);
    },
  });
}
