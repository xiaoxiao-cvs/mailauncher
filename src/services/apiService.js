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
  return window._useMockData || localStorage.getItem("useMockData") === "true";
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
      response = {
        instances: [
          {
            name: "maibot-latest",
            status: "running",
            installedAt: "2023-10-15",
            path: "D:\\MaiBot\\latest",
            services: {
              napcat: "running",
              nonebot: "stopped",
            },
          },
          {
            name: "maibot-stable",
            status: "stopped",
            installedAt: "2023-10-10",
            path: "D:\\MaiBot\\stable",
            services: {
              napcat: "stopped",
              nonebot: "stopped",
            },
          },
          {
            name: "maibot-test",
            status: "stopped",
            installedAt: "2023-09-20",
            path: "D:\\MaiBot\\test",
            services: {
              napcat: "stopped",
              nonebot: "stopped",
            },
          },
        ],
        isMock: true,
      };
    }
  } else if (method === "post" && url.includes("/deploy")) {
    response = {
      success: true,
      message: "模拟部署成功",
      instanceName: requestBody.instance_name || "maibot-simulated",
      isMock: true,
    };
  } else if (method === "post" && url.includes("/install")) {
    response = {
      success: true,
      message: "模拟安装配置成功",
      isMock: true,
    };
  } else if (method === "post" && url.includes("/start/")) {
    const instanceName = url.split("/").pop();
    response = {
      success: true,
      message: `模拟启动 ${instanceName} 成功`,
      isMock: true,
    };
  } else if (method === "post" && url.includes("/stop")) {
    response = {
      success: true,
      message: "模拟停止成功",
      isMock: true,
    };
  } else if (url.includes("/logs")) {
    const logSource = url.includes("/system") ? "system" : "instance";
    response = {
      logs: generateMockLogs(20, logSource),
      isMock: true,
    };
  } else if (url.includes("/status")) {
    response = {
      mongodb: { status: "running", info: "本地实例 (模拟)" },
      napcat: { status: "running", info: "端口 8095 (模拟)" },
      nonebot: { status: "stopped", info: "" },
      maibot: { status: "running", info: "版本 0.6.3 (模拟)" },
      isMock: true,
    };
  } else if (url.includes("/health")) {
    response = {
      status: "ok",
      version: "0.6.3",
      uptime: "1h 23m",
      isMock: true,
    };
  }

  return response;
};

// 生成模拟日志
const generateMockLogs = (count, source = "system") => {
  const logs = [];
  const levels = ["INFO", "WARNING", "ERROR", "SUCCESS", "DEBUG"];
  const now = new Date();

  const messages = {
    system: [
      "系统启动完成",
      "检查更新...",
      "无可用更新",
      "后台服务运行正常",
      "尝试连接数据库",
      "数据库连接成功",
      "用户配置加载完成",
      "监控服务启动",
      "执行定时任务",
      "清理临时文件",
      "正在处理队列任务",
      "警告: 磁盘空间不足",
      "错误: 无法访问远程服务器",
      "成功: 任务队列处理完成",
    ],
    instance: [
      "实例初始化中...",
      "加载配置文件",
      "NapCat服务启动成功",
      "NoneBot适配器启动中",
      "模型加载中...",
      "模型加载完成",
      "成功连接到QQ服务器",
      "警告: 接收到未知消息类型",
      "错误: 消息发送失败",
      "成功响应用户查询",
      "处理群聊消息",
      "处理私聊消息",
      "执行定时任务",
      "生成回复内容",
    ],
  };

  for (let i = 0; i < count; i++) {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const message =
      messages[source][Math.floor(Math.random() * messages[source].length)];
    const time = new Date(now - i * 60000); // 每条日志间隔1分钟

    logs.push({
      level,
      message,
      time: time.toLocaleString("zh-CN"),
      source,
    });
  }

  return logs;
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
        return generateMockResponse(url, "get", params, null);
      }

      const response = await apiClient.get(url, { params });
      return response.data;
    } catch (error) {
      // 如果开启模拟模式，则返回模拟数据
      if (shouldUseMockData()) {
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
        return generateMockResponse(url, "post", {}, data);
      }

      const response = await apiClient.post(url, data);
      return response.data;
    } catch (error) {
      // 如果开启模拟模式，则返回模拟数据
      if (shouldUseMockData()) {
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
   */
  disableMockMode: () => {
    window._useMockData = false;
    localStorage.setItem("useMockData", "false");
    console.log("已禁用API模拟数据模式");
  },
};

export default apiService;
