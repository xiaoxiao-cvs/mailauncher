// HTTP请求头自定义使用示例
import apiService from "../services/apiService.js";

/**
 * 演示各种自定义请求头的使用方法
 */

// 1. 为单个请求添加自定义请求头
export const deployWithCustomHeaders = async (deployData) => {
  try {
    const customHeaders = {
      "X-Deploy-Source": "frontend-ui",
      "X-Client-Name": "MailLauncher-Client",
      "X-Request-ID": generateRequestId(),
      Authorization: "Bearer your-token-here", // 如果需要认证
    };

    const response = await apiService.post(
      "/deploy/deploy",
      deployData,
      customHeaders
    );
    return response.data;
  } catch (error) {
    console.error("部署请求失败:", error);
    throw error;
  }
};

// 2. 使用通用request方法进行完全自定义的请求
export const customRequestExample = async () => {
  try {
    const response = await apiService.request({
      method: "get",
      url: "/instances",
      headers: {
        Accept: "application/json",
        "X-Custom-Header": "custom-value",
        "Cache-Control": "no-cache",
      },
      timeout: 15000, // 自定义超时时间
    });
    return response.data;
  } catch (error) {
    console.error("自定义请求失败:", error);
    throw error;
  }
};

// 3. 设置全局请求头（适用于所有请求）
export const setupGlobalHeaders = () => {
  // 设置全局认证头
  apiService.setGlobalHeaders({
    "X-Client-Version": "1.0.0",
    "X-Platform": getPlatform(),
    "X-Session-ID": getSessionId(),
  });
};

// 4. 在特定场景下临时移除或修改全局头
export const temporaryHeaderModification = async () => {
  // 获取当前全局头
  const currentHeaders = apiService.getGlobalHeaders();
  console.log("当前全局请求头:", currentHeaders);

  // 临时添加特殊头
  apiService.setGlobalHeaders({
    "X-Special-Operation": "true",
  });

  try {
    // 执行需要特殊头的操作
    const response = await apiService.get("/deploy/versions");
    return response.data;
  } finally {
    // 清理特殊头
    apiService.removeGlobalHeaders("X-Special-Operation");
  }
};

// 5. 条件性请求头设置
export const conditionalHeaders = async (
  includeAuth = false,
  userRole = "user"
) => {
  const headers = {
    Accept: "application/json",
  };

  // 根据条件添加不同的请求头
  if (includeAuth) {
    headers["Authorization"] = `Bearer ${getAuthToken()}`;
  }

  if (userRole === "admin") {
    headers["X-Admin-Access"] = "true";
  }

  // 添加调试信息
  if (process.env.NODE_ENV === "development") {
    headers["X-Debug-Mode"] = "true";
    headers["X-Timestamp"] = Date.now().toString();
  }

  return await apiService.get("/instances", {}, headers);
};

// 6. 批量请求时使用不同的请求头
export const batchRequestsWithDifferentHeaders = async () => {
  const requests = [
    {
      name: "instances",
      request: () =>
        apiService.get("/instances", {}, { "X-Request-Type": "instances" }),
    },
    {
      name: "versions",
      request: () =>
        apiService.get(
          "/deploy/versions",
          {},
          { "X-Request-Type": "versions" }
        ),
    },
    {
      name: "services",
      request: () =>
        apiService.get(
          "/deploy/services",
          {},
          { "X-Request-Type": "services" }
        ),
    },
  ];

  const results = {};

  for (const { name, request } of requests) {
    try {
      const response = await request();
      results[name] = response.data;
    } catch (error) {
      console.error(`请求 ${name} 失败:`, error);
      results[name] = null;
    }
  }

  return results;
};

// 工具函数
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getPlatform = () => {
  if (typeof window !== "undefined") {
    return window.navigator.platform || "unknown";
  }
  return "node";
};

const getSessionId = () => {
  // 从localStorage或其他地方获取会话ID
  return localStorage.getItem("sessionId") || generateRequestId();
};

const getAuthToken = () => {
  // 从localStorage或其他地方获取认证令牌
  return localStorage.getItem("authToken") || "demo-token";
};

// 导出所有示例函数
export default {
  deployWithCustomHeaders,
  customRequestExample,
  setupGlobalHeaders,
  temporaryHeaderModification,
  conditionalHeaders,
  batchRequestsWithDifferentHeaders,
};
