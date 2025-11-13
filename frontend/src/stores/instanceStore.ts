/**
 * 实例管理状态存储
 */

import { create } from 'zustand';
import { Instance, InstanceStatus, ComponentType, ComponentStatus } from '@/services/instanceApi';
import { instanceApi } from '@/services/instanceApi';

interface InstanceStore {
  // 状态
  instances: Instance[];
  selectedInstance: Instance | null;
  loading: boolean;
  error: string | null;
  
  // 组件状态缓存
  componentStatuses: Record<string, Record<ComponentType, ComponentStatus>>;
  
  // 操作
  fetchInstances: () => Promise<void>;
  fetchInstance: (instanceId: string) => Promise<void>;
  selectInstance: (instance: Instance | null) => void;
  startInstance: (instanceId: string) => Promise<void>;
  stopInstance: (instanceId: string) => Promise<void>;
  restartInstance: (instanceId: string) => Promise<void>;
  deleteInstance: (instanceId: string) => Promise<void>;
  
  // 组件操作
  startComponent: (instanceId: string, component: ComponentType) => Promise<void>;
  stopComponent: (instanceId: string, component: ComponentType) => Promise<void>;
  fetchComponentStatus: (instanceId: string, component: ComponentType) => Promise<ComponentStatus>;
  
  // 实用方法
  getInstanceComponents: (instanceId: string) => ComponentType[];
  clearError: () => void;
}

export const useInstanceStore = create<InstanceStore>((set, get) => ({
  // 初始状态
  instances: [],
  selectedInstance: null,
  loading: false,
  error: null,
  componentStatuses: {},
  
  // 获取所有实例
  fetchInstances: async () => {
    set({ loading: true, error: null });
    try {
      const data = await instanceApi.getAllInstances();
      set({ instances: data.instances, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取实例列表失败',
        loading: false 
      });
    }
  },
  
  // 获取单个实例
  fetchInstance: async (instanceId: string) => {
    set({ loading: true, error: null });
    try {
      const instance = await instanceApi.getInstance(instanceId);
      
      // 更新实例列表中的对应实例
      set(state => ({
        instances: state.instances.map(inst => 
          inst.id === instanceId ? instance : inst
        ),
        selectedInstance: state.selectedInstance?.id === instanceId 
          ? instance 
          : state.selectedInstance,
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取实例详情失败',
        loading: false 
      });
    }
  },
  
  // 选择实例
  selectInstance: (instance: Instance | null) => {
    set({ selectedInstance: instance });
  },
  
  // 启动实例
  startInstance: async (instanceId: string) => {
    set({ loading: true, error: null });
    try {
      await instanceApi.startInstance(instanceId);
      
      // 更新实例状态为 starting
      set(state => ({
        instances: state.instances.map(inst =>
          inst.id === instanceId ? { ...inst, status: 'starting' as InstanceStatus } : inst
        ),
        loading: false
      }));
      
      // 立即刷新以获取最新状态（减少延迟）
      setTimeout(() => get().fetchInstance(instanceId), 300);
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '启动实例失败',
        loading: false 
      });
      throw error;
    }
  },
  
  // 停止实例
  stopInstance: async (instanceId: string) => {
    set({ loading: true, error: null });
    try {
      await instanceApi.stopInstance(instanceId);
      
      // 更新实例状态为 stopping
      set(state => ({
        instances: state.instances.map(inst =>
          inst.id === instanceId ? { ...inst, status: 'stopping' as InstanceStatus } : inst
        ),
        loading: false
      }));
      
      // 立即刷新以获取最新状态（减少延迟）
      setTimeout(() => get().fetchInstance(instanceId), 300);
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '停止实例失败',
        loading: false 
      });
      throw error;
    }
  },
  
  // 重启实例
  restartInstance: async (instanceId: string) => {
    set({ loading: true, error: null });
    try {
      await instanceApi.restartInstance(instanceId);
      
      // 更新实例状态为 starting
      set(state => ({
        instances: state.instances.map(inst =>
          inst.id === instanceId ? { ...inst, status: 'starting' as InstanceStatus } : inst
        ),
        loading: false
      }));
      
      // 立即刷新以获取最新状态（减少延迟）
      setTimeout(() => get().fetchInstance(instanceId), 500);
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '重启实例失败',
        loading: false 
      });
      throw error;
    }
  },
  
  // 删除实例
  deleteInstance: async (instanceId: string) => {
    set({ loading: true, error: null });
    try {
      await instanceApi.deleteInstance(instanceId);
      
      // 从列表中移除实例
      set(state => ({
        instances: state.instances.filter(inst => inst.id !== instanceId),
        selectedInstance: state.selectedInstance?.id === instanceId ? null : state.selectedInstance,
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '删除实例失败',
        loading: false 
      });
      throw error;
    }
  },
  
  // 启动组件
  startComponent: async (instanceId: string, component: ComponentType) => {
    try {
      await instanceApi.startComponent(instanceId, component);
      
      // 更新组件状态缓存
      await get().fetchComponentStatus(instanceId, component);
      
      // 立即刷新实例状态（减少延迟）
      setTimeout(() => get().fetchInstance(instanceId), 200);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '启动组件失败' });
      throw error;
    }
  },
  
  // 停止组件
  stopComponent: async (instanceId: string, component: ComponentType) => {
    try {
      await instanceApi.stopComponent(instanceId, component);
      
      // 更新组件状态缓存
      await get().fetchComponentStatus(instanceId, component);
      
      // 立即刷新实例状态（减少延迟）
      setTimeout(() => get().fetchInstance(instanceId), 200);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '停止组件失败' });
      throw error;
    }
  },
  
  // 获取组件状态
  fetchComponentStatus: async (instanceId: string, component: ComponentType) => {
    try {
      const status = await instanceApi.getComponentStatus(instanceId, component);
      
      // 更新状态缓存
      set(state => ({
        componentStatuses: {
          ...state.componentStatuses,
          [instanceId]: {
            ...(state.componentStatuses[instanceId] || {}),
            [component]: status
          }
        }
      }));
      
      return status;
    } catch (error) {
      console.error(`获取组件 ${component} 状态失败:`, error);
      throw error;
    }
  },
  
  // 获取实例的组件列表（基于目录结构推断）
  getInstanceComponents: () => {
    // 基础组件总是包含 main
    const components: ComponentType[] = ['main'];
    
    // TODO: 这里可以从实例信息中获取实际的组件列表
    // 暂时假设所有实例都有这三个组件
    components.push('napcat', 'napcat-ada');
    
    return components;
  },
  
  // 清除错误
  clearError: () => {
    set({ error: null });
  }
}));
