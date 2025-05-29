import apiService from "./apiService";

/**
 * 部署API服务
 * 负责与后端的部署相关API交互
 */

/**
 * 获取可用版本列表
 * @returns {Promise<Object>} 版本列表
 */
const fetchVersions = async () => {
  try {
    const response = await apiService.get("/deploy/versions");
    console.log("fetchVersions响应:", response);
    return response.data || response;
  } catch (error) {
    console.error("获取版本列表失败:", error);
    throw error;
  }
};

/**
 * 获取版本列表（别名方法）
 * @returns {Promise<Object>} 版本列表
 */
const getVersions = async () => {
  return await fetchVersions();
};

/**
 * 获取可部署的服务列表
 * @returns {Promise<Object>} 服务列表
 */
const getServices = async () => {
  try {
    const response = await apiService.get("/deploy/services");
    console.log("getServices响应:", response);
    return response.data || response;
  } catch (error) {
    console.error("获取服务列表失败:", error);
    throw error;
  }
};

/**
 * 部署指定版本
 * @param {Object} config - 部署配置
 * @param {string} config.instance_name - 实例名称
 * @param {Array} config.install_services - 要安装的服务列表
 * @param {string} config.install_path - 安装路径
 * @param {number} config.port - 端口
 * @param {string} config.version - 版本
 * @param {string} [config.websocket_session_id] - WebSocket会话ID（用于实时日志）
 * @returns {Promise<Object>} 部署结果
 */
const deploy = async (config) => {
  try {
    console.log("发送部署请求:", config);

    // 构建请求配置
    const requestConfig = {
      timeout: config.websocket_session_id ? 30000 : 15000, // WebSocket模式使用更长超时
    };

    // 如果有WebSocket会话ID，添加到请求头
    if (config.websocket_session_id) {
      requestConfig.headers = {
        "X-WebSocket-Session-ID": config.websocket_session_id,
      };
      console.log("添加WebSocket会话ID到请求头:", config.websocket_session_id);
    }

    const response = await apiService.post(
      "/deploy/deploy",
      config,
      requestConfig
    );
    console.log("deploy响应:", response);
    return response.data || response;
  } catch (error) {
    console.error("部署失败:", error);

    // 增强错误信息
    if (error.code === "ECONNABORTED") {
      throw new Error("部署请求超时，但后端可能正在处理，请查看实时日志");
    }

    throw error;
  }
};

const deployVersion = async (version, instanceName) => {
  try {
    const response = await apiService.post(`/deploy/${version}`, {
      instance_name: instanceName,
    });
    console.log("deployVersion响应:", response);
    return response.data || response;
  } catch (error) {
    console.error("部署版本失败:", error);
    throw error;
  }
};

/**
 * 配置Bot
 * @param {Object} config - 配置参数
 * @returns {Promise<Object>} - 配置结果
 */
const configureBot = async (config) => {
  console.log("配置Bot:", config);

  try {
    const response = await apiService.post("/install/configure", config);
    console.log("配置请求成功:", response);
    return response.data || response;
  } catch (error) {
    console.error("配置请求失败:", error);
    throw error;
  }
};

/**
 * 检查安装状态
 * @param {string} instanceId - 实例ID
 * @returns {Promise<Object>} - 安装状态
 */
const checkInstallStatus = async (instanceId = null) => {
  try {
    console.log("检查安装状态", instanceId ? `实例ID: ${instanceId}` : "");

    const url = instanceId
      ? `/install-status/${instanceId}`
      : "/install-status";
    const response = await apiService.get(url);

    console.log("checkInstallStatus响应:", response);
    return response.data || response;
  } catch (error) {
    console.error("检查安装状态失败:", error);
    // 返回默认状态而不是抛出错误
    return {
      napcat_installing: false,
      nonebot_installing: false,
      status: "completed",
      progress: 100,
    };
  }
};

/**
 * 获取实例列表
 * @returns {Promise<Object>} - 实例列表
 */
const getInstances = async () => {
  try {
    const response = await apiService.get("/instances");
    console.log("getInstances响应:", response);
    return response.data || response;
  } catch (error) {
    console.error("获取实例列表失败:", error);
    throw error;
  }
};

/**
 * 启动实例
 * @param {string} instanceId - 实例ID
 * @returns {Promise<Object>} - 启动结果
 */
const startInstance = async (instanceId) => {
  try {
    const response = await apiService.get(`/instance/${instanceId}/start`);
    console.log("startInstance响应:", response);
    return response.data || response;
  } catch (error) {
    console.error("启动实例失败:", error);
    throw error;
  }
};

/**
 * 停止实例
 * @param {string} instanceId - 实例ID
 * @returns {Promise<Object>} - 停止结果
 */
const stopInstance = async (instanceId) => {
  try {
    const response = await apiService.get(`/instance/${instanceId}/stop`);
    console.log("stopInstance响应:", response);
    return response.data || response;
  } catch (error) {
    console.error("停止实例失败:", error);
    throw error;
  }
};

/**
 * 删除实例
 * @param {string} instanceId - 实例ID
 * @returns {Promise<Object>} - 删除结果
 */
const deleteInstance = async (instanceId) => {
  try {
    const response = await apiService.delete(`/instance/${instanceId}`);
    console.log("deleteInstance响应:", response);
    return response.data || response;
  } catch (error) {
    console.error("删除实例失败:", error);
    throw error;
  }
};

/**
 * 生成模拟实例数据
 * @returns {Array} 模拟实例列表
 */
const generateMockInstances = () => {
  return [
    {
      id: "mock-instance-1",
      name: "模拟实例-1",
      status: "running",
      installedAt: "2023-05-13 19:56:18",
      path: "D:\\MaiBot\\模拟实例-1",
      version: "v0.6.3",
    },
    {
      id: "mock-instance-2",
      name: "模拟实例-2",
      status: "stopped",
      installedAt: "2023-05-12 10:30:00",
      path: "D:\\MaiBot\\模拟实例-2",
      version: "latest",
    },
  ];
};

/**
 * 配置Bot设置
 * @param {Object} params - 配置参数
 * @returns {Promise<Object>} - 配置结果
 */
const configureBotSettings = async (params) => {
  console.log("配置Bot设置:", params);
  try {
    const response = await apiService.post("/install/configure", params);
    console.log("configureBotSettings响应:", response);
    return response.data || response;
  } catch (error) {
    console.error("配置Bot设置失败:", error);
    return { success: false, message: error.message };
  }
};

// 确保导出所有需要的方法
export { checkInstallStatus, getInstances, generateMockInstances };

export default {
  fetchVersions, // 主要方法
  getVersions, // 别名方法
  getServices, // 获取服务列表
  deploy, // 部署方法
  deployVersion, // 部署指定版本
  configureBot, // 配置Bot
  checkInstallStatus, // 检查安装状态
  getInstances, // 获取实例列表
  startInstance, // 启动实例
  stopInstance, // 停止实例
  deleteInstance, // 删除实例
  generateMockInstances, // 生成模拟数据
  configureBotSettings, // 配置Bot设置
};
