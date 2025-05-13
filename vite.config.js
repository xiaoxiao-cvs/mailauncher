import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { spawn } from "child_process";
import fs from "fs";
import { fileURLToPath } from "url";

// 启动后端服务
let backendProcess = null;
const logger = console;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shownErrors = new Set();

// 启动后端服务的函数
function startBackendServer() {
  // 检查Python可执行文件
  const pythonCommand = process.platform === "win32" ? "python" : "python3";
  const backendDir = path.join(__dirname, "..", "backend");
  const mainScript = path.join(backendDir, "main.py");

  // 检查后端脚本是否存在
  if (!fs.existsSync(mainScript)) {
    logger.warn(`后端脚本不存在: ${mainScript}`);
    return null;
  }

  logger.info(`正在启动后端服务: ${pythonCommand} ${mainScript}`);

  try {
    // 启动后端进程
    const proc = spawn(pythonCommand, [mainScript], {
      stdio: "pipe",
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      cwd: backendDir,
    });

    // 处理后端输出
    proc.stdout.on("data", (data) => {
      logger.info(`[后端] ${data.toString().trim()}`);
    });

    // 添加错误处理
    proc.stderr.on("data", (data) => {
      logger.error(`[后端错误] ${data.toString().trim()}`);
    });

    // 添加进程退出处理
    proc.on("exit", (code) => {
      logger.info(`[后端] 进程退出，退出码: ${code}`);
    });

    // 处理进程退出
    proc.on("exit", (code) => {
      logger.info(`后端进程退出，退出码: ${code}`);
      backendProcess = null;
    });

    proc.on("error", (err) => {
      logger.error(`后端进程启动错误: ${err.message}`);
      backendProcess = null;
    });

    return proc;
  } catch (error) {
    logger.error(`启动后端失败: ${error.message}`);
    return null;
  }
}

// 在开发配置中启动后端
if (process.env.NODE_ENV !== "production") {
  // 先检查是否已存在运行中的后端进程
  if (!backendProcess) {
    backendProcess = startBackendServer();
  }

  // 处理进程退出，确保后端正确关闭
  process.on("exit", () => {
    if (backendProcess) {
      backendProcess.kill();
    }
  });

  process.on("SIGINT", () => {
    if (backendProcess) {
      backendProcess.kill();
    }
    process.exit();
  });
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
