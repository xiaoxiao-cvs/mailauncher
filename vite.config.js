import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // 服务器配置
  server: {
    port: 1420,
    strictPort: true,
    // 添加代理配置以支持模拟后端API
    proxy: {
      // 如果需要代理API请求到其他服务器，可以在这里配置
    },
  },
  // 构建选项
  build: {
    outDir: "dist",
    assetsDir: "assets",
    // 确保能够正确处理动态导入
    rollupOptions: {
      output: {
        manualChunks: {
          "element-plus": ["element-plus"],
        },
      },
    },
  },
});
