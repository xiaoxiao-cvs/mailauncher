import { createApp } from "vue";
import App from "./App.vue";
import ElementPlus, { ElMessage } from "element-plus";
import "element-plus/dist/index.css";
import "./assets/global.css";
// 导入Tailwind CSS
import "./assets/tailwind.css";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import {
  checkBackendConnection,
  startConnectionRetry,
} from "./utils/backendChecker";

// 创建应用实例
const app = createApp(App);

// =======================================
// 注册所有Element Plus图标
// =======================================
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// =======================================
// CSS变量初始化
// =======================================
import "./assets/css/tailwind.css"; // 添加Tailwind CSS导入

const initCssVariables = () => {
  // 获取侧边栏状态
  const sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";

  // 设置CSS变量
  document.documentElement.style.setProperty(
    "--sidebar-width",
    sidebarCollapsed ? "64px" : "220px"
  );
  document.documentElement.style.setProperty(
    "--content-margin",
    sidebarCollapsed ? "79px" : "235px"
  );
  document.documentElement.style.setProperty(
    "--content-width",
    sidebarCollapsed ? "calc(100% - 64px)" : "calc(100% - 220px)"
  );

  // 保存侧边栏状态到全局，供组件访问
  window.sidebarState = {
    collapsed: sidebarCollapsed,
    toggle: () => {
      const appRoot = document.getElementById("app");
      const newState = !window.sidebarState.collapsed;
      window.sidebarState.collapsed = newState;

      if (appRoot) {
        if (newState) {
          appRoot.classList.add("sidebar-collapsed");
        } else {
          appRoot.classList.remove("sidebar-collapsed");
        }

        // 触发窗口resize事件，以便图表等组件可以正确调整尺寸
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
        }, 300);
      }

      // 触发自定义事件，通知侧边栏状态变化
      window.dispatchEvent(new CustomEvent("sidebar-state-changed"));
    },
  };

  // 初始化DOM类名
  const appRoot = document.getElementById("app");
  if (appRoot) {
    if (sidebarCollapsed) {
      appRoot.classList.add("sidebar-collapsed");
    } else {
      appRoot.classList.remove("sidebar-collapsed");
    }
  }
};

// =======================================
// 系统功能模拟
// =======================================

// 创建一个性能监控API
const createPerformanceAPI = () => {
  return {
    getSystemMetrics: async () => {
      try {
        // 如果实际的electronAPI可用，使用它
        // 修复递归调用问题：确保我们不是在引用自己创建的electronAPI
        if (
          window.electronAPI &&
          typeof window.electronAPI.getSystemMetrics === "function" &&
          window.electronAPI !== window._electronAPI // 防止自引用
        ) {
          return await window.electronAPI.getSystemMetrics();
        }
      } catch (e) {
        console.warn("原生electronAPI调用失败，使用模拟数据", e);
      }

      // 返回模拟数据
      return {
        cpu: {
          usage: Math.random() * 30 + 20,
          cores: 8,
          frequency: 2400,
          model: "CPU 模拟数据",
        },
        memory: {
          total: 16 * 1024 * 1024 * 1024,
          used: (Math.random() * 4 + 6) * 1024 * 1024 * 1024,
          free: 6 * 1024 * 1024 * 1024,
        },
        network: {
          sent: Math.random() * 5000 * 1024,
          received: Math.random() * 8000 * 1024,
          sentRate: Math.random() * 300 * 1024,
          receivedRate: Math.random() * 500 * 1024,
        },
      };
    },
  };
};

// 添加API拦截器
const setupApiMock = () => {
  // 保存原始fetch方法
  const originalFetch = window.fetch;

  // 替换fetch方法，拦截API请求
  window.fetch = async function (resource, options) {
    // 检查是否是API请求且需要使用模拟数据
    if (typeof resource === "string" && resource.startsWith("/api/")) {
      // 检查我们是否应该使用模拟数据
      const useMock =
        window._useMockData ||
        window.localStorage.getItem("useMockData") === "true";

      if (useMock) {
        console.log(`[模拟] 请求: ${resource}`);
        return mockApiResponse(resource, options);
      }

      try {
        const response = await originalFetch.apply(this, arguments);
        return response;
      } catch (error) {
        console.warn(
          `API请求失败 (${resource}): ${error.message}，切换到模拟数据`
        );
        window._useMockData = true;
        window.localStorage.setItem("useMockData", "true");

        // 显示友好提示
        ElMessage({
          message: "API连接失败，已切换到模拟数据模式",
          type: "warning",
          duration: 3000,
        });

        // 模拟API响应
        return mockApiResponse(resource, options);
      }
    }

    // 否则使用原始fetch
    return originalFetch.apply(this, arguments);
  };
};

