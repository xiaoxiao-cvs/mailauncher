/**
 * API请求辅助工具
 * 用于处理API请求的公共逻辑
 */

/**
 * 格式化API路径，确保正确的格式
 * @param {string} path - API路径
 * @returns {string} 格式化后的API路径
 */
export const formatApiPath = (path) => {
  // 确保path以/开头
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  // 确保path不以/结尾（除非只有一个/）
  if (path.length > 1 && path.endsWith("/")) {
    path = path.substring(0, path.length - 1);
  }

  return path;
};

/**
 * 构建完整的API URL
 * @param {string} path - API路径
 * @param {object} params - 查询参数
 * @returns {string} 完整的API URL
 */
export const buildApiUrl = (path, params = null) => {
  const formattedPath = formatApiPath(path);
  let url = `/api${formattedPath}`;

  // 添加查询参数
  if (params) {
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        queryParams.append(key, value);
      }
    }
    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return url;
};

/**
 * 处理API错误
 * @param {Error} error - 错误对象
 * @returns {string} 格式化的错误信息
 */
export const handleApiError = (error) => {
  let errorMessage = "未知错误";
  let status, data;

  if (error.response) {
    status = error.response.status;
    data = error.response.data;

    if (status === 404) {
      errorMessage = "请求的资源不存在 (404)";
    } else if (status === 500) {
      errorMessage = "服务器内部错误 (500)";
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
      }
    }
  } else if (error.request) {
    // 请求已发出，但没有收到响应
    errorMessage = "服务器没有响应，请确认后端服务是否运行";
  } else {
    // 请求配置有问题
    errorMessage = `请求错误: ${error.message}`;
  }

  // 记录到控制台以便调试
  console.error("API错误:", error);
  console.error("格式化的错误信息:", errorMessage);

  return errorMessage;
};

export default {
  formatApiPath,
  buildApiUrl,
  handleApiError,
};
