import { createApp } from "vue";
import App from "./App.vue";
import "./assets/css/tailwind.css";
import "./assets/global.css";
import toastService from "./services/toastService";

// 导入Iconify
import { Icon } from "@iconify/vue";

// 导入主题初始化函数
import { initTheme } from "./services/theme";

// 创建应用实例
const app = createApp(App);

// 全局注册Iconify组件
app.component("Icon", Icon);

// 全局提供toast服务
app.provide("toast", toastService);

// 也作为全局属性
app.config.globalProperties.$toast = toastService;

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
};

// 初始化CSS变量
initCssVariables();

// 挂载应用
app.mount("#app");
