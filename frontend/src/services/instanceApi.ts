/**
 * 实例管理 API 客户端
 */

import { apiJson } from '@/config/api';

// ==================== 类型定义 ====================

export type InstanceStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
export type BotType = 'maibot' | 'napcat' | 'other';
export type ComponentType = 'main' | 'napcat' | 'napcat-ada';

export interface Instance {
  id: string;
  name: string;
  bot_type: BotType;
  bot_version?: string;
  description?: string;
  status: InstanceStatus;
  python_path?: string;
  config_path?: string;
  created_at: string;
  updated_at: string;
  last_run?: string;
  run_time: number;
}

export interface InstanceCreate {
  name: string;
  bot_type: BotType;
  bot_version?: string;
  description?: string;
  python_path?: string;
  config_path?: string;
}

export interface InstanceUpdate {
  name?: string;
  description?: string;
  python_path?: string;
  config_path?: string;
}

export interface InstanceStatusResponse {
  id: string;
  status: InstanceStatus;
  pid?: number;
  uptime?: number;
}

export interface ComponentStatus {
  component: ComponentType;
  running: boolean;
  pid?: number;
  uptime?: number;
}

export interface InstanceList {
  total: number;
  instances: Instance[];
}

export interface SuccessResponse {
  success: boolean;
  message: string;
}

// ==================== API 客户端 ====================

class InstanceApiClient {
  private basePath = 'instances';

  /**
   * 获取所有实例
   */
  async getAllInstances(): Promise<InstanceList> {
    return apiJson<InstanceList>(`${this.basePath}`);
  }

  /**
   * 获取单个实例详情
   */
  async getInstance(instanceId: string): Promise<Instance> {
    return apiJson<Instance>(`${this.basePath}/${instanceId}`);
  }

  /**
   * 获取实例状态
   */
  async getInstanceStatus(instanceId: string): Promise<InstanceStatusResponse> {
    return apiJson<InstanceStatusResponse>(`${this.basePath}/${instanceId}/status`);
  }

  /**
   * 创建新实例
   */
  async createInstance(data: InstanceCreate): Promise<Instance> {
    return apiJson<Instance>(`${this.basePath}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 更新实例
   */
  async updateInstance(instanceId: string, data: InstanceUpdate): Promise<Instance> {
    return apiJson<Instance>(`${this.basePath}/${instanceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * 删除实例
   */
  async deleteInstance(instanceId: string): Promise<SuccessResponse> {
    return apiJson<SuccessResponse>(`${this.basePath}/${instanceId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 启动实例
   */
  async startInstance(instanceId: string): Promise<SuccessResponse> {
    return apiJson<SuccessResponse>(`${this.basePath}/${instanceId}/start`, { method: 'POST' });
  }

  /**
   * 停止实例
   */
  async stopInstance(instanceId: string): Promise<SuccessResponse> {
    return apiJson<SuccessResponse>(`${this.basePath}/${instanceId}/stop`, { method: 'POST' });
  }

  /**
   * 重启实例
   */
  async restartInstance(instanceId: string): Promise<SuccessResponse> {
    return apiJson<SuccessResponse>(`${this.basePath}/${instanceId}/restart`, { method: 'POST' });
  }

  /**
   * 启动指定组件
   */
  async startComponent(instanceId: string, component: ComponentType): Promise<SuccessResponse> {
    return apiJson<SuccessResponse>(`${this.basePath}/${instanceId}/component/${component}/start`, { method: 'POST' });
  }

  /**
   * 停止指定组件
   */
  async stopComponent(instanceId: string, component: ComponentType): Promise<SuccessResponse> {
    return apiJson<SuccessResponse>(`${this.basePath}/${instanceId}/component/${component}/stop`, { method: 'POST' });
  }

  /**
   * 获取组件状态
   */
  async getComponentStatus(instanceId: string, component: ComponentType): Promise<ComponentStatus> {
    return apiJson<ComponentStatus>(`${this.basePath}/${instanceId}/component/${component}/status`);
  }
}

// 导出单例
export const instanceApi = new InstanceApiClient();
