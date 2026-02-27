/**
 * 实例管理 API 客户端
 *
 * 通过 Tauri invoke 直接调用 Rust 命令，替代原有的 HTTP API。
 */

import { tauriInvoke } from '@/services/tauriInvoke';

// ==================== 类型定义 ====================

export type InstanceStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
export type BotType = 'maibot' | 'napcat' | 'other';
export type ComponentType = 'MaiBot' | 'NapCat' | 'MaiBot-Napcat-Adapter';

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
  cpu_usage?: number;
  memory_usage?: number;
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
  qq_account?: string;
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
  /**
   * 获取所有实例
   */
  async getAllInstances(): Promise<InstanceList> {
    return tauriInvoke<InstanceList>('get_all_instances');
  }

  /**
   * 获取单个实例详情
   */
  async getInstance(instanceId: string): Promise<Instance> {
    const result = await tauriInvoke<Instance | null>('get_instance', { instanceId });
    if (!result) throw new Error(`实例 ${instanceId} 不存在`);
    return result;
  }

  /**
   * 获取实例状态
   */
  async getInstanceStatus(instanceId: string): Promise<InstanceStatusResponse> {
    return tauriInvoke<InstanceStatusResponse>('get_instance_status', { instanceId });
  }

  /**
   * 创建新实例
   */
  async createInstance(data: InstanceCreate): Promise<Instance> {
    return tauriInvoke<Instance>('create_instance', {
      name: data.name,
      botType: data.bot_type,
      botVersion: data.bot_version,
      description: data.description,
      pythonPath: data.python_path,
      configPath: data.config_path,
    });
  }

  /**
   * 更新实例
   */
  async updateInstance(instanceId: string, data: InstanceUpdate): Promise<Instance> {
    return tauriInvoke<Instance>('update_instance', {
      instanceId,
      name: data.name,
      description: data.description,
      pythonPath: data.python_path,
      configPath: data.config_path,
      qqAccount: data.qq_account,
    });
  }

  /**
   * 删除实例
   */
  async deleteInstance(instanceId: string): Promise<SuccessResponse> {
    return tauriInvoke<SuccessResponse>('delete_instance', { instanceId });
  }

  /**
   * 启动实例
   */
  async startInstance(instanceId: string): Promise<SuccessResponse> {
    return tauriInvoke<SuccessResponse>('start_instance', { instanceId });
  }

  /**
   * 停止实例
   */
  async stopInstance(instanceId: string): Promise<SuccessResponse> {
    return tauriInvoke<SuccessResponse>('stop_instance', { instanceId });
  }

  /**
   * 重启实例
   */
  async restartInstance(instanceId: string): Promise<SuccessResponse> {
    return tauriInvoke<SuccessResponse>('restart_instance', { instanceId });
  }

  /**
   * 启动指定组件
   */
  async startComponent(instanceId: string, component: ComponentType): Promise<SuccessResponse> {
    return tauriInvoke<SuccessResponse>('start_component', { instanceId, component });
  }

  /**
   * 停止指定组件
   */
  async stopComponent(instanceId: string, component: ComponentType): Promise<SuccessResponse> {
    return tauriInvoke<SuccessResponse>('stop_component', { instanceId, component });
  }

  /**
   * 获取组件状态
   */
  async getComponentStatus(instanceId: string, component: ComponentType): Promise<ComponentStatus> {
    return tauriInvoke<ComponentStatus>('get_component_status', { instanceId, component });
  }

  async getInstanceComponents(instanceId: string): Promise<ComponentType[]> {
    return tauriInvoke<ComponentType[]>('get_instance_components', { instanceId });
  }

  /**
   * 获取NapCat已登录账号列表
   * TODO: 尚未迁移至 Rust，暂时返回空列表
   */
  async getNapCatAccounts(instanceId: string): Promise<{success: boolean; accounts: Array<{account: string; nickname: string}>; message: string}> {
    console.warn('[instanceApi] getNapCatAccounts 尚未迁移至 Rust');
    return { success: true, accounts: [], message: '功能尚未迁移' };
  }
}

// 导出单例
export const instanceApi = new InstanceApiClient();
