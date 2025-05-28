const { defineConfig } = require("@vue/cli-service");

module.exports = defineConfig({
  transpileDependencies: true,

  // 开发服务器配置
  devServer: {
    // 允许局域网访问
    host: "0.0.0.0",
    port: 8080,

    // 配置代理，将API请求转发到后端
    proxy: {
      "/api/v1": {
        target: `http://localhost:23456`,
        changeOrigin: true,
        ws: true, // 支持websocket
      },
    },

    // 允许所有源的请求
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  },

  // 生产环境配置
  publicPath: process.env.NODE_ENV === "production" ? "./" : "/",
});
