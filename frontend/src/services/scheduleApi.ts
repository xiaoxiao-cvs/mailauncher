/**
 * 计划任务 API 客户端
 * 已迁移至 Tauri IPC 调用
 */

import { tauriInvoke } from '@/services/tauriInvoke';

// ==================== 类型定义 ====================

export type ScheduleAction = 'start' | 'stop' | 'restart';
export type ScheduleType = 'once' | 'daily' | 'weekly' | 'monitor';

export interface ScheduleConfig {
  hour?: number;
  minute?: number;
  weekdays?: number[];
  date?: string;
}

export interface Schedule {
  id: string;
  instance_id: string;
  name: string;
  action: ScheduleAction;
  schedule_type: ScheduleType;
  schedule_config: ScheduleConfig;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleCreate {
  instance_id: string;
  name: string;
  action: ScheduleAction;
  schedule_type: ScheduleType;
  schedule_config: ScheduleConfig;
  enabled?: boolean;
}

export interface ScheduleUpdate {
  name?: string;
  action?: ScheduleAction;
  schedule_type?: ScheduleType;
  schedule_config?: ScheduleConfig;
  enabled?: boolean;
}

export interface ScheduleToggle {
  enabled: boolean;
}

export interface SuccessResponse {
  message: string;
}

// ==================== API 客户端 ====================

class ScheduleApiClient {
  /**
   * 获取计划任务列表
   */
  async getSchedules(instanceId?: string): Promise<Schedule[]> {
    return tauriInvoke<Schedule[]>('list_schedules', {
      instanceId: instanceId ?? null,
    });
  }

  /**
   * 获取单个计划任务
   */
  async getSchedule(scheduleId: string): Promise<Schedule> {
    return tauriInvoke<Schedule>('get_schedule', { scheduleId });
  }

  /**
   * 创建计划任务
   */
  async createSchedule(data: ScheduleCreate): Promise<Schedule> {
    return tauriInvoke<Schedule>('create_schedule', {
      instanceId: data.instance_id,
      name: data.name,
      action: data.action,
      scheduleType: data.schedule_type,
      scheduleConfig: data.schedule_config,
      enabled: data.enabled ?? true,
    });
  }

  /**
   * 更新计划任务
   */
  async updateSchedule(scheduleId: string, data: ScheduleUpdate): Promise<Schedule> {
    return tauriInvoke<Schedule>('update_schedule', {
      scheduleId,
      name: data.name ?? null,
      action: data.action ?? null,
      scheduleType: data.schedule_type ?? null,
      scheduleConfig: data.schedule_config ?? null,
      enabled: data.enabled ?? null,
    });
  }

  /**
   * 删除计划任务
   */
  async deleteSchedule(scheduleId: string): Promise<SuccessResponse> {
    return tauriInvoke<SuccessResponse>('delete_schedule', { scheduleId });
  }

  /**
   * 切换计划任务启用状态
   */
  async toggleSchedule(scheduleId: string, enabled: boolean): Promise<Schedule> {
    return tauriInvoke<Schedule>('toggle_schedule', { scheduleId, enabled });
  }
}

export const scheduleApi = new ScheduleApiClient();
