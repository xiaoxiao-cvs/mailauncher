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

/**
 * 获取实例列表（模拟数据）
 * @returns {Promise<Object>} 实例列表数据
 */
const getInstances = async () => {
  try {
    const response = await axios.get("/api/instances");
    return response.data;
  } catch (error) {
    console.error("获取实例列表失败:", error);
    // 返回模拟数据
    return {
      instances: generateMockInstances(),
      success: true,
      isMock: true,
    };
  }
};

/**
 * 生成模拟实例数据
 * @param {number} count 要生成的实例数量
 * @returns {Array} 模拟实例数组
 */
const generateMockInstances = (count = 3) => {
  const statuses = ["running", "stopped"];
  const versions = ["latest", "stable", "beta", "v0.6.3", "v0.6.2"];
  const instances = [];

  for (let i = 0; i < count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const version = versions[Math.floor(Math.random() * versions.length)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));

    instances.push({
      name: `maibot-${version}-${i + 1}`,
      status: status,
      installedAt: date.toISOString().split("T")[0],
      path: `D:\\MaiBot\\${version}-${i + 1}`,
      services: {
        napcat: status,
        nonebot: Math.random() > 0.5 ? status : "stopped",
      },
      version: version,
    });
  }

  return instances;
};

/**
 * 启动实例（模拟）
 * @param {string} instanceName 实例名称
 * @returns {Promise<Object>} 启动结果
 */
const startInstance = async (instanceName) => {
  console.log(`启动实例: ${instanceName}`);
  try {
    const response = await axios.post(`/api/start/${instanceName}`);
    return response.data;
  } catch (error) {
    console.error(`启动实例 ${instanceName} 失败:`, error);
    // 返回模拟成功数据
    return {
      success: true,
      message: `实例 ${instanceName} 启动成功（模拟）`,
      isMock: true,
    };
  }
};

/**
 * 停止实例（模拟）
 * @param {string} instanceName 实例名称
 * @returns {Promise<Object>} 停止结果
 */
const stopInstance = async (instanceName) => {
  console.log(`停止实例: ${instanceName}`);
  try {
    const response = await axios.post(`/api/stop/${instanceName}`);
    return response.data;
  } catch (error) {
    console.error(`停止实例 ${instanceName} 失败:`, error);
    // 返回模拟成功数据
    return {
      success: true,
      message: `实例 ${instanceName} 已停止（模拟）`,
      isMock: true,
    };
  }
};

/**
 * 删除实例（模拟）
 * @param {string} instanceName 实例名称
 * @returns {Promise<Object>} 删除结果
 */
const deleteInstance = async (instanceName) => {
  console.log(`删除实例: ${instanceName}`);
  try {
    const response = await axios.delete(`/api/instance/${instanceName}`);
    return response.data;
  } catch (error) {
    console.error(`删除实例 ${instanceName} 失败:`, error);
    // 返回模拟成功数据
    return {
      success: true,
      message: `实例 ${instanceName} 已删除（模拟）`,
      isMock: true,
    };
  }
};

export default {
  fetchVersions,
  deployVersion,
  configureBot,
  checkInstallStatus,
  getInstances,
  startInstance,
  stopInstance,
  deleteInstance,
  generateMockInstances,
};
