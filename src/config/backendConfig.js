/**
 * 后端配置
 * 从后端的config.toml提取的配置
 */

const backendConfig = {
  // 后端服务配置 - 支持动态设置
  server: {
    host: "127.0.0.1", // 默认本地回环地址
    port: 23456, // 默认后端端口号
    api_prefix: "/api/v1", // API前缀
  },

  // 调试配置
  debug: {
    level: "INFO",
  },
  // 设置后端服务器地址
  setBackendServer(host, port = 23456) {
    this.server.host = host;
    this.server.port = port;
    // 保存到localStorage
    localStorage.setItem("backendHost", host);
    localStorage.setItem("backendPort", port.toString());

    // 动态更新axios实例的baseURL
    // 延迟导入以避免循环依赖
    setTimeout(() => {
      import("../services/apiService.js").then((module) => {
        if (module.updateAxiosBaseURL) {
          module.updateAxiosBaseURL();
        }
      });
    }, 0);
  },

  // 从localStorage加载配置
  loadFromStorage() {
    const savedHost = localStorage.getItem("backendHost");
    const savedPort = localStorage.getItem("backendPort");

    if (savedHost) {
      this.server.host = savedHost;
    }
    if (savedPort) {
      this.server.port = parseInt(savedPort, 10);
    }
  },

  // 获取完整的后端API地址
  getBackendUrl() {
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
