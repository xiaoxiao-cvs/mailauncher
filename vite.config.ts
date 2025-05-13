import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { fileURLToPath } from "url";

// 获取当前文件的目录路径
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    // 保留代理配置但添加注释说明
    proxy: {
      "/api": {
        // 注意：实际后端已移出项目，此处为前端模拟模式提供支持
        // 如果想连接真实后端，请修改下面的target
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM == "windows" ? "chrome105" : "safari13",
    minify: process.env.TAURI_ENV_DEBUG ? false : ("esbuild" as "esbuild"),
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
}));
