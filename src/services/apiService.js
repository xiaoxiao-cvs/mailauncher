import axios from "axios";
import backendConfig from "../config/backendConfig.js";

// 模拟数据功能已删除，始终返回false
export const isMockModeActive = () => {
  return false;
};

// 创建axios实例并配置固定的baseURL
const axiosInstance = axios.create({
  // 固定使用后端地址，不再依赖代理
  baseURL: backendConfig.getBackendUrl(),
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Client-Name": "MailLauncher-Frontend",
    "X-Client-Version": "1.0.0",
  },
});

// 更新axios实例的baseURL（当后端配置更改时调用）
export const updateAxiosBaseURL = () => {
  axiosInstance.defaults.baseURL = backendConfig.getBackendUrl();
  console.log("axios baseURL 已更新为:", axiosInstance.defaults.baseURL);
};

// 请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    // 增强请求日志，显示完整的请求URL和请求参数
    const fullUrl = config.baseURL
      ? `${config.baseURL}${config.url}`
      : config.url;
    console.log(`发起请求: ${config.method.toUpperCase()} ${fullUrl}`);
    if (config.params && Object.keys(config.params).length > 0) {
      console.log("请求参数:", config.params);
    }
    if (config.data) {
      console.log("请求数据:", config.data);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 移除模拟数据逻辑
axiosInstance.interceptors.response.use(
  (response) => {
    // 修复：不要直接返回response.data，保持完整的response对象
    return response;
  },
  (error) => {
    console.error("API 请求错误:", error);
    return Promise.reject(error);
  }
);

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

// 统一的API请求函数 - 修改为使用正确的axios实例和代理
const apiRequest = async (method, url, data = null, config = {}) => {
  try {
    // 判断是否应该使用代理
    const useProxy = import.meta.env.VITE_USE_PROXY === "true";
    // 合并默认请求头和自定义请求头
    const requestConfig = {
      ...config,
      headers: {
        // 保留默认头（但排除浏览器禁止的头）
        "Content-Type":
          axiosInstance.defaults.headers.common["Content-Type"] ||
          "application/json",
        Accept:
          axiosInstance.defaults.headers.common["Accept"] || "application/json",
        "X-Client-Name": axiosInstance.defaults.headers.common["X-Client-Name"],
        "X-Client-Version":
          axiosInstance.defaults.headers.common["X-Client-Version"],
        // 允许config覆盖特定头
        ...config.headers,
        // 添加请求时间戳（便于调试）
        "X-Request-Time": new Date().toISOString(),
      },
    };

    // 处理URL，确保使用代理时使用正确的路径格式
    let requestUrl;
    if (useProxy) {
      // 使用代理时，需要添加/api/v1前缀，但要避免重复
      // 检查URL是否已经包含api/v1部分
      if (url.includes("/api/v1")) {
        // 如果已经包含，则直接使用该URL
        requestUrl = url;
      } else {
        // 否则，添加api/v1前缀
        const cleanPath = url.replace(/^\/+/, ""); // 移除开头的所有斜杠
        requestUrl = `/api/v1/${cleanPath}`;
      }
    } else {
      // 不使用代理时，由于axios实例已经设置了baseURL，
      // 这里只需要构建相对路径部分
      const apiPrefix = backendConfig.getApiPrefix();

      // 清理URL，移除开头的斜杠
      const cleanUrl = url.replace(/^\/+/, "");

      // 确保不重复添加API前缀
      if (cleanUrl.startsWith(apiPrefix.replace(/^\/+/, ""))) {
        // 如果URL已经包含API前缀，直接使用
        requestUrl = `/${cleanUrl}`;
      } else {
        // 否则，添加API前缀
        requestUrl = `${apiPrefix}/${cleanUrl}`;
      }
    }

    // 添加详细日志，帮助诊断URL构建问题
    console.log(
      `发送${
        useProxy ? "代理" : "直接"
      }请求: ${method.toUpperCase()} ${requestUrl}`
    );

    // 当使用非代理模式时，记录完整的请求URL，便于调试
    if (!useProxy) {
      console.log(`完整请求URL: ${requestUrl}`);
    }

    // 使用配置的axios实例而不是全局axios
    const response = await axiosInstance({
      method,
      url: requestUrl,
      data,
      ...requestConfig,
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
    // 直接抛出错误，不使用模拟数据
    console.error(`API请求失败: ${method} ${url}`, error.message);
    throw error;
  }
};

// 导出API方法
export default {
  get: (url, params, headers = {}) => {
    return apiRequest("get", url, null, { params, headers });
  },

  post: (url, data, headers = {}) => {
    return apiRequest("post", url, data, { headers });
  },

  put: (url, data, headers = {}) => {
    return apiRequest("put", url, data, { headers });
  },

  delete: (url, headers = {}) => {
    return apiRequest("delete", url, null, { headers });
  },
  // 通用请求方法，支持完全自定义配置
  request: (config) => {
    const { method, url, data, params, headers = {}, ...otherConfig } = config;
    return apiRequest(method, url, data, { params, headers, ...otherConfig });
  },

  // 测试后端连接
  testBackendConnection,

  // 检查是否处于模拟模式（已删除模拟功能，始终返回false）
  isMockModeActive: () => {
    return false;
  },
  // 设置全局请求头（会应用到所有请求）
  setGlobalHeaders: (headers) => {
    // 过滤掉浏览器禁止的请求头
    const forbiddenHeaders = [
      "user-agent",
      "accept-charset",
      "accept-encoding",
      "access-control-request-headers",
      "access-control-request-method",
      "connection",
      "content-length",
      "cookie",
      "cookie2",
      "date",
      "dnt",
      "expect",
      "host",
      "keep-alive",
      "origin",
      "referer",
      "te",
      "trailer",
      "transfer-encoding",
      "upgrade",
      "via",
    ];

    const safeHeaders = {};
    Object.keys(headers).forEach((key) => {
      if (!forbiddenHeaders.includes(key.toLowerCase())) {
        safeHeaders[key] = headers[key];
      } else {
        console.warn(`跳过禁止的请求头: ${key}`);
      }
    });

    Object.assign(axiosInstance.defaults.headers.common, safeHeaders);
  },

  // 移除全局请求头
  removeGlobalHeaders: (headerNames) => {
    if (Array.isArray(headerNames)) {
      headerNames.forEach((name) => {
        delete axiosInstance.defaults.headers.common[name];
      });
    } else {
      delete axiosInstance.defaults.headers.common[headerNames];
    }
  },

  // 获取当前全局请求头
  getGlobalHeaders: () => {
    return { ...axiosInstance.defaults.headers.common };
  },
};
