import axios from "axios";
import backendConfig from "../config/backendConfig.js";

// 检查是否应该使用模拟模式
export const isMockModeActive = () => {
  return (
    localStorage.getItem("useMockData") === "true" ||
    window._useMockData === true
  );
};

// 创建axios实例并配置正确的baseURL
const axiosInstance = axios.create({
  baseURL: backendConfig.getBackendUrl(), // 使用完整的后端URL
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// 请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`发起请求: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response) => {
    // 修复：不要直接返回response.data，保持完整的response对象
    return response;
  },
  (error) => {
    console.error("API 请求错误:", error); // 检查是否需要使用模拟数据
    if (isMockModeActive()) {
      console.log("使用模拟数据响应请求");
      const url = error.config.url;
      const method = error.config.method;
      const params = error.config.params;
      const data = error.config.data ? JSON.parse(error.config.data) : {};

      return Promise.resolve({
        data: generateMockResponse(url, method, params, data),
        status: 200,
        statusText: "OK",
      });
    }

    return Promise.reject(error);
  }
);

// 模拟响应生成函数
const generateMockResponse = (url, method, params, data) => {
  // 基本模拟数据模板
  let response = { success: true, isMock: true };

  // 根据URL和方法生成不同的模拟数据
  if (url.includes("/deploy/versions")) {
    response = {
      versions: ["latest", "main", "v0.6.3", "v0.6.2", "v0.6.1"],
      isMock: true,
    };
  } else if (url.includes("/deploy/services")) {
    response = {
      services: [
        {
          name: "napcat",
          description: "NapCat 服务",
        },
        {
          name: "nonebot-ada",
          description: "NoneBot-ada 服务",
        },
        {
          name: "nonebot",
          description: "NoneBot 服务",
        },
      ],
      isMock: true,
    };
  } else if (url.includes("/deploy/deploy")) {
    // 处理部署请求
    const instanceName = data?.instance_name || "unknown_instance";
    const version = data?.version || "latest";
    response = {
      success: true,
      message: "部署任务已提交",
      instance_id: "a2fe529b51999fc2d45df5196c6c50a46a608fa1",
      isMock: true,
    };
  } else if (url.includes("/install-status")) {
    // 提取实例ID
    const instanceId = url.split("/install-status/")[1];

    // 模拟不同的安装状态
    const rand = Math.random();
    let status, progress;

    if (rand < 0.3) {
      status = "installing";
      progress = Math.floor(Math.random() * 70) + 10;
    } else if (rand < 0.6) {
      status = "finishing";
      progress = Math.floor(Math.random() * 20) + 75;
    } else {
      status = "completed";
      progress = 100;
    }

    response = {
      status: status,
      progress: progress,
      message: `${status === "completed" ? "安装完成" : "正在安装组件..."}`,
      services_install_status: [
        {
          name: "napcat",
          status: status,
          progress: progress,
          message: `正在安装 NapCat`,
        },
        {
          name: "nonebot-ada",
          status: status === "completed" ? "completed" : "installing",
          progress: status === "completed" ? 100 : progress - 10,
          message: `正在安装 NoneBot-ada`,
        },
      ],
      isMock: true,
    };
  } else if (url.includes("/instances")) {
    if (url.includes("/stats")) {
      response = {
        total: 3,
        running: 2,
        stopped: 1,
        isMock: true,
      };
    } else {
      // 返回硬编码的实例数据
      response = {
        instances: [
          {
            id: "a2fe529b51999fc2d45df5196c6c50a46a608fa1",
            name: "maibot-stable-1",
            status: "running",
            installedAt: "1747404418536",
            path: "D:\\MaiBot\\MaiBot-1",
            port: 8000,
            services: [
              {
                name: "napcat",
                path: "D:\\MaiBot\\MaiBot-1\\napcat",
                status: "running",
                port: 8095,
              },
              {
                name: "nonebot-ada",
                path: "D:\\MaiBot\\MaiBot-1\\nonebot-ada",
                status: "stopped",
                port: 18002,
              },
            ],
            version: "0.6.3",
          },
          {
            id: "b3fe529b51999fc2d45df5196c6c50a46a608fb2",
            name: "maibot-dev-2",
            status: "stopped",
            installedAt: "1745404418536",
            path: "D:\\MaiBot\\MaiBot-2",
            port: 8001,
            services: [
              {
                name: "napcat",
                path: "D:\\MaiBot\\MaiBot-2\\napcat",
                status: "stopped",
                port: 8096,
              },
            ],
            version: "latest",
          },
        ],
        success: true,
        isMock: true,
      };
    }
  } else if (url.includes("/start/")) {
    // 处理启动实例请求
    const instanceName = url.split("/start/")[1].split("/")[0];
    response = {
      success: true,
      message: `实例 ${instanceName} 已启动（固定数据）`,
      isMock: true,
    };
  } else if (url.includes("/stop")) {
    // 处理停止实例请求
    response = {
      success: true,
      message: `实例已停止（固定数据）`,
      isMock: true,
    };
  } else if (url.match(/\/instance\/[^\/]+$/)) {
    // 处理删除实例请求 (DELETE)
    if (method === "DELETE") {
      const instanceName = url.split("/instance/")[1];
      response = {
        success: true,
        message: `实例 ${instanceName} 已删除（固定数据）`,
        isMock: true,
      };
    }
  } else if (url.includes("/logs/instance/")) {
    // 处理实例日志请求 - 使用硬编码的日志数据
    const instanceName = url.split("/logs/instance/")[1];
    response = {
      logs: [
        {
          time: "2023-10-15 10:00:00",
          level: "INFO",
          message: `${instanceName} 实例启动中`,
          source: "system",
        },
        {
          time: "2023-10-15 10:00:05",
          level: "INFO",
          message: "加载配置文件",
          source: "system",
        },
        {
          time: "2023-10-15 10:00:10",
          level: "INFO",
          message: "初始化数据库连接",
          source: "system",
        },
        {
          time: "2023-10-15 10:00:15",
          level: "WARNING",
          message: "某些功能可能不可用",
          source: "system",
        },
        {
          time: "2023-10-15 10:00:20",
          level: "INFO",
          message: `${instanceName} 启动完成`,
          source: "system",
        },
      ],
      isMock: true,
    };
  } else if (url.includes("/deploy")) {
    // 处理部署请求
    const version = data?.version || url.split("/deploy/")[1] || "latest";
    const instanceName = data?.instance_name || "unknown_instance";
    response = {
      success: true,
      message: `开始部署 ${version} 版本，实例名称：${instanceName}（模拟数据）`,
      isMock: true,
    };
  } else if (url.includes("/install/configure")) {
    // 处理配置Bot请求
    const qqNumber = data?.qq_number || "未指定";
    response = {
      success: true,
      message: `已配置QQ号 ${qqNumber} 的实例（模拟数据）`,
      isMock: true,
    };
  } else if (url.includes("/install-status")) {
    // 处理检查安装状态请求
    response = {
      napcat_installing: false,
      nonebot_installing: false,
      status: "completed",
      progress: 100,
      isMock: true,
    };
  } else {
    // 默认响应
    response = {
      success: false,
      message: "未知请求",
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
  const levels = ["INFO", "WARNING", "ERROR", "DEBUG"];
  const now = new Date();
  const logs = [];

  for (let i = 0; i < count; i++) {
    const time = new Date(now.getTime() - i * 60000);
    logs.unshift({
      time: time.toISOString().replace("T", " ").substring(0, 19),
      level: levels[Math.floor(Math.random() * levels.length)],
      message: `这是一条来自${source}的模拟日志消息 #${i + 1}`,
      source: source,
    });
  }

  return logs;
};

/**
 * 测试后端连接
 * @returns {Promise<boolean>} 连接是否成功
 */
const testBackendConnection = async () => {
  try {
    console.log("正在测试后端连接...");
    console.log("后端地址:", backendConfig.getBackendUrl());
    console.log(
      "健康检查URL:",
      `${backendConfig.getBackendUrl()}${backendConfig.getFullUrl(
        "/system/health"
      )}`
    );

    // 使用正确的健康检查路径和完整URL
    const response = await axiosInstance.get(
      backendConfig.getFullUrl("/system/health"),
      {
        timeout: 5000,
        headers: {
          Accept: "application/json",
        },
      }
    );

    console.log("健康检查响应:", response);
    console.log("健康检查响应数据:", response.data);

    // 检查响应是否符合预期格式
    if (response.data && response.data.status === "success") {
      return true;
    }

    return false;
  } catch (error) {
    console.error("后端连接测试失败:", error);
    return false;
  }
};

// 统一的API请求函数 - 修改为使用正确的axios实例
const apiRequest = async (method, url, data = null, config = {}) => {
  try {
    // 使用配置的axios实例而不是全局axios
    const response = await axiosInstance({
      method,
      url: url.startsWith("/api/") ? url : backendConfig.getFullUrl(url),
      data,
      ...config,
    });

    // 对实例相关的API响应进行数据预处理
    if (
      url.includes("/instances") &&
      response.data &&
      response.data.instances
    ) {
      // 修复后端返回数据中字段名不匹配的问题
      response.data.instances = response.data.instances.map((instance) => {
        return {
          ...instance,
          // 如果实例没有installedAt属性，使用创建时间
          installedAt: instance.installedAt || instance.created_at,
        };
      });
    }

    return response;
  } catch (error) {
    // 如果后端不可用，使用模拟数据
    console.warn(`API请求失败，使用模拟数据: ${method} ${url}`, error.message);
    return { data: generateMockResponse(url, method, config.params, data) };
  }
};

// 导出API方法
export default {
  get: (url, params) => {
    // 检查是否强制使用模拟数据
    if (localStorage.getItem("useMockData") === "true") {
      console.log(`GET请求使用模拟数据: ${url}`);
      return Promise.resolve({
        data: generateMockResponse(url, "get", params, null),
      });
    }
    return apiRequest("get", url, null, { params });
  },

  post: (url, data) => {
    // 检查是否强制使用模拟数据
    if (localStorage.getItem("useMockData") === "true") {
      console.log(`POST请求使用模拟数据: ${url}`);
      return Promise.resolve({
        data: generateMockResponse(url, "post", null, data),
      });
    }
    return apiRequest("post", url, data);
  },

  put: (url, data) => {
    // 检查是否强制使用模拟数据
    if (localStorage.getItem("useMockData") === "true") {
      console.log(`PUT请求使用模拟数据: ${url}`);
      return Promise.resolve({
        data: generateMockResponse(url, "put", null, data),
      });
    }
    return apiRequest("put", url, data);
  },

  delete: (url) => {
    // 检查是否强制使用模拟数据
    if (localStorage.getItem("useMockData") === "true") {
      console.log(`DELETE请求使用模拟数据: ${url}`);
      return Promise.resolve({
        data: generateMockResponse(url, "delete", null, null),
      });
    }
    return apiRequest("delete", url);
  },
  // 测试后端连接
  testBackendConnection,
  // 配置是否使用模拟数据
  setUseMockData: (useMock) => {
    localStorage.setItem("useMockData", useMock);
  },

  // 检查是否处于模拟模式
  isMockModeActive: () => {
    return (
      localStorage.getItem("useMockData") === "true" ||
      window._useMockData === true
    );
  },
};
