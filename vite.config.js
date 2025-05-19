import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "url";

export default defineConfig({
  plugins: [vue()],
  server: {
    host: "0.0.0.0", // 设置为0.0.0.0使服务器可从局域网访问
    port: 5173, // 设置默认端口
    strictPort: false, // 如果端口被占用，自动尝试下一个可用端口
    open: true, // 启动时自动打开浏览器
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ["echarts"],
        },
      },
    },
  },
});
