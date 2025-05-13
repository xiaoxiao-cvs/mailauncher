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

    return Promise.reject(error);
  }
);

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
      const response = await apiClient.get(url, { params });
      return response.data;
    } catch (error) {
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
      const response = await apiClient.post(url, data);
      return response.data;
    } catch (error) {
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
};

export default apiService;
