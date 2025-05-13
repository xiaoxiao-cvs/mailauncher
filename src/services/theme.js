import { ref } from "vue";

// 主题颜色
const themeColors = {
  blue: "#4a7eff",
  green: "#42b983",
  purple: "#9370db",
  orange: "#e67e22",
  pink: "#e84393",
  teal: "#00b894",
};

// 使用深色模式
export const useDarkMode = (emitter = null) => {
  const darkMode = ref(false);

  // 初始化深色模式
  const initialize = () => {
    const savedDarkMode = localStorage.getItem("darkMode");

    if (savedDarkMode !== null) {
      darkMode.value = savedDarkMode === "true";
    } else {
      // 检查系统偏好
      darkMode.value = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
    }

    applyDarkMode(darkMode.value);
  };

  // 切换深色模式
  const toggleDarkMode = () => {
    darkMode.value = !darkMode.value;
    localStorage.setItem("darkMode", darkMode.value);
    applyDarkMode(darkMode.value);

    // 通知系统深色模式已更改
    if (emitter) {
      emitter.emit("dark-mode-changed", darkMode.value);
    }
  };

  // 应用深色模式
  const applyDarkMode = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add("dark-mode");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark-mode");
      document.documentElement.setAttribute("data-theme", "light");
    }
  };

  // 初始化
  initialize();

  return {
    darkMode,
    toggleDarkMode,
  };
};

// 使用主题色
export const useTheme = (emitter = null) => {
  const currentTheme = ref(localStorage.getItem("themeColor") || "blue");

  // 选择主题
  const selectTheme = (theme, color) => {
    currentTheme.value = theme;
    localStorage.setItem("themeColor", theme);

    applyThemeColor(color);

    // 通知主题色已更改
    if (emitter) {
      emitter.emit("theme-color-changed", color);
    }
  };

  return {
    currentTheme,
    themeColors,
    selectTheme,
  };
};

// 初始化主题
export const initTheme = () => {
  const savedTheme = localStorage.getItem("themeColor") || "blue";
  const color = themeColors[savedTheme] || themeColors.blue;

  applyThemeColor(color);

  // 保存当前主题色到全局变量
  window.currentThemeColor = color;
};

// 应用主题色
export const applyThemeColor = (color) => {
  document.documentElement.style.setProperty("--el-color-primary", color);
  document.documentElement.style.setProperty("--primary-color", color);

  // 生成主题色的亮色和暗色变体
  const lightenColor = adjustColorBrightness(color, 20);
  const darkenColor = adjustColorBrightness(color, -20);

  document.documentElement.style.setProperty("--primary-light", lightenColor);
  document.documentElement.style.setProperty("--primary-dark", darkenColor);

  // 图表颜色绑定到主题色
  document.documentElement.style.setProperty("--chart-line", color);
  document.documentElement.style.setProperty("--chart-secondary", lightenColor);
};

// 颜色亮度调整工具函数
const adjustColorBrightness = (hex, percent) => {
  // 将十六进制颜色转换为RGB
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);

  // 调整亮度
  r = Math.min(255, Math.max(0, Math.round(r + (r * percent) / 100)));
  g = Math.min(255, Math.max(0, Math.round(g + (g * percent) / 100)));
  b = Math.min(255, Math.max(0, Math.round(b + (b * percent) / 100)));

  // 转换回十六进制格式
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};
