/**
 * 后端配置
 * 从后端的config.toml提取的配置
 */

const backendConfig = {
  // 后端服务配置
  server: {
    host: "localhost", // 从后端config.toml提取的主机名
    port: 23456, // 从后端config.toml提取的端口号
    api_prefix: "/api/v1", // 从后端config.toml提取的API前缀
  },

  // 调试配置
  debug: {
    level: "INFO",
  },

  // 获取完整的后端API地址
  getBackendUrl() {
    // 修复：确保始终返回完整的后端地址
    // 在开发环境下，如果需要使用代理，可以通过环境变量控制
    const useProxy = import.meta.env.VITE_USE_PROXY === "true";

    if (useProxy) {
      return ""; // 使用代理时返回空字符串
    }

    return `http://${this.server.host}:${this.server.port}`;
  },

  // 获取完整的API前缀
  getApiPrefix() {
    return this.server.api_prefix;
  },

  // 构建完整的API URL
  getFullUrl(path) {
    // 确保路径格式正确
    if (!path.startsWith("/")) {
      path = "/" + path;
    }
    return this.server.api_prefix + path;
  },
};

export default backendConfig;
