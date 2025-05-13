import axios from "axios";
import { ElMessage, ElNotification } from "element-plus";

// API基础URL配置
const API_BASE_URL = "/api";

// 创建一个带有默认配置的axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000, // 30秒超时
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API请求: ${config.method.toUpperCase()} ${config.url}`);

    // 检查是否应该使用模拟数据
    if (shouldUseMockData()) {
      console.log(`[模拟模式] API请求: ${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error("API请求配置错误:", error);
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    console.log(
      `API响应 [${response.status}]: ${response.config.url}`,
      response.data
    );
    return response;
  },
  (error) => {
    // 输出详细错误信息
    if (error.response) {
      console.error(
        `API错误 [${error.response.status}]: ${error.config.url}`,
        error.response.data
      );
    } else if (error.request) {
      console.error("API请求未收到响应:", error.request);
    } else {
      console.error("API错误:", error.message);
    }

    // 如果API请求失败且启用了模拟模式，返回模拟数据
    if (shouldUseMockData()) {
      const url = error.config.url;
      const method = error.config.method;
      const params = error.config.params;
      const data = error.config.data;

      console.log(
        `[模拟模式] 尝试返回模拟数据: ${method.toUpperCase()} ${url}`
      );
      return Promise.resolve({
        data: generateMockResponse(url, method, params, data),
        status: 200,
        statusText: "OK (Mocked)",
        headers: {},
        config: error.config,
        isMock: true,
      });
    }

    return Promise.reject(error);
  }
);

// 检查是否应该使用模拟数据
const shouldUseMockData = () => {
  // 始终返回true，因为后端已从项目移出
  return true;
  // 以下代码已不再使用，保留作为参考
  // return window._useMockData || localStorage.getItem("useMockData") === "true";
};

// 添加一个新的导出函数，用于检查模拟模式是否激活
export const isMockModeActive = () => {
  return true; // 始终返回true
};

// 生成模拟响应
const generateMockResponse = (url, method, params, data) => {
  // 基本模拟数据模板
  let response = { success: true, isMock: true };

  // 解析数据体
  let requestBody = {};
  if (data && typeof data === "string") {
    try {
      requestBody = JSON.parse(data);
    } catch (e) {
      console.warn("无法解析请求数据体:", data);
    }
  } else if (data && typeof data === "object") {
    requestBody = data;
  }

  // 根据URL和方法生成不同的模拟数据
  if (url.includes("/versions")) {
    response = {
      versions: ["latest", "beta", "stable", "v0.6.3", "v0.6.2", "v0.6.1"],
      isMock: true,
    };
  } else if (url.includes("/instances")) {
    if (url.includes("/stats")) {
      response = {
        total: 3,
        running: 1,
        stopped: 2,
        isMock: true,
      };
    } else {
      // 确保实例数据格式一致
      const mockInstances = generateMockInstances(3);
      response = {
        instances: mockInstances,
        success: true,
        isMock: true,
      };
    }
  } else if (url.includes("/start/")) {
    // 处理启动实例请求
    const instanceName = url.split("/start/")[1].split("/")[0];
    response = {
      success: true,
      message: `实例 ${instanceName} 已启动（模拟）`,
      isMock: true,
    };
  } else if (url.includes("/stop")) {
    // 处理停止实例请求
    response = {
      success: true,
      message: `实例已停止（模拟）`,
      isMock: true,
    };
  } else if (url.match(/\/instance\/[^\/]+$/)) {
    // 处理删除实例请求 (DELETE)
    if (method === "DELETE") {
      const instanceName = url.split("/instance/")[1];
      response = {
        success: true,
        message: `实例 ${instanceName} 已删除（模拟）`,
        isMock: true,
      };
    }
  } else if (url.includes("/logs/instance/")) {
    // 处理实例日志请求
    const instanceName = url.split("/logs/instance/")[1];
    response = {
      logs: generateMockLogs(instanceName, 20),
      isMock: true,
    };
  } else if (url.includes("/deploy")) {
    // 处理部署请求
    response = {
      success: true,
      message: "部署任务已提交（模拟）",
      isMock: true,
    };
  } else if (url.includes("/install-status")) {
    // 处理安装状态请求
    response = {
      napcat_installing: false,
      nonebot_installing: false,
      isMock: true,
    };
  } else if (url.includes("/open-folder")) {
    // 处理打开文件夹请求
    response = {
      success: true,
      isMock: true,
    };
  }

  return response;
};

