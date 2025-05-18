import { createApp } from "vue";
import App from "./App.vue";
import "./assets/global.css";
// 导入Tailwind CSS
import "./assets/tailwind.css";
import {
  checkBackendConnection,
  startConnectionRetry,
} from "./utils/backendChecker";

// 导入Iconify
import { Icon } from "@iconify/vue";

// 创建应用实例
const app = createApp(App);

// 全局注册Iconify组件
app.component("Icon", Icon);

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
        window.dispatchEvent(new Event("resize"));
      }
    },
  };
};

// 初始化CSS变量
initCssVariables();

// 挂载应用
app.mount("#app");

// 检查后端连接 - 保留后端检查功能
checkBackendConnection();
