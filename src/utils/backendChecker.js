/**
 * 后端连接检查工具
 * 用于检测后端服务是否可用，并支持自动重试连接
 */
import axios from "axios";
import apiService from "../services/apiService";

let retryInterval = null;
let retryCount = 0;
const MAX_RETRY = 5;
const RETRY_DELAY = 5000; // 5秒

/**
 * 检查后端连接是否可用
 * @returns {Promise<boolean>} 后端是否可用
 */
export const checkBackendConnection = async () => {
  try {
    // 尝试对一个轻量级API端点发起请求
    const response = await axios.get("/api/health", {
      timeout: 3000,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    return response.status === 200;
  } catch (error) {
    console.warn("后端连接检查失败:", error.message);
    return false;
  }
};

/**
 * 开始连接重试
 * @param {Function} onSuccess 连接成功回调
 */
export const startConnectionRetry = (onSuccess) => {
  // 清除已有的重试计时器
  if (retryInterval) {
    clearInterval(retryInterval);
  }

  retryCount = 0;

  // 开始重试
  retryInterval = setInterval(async () => {
    retryCount++;
    console.log(`尝试连接后端 (${retryCount}/${MAX_RETRY})...`);

    const connected = await checkBackendConnection();

    if (connected) {
      console.log("后端连接成功!");
      clearInterval(retryInterval);

      // 禁用模拟数据模式
      apiService.disableMockMode();

      // 调用成功回调
      if (typeof onSuccess === "function") {
        onSuccess();
      }
    } else if (retryCount >= MAX_RETRY) {
      console.warn("达到最大重试次数，停止重试。");
      clearInterval(retryInterval);

      // 启用模拟数据模式
      apiService.enableMockMode();
    }
  }, RETRY_DELAY);
};

/**
 * 停止连接重试
 */
export const stopConnectionRetry = () => {
  if (retryInterval) {
    clearInterval(retryInterval);
    retryInterval = null;
  }
};

export default {
  checkBackendConnection,
  startConnectionRetry,
  stopConnectionRetry,
};
