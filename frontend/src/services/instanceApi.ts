/**
 * 实例管理 API 客户端
 */

import { API_BASE_URL } from '@/config/api';

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
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 获取所有实例
   */
  async getAllInstances(): Promise<InstanceList> {
    const response = await fetch(`${this.baseUrl}/instances`);
    if (!response.ok) {
      throw new Error(`获取实例列表失败: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 获取单个实例详情
   */
  async getInstance(instanceId: string): Promise<Instance> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}`);
    if (!response.ok) {
      throw new Error(`获取实例详情失败: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 获取实例状态
   */
  async getInstanceStatus(instanceId: string): Promise<InstanceStatusResponse> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}/status`);
    if (!response.ok) {
      throw new Error(`获取实例状态失败: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 创建新实例
   */
  async createInstance(data: InstanceCreate): Promise<Instance> {
    const response = await fetch(`${this.baseUrl}/instances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '创建实例失败');
    }
    return response.json();
  }

  /**
   * 更新实例
   */
  async updateInstance(instanceId: string, data: InstanceUpdate): Promise<Instance> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '更新实例失败');
    }
    return response.json();
  }

  /**
   * 删除实例
   */
  async deleteInstance(instanceId: string): Promise<SuccessResponse> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '删除实例失败');
    }
    return response.json();
  }

  /**
   * 启动实例
   */
  async startInstance(instanceId: string): Promise<SuccessResponse> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}/start`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '启动实例失败');
    }
    return response.json();
  }

  /**
   * 停止实例
   */
  async stopInstance(instanceId: string): Promise<SuccessResponse> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}/stop`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '停止实例失败');
    }
    return response.json();
  }

  /**
   * 重启实例
   */
  async restartInstance(instanceId: string): Promise<SuccessResponse> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}/restart`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '重启实例失败');
    }
    return response.json();
  }

  /**
   * 启动指定组件
   */
  async startComponent(instanceId: string, component: ComponentType): Promise<SuccessResponse> {
    const response = await fetch(
      `${this.baseUrl}/instances/${instanceId}/component/${component}/start`,
      { method: 'POST' }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `启动组件 ${component} 失败`);
    }
    return response.json();
  }

  /**
   * 停止指定组件
   */
  async stopComponent(instanceId: string, component: ComponentType): Promise<SuccessResponse> {
    const response = await fetch(
      `${this.baseUrl}/instances/${instanceId}/component/${component}/stop`,
      { method: 'POST' }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `停止组件 ${component} 失败`);
    }
    return response.json();
  }

  /**
   * 获取组件状态
   */
  async getComponentStatus(instanceId: string, component: ComponentType): Promise<ComponentStatus> {
    const response = await fetch(
      `${this.baseUrl}/instances/${instanceId}/component/${component}/status`
    );
    if (!response.ok) {
      throw new Error(`获取组件 ${component} 状态失败`);
    }
    return response.json();
  }
}

// 导出单例
export const instanceApi = new InstanceApiClient();
