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

    // 尝试分析错误，如果是字段不匹配问题，尝试适配数据结构
    if (error.response && error.response.data) {
      try {
        const errorData = error.response.data;
        if (
          errorData.detail &&
          errorData.detail.includes("has no attribute 'installed_at'")
        ) {
          // 直接从响应中获取原始数据，手动进行适配
          const rawInstances = await import("@/services/api").then(
            async ({ instancesApi }) => {
              try {
                const rawResponse = await instancesApi.getMockInstances();
                return adaptInstancesList(rawResponse);
              } catch (e) {
                console.error("获取模拟实例数据失败:", e);
                return [];
              }
            }
          );
          if (rawInstances && rawInstances.length > 0) {
            return rawInstances;
          }
        }
      } catch (adaptError) {
        console.error("尝试适配实例数据时出错:", adaptError);
      }
    }
  }

  // 如果API调用失败，返回硬编码的实例数据作为后备
  console.log("API调用失败，使用硬编码的实例列表数据");
  const hardcodedInstances = [
    {
      id: "a2fe529b51999fc2d45df5196c6c50a46a608fa1",
      name: "maibot-stable-1",
      status: "running",
      installedAt: "2023-08-15",
      path: "D:\\MaiBot\\stable-1",
      services: {
        napcat: "running",
        nonebot: "running",
      },
      version: "stable",
    },
    {
      id: "b3fe529b51999fc2d45df5196c6c50a46a608fb2",
      name: "maibot-beta-1",
      status: "stopped",
      installedAt: "2023-09-10",
      path: "D:\\MaiBot\\beta-1",
      services: {
        napcat: "stopped",
        nonebot: "stopped",
      },
      version: "beta",
    },
    {
      id: "c4fe529b51999fc2d45df5196c6c50a46a608fc3",
      name: "maibot-v0.6.3-1",
      status: "running",
      installedAt: "2023-10-05",
      path: "D:\\MaiBot\\v0.6.3-1",
      services: {
        napcat: "running",
        nonebot: "stopped",
      },
      version: "v0.6.3",
    },
  ];

  return hardcodedInstances;
};

/**
 * 获取实例统计数据
 * @returns {Promise<Object>} 实例统计数据（总数和运行中的数量）
 */
export const fetchInstanceStats = async () => {
  // 直接返回硬编码的统计数据，不发送API请求
  console.log("使用硬编码的实例统计数据");
  return {
    total: 3,
    running: 2,
    stopped: 1,
    _isMock: true,
  };
};

/**
 * 获取系统状态
 * @returns {Promise<Object>} 系统状态
 */
export const fetchSystemStatus = async () => {
  // 直接返回硬编码的系统状态，不发送API请求
  console.log("使用硬编码的系统状态数据");
  return {
    mongodb: { status: "running", info: "本地实例 (固定数据)" },
    napcat: { status: "running", info: "端口 8095 (固定数据)" },
    nonebot: { status: "stopped", info: "" },
    maibot: { status: "stopped", info: "" },
  };
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
    // 如果API调用失败，返回模拟数据
    return {
      success: false,
      message: error.message || `启动实例 ${instanceId} 失败`,
    };
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
    // 如果API调用失败，返回模拟数据
    return {
      success: false,
      message: error.message || `停止实例 ${instanceId} 失败`,
    };
  }
};

/**
 * 启动NapCat服务
 * @param {string} instanceName 实例名称
 * @returns {Promise<Object>} 启动结果
 */
export const startNapcat = async (instanceName) => {
  // 直接返回硬编码的成功响应，不发送API请求
  console.log(`模拟启动NapCat: ${instanceName}`);
  return {
    success: true,
    message: `NapCat服务已启动（固定数据）`,
  };
};

/**
 * 启动NoneBot服务
 * @param {string} instanceName 实例名称
 * @returns {Promise<Object>} 启动结果
 */
export const startNonebot = async (instanceName) => {
  // 直接返回硬编码的成功响应，不发送API请求
  console.log(`模拟启动NoneBot: ${instanceName}`);
  return {
    success: true,
    message: `NoneBot服务已启动（固定数据）`,
  };
};

/**
 * 更新实例
 * @param {string} instanceName 实例名称
 * @returns {Promise<Object>} 更新结果
 */
export const updateInstance = async (instanceName) => {
  // 直接返回硬编码的成功响应，不发送API请求
  console.log(`模拟更新实例: ${instanceName}`);
  return {
    success: true,
    message: `实例 ${instanceName} 已更新（固定数据）`,
  };
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
    // 如果API调用失败，返回模拟数据
    return {
      success: false,
      message: error.message || `重启实例 ${instanceId} 失败`,
    };
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
    // 如果API调用失败，返回模拟数据
    return {
      success: false,
      message: error.message || `删除实例 ${instanceId} 失败`,
    };
  }
};

/**
 * 打开文件夹
 * @param {string} path 文件夹路径
 * @returns {Promise<void>}
 */
export const openFolder = async (path) => {
  // 不实际执行任何操作，只输出日志
  console.log(`模拟打开文件夹: ${path}`);
  return { success: true };
};

/**
 * 获取系统性能指标
 * @returns {Promise<Object>} 性能指标
 */
export const fetchSystemMetrics = async () => {
  // 直接返回硬编码的系统指标，不发送API请求或调用electronAPI
  console.log("使用硬编码的系统性能指标数据");

  return {
    cpu: {
      usage: 25,
      cores: 8,
      frequency: 3200,
      model: "Intel Core i7-10700K (固定数据)",
    },
    memory: {
      total: 16 * 1024 * 1024 * 1024,
      used: 8 * 1024 * 1024 * 1024,
      free: 8 * 1024 * 1024 * 1024,
    },
    network: {
      sent: 5000 * 1024,
      received: 8000 * 1024,
      sentRate: 200 * 1024,
      receivedRate: 350 * 1024,
    },
  };
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
