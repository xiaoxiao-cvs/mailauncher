/**
 * 计划任务 API 客户端
 */

import { apiJson } from '@/config/api';

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
  private basePath = '/schedules';

  /**
   * 获取计划任务列表
   */
  async getSchedules(instanceId?: string): Promise<Schedule[]> {
    const url = instanceId
      ? `${this.basePath}?instance_id=${instanceId}`
      : this.basePath;
    return apiJson<Schedule[]>(url);
  }

  /**
   * 获取单个计划任务
   */
  async getSchedule(scheduleId: string): Promise<Schedule> {
    return apiJson<Schedule>(`${this.basePath}/${scheduleId}`);
  }

  /**
   * 创建计划任务
   */
  async createSchedule(data: ScheduleCreate): Promise<Schedule> {
    return apiJson<Schedule>(this.basePath, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 更新计划任务
   */
  async updateSchedule(scheduleId: string, data: ScheduleUpdate): Promise<Schedule> {
    return apiJson<Schedule>(`${this.basePath}/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * 删除计划任务
   */
  async deleteSchedule(scheduleId: string): Promise<SuccessResponse> {
    return apiJson<SuccessResponse>(`${this.basePath}/${scheduleId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 切换计划任务启用状态
   */
  async toggleSchedule(scheduleId: string, enabled: boolean): Promise<Schedule> {
    return apiJson<Schedule>(`${this.basePath}/${scheduleId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }
}

export const scheduleApi = new ScheduleApiClient();
