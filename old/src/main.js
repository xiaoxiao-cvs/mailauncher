// 在所有其他导入之前导入 polyfill
import setupNodePolyfills from "./utils/node-polyfill.js";
setupNodePolyfills();

// 导入ECharts错误处理器
import { setupGlobalErrorHandler } from "./utils/chartErrorHandler.js";

// 设置全局错误处理器
setupGlobalErrorHandler();

// 全局错误处理器 - 用于捕获ECharts等库的错误
window.addEventListener('error', (event) => {
  // 检查是否是ECharts相关错误
  const isEChartsError = (event.filename && event.filename.includes('echarts')) ||
    (event.error && event.error.message && event.error.message.toLowerCase().includes('echarts')) ||
    (event.message && event.message.toLowerCase().includes('echarts'));
    
  if (isEChartsError) {
    console.error('ECharts Error:', {
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      error: event.error
    });
    
    // 提供更详细的错误信息和解决建议
    if (event.message.includes("Cannot read properties of undefined (reading 'type')")) {
      console.warn('ECharts 数据错误: 检查传入的数据对象是否包含正确的 type 属性');
      console.warn('解决方案:');
      console.warn('1. 确保所有series对象都有type属性（如"bar", "line"等）');
      console.warn('2. 检查图表数据是否完整且格式正确');
      console.warn('3. 验证图表配置选项中的series数组不为空');
      console.warn('4. 确保在图表数据加载完成后再初始化图表');
    }
    
    // 阻止错误继续传播到控制台（可选）
    event.preventDefault();
    return true;
  }
});

// 处理未捕获的Promise拒绝
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.toString().toLowerCase().includes('echarts')) {
    console.error('ECharts Promise Error:', event.reason);
    console.warn('建议检查异步图表操作的错误处理');
    event.preventDefault();
  }
});

// 初始化 Tauri（如果在 Tauri 环境中）
let isTauriApp = false;
try {
  if (typeof window !== 'undefined' && window.__TAURI__) {
    isTauriApp = true;
    console.log("🔌 检测到 Tauri 环境");
  }
} catch (error) {
  console.log("📱 运行在浏览器环境");
}

// 导入路径修复工具（开发环境调试用）
import './utils/pathFixHelper.js';

// 全局配置被动事件监听器以提高页面响应性
// 这将解决 ECharts 和其他库的滚轮事件监听器警告
if (typeof window !== "undefined") {
  // 重写 addEventListener 方法来默认使用被动监听器
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    // 对于滚轮相关事件，默认使用被动监听器
    if (["wheel", "mousewheel", "touchstart", "touchmove"].includes(type)) {
      if (typeof options === "boolean") {
        options = { capture: options, passive: true };
      } else if (typeof options === "object" && options !== null) {
        options = { ...options, passive: true };
      } else {
        options = { passive: true };
      }
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
}

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./assets/css/tailwind.css";
import "./assets/global.css";
import "./assets/css/select-fix.css"; // 下拉框文字显示修复
import "./assets/css/ultimate-performance-theme.css"; // 终极性能主题样式（最高优先级）
import "./assets/css/theme-performance-optimized.css"; // 性能优化的主题样式
import "./assets/css/enhanced-light-theme.css"; // 增强亮色主题
import "./assets/css/sidebar-enhanced.css"; // 侧边栏增强样式
import "./assets/css/global-components-enhanced.css"; // 全局组件增强样式
import "./assets/css/page-specific-enhanced.css"; // 页面特定增强样式
import "./assets/css/clean-theme.css"; // 使用清理版本的主题样式，兼容DaisyUI
import "./assets/css/dark-theme-unified.css"; // 统一的暗色主题修复
import "./assets/css/font-optimization.css"; // 导入字体优化样式
import toastService from "./services/toastService";
import eventBus from "./services/eventBus"; // 导入改进的事件总线

// 导入Iconify
import { Icon } from "@iconify/vue";

// 导入主题初始化函数
import { initTheme } from "./services/theme-simplified";

// 导入优化的主题引擎
import { optimizedTheme } from "./services/optimizedThemeEngine";

// 导入轮询服务
import { usePollingStore } from "./stores/pollingStore";

// 导入后端配置
import backendConfig from "./config/backendConfig";

// 导入全局错误处理器
import globalErrorHandler from "./services/globalErrorHandler";

// 导入下拉框修复工具
import "./utils/selectFixUtil.js";

// 导入下拉框诊断工具（开发环境）
import "./utils/selectDiagnosticTool.js";

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

  // 初始化主题（使用原有的初始化保持兼容性）
  initTheme();
  
  // 启动优化的主题引擎
  console.log('🚀 优化主题引擎已启动');
  console.log('📊 当前主题状态:', optimizedTheme.getPerformanceStats());

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

  // 保存 Tauri 状态到全局
  window.isTauriApp = isTauriApp;

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
  console.log("🚀 初始化应用...");
  try {
    // 初始化后端配置
    backendConfig.loadFromStorage();
    console.log("✅ 后端配置加载完成");

    // 自动检测后端服务
    console.log("🔍 检测后端服务...");
    const backendAvailable = await backendConfig.autoDetectBackend();
    if (backendAvailable) {
      console.log("✅ 后端服务检测成功");
    } else {
      console.warn("⚠️ 未检测到后端服务，将使用默认配置");
    }    // 确保轮询服务配置正确，但不立即初始化
    // 轮询将在App.vue组件挂载时启动
    console.log("✅ 轮询服务配置完成");
  } catch (error) {
    console.error("❌ 服务初始化失败:", error);
  }

  // 挂载应用
  app.mount("#app");
  console.log("✅ 应用挂载完成");
};

// 初始化全局错误处理
globalErrorHandler.init();

// 将全局错误处理器挂载到window对象，以便在组件中使用
window.globalErrorHandler = globalErrorHandler;

// 启动应用
initAndMountApp();
