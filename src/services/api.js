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

  // 获取模拟实例列表 (用于处理后端错误的情况)
  getMockInstances: () => {
    return Promise.resolve({
      instances: [
        {
          id: "a2fe529b51999fc2d45df5196c6c50a46a608fa1",
          name: "maibot-stable-1",
          status: "running",
          created_at: "2025-05-28T10:30:00",
          path: "D:\\MaiBot\\MaiBot-1",
          port: 8000,
          services: [
            {
              name: "napcat",
              path: "D:\\MaiBot\\MaiBot-1\\napcat",
              status: "running",
              port: 8095,
            },
          ],
          version: "0.6.3",
        },
      ],
      success: true,
    });
  },

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

/**
 * 聊天API
 */
export const chatApi = {
  // 获取指定实例的聊天历史
  getChatHistory: (instanceId) =>
    apiService.get(createUrl(`/chat/${instanceId}/history`)),

  // 发送聊天消息
  sendMessage: (instanceId, message) =>
    apiService.post(createUrl(`/chat/${instanceId}/send`), message),

  // 获取聊天模拟数据
  getMockChatHistory: () => {
    return Promise.resolve({
      messages: [
        {
          id: 1,
          content: "你好！我是模型助手，有什么可以帮助你的吗？",
          timestamp: "2025-05-29T14:30:00",
          sender: "bot",
          avatar: "/assets/icon.ico",
        },
        {
          id: 2,
          content: "你好，我想了解一下你的功能。",
          timestamp: "2025-05-29T14:31:00",
          sender: "user",
          avatar: "/assets/default.png",
        },
        {
          id: 3,
          content:
            "我是一个AI助手，可以回答问题、提供建议、进行对话交流等。有任何问题都可以直接问我。",
          timestamp: "2025-05-29T14:32:00",
          sender: "bot",
          avatar: "/assets/icon.ico",
        },
      ],
      success: true,
    });
  },

  // 发送聊天模拟消息
  sendMockMessage: (message) => {
    return Promise.resolve({
      message: {
        id: Date.now(),
        content:
          "这是一个模拟回复：我已收到你的消息「" + message.content + "」",
        timestamp: new Date().toISOString(),
        sender: "bot",
        avatar: "/assets/icon.ico",
      },
      success: true,
    });
  },
};

export default {
  deployApi,
  instancesApi,
  systemApi,
  chatApi, // 添加聊天API
};
