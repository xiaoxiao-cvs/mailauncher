/**
 * API服务模块
 * 统一处理所有API请求，确保路径一致
 */
import apiService from "./apiService";
import backendConfig from "@/config/backendConfig";

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
  return `${backendConfig.server.api_prefix}${path}`;
};

/**
 * 部署模块API
 */
export const deployApi = {
  // 获取版本列表
  getVersions: () => apiService.get(createUrl("/deploy/versions")),

  // 获取可部署的服务列表
  getServices: () => apiService.get(createUrl("/deploy/services")),

  // 部署版本 - 符合后端API格式
  deploy: (deployConfig) =>
    apiService.post(createUrl("/deploy/deploy"), deployConfig),

  // 检查安装状态
  checkInstallStatus: (instanceId) =>
    apiService.get(createUrl(`/install-status/${instanceId}`)),
};

/**
 * 实例管理API
 */
export const instancesApi = {
  // 获取实例列表
  getInstances: () => apiService.get(createUrl("/instances")),

  // 获取实例统计
  getStats: () => apiService.get(createUrl("/instances/stats")),

  // 获取版本列表 (兼容错误调用，重定向到deployApi)
  getVersions: () => deployApi.getVersions(),

  // 启动实例
  startInstance: (id) => apiService.get(createUrl(`/instance/${id}/start`)),

  // 停止实例
  stopInstance: (id) => apiService.get(createUrl(`/instance/${id}/stop`)),

  // 重启实例
  restartInstance: (id) => apiService.get(createUrl(`/instance/${id}/restart`)),

  // 删除实例
  deleteInstance: (id) => apiService.get(createUrl(`/instance/${id}/delete`)),
};

/**
 * 系统API
 */
export const systemApi = {
  // 健康检查
  healthCheck: () => apiService.get(createUrl("/system/health")),

  // 获取系统性能指标
  getMetrics: () => apiService.get(createUrl("/system/metrics")),
};

export default {
  deployApi,
  instancesApi,
  systemApi,
};
