/**
 * 计划任务 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleApi, Schedule, ScheduleCreate, ScheduleUpdate } from '@/services/scheduleApi';
import { toast } from 'sonner';

// ==================== Query Keys ====================

export const scheduleKeys = {
  all: ['schedules'] as const,
  lists: () => [...scheduleKeys.all, 'list'] as const,
  list: (instanceId?: string) => [...scheduleKeys.lists(), { instanceId }] as const,
  details: () => [...scheduleKeys.all, 'detail'] as const,
  detail: (id: string) => [...scheduleKeys.details(), id] as const,
};

// ==================== Queries ====================

/**
 * 获取计划任务列表
 */
export function useSchedulesQuery(instanceId?: string) {
  return useQuery({
    queryKey: scheduleKeys.list(instanceId),
    queryFn: () => scheduleApi.getSchedules(instanceId),
  });
}

/**
 * 获取单个计划任务
 */
export function useScheduleQuery(scheduleId: string) {
  return useQuery({
    queryKey: scheduleKeys.detail(scheduleId),
    queryFn: () => scheduleApi.getSchedule(scheduleId),
    enabled: !!scheduleId,
  });
}

// ==================== Mutations ====================

/**
 * 创建计划任务
 */
export function useCreateScheduleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ScheduleCreate) => scheduleApi.createSchedule(data),
    onSuccess: (newSchedule) => {
      // 刷新列表
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      toast.success('计划任务创建成功', {
        description: `任务"${newSchedule.name}"已创建`,
      });
    },
    onError: (error: Error) => {
      toast.error('创建计划任务失败', {
        description: error.message,
      });
    },
  });
}

/**
 * 更新计划任务
 */
export function useUpdateScheduleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: ScheduleUpdate }) =>
      scheduleApi.updateSchedule(scheduleId, data),
    onSuccess: (updatedSchedule) => {
      // 刷新列表和详情
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(updatedSchedule.id) });
      toast.success('计划任务更新成功', {
        description: `任务"${updatedSchedule.name}"已更新`,
      });
    },
    onError: (error: Error) => {
      toast.error('更新计划任务失败', {
        description: error.message,
      });
    },
  });
}

/**
 * 删除计划任务
 */
export function useDeleteScheduleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: string) => scheduleApi.deleteSchedule(scheduleId),
    onSuccess: () => {
      // 刷新列表
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      toast.success('计划任务已删除');
    },
    onError: (error: Error) => {
      toast.error('删除计划任务失败', {
        description: error.message,
      });
    },
  });
}

/**
 * 切换计划任务启用状态
 */
export function useToggleScheduleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, enabled }: { scheduleId: string; enabled: boolean }) =>
      scheduleApi.toggleSchedule(scheduleId, enabled),
    onSuccess: (updatedSchedule) => {
      // 刷新列表和详情
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(updatedSchedule.id) });
      toast.success(
        updatedSchedule.enabled ? '计划任务已启用' : '计划任务已禁用',
        {
          description: `任务"${updatedSchedule.name}"`,
        }
      );
    },
    onError: (error: Error) => {
      toast.error('切换任务状态失败', {
        description: error.message,
      });
    },
  });
}
