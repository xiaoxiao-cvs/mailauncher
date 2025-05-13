/**
 * Vue 工具函数
 * 这个文件主要用于处理Vue 3相关的辅助函数和工具方法
 */

/**
 * 创建一个防抖函数
 * @param {Function} fn 要执行的函数
 * @param {number} delay 延迟时间 (毫秒)
 * @returns {Function} 防抖后的函数
 */
export const debounce = (fn, delay = 300) => {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

/**
 * 创建一个节流函数
 * @param {Function} fn 要执行的函数
 * @param {number} limit 限制时间 (毫秒)
 * @returns {Function} 节流后的函数
 */
export const throttle = (fn, limit = 300) => {
  let lastCall = 0; // 添加 lastCall 变量
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
};

/**
 * 通用 API 错误处理函数
 * @param {Error} error 错误对象
 */
export const handleApiError = (error) => {
  if (error.response) {
    console.error(
      `API 请求失败: ${error.response.status} - ${
        error.response.data.detail || "未知错误"
      }`
    );
    alert(`请求失败: ${error.response.data.detail || "服务器错误"}`);
  } else if (error.request) {
    console.error("API 请求未收到响应:", error.request);
    alert("请求未收到响应，请检查网络连接或服务器状态。");
  } else {
    console.error("API 请求配置错误:", error.message);
    alert(`请求配置错误: ${error.message}`);
  }
};
