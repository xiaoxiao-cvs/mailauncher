// 在所有其他导入之前导入 polyfill
import setupNodePolyfills from "./utils/node-polyfill.js";
setupNodePolyfills();

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./assets/tailwind.css";
import "./assets/global.css";
import toastService from "./services/toastService";
import eventBus from "./services/eventBus"; // 导入改进的事件总线

// 导入Iconify
import { Icon } from "@iconify/vue";

// 导入主题初始化函数
import { initTheme } from "./services/theme";

// 导入轮询服务
import { usePollingStore } from "./stores/pollingStore";

// 导入测试工具（开发模式）
import "./utils/pollingTest.js";
import "./utils/verifyPollingFix.js"; // 添加修复验证工具
import "./utils/testDashboardFix.js"; // 添加仪表盘修复测试工具
import "./utils/finalVerification.js"; // 添加最终验证工具

// 创建应用实例
const app = createApp(App);

// 创建并使用Pinia状态管理
const pinia = createPinia();
app.use(pinia);

// 全局注册Iconify组件
app.component("Icon", Icon);

// 全局提供toast服务
app.provide("toast", toastService);

// 全局提供事件总线
app.provide("emitter", eventBus);

// 初始化主题
initTheme();

// =======================================
// CSS变量初始化与主题系统集成
// =======================================
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

  // 初始化主题
  initTheme();

  // 初始化布局密度
  const layoutDensity = localStorage.getItem("layoutDensity") || "comfortable";
  document.documentElement.setAttribute("data-density", layoutDensity);

  // 初始化字体大小
  const fontSize = localStorage.getItem("fontSize") || "14";
  document.documentElement.style.setProperty(
    "--base-font-size",
    `${fontSize}px`
  );

  // 初始化动画设置
  const animationsEnabled =
    localStorage.getItem("animationsEnabled") !== "false";
  if (!animationsEnabled) {
    document.documentElement.classList.add("no-animations");
  }

  // 保存侧边栏状态到全局，供组件访问
  window.sidebarState = {
    collapsed: sidebarCollapsed,
    toggle: () => {
      const appRoot = document.getElementById("app");
      const newState = !window.sidebarState.collapsed;
      window.sidebarState.collapsed = newState;
      localStorage.setItem("sidebarCollapsed", newState);

      document.documentElement.style.setProperty(
        "--sidebar-width",
        newState ? "64px" : "220px"
      );

      document.documentElement.style.setProperty(
        "--content-margin",
        newState ? "79px" : "235px"
      );

      document.documentElement.style.setProperty(
        "--content-width",
        newState ? "calc(100% - 64px)" : "calc(100% - 220px)"
      );

      if (appRoot) {
        if (newState) {
          appRoot.classList.add("sidebar-collapsed");
        } else {
          appRoot.classList.remove("sidebar-collapsed");
        }

        // 触发窗口resize事件，以便图表等组件可以正确调整尺寸
        window.dispatchEvent(new Event("resize"));
      }
    },
  };

  // 初始化主题色
  try {
    // 设置默认主题色
    const defaultColor = "#3b82f6"; // 默认蓝色

    // 尝试获取保存的主题色
    const savedColor = localStorage.getItem("themeColor") || defaultColor;

    // 安全地应用主题色
    if (typeof savedColor === "string") {
      // 如果保存的是HSL格式
      if (savedColor.includes("%") || savedColor.split(" ").length === 3) {
        console.log("检测到HSL格式色值,直接使用默认色值");
        document.documentElement.style.setProperty(
          "--primary-color",
          defaultColor
        );
      } else {
        document.documentElement.style.setProperty(
          "--primary-color",
          savedColor
        );
      }
    } else {
      // 如果savedColor不是字符串,使用默认色
      document.documentElement.style.setProperty(
        "--primary-color",
        defaultColor
      );
    }
  } catch (err) {
    console.error("初始化主题色失败:", err);
  }
};

// 初始化CSS变量
initCssVariables();

// 挂载应用前确保旧的事件监听器已被清除
eventBus.clear();

// 异步初始化轮询服务，然后挂载应用
const initAndMountApp = async () => {
  try {
    // 确保轮询服务正确初始化
    const pollingStore = usePollingStore();
    await pollingStore.initializeDefaultPolling();
    console.log("✅ 轮询服务初始化完成");
  } catch (error) {
    console.error("❌ 轮询服务初始化失败:", error);
  }

  // 挂载应用
  app.mount("#app");
  console.log("✅ 应用挂载完成");
};

// 启动应用
initAndMountApp();
