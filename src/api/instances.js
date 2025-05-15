import axios from "axios";

/**
 * 获取所有实例列表
 * @returns {Promise<Array>} 实例列表
 */
export const fetchInstances = async () => {
  // 直接返回硬编码的实例数据，不发送API请求
  const hardcodedInstances = [
    {
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

  // 返回硬编码数据而不是发送请求
  console.log("使用硬编码的实例列表数据");
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
 * @param {string} instanceName 实例名称
 * @returns {Promise<Object>} 启动结果
 */
export const startInstance = async (instanceName) => {
  // 直接返回硬编码的成功响应，不发送API请求
  console.log(`模拟启动实例: ${instanceName}`);
  return {
    success: true,
    message: `实例 ${instanceName} 已启动（固定数据）`,
  };
};

/**
 * 停止实例
 * @returns {Promise<Object>} 停止结果
 */
export const stopInstance = async () => {
  // 直接返回硬编码的成功响应，不发送API请求
  console.log(`模拟停止实例`);
  return {
    success: true,
    message: `实例已停止（固定数据）`,
  };
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
 * 删除实例
 * @param {string} instanceName 实例名称
 * @returns {Promise<Object>} 删除结果
 */
export const deleteInstance = async (instanceName) => {
  // 直接返回硬编码的成功响应，不发送API请求
  console.log(`模拟删除实例: ${instanceName}`);
  return {
    success: true,
    message: `实例 ${instanceName} 已删除（固定数据）`,
  };
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

export default {
  fetchInstances,
  fetchInstanceStats,
  fetchSystemStatus,
  startInstance,
  stopInstance,
  startNapcat,
  startNonebot,
  updateInstance,
  deleteInstance,
  openFolder,
  fetchSystemMetrics,
};
