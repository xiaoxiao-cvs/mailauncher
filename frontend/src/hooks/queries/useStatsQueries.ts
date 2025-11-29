/**
 * 统计数据相关的 React Query hooks
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiUrl } from '@/config/api';

// ==================== Types ====================

export type TimeRange = '1h' | '6h' | '12h' | '24h' | '7d' | '30d';

export interface StatsSummary {
  total_requests: number;
  total_cost: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  online_time: number;
  total_messages: number;
  total_replies: number;
  avg_response_time: number;
  cost_per_hour: number;
  tokens_per_hour: number;
}

export interface ModelStats {
  model_name: string;
  display_name: string | null;
  request_count: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  avg_response_time: number;
}

export interface RequestTypeStats {
  request_type: string;
  request_count: number;
  total_tokens: number;
  total_cost: number;
}

export interface InstanceStats {
  instance_id: string;
  instance_name: string;
  time_range: string;
  query_time: string;
  summary: StatsSummary;
  model_stats: ModelStats[];
  request_type_stats: RequestTypeStats[];
}

export interface StatsOverview {
  total_instances: number;
  running_instances: number;
  time_range: string;
  query_time: string;
  summary: StatsSummary;
  top_models: ModelStats[];
}

export interface AggregatedStats {
  instance_count: number;
  time_range: string;
  query_time: string;
  summary: StatsSummary;
  by_instance: InstanceStats[];
  model_stats: ModelStats[];
}

// ==================== Query Keys ====================

export const statsKeys = {
  all: ['stats'] as const,
  overview: (timeRange: TimeRange) => [...statsKeys.all, 'overview', timeRange] as const,
  aggregated: (timeRange: TimeRange, instanceIds?: string) => 
    [...statsKeys.all, 'aggregated', timeRange, instanceIds] as const,
  instance: (instanceId: string, timeRange: TimeRange) => 
    [...statsKeys.all, 'instance', instanceId, timeRange] as const,
  instanceModels: (instanceId: string, timeRange: TimeRange) => 
    [...statsKeys.all, 'instance', instanceId, 'models', timeRange] as const,
};

// ==================== Queries ====================

/**
 * 获取统计概览
 */
export function useStatsOverviewQuery(
  timeRange: TimeRange = '24h',
  options?: { refetchInterval?: number | false }
) {
  return useQuery({
    queryKey: statsKeys.overview(timeRange),
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/stats/overview?time_range=${timeRange}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || '获取统计概览失败');
      }
      
      return data.data as StatsOverview;
    },
    refetchInterval: options?.refetchInterval,
    staleTime: 10000, // 10秒内不重新请求
  });
}

/**
 * 获取聚合统计
 */
export function useAggregatedStatsQuery(
  timeRange: TimeRange = '24h',
  instanceIds?: string[],
  options?: { refetchInterval?: number | false }
) {
  const idsParam = instanceIds?.join(',');
  
  return useQuery({
    queryKey: statsKeys.aggregated(timeRange, idsParam),
    queryFn: async () => {
      const apiUrl = getApiUrl();
      let url = `${apiUrl}/stats/aggregated?time_range=${timeRange}`;
      if (idsParam) {
        url += `&instance_ids=${idsParam}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || '获取聚合统计失败');
      }
      
      return data.data as AggregatedStats;
    },
    refetchInterval: options?.refetchInterval,
    staleTime: 10000,
  });
}

/**
 * 获取单实例统计
 */
export function useInstanceStatsQuery(
  instanceId: string | undefined,
  timeRange: TimeRange = '24h',
  options?: { refetchInterval?: number | false }
) {
  return useQuery({
    queryKey: statsKeys.instance(instanceId!, timeRange),
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(
        `${apiUrl}/stats/instances/${instanceId}?time_range=${timeRange}`
      );
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || '获取实例统计失败');
      }
      
      return data.data as InstanceStats;
    },
    enabled: !!instanceId,
    refetchInterval: options?.refetchInterval,
    staleTime: 10000,
  });
}

/**
 * 获取实例模型统计
 */
export function useInstanceModelStatsQuery(
  instanceId: string | undefined,
  timeRange: TimeRange = '24h',
  limit: number = 10,
  options?: { refetchInterval?: number | false }
) {
  return useQuery({
    queryKey: statsKeys.instanceModels(instanceId!, timeRange),
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(
        `${apiUrl}/stats/instances/${instanceId}/models?time_range=${timeRange}&limit=${limit}`
      );
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || '获取模型统计失败');
      }
      
      return data.data as {
        instance_id: string;
        time_range: string;
        models: ModelStats[];
      };
    },
    enabled: !!instanceId,
    refetchInterval: options?.refetchInterval,
    staleTime: 10000,
  });
}

/**
 * 使用统计数据 invalidation
 */
export function useInvalidateStats() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: statsKeys.all }),
    invalidateOverview: () => queryClient.invalidateQueries({ queryKey: ['stats', 'overview'] }),
    invalidateInstance: (instanceId: string) => 
      queryClient.invalidateQueries({ queryKey: ['stats', 'instance', instanceId] }),
  };
}
