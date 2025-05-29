/**
 * 后端连接检查工具
 * 注意：后端已移出项目，此模块现用于管理模拟数据模式 1111111
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
    // 由于后端已从项目移出，始终返回false
    console.log("后端连接检查：使用模拟数据模式");
    return false;

    /* 
    注释odl
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
  // 由于始终使用模拟数据，直接调用成功回调
  if (onSuccess && typeof onSuccess === "function") {
    setTimeout(() => {
      console.log("模拟数据模式已激活");
      onSuccess();
    }, 500);
  }
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
