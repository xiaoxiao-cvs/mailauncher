import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

// 使用正确的ESM方式来定义配置
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // 移除对 postcss.config.js 的直接引用
  // Vite 会自动检测项目根目录下的 postcss.config.js
});
