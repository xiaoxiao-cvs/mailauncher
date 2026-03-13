/**
 * 实例管理 API 客户端
 *
 * 通过 Tauri invoke 直接调用 Rust 命令，替代原有的 HTTP API。
 */

import { tauriInvoke } from '@/services/tauriInvoke';

// ==================== 类型定义 ====================

export type InstanceStatus = 'pending' | 'starting' | 'running' | 'partial' | 'stopping' | 'stopped' | 'failed' | 'unknown';
export type BotType = 'maibot' | 'napcat' | 'other';
export type ComponentType = 'MaiBot' | 'NapCat' | 'MaiBot-Napcat-Adapter';
export type ComponentLifecycleStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'failed' | 'unknown';
export type RuntimeKind = 'local' | 'wsl2' | 'docker';
export type HostOs = 'windows' | 'macos' | 'linux';
export type GuestOs = 'linux';
export type PythonMode = 'venv' | 'system' | 'explicit';
export type PathMappingStrategy = 'native' | 'explicit';

export interface PythonRuntimeConfig {
  mode: PythonMode;
  path?: string | null;
}

export interface TerminalCapability {
  interactive: boolean;
  supports_resize: boolean;
}

export interface SignalPolicy {
  graceful_stop: string;
  force_stop: string;
}

export interface RuntimeProfile {
  kind: RuntimeKind;
  host_os: HostOs;
  guest_os?: GuestOs | null;
  workspace_root: string;
  guest_workspace_root?: string | null;
  container_name?: string | null;
  python: PythonRuntimeConfig;
  terminal: TerminalCapability;
  signal_policy: SignalPolicy;
  distribution?: string | null;
  user?: string | null;
  path_mapping: PathMappingStrategy;
}

export interface WslDistributionInfo {
  name: string;
  state: string;
  version: number;
  is_default: boolean;
}

export type RuntimeProbeSeverity = 'warning' | 'error';

export interface RuntimeProbeIssue {
  severity: RuntimeProbeSeverity;
  code: string;
  message: string;
}

export interface RuntimeProbeResult {
  ok: boolean;
  issues: RuntimeProbeIssue[];
}

export interface InstanceComponentState {
  component: ComponentType;
  runtime_kind: RuntimeKind;
  status: ComponentLifecycleStatus;
  running: boolean;
  pid?: number;
  host_pid?: number;
  guest_pid?: number;
  uptime?: number;
  last_error?: string | null;
}

export interface Instance {
  id: string;
  name: string;
  instance_path?: string;
  bot_type: BotType;
  bot_version?: string;
  description?: string;
  status: InstanceStatus;
  python_path?: string;
  config_path?: string;
  qq_account?: string;
  created_at: string;
  updated_at: string;
  last_run?: string;
  run_time: number;
  runtime_profile: RuntimeProfile;
  last_error?: string | null;
  last_status_reason?: string | null;
  component_states: InstanceComponentState[];
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
  host_pid?: number;
  guest_pid?: number;
  uptime?: number;
  runtime_profile: RuntimeProfile;
  last_error?: string | null;
  last_status_reason?: string | null;
  component_states: InstanceComponentState[];
}

export interface ComponentStatus extends InstanceComponentState {}

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
      data: {
        name: data.name,
        bot_type: data.bot_type,
        bot_version: data.bot_version,
        description: data.description,
        python_path: data.python_path,
        config_path: data.config_path,
      },
    });
  }

  /**
   * 更新实例
   */
  async updateInstance(instanceId: string, data: InstanceUpdate): Promise<Instance> {
    return tauriInvoke<Instance>('update_instance', {
      instanceId,
      data: {
        name: data.name,
        description: data.description,
        python_path: data.python_path,
        config_path: data.config_path,
        qq_account: data.qq_account,
      },
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

  async listWslDistributions(): Promise<WslDistributionInfo[]> {
    return tauriInvoke<WslDistributionInfo[]>('list_wsl_distributions');
  }

  async setInstanceRuntimeProfile(instanceId: string, runtimeProfile: RuntimeProfile): Promise<SuccessResponse> {
    return tauriInvoke<SuccessResponse>('set_instance_runtime_profile', {
      instanceId,
      runtimeProfile,
    });
  }

  async refreshInstanceRuntimeState(instanceId: string): Promise<InstanceStatus> {
    return tauriInvoke<InstanceStatus>('refresh_instance_runtime_state', {
      instanceId,
    });
  }

  async validateRuntimeProfile(runtimeProfile: RuntimeProfile): Promise<RuntimeProbeResult> {
    return tauriInvoke<RuntimeProbeResult>('validate_runtime_profile', {
      runtimeProfile,
    });
  }

  /**
   * 获取NapCat已登录账号列表
   * TODO: 尚未迁移至 Rust，暂时返回空列表
   */
  async getNapCatAccounts(_instanceId: string): Promise<{success: boolean; accounts: Array<{account: string; nickname: string}>; message: string}> {
    console.warn('[instanceApi] getNapCatAccounts 尚未迁移至 Rust');
    return { success: true, accounts: [], message: '功能尚未迁移' };
  }
}

// 导出单例
export const instanceApi = new InstanceApiClient();
