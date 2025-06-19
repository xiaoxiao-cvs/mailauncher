/**
 * 后端配置
 * 从后端的config.toml提取的配置
 */

const backendConfig = {
  // 后端服务配置 - 支持动态设置
  server: {
    host: "127.0.0.1", // 默认本地回环地址
    port: 23456, // 修正为正确的后端端口号
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

  // 获取完整的API URL（包含API前缀和路径）
  getFullUrl(path = "") {
    // 确保路径以/开头
    if (path && !path.startsWith("/")) {
      path = "/" + path;
    }
    return `${this.server.api_prefix}${path}`;
  },
  // 测试后端连接
  async testConnection() {
    try {
      const response = await fetch(`${this.getBackendUrl()}/api/v1/version/current`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      console.error('后端连接测试失败:', error);
      return false;
    }
  },

  // 自动检测可用的后端端口
  async autoDetectBackend() {
    const possiblePorts = [23456, 5000, 8000, 3000];
    
    for (const port of possiblePorts) {
      try {
        const testUrl = `http://${this.server.host}:${port}/api/v1/version/current`;
        const response = await fetch(testUrl, {
          method: 'GET',
          timeout: 2000
        });
        
        if (response.ok) {
          console.log(`发现后端服务运行在端口: ${port}`);
          this.setBackendServer(this.server.host, port);
          return true;
        }
      } catch (error) {
        // 继续尝试下一个端口
        continue;
      }
    }
    
    console.warn('未找到可用的后端服务');
    return false;
  },
};

// 立即加载存储的配置
backendConfig.loadFromStorage();

export default backendConfig;
