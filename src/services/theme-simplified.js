import { ref, watch } from "vue";

// 全局主题状态 - 确保所有组件使用同一个响应式状态
const globalThemeState = ref(localStorage.getItem("theme") || "light");

// 使用DaisyUI兼容的深色模式
export const useDarkMode = (emitter = null) => {
  const darkMode = ref(
    localStorage.getItem("darkMode") === "true" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // 切换深色模式
  const toggleDarkMode = () => {
    console.log("切换深色模式:", !darkMode.value, new Date().toISOString());
    darkMode.value = !darkMode.value;
    localStorage.setItem("darkMode", darkMode.value);

    // 直接使用DaisyUI主题切换
    const newTheme = darkMode.value ? "dark" : "light";
    setTheme(newTheme);

    // 通知主题变化
    if (emitter) {
      emitter.emit("dark-mode-changed", darkMode.value);
    }
  };

  return {
    darkMode,
    toggleDarkMode,
  };
};

// 简化的主题设置函数，完全兼容DaisyUI
export function setTheme(themeName) {
  if (!themeName || !["light", "dark"].includes(themeName)) {
    themeName = "light";
  }

  console.log("设置主题:", themeName);

  // 更新全局状态
  globalThemeState.value = themeName;

  // 设置DaisyUI主题属性
  document.documentElement.setAttribute("data-theme", themeName);
  document.body.setAttribute("data-theme", themeName);

  // 更新存储
  localStorage.setItem("theme", themeName);

  // 设置暗色模式类（为了兼容现有CSS）
  if (themeName === "dark") {
    document.documentElement.classList.add("dark-mode");
    document.body.classList.add("dark-mode");
  } else {
    document.documentElement.classList.remove("dark-mode");
    document.body.classList.remove("dark-mode");
  }

  // 触发主题变更事件
  window.dispatchEvent(
    new CustomEvent("theme-changed", { detail: { theme: themeName } })
  );

  console.log("主题已设置:", themeName);
}

// 初始化主题
export function initTheme() {
  try {
    // 获取当前主题
    const currentTheme =
      localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");

    // 更新全局状态
    globalThemeState.value = currentTheme;

    // 应用主题
    setTheme(currentTheme);

    console.log("主题初始化完成:", currentTheme);
  } catch (err) {
    console.error("初始化主题时出错:", err);
    // 使用默认主题
    globalThemeState.value = "light";
    setTheme("light");
  }
}

// 使用主题配置
export const useTheme = () => {
  // 返回全局主题状态，确保所有组件使用同一个响应式状态
  const currentTheme = globalThemeState;

  // DaisyUI的主题列表 - 只保留明暗色主题
  const availableThemes = ref([
    { name: "light", label: "明亮", color: "#FFFFFF" },
    { name: "dark", label: "深色", color: "#2a303c" },
  ]);

  // 设置主题
  const setThemeFunction = (themeName) => {
    if (!themeName) return;

    // 检查当前主题，如果没有变化则不重复操作
    const currentDomTheme = document.documentElement.getAttribute("data-theme");
    if (currentDomTheme === themeName) {
      console.log("主题未变化，跳过设置:", themeName);
      return;
    }

    console.log("主题变更:", currentTheme.value, "->", themeName);

    // 直接调用全局setTheme函数
    setTheme(themeName);
  };

  return {
    currentTheme,
    availableThemes,
    setTheme: setThemeFunction,
  };
};

// 主题色彩应用函数（简化版，不干扰DaisyUI）
export function applyThemeColor(color) {
  if (!color) return;

  // 只设置自定义CSS变量，不干扰DaisyUI
  try {
    localStorage.setItem("themeColor", color);
    document.documentElement.style.setProperty("--custom-theme-color", color);
    console.log("已设置自定义主题色:", color);
  } catch (error) {
    console.error("设置主题色时出错:", error);
  }
}

// 更新主题颜色（简化版）
export function updateThemeColors(primaryColor) {
  if (primaryColor) {
    applyThemeColor(primaryColor);
  }
}
