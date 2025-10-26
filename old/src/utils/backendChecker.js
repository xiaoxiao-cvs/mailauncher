/**
 * 后端连接检查工具
 */
import backendConfig from "../config/backendConfig";

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
    const backendUrl = backendConfig.getBackendUrl();
    const response = await fetch(`${backendUrl}/api/v1/system/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 5000,
    });

    if (response.ok) {
      const data = await response.json();
      return data && data.status === "success";
    }
    return false;
  } catch (error) {
    console.warn("后端连接检查失败:", error.message);
    return false;
  }
};

/**
 * 开始连接重试
 * @param {Function} onSuccess 连接成功回调
 * @param {Function} onFailed 连接失败回调
 */
export const startConnectionRetry = (onSuccess, onFailed) => {
  if (retryInterval) {
    clearInterval(retryInterval);
  }

  retryCount = 0;

  const attemptConnection = async () => {
    console.log(`尝试连接后端 (${retryCount + 1}/${MAX_RETRY})`);

    const isConnected = await checkBackendConnection();

    if (isConnected) {
      console.log("后端连接成功");
      stopConnectionRetry();
      if (onSuccess && typeof onSuccess === "function") {
        onSuccess();
      }
      return;
    }

    retryCount++;
    if (retryCount >= MAX_RETRY) {
      console.error("后端连接失败，已达到最大重试次数");
      stopConnectionRetry();
      if (onFailed && typeof onFailed === "function") {
        onFailed();
      }
      return;
    }

    // 继续重试
    retryInterval = setTimeout(attemptConnection, RETRY_DELAY);
  };

  // 立即开始第一次尝试
  attemptConnection();
};

/**
 * 停止连接重试
 */
export const stopConnectionRetry = () => {
  if (retryInterval) {
    clearInterval(retryInterval);
    retryInterval = null;
  }
  retryCount = 0;
};

export default {
  checkBackendConnection,
  startConnectionRetry,
  stopConnectionRetry,
};
