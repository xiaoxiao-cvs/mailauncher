import axios from "axios";

/**
 * 部署API服务
 * 负责与后端的部署相关API交互
 */

/**
 * 获取可用版本列表
 * @returns {Promise<Array<string>>} 版本列表
 */
const fetchVersions = async () => {
  console.log("获取可用版本列表...");
  try {
    const response = await axios.get("/api/versions");
    if (response.data && response.data.versions) {
      console.log("获取版本列表成功:", response.data.versions);
      return response.data.versions;
    }
    console.warn("版本列表格式异常:", response.data);
    return [];
  } catch (error) {
    console.error("获取版本列表失败:", error);
    // 返回缓存的静态版本列表
    return ["latest", "stable", "v0.6.3", "v0.6.2"];
  }
};

/**
 * 部署指定版本
 * @param {string} version - 要部署的版本
 * @param {string} instanceName - 实例名称
 * @returns {Promise<Object>} - 部署结果
 */
const deployVersion = async (version, instanceName) => {
  console.log(`部署版本 ${version}, 实例名称: ${instanceName}`);

  try {
    // 使用正确的URL格式: /api/deploy/{version}
    const response = await axios.post(`/api/deploy/${version}`, {
      instance_name: instanceName,
    });

    console.log("部署请求成功:", response.data);
    return response.data;
  } catch (error) {
    console.error("部署请求失败:", error);

    // 如果遇到404错误，尝试使用备用路径
    if (error.response && error.response.status === 404) {
      try {
        console.log(`尝试备用路径: /deploy/${version}`);
        const fallbackResponse = await axios.post(`/deploy/${version}`, {
          instance_name: instanceName,
        });
        console.log("备用路径部署请求成功:", fallbackResponse.data);
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error("备用路径部署请求失败:", fallbackError);
        throw fallbackError;
      }
    }

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
    const response = await axios.post("/api/install/configure", config);
    console.log("配置请求成功:", response.data);
    return response.data;
  } catch (error) {
    console.error("配置请求失败:", error);
    throw error;
  }
};

/**
 * 检查安装状态
 * @returns {Promise<Object>} - 安装状态
 */
const checkInstallStatus = async () => {
  try {
    const response = await axios.get("/api/install-status");
    return response.data;
  } catch (error) {
    console.error("检查安装状态失败:", error);
    return {
      napcat_installing: false,
      nonebot_installing: false,
    };
  }
};

export default {
  fetchVersions,
  deployVersion,
  configureBot,
  checkInstallStatus,
};
