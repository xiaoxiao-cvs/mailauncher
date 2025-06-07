import axios from "axios";
import { adaptInstancesList } from "@/utils/apiAdapters";

/**
 * 获取所有实例列表
 * @returns {Promise<Array>} 实例列表
 */
export const fetchInstances = async () => {
  try {
    const { instancesApi } = await import("@/services/api");
    const response = await instancesApi.getInstances();
    console.log("从API获取实例列表:", response);

    // 使用适配器处理实例数据
    return adaptInstancesList(response);
  } catch (error) {
    console.error("从API获取实例列表失败:", error);
    // 直接抛出错误，不使用任何后备数据
    throw error;
  }
};

/**
 * 获取实例统计数据
 * @returns {Promise<Object>} 实例统计数据（总数和运行中的数量）
 */
export const fetchInstanceStats = async () => {
  try {
    const { instancesApi } = await import("@/services/api");
    const response = await instancesApi.getInstanceStats();
    console.log("从API获取实例统计数据:", response);
    return response.data || response;
  } catch (error) {
    console.error("获取实例统计数据失败:", error);
    throw error;
  }
};

/**
 * 获取系统状态
 * @returns {Promise<Object>} 系统状态
 */
export const fetchSystemStatus = async () => {
  try {
    const { systemApi } = await import("@/services/api");
    const response = await systemApi.getSystemStatus();
    console.log("从API获取系统状态:", response);
    return response.data || response;
  } catch (error) {
    console.error("获取系统状态失败:", error);
    throw error;
  }
};

/**
 * 启动实例
 * @param {string} instanceId 实例ID
 * @returns {Promise<Object>} 启动结果
 */
export const startInstance = async (instanceId) => {
  try {
    const { instancesApi } = await import("@/services/api");
    const response = await instancesApi.startInstance(instanceId);
    console.log(`启动实例 ${instanceId} 成功:`, response);
    return response.data || response;
  } catch (error) {
    console.error(`启动实例 ${instanceId} 失败:`, error);
    throw error;
  }
};

/**
 * 停止实例
 * @param {string} instanceId 实例ID
 * @returns {Promise<Object>} 停止结果
 */
export const stopInstance = async (instanceId) => {
  try {
    const { instancesApi } = await import("@/services/api");
    const response = await instancesApi.stopInstance(instanceId);
    console.log(`停止实例 ${instanceId} 成功:`, response);
    return response.data || response;
  } catch (error) {
    console.error(`停止实例 ${instanceId} 失败:`, error);
    throw error;
  }
};

/**
 * 启动NapCat服务
 * @param {string} instanceName 实例名称
 * @returns {Promise<Object>} 启动结果
 */
export const startNapcat = async (instanceName) => {
  try {
    const { instancesApi } = await import("@/services/api");
    const response = await instancesApi.startNapcat(instanceName);
    console.log(`启动NapCat ${instanceName} 成功:`, response);
    return response.data || response;
  } catch (error) {
    console.error(`启动NapCat ${instanceName} 失败:`, error);
    throw error;
  }
};

/**
 * 启动NoneBot服务
 * @param {string} instanceName 实例名称
 * @returns {Promise<Object>} 启动结果
 */
export const startNonebot = async (instanceName) => {
  try {
    const { instancesApi } = await import("@/services/api");
    const response = await instancesApi.startNonebot(instanceName);
    console.log(`启动NoneBot ${instanceName} 成功:`, response);
    return response.data || response;
  } catch (error) {
    console.error(`启动NoneBot ${instanceName} 失败:`, error);
    throw error;
  }
};

/**
 * 更新实例
 * @param {string} instanceName 实例名称
 * @returns {Promise<Object>} 更新结果
 */
export const updateInstance = async (instanceName) => {
  try {
    const { instancesApi } = await import("@/services/api");
    const response = await instancesApi.updateInstance(instanceName);
    console.log(`更新实例 ${instanceName} 成功:`, response);
    return response.data || response;
  } catch (error) {
    console.error(`更新实例 ${instanceName} 失败:`, error);
    throw error;
  }
};

/**
 * 重启实例
 * @param {string} instanceId 实例ID
 * @returns {Promise<Object>} 重启结果
 */
export const restartInstance = async (instanceId) => {
  try {
    const { instancesApi } = await import("@/services/api");
    const response = await instancesApi.restartInstance(instanceId);
    console.log(`重启实例 ${instanceId} 成功:`, response);
    return response.data || response;
  } catch (error) {
    console.error(`重启实例 ${instanceId} 失败:`, error);
    throw error;
  }
};

/**
 * 删除实例
 * @param {string} instanceId 实例ID
 * @returns {Promise<Object>} 删除结果
 */
export const deleteInstance = async (instanceId) => {
  try {
    const { instancesApi } = await import("@/services/api");
    const response = await instancesApi.deleteInstance(instanceId);
    console.log(`删除实例 ${instanceId} 成功:`, response);
    return response.data || response;
  } catch (error) {
    console.error(`删除实例 ${instanceId} 失败:`, error);
    throw error;
  }
};

/**
 * 打开文件夹
 * @param {string} path 文件夹路径
 * @returns {Promise<void>}
 */
export const openFolder = async (path) => {
  try {
    // 使用系统API打开文件夹
    if (window.electronAPI && window.electronAPI.openFolder) {
      return await window.electronAPI.openFolder(path);
    } else {
      console.warn("Electron API不可用，无法打开文件夹");
      throw new Error("Electron API不可用");
    }
  } catch (error) {
    console.error(`打开文件夹失败: ${path}`, error);
    throw error;
  }
};

/**
 * 获取系统性能指标
 * @returns {Promise<Object>} 性能指标
 */
export const fetchSystemMetrics = async () => {
  try {
    const { systemApi } = await import("@/services/api");
    const response = await systemApi.getSystemMetrics();
    console.log("从API获取系统性能指标:", response);
    return response.data || response;
  } catch (error) {
    console.error("获取系统性能指标失败:", error);
    throw error;
  }
};

/**
 * 添加已有实例
 * @param {Object} instanceConfig 实例配置
 * @returns {Promise<Object>} 添加结果
 */
export const addExistingInstance = async (instanceConfig) => {
  try {
    console.log("正在添加已有实例:", instanceConfig);

    // 调用后端API
    const response = await axios.post(
      "http://localhost:23456/api/v1/instances/add",
      instanceConfig,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("添加已有实例成功:", response.data);
    return response.data;
  } catch (error) {
    console.error("添加已有实例失败:", error);

    // 处理后端返回的错误信息
    if (error.response && error.response.data) {
      const errorData = error.response.data;
      if (errorData.detail) {
        throw new Error(errorData.detail);
      }
    }

    throw new Error(error.message || "添加实例失败");
  }
};

export default {
  fetchInstances,
  fetchInstanceStats,
  fetchSystemStatus,
  startInstance,
  stopInstance,
  restartInstance,
  startNapcat,
  startNonebot,
  updateInstance,
  deleteInstance,
  openFolder,
  fetchSystemMetrics,
  addExistingInstance,
};
