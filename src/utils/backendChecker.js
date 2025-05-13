/**
 * 后端连接检查工具
 * 注意：后端已移出项目，此模块现用于管理模拟数据模式
 */
import axios from "axios";
import apiService from "../services/apiService";

let retryInterval = null;
let retryCount = 0;
const MAX_RETRY = 5;
const RETRY_DELAY = 5000; // 5秒

/**
 * 检查后端连接是否可用
 * 注意：由于后端已移出项目，此函数总是返回false
 * @returns {Promise<boolean>} 后端是否可用
 */
export const checkBackendConnection = async () => {
  try {
    // 添加日志说明
    console.log("后端连接检查：后端已从项目移出，将始终使用模拟数据模式");

    // 由于没有真实后端，始终返回false表示连接失败
    return false;

    // 以下代码已不再执行，保留作为参考
    /*
    const timestamp = new Date().getTime();
    const response = await axios.get(`/api/health?_t=${timestamp}`, {
      timeout: 3000,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "X-Backend-Check": "true",
      },
    });

    // 检查响应是否为模拟数据
    const isValidResponse = 
      response.status === 200 && 
      response.data && 
      typeof response.data === 'object' &&
      response.data.status === 'ok' &&
      !response.data.isMock;

    if (!isValidResponse) {
      console.warn("后端连接检查：收到响应但格式不符合预期或为模拟数据");
      return false;
    }

    console.log("后端连接检查成功，确认后端服务在线");
    return true;
    */
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

  // 由于后端已移除，不再需要重试连接
  console.log("由于后端已从项目移出，启用模拟数据模式");

  // 直接启用模拟数据模式
  apiService.enableMockMode();

  // 不实际启动重试，因为没有真实的后端
  /*
  retryCount = 0;
  retryInterval = setInterval(async () => {
    retryCount++;
    console.log(`尝试连接后端 (${retryCount}/${MAX_RETRY})...`);
    const connected = await checkBackendConnection();
    if (connected) {
      console.log("后端连接成功!");
      clearInterval(retryInterval);
      apiService.disableMockMode();
      if (typeof onSuccess === "function") {
        onSuccess();
      }
    } else if (retryCount >= MAX_RETRY) {
      console.warn("达到最大重试次数，停止重试。");
      clearInterval(retryInterval);
      apiService.enableMockMode();
    }
  }, RETRY_DELAY);
  */
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
