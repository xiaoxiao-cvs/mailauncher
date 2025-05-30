/**
 * 后端配置
 * 从后端的config.toml提取的配置
 */

const backendConfig = {
  // 后端服务配置 - 固定端口23456
  server: {
    host: "127.0.0.1", // 固定使用本地回环地址
    port: 23456, // 固定后端端口号
    api_prefix: "/api/v1", // API前缀
  },

  // 调试配置
  debug: {
    level: "INFO",
  },
  // 获取完整的后端API地址
  getBackendUrl() {
    // 固定返回后端地址，不再依赖代理
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
