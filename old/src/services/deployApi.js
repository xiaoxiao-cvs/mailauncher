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
    const response = await apiService.get("/api/v1/deploy/versions");
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
    const response = await apiService.get("/api/v1/deploy/services");
    console.log("getServices响应:", response);
    return response.data || response;
  } catch (error) {
    console.error("获取服务列表失败:", error);
    throw error;
  }
};

// 防重复调用的请求缓存
const activeRequests = new Map();

const preventDuplicateRequest = async (key, requestFn) => {
  if (activeRequests.has(key)) {
    console.log(`防止重复请求: ${key}，等待已存在的请求完成`);
    return await activeRequests.get(key);
  }
  
  const requestPromise = requestFn().finally(() => {
    activeRequests.delete(key);
  });
  
  activeRequests.set(key, requestPromise);
  return requestPromise;
};

/**
 * 部署指定版本 - **修复6: 添加重复调用防护机制**
 * @param {Object} config - 部署配置
 * @returns {Promise<Object>} 部署结果
 */
const deploy = async (config) => {
  const requestKey = `deploy-${config.instance_name}-${config.version}`;
  
  return preventDuplicateRequest(requestKey, async () => {
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
      }      const response = await apiService.post(
        "/api/v1/deploy/deploy",
        config,
        requestConfig
      );

      console.log("deploy响应:", response);
      
      // 确保返回正确的数据结构
      const responseData = response?.data || response;
      console.log("解析后的响应数据:", responseData);

      return responseData;
    } catch (error) {
      console.error("部署失败:", error);
      console.error("错误详情:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
      });      // 增强错误信息
      if (error.code === "ECONNABORTED") {
        throw new Error("部署请求超时，但后端可能正在处理，请查看实时日志");
      }
      
      // 如果有响应数据，尝试提取错误信息
      if (error.response?.data) {
        const errorData = error.response.data;

        // 处理结构化错误信息
        if (typeof errorData === "object") {
          let errorMessage =
            errorData.message || errorData.detail || error.message;

          // 如果有更详细的信息，添加到错误消息中
          if (errorData.detail && errorData.detail !== errorData.message) {
            errorMessage += ` (${errorData.detail})`;
          }

          // 如果有建议信息，也添加进去
          if (errorData.suggestion) {
            errorMessage += ` 建议: ${errorData.suggestion}`;
          }

          throw new Error(errorMessage);
        } else {
          // 如果是字符串格式的错误
          const errorMessage = errorData || error.message;
          throw new Error(errorMessage);
        }
      }

      throw error;
    }
  });
};

const deployVersion = async (version, instanceName) => {
  console.log("deployVersion 方法已弃用，请使用 deploy 方法");
  // 重定向到正确的 deploy 方法
  return await deploy({
    instance_name: instanceName,
    install_services: [],
    install_path: "", // 这需要在调用时提供
    port: 8000, // 默认端口，应该在调用时提供
    version: version
  });
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
    console.log("🔍 [调试] checkInstallStatus调用", instanceId ? `实例ID: ${instanceId}` : "");
    
    const url = instanceId
      ? `/api/v1/deploy/install-status/${instanceId}`
      : "/api/v1/deploy/install-status";
    
    console.log("🔍 [调试] 请求URL:", url);
    const response = await apiService.get(url);

    console.log("🔍 [调试] checkInstallStatus响应:", response);
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
    const response = await apiService.get("/api/v1/instances");
    console.log("getInstances响应:", response);
    return response.data || response;
  } catch (error) {
    console.error("获取实例列表失败:", error);    throw error;
  }
};

/**
 * 启动实例
 * @param {string} instanceId - 实例ID
 * @returns {Promise<Object>} - 启动结果
 */
const startInstance = async (instanceId) => {
  const requestKey = `start-${instanceId}`;

  return preventDuplicateRequest(requestKey, async () => {
    try {
      console.log(`发起启动实例请求: ${instanceId}`);
      const response = await apiService.get(
        `/api/v1/instance/${instanceId}/start`
      );
      console.log("startInstance响应:", response);
      return response.data || response;
    } catch (error) {
      console.error("启动实例失败:", error);
      throw error;
    }
  });
};

/**
 * 停止实例
 * @param {string} instanceId - 实例ID
 * @returns {Promise<Object>} - 停止结果
 */
const stopInstance = async (instanceId) => {
  const requestKey = `stop-${instanceId}`;

  return preventDuplicateRequest(requestKey, async () => {
    try {
      console.log(`发起停止实例请求: ${instanceId}`);
      const response = await apiService.get(
        `/api/v1/instance/${instanceId}/stop`
      );
      console.log("stopInstance响应:", response);
      return response.data || response;
    } catch (error) {
      console.error("停止实例失败:", error);
      throw error;
    }
  });
};

/**
 * 删除实例
 * @param {string} instanceId - 实例ID
 * @returns {Promise<Object>} - 删除结果
 */
const deleteInstance = async (instanceId) => {
  const requestKey = `delete-${instanceId}`;

  return preventDuplicateRequest(requestKey, async () => {
    try {
      console.log(`发起删除实例请求: ${instanceId}`);
      const response = await apiService.delete(
        `/api/v1/instance/${instanceId}/delete`
      );
      console.log("deleteInstance响应:", response);
      return response.data || response;
    } catch (error) {
      console.error("删除实例失败:", error);
      throw error;
    }
  });
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
export { checkInstallStatus, getInstances };

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
  configureBotSettings, // 配置Bot设置
};
