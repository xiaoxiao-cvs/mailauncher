import axios from "axios";
import { ElMessage } from "element-plus";

/**
 * 获取可用的版本列表
 * @returns {Promise<Array<string>>} 版本列表
 */
export const fetchVersions = async () => {
  try {
    // 首先尝试标准API路径
    console.log("尝试获取版本列表: /api/versions");
    const response = await axios.get("/api/versions");
    if (response.data && response.data.versions) {
      console.log("成功获取版本列表:", response.data.versions);
      return response.data.versions;
    }
    return [];
  } catch (error) {
    console.error("获取版本列表失败:", error);
    // 尝试备用路径
    try {
      console.log("尝试备用路径: /versions");
      const fallbackResponse = await axios.get("/versions");
      if (fallbackResponse.data && fallbackResponse.data.versions) {
        console.log(
          "通过备用路径成功获取版本列表:",
          fallbackResponse.data.versions
        );
        return fallbackResponse.data.versions;
      }
    } catch (fallbackError) {
      console.error("备用路径获取版本列表失败:", fallbackError);
    }
    throw new Error("获取版本列表失败");
  }
};

/**
 * 部署指定版本 (基础部署)
 * @param {string} version 版本号
 * @param {string} instanceName 实例名称
 * @returns {Promise<Object>} 部署结果
 */
export const deployVersion = async (version, instanceName) => {
  console.log(`API: 开始基础部署版本 ${version}, 实例名称: ${instanceName}`);
  try {
    // 修改为使用正确的URL路径格式: /api/deploy/{version}
    const response = await axios.post(`/api/deploy/${version}`, {
      instance_name: instanceName,
    });
    console.log(`API: 基础部署请求成功: ${version}`, response.data);
    return response.data;
  } catch (error) {
    console.error(`API: 基础部署版本 ${version} 失败:`, error);

    // 如果404错误，尝试备用路径
    if (error.response && error.response.status === 404) {
      try {
        console.log(`尝试备用部署路径: /deploy/${version}`);
        const fallbackResponse = await axios.post(`/deploy/${version}`, {
          instance_name: instanceName,
        });
        console.log(
          `API: 通过备用路径部署成功: ${version}`,
          fallbackResponse.data
        );
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error(`API: 备用路径部署失败: ${version}`, fallbackError);
      }
    }

    return {
      success: false,
      message:
        error.response?.data?.detail ||
        error.message ||
        `部署版本 ${version} 失败`,
    };
  }
};

/**
 * 检查部署状态
 * @param {string} instanceName 实例名称
 * @returns {Promise<Object>} 部署状态
 */
export const checkDeployStatus = async (instanceName) => {
  try {
    const response = await axios.get(`/api/deploy/status/${instanceName}`);
    return response.data;
  } catch (error) {
    console.error("检查部署状态失败:", error);
    throw new Error("检查部署状态失败");
  }
};

/**
 * 配置Bot (详细配置)
 * @param {Object} config 配置对象, e.g., { instance_name, qq_number, install_napcat, install_adapter, ports }
 * @returns {Promise<Object>} 配置结果
 */
export const configureBot = async (config) => {
  try {
    console.log("API: 发送配置Bot请求:", config);
    const response = await axios.post("/api/install/configure", config);
    console.log("API: 配置Bot请求成功:", response.data);
    return response.data;
  } catch (error) {
    console.error("API: 配置Bot失败:", error);
    return {
      success: false,
      message: error.response?.data?.detail || error.message || "配置Bot失败",
    };
  }
};

/**
 * 检查安装状态
 * @returns {Promise<Object>} 安装状态
 */
export const checkInstallStatus = async () => {
  try {
    const response = await axios.get("/api/install-status");
    return response;
  } catch (error) {
    console.error("检查安装状态失败:", error);
    return {
      data: {
        napcat_installing: false,
        nonebot_installing: false,
      },
    };
  }
};

export default {
  fetchVersions,
  deployVersion,
  checkDeployStatus,
  configureBot,
  checkInstallStatus,
};