/**
 * 生成模拟日志数据
 * @param {string} source 日志来源
 * @param {number} count 日志条数
 * @returns {Array} 模拟日志数组
 */
const generateMockLogs = (source, count = 10) => {
  const levels = ["INFO", "WARNING", "ERROR", "SUCCESS"];
  const logs = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const time = new Date(now - i * 60000).toLocaleString();
    let message = "";

    switch (level) {
      case "INFO":
        message = `[${source}] 系统正常运行中...`;
        break;
      case "WARNING":
        message = `[${source}] 检测到潜在问题，请注意观察`;
        break;
      case "ERROR":
        message = `[${source}] 操作失败，请检查系统配置`;
        break;
      case "SUCCESS":
        message = `[${source}] 操作成功完成`;
        break;
    }

    logs.push({
      level,
      time,
      message,
      source,
    });
  }

  return logs;
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

// 创建通用API调用方法
const apiService = {
  /**
   * 发送GET请求
   * @param {string} url - API路径
   * @param {Object} params - 请求参数
   * @returns {Promise<any>} - 请求结果
   */
  get: async (url, params = {}) => {
    try {
      // 如果启用了模拟模式，直接返回模拟数据
      if (shouldUseMockData()) {
        console.log(`[模拟模式] GET ${url}`);
        const mockResponse = generateMockResponse(url, "get", params, null);
        // 添加延迟，模拟网络延迟
        await new Promise((resolve) => setTimeout(resolve, 200));
        return mockResponse;
      }

      const response = await apiClient.get(url, { params });
      return response.data;
    } catch (error) {
      // 如果开启模拟模式，则返回模拟数据
      if (shouldUseMockData()) {
        console.log(`[模拟模式-请求失败后] GET ${url}`);
        return generateMockResponse(url, "get", params, null);
      }

      // 自动尝试不带/api前缀的URL
      if (error.response && error.response.status === 404) {
        try {
          console.log(`尝试直接访问: ${url}`);
          const fallbackResponse = await axios.get(
            url.startsWith("/") ? url : `/${url}`,
            { params }
          );
          return fallbackResponse.data;
        } catch (fallbackError) {
          console.error(`备用请求失败: ${url}`, fallbackError);
        }
      }
      throw error;
    }
  },

  /**
   * 发送POST请求
   * @param {string} url - API路径
   * @param {Object} data - 请求数据
   * @returns {Promise<any>} - 请求结果
   */
  post: async (url, data = {}) => {
    try {
      // 如果启用了模拟模式，直接返回模拟数据
      if (shouldUseMockData()) {
        console.log(`[模拟模式] POST ${url}`);
        const mockResponse = generateMockResponse(url, "post", {}, data);
        // 添加延迟，模拟网络延迟
        await new Promise((resolve) => setTimeout(resolve, 200));
        return mockResponse;
      }

      const response = await apiClient.post(url, data);
      return response.data;
    } catch (error) {
      // 如果开启模拟模式，则返回模拟数据
      if (shouldUseMockData()) {
        console.log(`[模拟模式-请求失败后] POST ${url}`);
        return generateMockResponse(url, "post", {}, data);
      }

      // 自动尝试不带/api前缀的URL
      if (error.response && error.response.status === 404) {
        try {
          console.log(`尝试直接访问: ${url}`);
          const fallbackResponse = await axios.post(
            url.startsWith("/") ? url : `/${url}`,
            data
          );
          return fallbackResponse.data;
        } catch (fallbackError) {
          console.error(`备用请求失败: ${url}`, fallbackError);
        }
      }
      throw error;
    }
  },

  /**
   * 启用模拟数据模式
   */
  enableMockMode: () => {
    window._useMockData = true;
    localStorage.setItem("useMockData", "true");
    console.log("已启用API模拟数据模式");
  },

  /**
   * 禁用模拟数据模式
   * 注意：由于后端已从项目移出，此方法不再有实际效果
   */
  disableMockMode: () => {
    // 由于后端已移出，不再允许禁用模拟模式
    console.log("注意：后端已从项目移出，将继续使用模拟数据模式");
    window._useMockData = true;
    localStorage.setItem("useMockData", "true");
  },
};

// 确保应用启动时启用模拟模式
apiService.enableMockMode();

export default apiService;
