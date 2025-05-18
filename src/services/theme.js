import { ref, watch } from "vue";

// 使用深色模式
export const useDarkMode = (emitter = null) => {
  const darkMode = ref(
    localStorage.getItem("darkMode") === "true" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // 切换深色模式
  const toggleDarkMode = () => {
    darkMode.value = !darkMode.value;
    localStorage.setItem("darkMode", darkMode.value);

    // 根据深色模式状态切换DaisyUI主题
    if (darkMode.value) {
      document.documentElement.classList.add("dark-mode");
      // 自动切换到深色主题
      const currentTheme = localStorage.getItem("theme");
      if (!["dark", "night", "dracula", "black"].includes(currentTheme)) {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
      }
    } else {
      document.documentElement.classList.remove("dark-mode");
      // 自动切换到浅色主题
      const currentTheme = localStorage.getItem("theme");
      if (["dark", "night", "dracula", "black"].includes(currentTheme)) {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("theme", "light");
      }
    }

    // 通知主题变化
    if (emitter) {
      emitter.emit("dark-mode-changed", darkMode.value);
    }
  };

  // 初始化深色模式
  if (darkMode.value) {
    document.documentElement.classList.add("dark-mode");
  } else {
    document.documentElement.classList.remove("dark-mode");
  }

  return {
    darkMode,
    toggleDarkMode,
  };
};

// 应用主题颜色
export const applyThemeColor = (color) => {
  if (!color) return;

  // 设置CSS变量
  document.documentElement.style.setProperty("--p", color); // DaisyUI主色
  document.documentElement.style.setProperty("--primary", color); // DaisyUI主色变量
  document.documentElement.style.setProperty("--primary-color", color); // 自定义主色变量

  // 为深色和浅色模式更新其他相关变量
  const isDark = document.documentElement.classList.contains("dark-mode");
  updateThemeColorVariables(color, isDark);
};

// 更新主题相关颜色变量
const updateThemeColorVariables = (color, isDark) => {
  try {
    // 引入颜色亮度调整函数
    const adjustColor = (hex, percent) => {
      let r = parseInt(hex.substring(1, 3), 16);
      let g = parseInt(hex.substring(3, 5), 16);
      let b = parseInt(hex.substring(5, 7), 16);

      r = Math.min(255, Math.max(0, Math.round(r + (r * percent) / 100)));
      g = Math.min(255, Math.max(0, Math.round(g + (g * percent) / 100)));
      b = Math.min(255, Math.max(0, Math.round(b + (b * percent) / 100)));

      return `#${r.toString(16).padStart(2, "0")}${g
        .toString(16)
        .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    };

    // 生成主题色的亮色和暗色变体
    const lightenColor = adjustColor(color, 20);
    const darkenColor = adjustColor(color, -20);

    document.documentElement.style.setProperty("--primary-light", lightenColor);
    document.documentElement.style.setProperty("--primary-dark", darkenColor);

    // 图表颜色绑定到主题色
    document.documentElement.style.setProperty("--chart-line", color);
    document.documentElement.style.setProperty(
      "--chart-secondary",
      lightenColor
    );
  } catch (error) {
    console.error("更新主题色变量失败:", error);
  }
};

// 初始化主题
export const initTheme = () => {
  // 获取保存的主题名称
  const savedTheme = localStorage.getItem("theme") || "light";

  // 设置文档的data-theme属性
  document.documentElement.setAttribute("data-theme", savedTheme);

  // 判断是否是深色主题
  const isDarkTheme = ["dark", "night", "dracula", "black"].includes(
    savedTheme
  );
  if (isDarkTheme) {
    document.documentElement.classList.add("dark-mode");
  }

  // 初始化主题色，可以从CSS变量中获取
  setTimeout(() => {
    // 等待DOM加载完成后获取计算后的CSS变量值
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor =
      computedStyle.getPropertyValue("--p").trim() ||
      computedStyle.getPropertyValue("--primary").trim();

    // 如果能获取到主色，就应用它
    if (primaryColor) {
      window.currentThemeColor = primaryColor;
      applyThemeColor(primaryColor);
    }
  }, 100);
};

// 使用主题
export const useTheme = () => {
  const currentTheme = ref(localStorage.getItem("theme") || "light");
  const availableThemes = ref([
    { name: "light", color: "#e5e7eb", label: "明亮" },
    { name: "dark", color: "#2a303c", label: "暗黑" },
    { name: "cupcake", color: "#65c3c8", label: "蛋糕" },
    { name: "bumblebee", color: "#e0a82e", label: "大黄蜂" },
    { name: "emerald", color: "#66cc8a", label: "翡翠" },
    { name: "corporate", color: "#4b6bfb", label: "企业" },
    { name: "synthwave", color: "#e779c1", label: "合成波" },
    { name: "retro", color: "#ef9995", label: "复古" },
    { name: "cyberpunk", color: "#ff7598", label: "赛博朋克" },
    { name: "valentine", color: "#e96d7b", label: "情人节" },
    { name: "halloween", color: "#f28c18", label: "万圣节" },
    { name: "garden", color: "#5c7f67", label: "花园" },
    { name: "forest", color: "#1eb854", label: "森林" },
    { name: "aqua", color: "#09ecf3", label: "水色" },
    { name: "lofi", color: "#808080", label: "低保真" },
    { name: "pastel", color: "#d1c1d7", label: "粉彩" },
    { name: "fantasy", color: "#6e0b75", label: "幻想" },
    { name: "wireframe", color: "#b8b8b8", label: "线框" },
    { name: "black", color: "#333333", label: "纯黑" },
    { name: "luxury", color: "#ffffff", label: "奢华" },
    { name: "dracula", color: "#ff79c6", label: "德古拉" },
    { name: "cmyk", color: "#45aeee", label: "印刷" },
    { name: "autumn", color: "#8C0327", label: "秋天" },
    { name: "business", color: "#1C4E80", label: "商务" },
    { name: "acid", color: "#FF00F4", label: "酸性" },
    { name: "lemonade", color: "#FFFF00", label: "柠檬水" },
    { name: "night", color: "#38bdf8", label: "夜晚" },
    { name: "coffee", color: "#DB924B", label: "咖啡" },
    { name: "winter", color: "#0EA5E9", label: "冬季" },
  ]);

  const savedTheme = localStorage.getItem("themeColor");

  const setTheme = (themeName) => {
    currentTheme.value = themeName;
    localStorage.setItem("theme", themeName);
    document.documentElement.setAttribute("data-theme", themeName);

    // 获取主题的主色调，并应用到variables中
    const theme = availableThemes.value.find((t) => t.name === themeName);
    if (theme) {
      applyThemeColor(theme.color);
    }
  };

  return {
    currentTheme,
    availableThemes,
    setTheme,
  };
};
