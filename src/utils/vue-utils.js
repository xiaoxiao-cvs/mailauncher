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
 * 通用API错误处理函数
 * @param {Error} error - Axios错误对象
 * @param {Object} options - 处理选项
 * @param {boolean} options.showMessage - 是否显示错误消息
 * @param {number} options.duration - 错误消息显示时长
 * @returns {string} 格式化后的错误消息
 */
export const handleApiError = (error, options = {}) => {
  let errorMessage = "未知错误";

  if (error.response) {
    const { status, data } = error.response;

    if (status === 404) {
      errorMessage = "请求的资源不存在 (404)";
    } else if (status === 500) {
      errorMessage = "服务器内部错误 (500)";
    } else if (status === 401) {
      errorMessage = "未授权的请求 (401)";
    } else if (status === 403) {
      errorMessage = "禁止访问此资源 (403)";
    } else if (status === 400) {
      errorMessage = "请求参数错误 (400)";
    } else {
      errorMessage = `API错误 (${status})`;
    }

    // 添加服务器返回的详细信息
    if (data) {
      if (typeof data === "string") {
        errorMessage += `: ${data}`;
      } else if (data.detail) {
        errorMessage += `: ${data.detail}`;
      } else if (data.message) {
        errorMessage += `: ${data.message}`;
      } else if (data.error) {
        errorMessage += `: ${data.error}`;
      }
    }
  } else if (error.request) {
    errorMessage = "服务器没有响应，请确认后端服务是否运行";
  } else {
    errorMessage = `请求错误: ${error.message}`;
  }

  // 记录到控制台以便调试
  console.error("API错误:", error);
  console.error("格式化的错误信息:", errorMessage);

  // 显示错误消息
  if (options.showMessage) {
    // 使用自定义toast而不是Element UI
    const toast = document.createElement("div");
    toast.className = "toast toast-top toast-end";
    toast.innerHTML = `
      <div class="alert alert-error">
        <span>${errorMessage}</span>
      </div>
    `;
    document.body.appendChild(toast);

    // 设置显示时长
    setTimeout(() => {
      document.body.removeChild(toast);
    }, options.duration || 5000);
  }

  // 返回错误消息，使调用方可以处理
  return errorMessage;
};

/**
 * 格式化日期时间
 * @param {Date|string} date - 日期对象或日期字符串
 * @param {string} format - 格式化模板
 * @returns {string} 格式化后的日期时间字符串
 */
export const formatDateTime = (date, format = "YYYY-MM-DD HH:mm:ss") => {
  if (!date) return "";

  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  return format
    .replace("YYYY", year)
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hours)
    .replace("mm", minutes)
    .replace("ss", seconds);
};

/**
 * 格式化字节大小
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的大小
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export default {
  handleApiError,
  formatDateTime,
  formatBytes,
};
