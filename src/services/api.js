/**
 * API服务模块
 * 统一处理所有API请求，确保路径一致
 */
import axios from "axios";
import apiService from "./apiService";

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
  getVersions: () => apiService.get(createUrl("/versions")),

  // 部署版本 - 修复这里，确保提供deploy方法
  deploy: (version, instanceName) =>
    apiService.post("/api/deploy", {
      version,
      instance_name: instanceName,
    }),

  // 配置Bot
  configureBotSettings: (config) =>
    apiService.post(createUrl("/install/configure"), config),

  // 检查安装状态
  checkStatus: () => apiService.get(createUrl("/install-status")),

  // 添加兼容现有代码的checkInstallStatus方法
  checkInstallStatus: () => apiService.get(createUrl("/install-status")),
};

/**
 * 实例管理API
 */
export const instancesApi = {
  // 获取实例列表
  getInstances: () => apiService.get(createUrl("/instances")),

  // 获取实例统计
  getStats: () => apiService.get(createUrl("/instances/stats")),

  // 启动实例
  startInstance: (instanceName) =>
    apiService.post(createUrl(`/start/${instanceName}`)),

  // 停止实例
  stopInstance: () => apiService.post(createUrl("/stop")),

  // 启动NapCat服务
  startNapcat: (instanceName) =>
    apiService.post(createUrl(`/start/${instanceName}/napcat`)),

  // 获取日志
  getLogs: (instanceName) =>
    apiService.get(createUrl(`/logs/instance/${instanceName}`)),

  // 删除实例
  deleteInstance: (instanceName) =>
    apiService.get(createUrl(`/instance/${instanceName}`)), // 修改为get请求，避免cors问题

  // 打开文件夹
  openFolder: (path) => apiService.post(createUrl("/open-folder"), { path }),
};

/**
 * 系统API
 */
export const systemApi = {
  // 健康检查
  healthCheck: () => apiService.get(createUrl("/health")),

  // 获取系统状态
  getStatus: () => apiService.get(createUrl("/status")),

  // 获取系统日志
  getLogs: () => apiService.get(createUrl("/logs/system")),
};

// 实例统计 - 修改为使用apiService
export const getInstanceStats = async () => {
  try {
    // 使用旧的API路径
    return await apiService.get("/api/instance-stats");
  } catch (error) {
    console.error("获取实例统计失败:", error);
    // 返回模拟数据
    return {
      total: 3,
      running: 1,
      stopped: 2,
      isMock: true,
    };
  }
};

export default {
  deployApi,
  instancesApi,
  systemApi,
  getInstanceStats,
};
