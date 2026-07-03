/**
 * 批量启停全部实例的 React Query mutation hooks(G10-2)
 *
 * 调用后端 start_all_instances / stop_all_instances,返回成功/失败聚合清单
 * (BatchOperationResult)。完成后失效实例列表缓存,让列表刷新到最新状态。
 * 汇总 toast 由调用方(InstanceListPage)按返回清单自行呈现。
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { instanceApi, BatchOperationResult } from "@/services/instanceApi";
import { instanceKeys } from "@/hooks/queries/useInstanceQueries";

/**
 * 启动全部实例。
 */
export function useStartAllInstancesMutation() {
  const queryClient = useQueryClient();

  return useMutation<BatchOperationResult, Error, void>({
    mutationFn: () => instanceApi.startAllInstances(),
    onSettled: () => {
      // 批量启动会改动多个实例状态,统一失效列表缓存触发重取。
      queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
    },
  });
}

/**
 * 停止全部实例。
 */
export function useStopAllInstancesMutation() {
  const queryClient = useQueryClient();

  return useMutation<BatchOperationResult, Error, void>({
    mutationFn: () => instanceApi.stopAllInstances(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
    },
  });
}