// 模拟API响应
function mockApiResponse(url, options = {}) {
  return new Promise((resolve) => {
    // 模拟网络延迟
    setTimeout(() => {
      let responseData = { success: true };

      // 根据不同URL返回不同的模拟数据
      if (url.includes("/api/status")) {
        responseData = {
          mongodb: { status: "running", info: "本地实例 (固定数据)" },
          napcat: { status: "running", info: "端口 8095 (固定数据)" },
          nonebot: { status: "stopped", info: "" },
          maibot: { status: "stopped", info: "" },
        };
      } else if (url.includes("/api/instances")) {
        responseData = {
          instances: [
            {
              name: "maibot-stable-1",
              status: "running",
              installedAt: "2023-08-15",
              path: "D:\\MaiBot\\stable-1",
              services: {
                napcat: "running",
                nonebot: "running",
              },
              version: "stable",
            },
            {
              name: "maibot-beta-1",
              status: "stopped",
              installedAt: "2023-09-10",
              path: "D:\\MaiBot\\beta-1",
              services: {
                napcat: "stopped",
                nonebot: "stopped",
              },
              version: "beta",
            },
            {
              name: "maibot-v0.6.3-1",
              status: "running",
              installedAt: "2023-10-05",
              path: "D:\\MaiBot\\v0.6.3-1",
              services: {
                napcat: "running",
                nonebot: "stopped",
              },
              version: "v0.6.3",
            },
          ],
        };
      } else if (url.includes("/api/versions")) {
        responseData = {
          versions: ["latest", "beta", "stable", "v0.6.3", "v0.6.2", "v0.6.1"],
        };
      } else if (url.includes("/api/deploy/")) {
        responseData = {
          success: true,
          message: "模拟部署成功",
          instanceName: "maibot-simulated",
        };
      } else if (url.includes("/api/install/")) {
        responseData = {
          success: true,
          inProgress: false,
          message: "模拟安装完成",
        };
      } else if (url.includes("/api/logs/")) {
        responseData = {
          logs: [
            {
              time: "2023-10-15 12:00:00",
              level: "INFO",
              message: "系统日志记录启动",
              source: "system",
            },
            {
              time: "2023-10-15 12:01:00",
              level: "WARNING",
              message: "您正在使用固定数据模式",
              source: "system",
            },
            {
              time: "2023-10-15 12:02:00",
              level: "INFO",
              message: "启动后端服务可获取真实数据",
              source: "system",
            },
          ],
        };
      }

      // 处理模拟POST请求
      if (options.method === "POST") {
        if (url.includes("/api/install/configure")) {
          responseData = {
            success: true,
            message: "模拟配置已提交",
          };
        } else if (url.includes("/api/start/")) {
          responseData = {
            success: true,
            message: "模拟启动成功",
          };
        } else if (url.includes("/api/stop")) {
          responseData = {
            success: true,
            message: "模拟停止成功",
          };
        }
      }

      // 返回模拟响应
      resolve({
        ok: true,
        json: () => Promise.resolve(responseData),
        text: () => Promise.resolve(JSON.stringify(responseData)),
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
      });
    }, 10); // 将延迟减少到最小，避免等待
  });
}

// =======================================
// 应用初始化
// =======================================

// 初始化应用
const initApp = () => {
  // 初始化CSS变量
  initCssVariables();

  // 使用Element Plus
  app.use(ElementPlus);

  // 全局错误处理
  app.config.errorHandler = (err, vm, info) => {
    console.error("Vue错误:", err);
    console.error("错误信息:", info);
  };

  // 全局异常处理
  window.addEventListener("unhandledrejection", (event) => {
    console.error("未处理的Promise拒绝:", event.reason);
  });

  // 创建并提供性能监控API
  const performanceAPI = createPerformanceAPI();
  app.provide("electronAPI", performanceAPI);
  app.config.globalProperties.$electronAPI = performanceAPI;

  // 如果没有原生electronAPI，提供模拟版本
  if (!window.electronAPI) {
    try {
      // 修复：先创建API实例，再定义属性
      const performanceAPIInstance = createPerformanceAPI();

      // 保存一个引用到全局变量，以便检测自引用
      window._electronAPI = performanceAPIInstance;

      Object.defineProperty(window, "electronAPI", {
        value: performanceAPIInstance,
        writable: false,
        configurable: true,
      });
      console.log("electronAPI 接口成功模拟");
    } catch (e) {
      console.warn("无法定义 electronAPI:", e);
      // 备用方案
      window._electronAPI = createPerformanceAPI();
    }
  }

  // 检查API连接状态并自动重试连接
  checkInitialBackendConnection();

  // 设置API模拟
  setupApiMock();

  // 添加状态监听
  window.addEventListener("mock-mode-initialized", () => {
    console.log("应用初始化完成，正在使用模拟数据模式...");
    // 这里可以添加模拟数据模式下的初始化逻辑
  });

  // 挂载应用
  app.mount("#app");
};

// 检查初始后端连接
const checkInitialBackendConnection = async () => {
  // 显示正在初始化的通知
  const loadingNotification = ElMessage({
    message: "正在初始化应用...",
    type: "info",
    duration: 2000,
    showClose: false,
  });

  // 后端已从项目移出，直接启用模拟数据模式
  window._useMockData = true;
  window.localStorage.setItem("useMockData", "true");

  // 显示友好的提示
  setTimeout(() => {
    ElMessage({
      message: "应用启动完成，使用模拟数据模式运行",
      type: "success",
      duration: 3000,
    });
  }, 2500);

  // 触发模拟数据模式下的应用初始化
  setTimeout(() => {
    window.dispatchEvent(new Event("mock-mode-initialized"));
  }, 500);
};

// 启动应用
initApp();

// 设置模拟数据为默认模式
localStorage.setItem("useMockData", "true");
window._useMockData = true;
console.log("应用已配置为使用模拟数据模式");

// 添加侧边栏状态同步
window.addEventListener("sidebar-state-changed", () => {
  const sidebarCollapsed = localStorage.getItem("sidebarExpanded") !== "true";

  // 更新CSS变量
  document.documentElement.style.setProperty(
    "--sidebar-width",
    sidebarCollapsed ? "64px" : "220px"
  );
  document.documentElement.style.setProperty(
    "--content-margin",
    sidebarCollapsed ? "79px" : "235px"
  );
  document.documentElement.style.setProperty(
    "--content-width",
    sidebarCollapsed ? "calc(100% - 64px)" : "calc(100% - 220px)"
  );

  console.log("侧边栏状态已同步:", sidebarCollapsed ? "折叠" : "展开");
});
