/**
 * 后端连接检查器
 * 用于检查后端服务是否可用并提供自动重试功能
 */

import { ElMessage } from 'element-plus';

// 全局变量定义
const TIMEOUT = 5000; // 5秒超时
const CHECK_INTERVAL = 5000; // 5秒重试间隔
const MAX_RETRIES = 12; // 最多重试12次

let isChecking = false;
let wasEverConnected = false;
let onConnectedCallback = null;
let retryCount = 0;
let checkTimer = null;

/**
 * 检查后端连接
 * @param {Function} onConnected - 连接成功时的回调
 * @param {boolean} showNotifications - 是否显示通知
 * @returns {Promise<boolean>} 连接状态
 */
export const checkBackendConnection = async (onConnected = null, showNotifications = true) => {
  
  // 正在检查中，不重复发起请求
  if (isChecking) return false;
  
  isChecking = true;
  let connected = false;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    console.log('尝试检查后端连接...');
    
    // 使用简单的健康检查API
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('后端健康检查响应:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('健康检查数据:', data);
      
      connected = true;
      window._useMockData = false;
      window.localStorage.setItem('useMockData', 'false');
      
      // 现在连接成功，但之前断开过，显示重新连接消息
      if (wasEverConnected && showNotifications) {
        if (window.ElMessage) {  // 确保ElMessage已加载
          window.ElMessage.success({
            message: '已重新连接至后端服务',
            duration: 3000
          });
        }
      }
      
      // 执行连接成功回调
      if (onConnected) {
        onConnected();
      }
      
      // 重置重试计数
      retryCount = 0;
      wasEverConnected = true;
    } else {
      connected = false;
      console.error('健康检查失败，状态码:', response.status);
      
      // 尝试读取错误信息
      try {
        const errorData = await response.json();
        console.error('错误详情:', errorData);
      } catch (parseError) {
        console.error('无法解析错误响应');
      }
      
      enableMockMode('后端服务返回错误状态码: ' + response.status);
    }
  } catch (error) {
    connected = false;
    console.error('健康检查请求失败:', error);
    enableMockMode(error.name === 'AbortError' ? '连接超时' : error.message);
  } finally {
    isChecking = false;
  }
  
  return connected;
};

/**
 * 启用模拟数据模式
 * @param {string} reason - 原因描述
 */
const enableMockMode = (reason) => {
  // 如果已经在模拟模式，不重复显示消息
  if (window._useMockData === true) return;
  
  window._useMockData = true;
  window.localStorage.setItem('useMockData', 'true');
  
  // 添加日志以便调试
  console.warn(`已启用模拟数据模式: ${reason}`);
};

/**
 * 启动自动重试连接
 * @param {Function} onConnected - 连接成功时的回调
 */
export const startConnectionRetry = (onConnected = null) => {
  // 清除已有的重试计时器
  if (checkTimer) {
    clearInterval(checkTimer);
  }
  
  // 存储回调
  if (onConnected) {
    onConnectedCallback = onConnected;
  }
  
  // 立即执行一次检查
  checkBackendConnection();
  
  // 设置重试计时器
  checkTimer = setInterval(async () => {
    // 如果已连接，不需要重试
    if (!window._useMockData) {
      clearInterval(checkTimer);
      checkTimer = null;
      return;
    }
    
    // 达到最大重试次数，停止重试
    if (retryCount >= MAX_RETRIES) {
      console.warn('后端连接重试次数已达上限，不再尝试连接');
      clearInterval(checkTimer);
      checkTimer = null;
      return;
    }
    
    console.log(`尝试重新连接后端服务 (${retryCount + 1}/${MAX_RETRIES})...`);
    retryCount++;
    
    const connected = await checkBackendConnection();
    if (connected) {
      console.log('后端服务连接成功，停止重试');
      clearInterval(checkTimer);
      checkTimer = null;
    }
  }, CHECK_INTERVAL);
  
  // 返回清理函数
  return () => {
    if (checkTimer) {
      clearInterval(checkTimer);
      checkTimer = null;
    }
  };
};

/**
 * 停止连接重试
 */
export const stopConnectionRetry = () => {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
  retryCount = 0;
};

/**
 * 一次性检查API端点可用性
 * @param {string} endpoint - 要检查的API端点
 * @returns {Promise<boolean>} 端点是否可用
 */
export const checkApiEndpoint = async (endpoint) => {
  try {
    console.log(`检查API端点: ${endpoint}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const available = response.ok;
    console.log(`API端点 ${endpoint} 可用性: ${available ? '可用' : '不可用'}`);
    return available;
  } catch (error) {
    console.error(`API端点 ${endpoint} 检查失败:`, error);
    return false;
  }
};

export default {
  checkBackendConnection,
  startConnectionRetry,
  stopConnectionRetry,
  checkApiEndpoint
};
