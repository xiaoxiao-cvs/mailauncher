/**
 * API服务模块
 * 统一处理所有API请求，确保路径一致
 */
import axios from "axios";

// API基础路径
const API_BASE = "/api";

/**
 * 创建API URL
 * @param {string} path - API路径
 * @returns {string} 完整的API URL
 */
const createUrl = (path) => {
  // 确保路径格式正确
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  return `${API_BASE}${path}`;
};

/**
 * 部署模块API
 */
export const deployApi = {
  // 获取版本列表
  getVersions: () => axios.get(createUrl("/versions")),

  // 部署版本 - 修复这里，确保提供deploy方法
  deploy: (version, instanceName) =>
    axios.post("/api/deploy", {
      version,
      instance_name: instanceName,
    }),

  // 配置Bot
  configureBotSettings: (config) =>
    axios.post(createUrl("/install/configure"), config),

  // 检查安装状态
  checkStatus: () => axios.get(createUrl("/install-status")),
};

/**
 * 实例管理API
 */
export const instancesApi = {
  // 获取实例列表
  getInstances: () => axios.get(createUrl("/instances")),

  // 获取实例统计
  getStats: () => axios.get(createUrl("/instances/stats")),

  // 启动实例
  startInstance: (instanceName) =>
    axios.post(createUrl(`/start/${instanceName}`)),

  // 停止实例
  stopInstance: () => axios.post(createUrl("/stop")),

  // 启动NapCat服务
  startNapcat: (instanceName) =>
    axios.post(createUrl(`/start/${instanceName}/napcat`)),

  // 获取日志
  getLogs: (instanceName) =>
    axios.get(createUrl(`/logs/instance/${instanceName}`)),

  // 删除实例
  deleteInstance: (instanceName) =>
    axios.delete(createUrl(`/instance/${instanceName}`)),

  // 打开文件夹
  openFolder: (path) => axios.post(createUrl("/open-folder"), { path }),
};

/**
 * 系统API
 */
export const systemApi = {
  // 健康检查
  healthCheck: () => axios.get(createUrl("/health")),

  // 获取系统状态
  getStatus: () => axios.get(createUrl("/status")),

  // 获取系统日志
  getLogs: () => axios.get(createUrl("/logs/system")),
};

// 实例统计 - 修改为使用旧API
export const getInstanceStats = async () => {
  try {
    // 使用旧的API路径
    const response = await axios.get("/api/instance-stats");
    return response.data;
  } catch (error) {
    console.error("获取实例统计失败:", error);
    // 返回模拟数据
    return {
      total: 3,
      running: 1,
      stopped: 2,
    };
  }
};

// 全局错误处理
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API请求失败:", error);
    if (error.response) {
      console.error("状态码:", error.response.status);
      console.error("响应数据:", error.response.data);
    } else if (error.request) {
      console.error("未收到响应:", error.request);
    } else {
      console.error("请求配置错误:", error.message);
    }
    return Promise.reject(error);
  }
);

export default {
  deployApi,
  instancesApi,
  systemApi,
  getInstanceStats,
};
