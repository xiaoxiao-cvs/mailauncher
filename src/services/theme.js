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

        // 重新获取主题色并应用
        setTimeout(() => updateThemeColors(), 50);
      }
    } else {
      document.documentElement.classList.remove("dark-mode");
      // 自动切换到浅色主题
      const currentTheme = localStorage.getItem("theme");
      if (["dark", "night", "dracula", "black"].includes(currentTheme)) {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("theme", "light");

        // 重新获取主题色并应用
        setTimeout(() => updateThemeColors(), 50);
      }
    }

    // 通知主题变化
    if (emitter) {
      emitter.emit("dark-mode-changed", darkMode.value);
    }

    // 触发全局事件，让其他组件能够响应主题切换
    window.dispatchEvent(
      new CustomEvent("theme-mode-changed", {
        detail: { isDark: darkMode.value },
      })
    );
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

  // 检查颜色格式
  if (!isValidColor(color)) {
    console.warn("尝试应用无效的颜色格式:", color);
    return;
  }

  // 设置CSS变量
  document.documentElement.style.setProperty("--p", color); // DaisyUI主色
  document.documentElement.style.setProperty("--primary", color); // DaisyUI主色变量
  document.documentElement.style.setProperty("--primary-color", color); // 自定义主色变量

  // 为深色和浅色模式更新其他相关变量
  const isDark = document.documentElement.classList.contains("dark-mode");
  updateThemeColorVariables(color, isDark);

  // 保存当前主题色
  window.currentThemeColor = color;

  // 分发全局主题色变化事件
  window.dispatchEvent(
    new CustomEvent("theme-color-changed", { detail: color })
  );
};

// 检查颜色格式是否有效
const isValidColor = (color) => {
  // 检查是否为十六进制颜色
  if (typeof color === "string" && /^#([0-9A-F]{3}){1,2}$/i.test(color)) {
    return true;
  }

  // 检查是否为hsl格式 (DaisyUI使用)
  if (typeof color === "string" && color.startsWith("hsl(")) {
    return true;
  }

  return false;
};

// 更新主题相关颜色变量
const updateThemeColorVariables = (color, isDark) => {
  try {
    // 如果是HSL格式，转换为十六进制
    let hexColor = color;
    if (color.startsWith("hsl(")) {
      hexColor = hslToHex(color);
    }

    // 使用十六进制颜色进行亮度调整
    const lightenColor = adjustColorBrightness(hexColor, 20);
    const darkenColor = adjustColorBrightness(hexColor, -20);

    document.documentElement.style.setProperty("--primary-light", lightenColor);
    document.documentElement.style.setProperty("--primary-dark", darkenColor);

    // 设置DaisyUI衍生变量
    document.documentElement.style.setProperty("--pf", darkenColor);
    document.documentElement.style.setProperty(
      "--pc",
      isDark ? "#000" : "#fff"
    );
  } catch (error) {
    console.error("更新主题颜色变量时出错:", error);
  }
};

// HSL转换为十六进制颜色
const hslToHex = (hslColor) => {
  try {
    // 从hsl(x y% z)格式提取值
    const hslRegex =
      /hsl\(\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)(?:%|\s*)\)/i;
    const match = hslColor.match(hslRegex);

    if (!match) {
      throw new Error("无效的HSL格式: " + hslColor);
    }

    let h = parseFloat(match[1]);
    let s = parseFloat(match[2]) / 100;
    let l = parseFloat(match[3]) / 100;

    // HSL转RGB算法
    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let m = l - c / 2;
    let r = 0,
      g = 0,
      b = 0;

    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 60 && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 180 && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 240 && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else {
      r = c;
      g = 0;
      b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } catch (error) {
    console.error("HSL转换为十六进制颜色时出错:", error);
    return "#570df8"; // 返回DaisyUI默认主色
  }
};

// 颜色亮度调整函数
export const adjustColorBrightness = (hex, percent) => {
  if (!hex || typeof hex !== "string") {
    console.error("无效的颜色格式", hex);
    return hex || "#570df8"; // 返回默认颜色
  }

  // 支持hsl格式
  if (hex.startsWith("hsl(")) {
    try {
      hex = hslToHex(hex);
    } catch (error) {
      console.error("转换HSL到HEX失败:", error);
      return "#570df8"; // 返回默认主色
    }
  }

  // 确保是有效的十六进制颜色格式
  if (!hex.startsWith("#") || ![4, 7].includes(hex.length)) {
    console.error("无效的十六进制颜色格式", hex);
    return "#570df8";
  }

  try {
    // 将简写的十六进制颜色扩展为完整形式
    if (hex.length === 4) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }

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
  } catch (error) {
    console.error("调整颜色亮度时出错:", error);
    return hex;
  }
};

// 获取当前主题颜色
const updateThemeColors = () => {
  try {
    const computedStyle = getComputedStyle(document.documentElement);

    // 获取主题色
    const primaryColor = computedStyle.getPropertyValue("--p").trim();

    if (primaryColor) {
      // 检查颜色格式，如果需要，进行转换
      if (primaryColor.startsWith("hsl(")) {
        // 将HSL转换为HEX以便进行亮度调整
        const hexColor = hslToHex(primaryColor);
        applyThemeColor(hexColor);
      } else {
        applyThemeColor(primaryColor);
      }
    }
  } catch (error) {
    console.error("获取主题颜色时出错:", error);
  }
};

// 初始化主题
export const initTheme = () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  // 应用保存的主题色
  const savedThemeColor = localStorage.getItem("themeColor");
  if (savedThemeColor) {
    // 直接设置CSS变量，但不调用applyThemeColor
    // 因为initTheme后会调用updateThemeColors
    document.documentElement.style.setProperty("--p", savedThemeColor);
    document.documentElement.style.setProperty("--primary", savedThemeColor);
    document.documentElement.style.setProperty(
      "--primary-color",
      savedThemeColor
    );
  }

  // 延迟调用updateThemeColors，确保DaisyUI的主题已经应用
  setTimeout(() => updateThemeColors(), 100);
};

// 使用主题配置
export const useTheme = () => {
  const currentTheme = ref(localStorage.getItem("theme") || "light");

  // DaisyUI的主题列表
  const availableThemes = ref([
    { name: "light", label: "明亮", color: "#FFFFFF" },
    { name: "dark", label: "深色", color: "#2a303c" },
    { name: "cupcake", label: "杯子蛋糕", color: "#faf7f5" },
    { name: "bumblebee", label: "大黄蜂", color: "#fde68a" },
    { name: "emerald", label: "祖母绿", color: "#10b981" },
    { name: "corporate", label: "企业", color: "#4b6bfb" },
    { name: "synthwave", label: "合成波", color: "#e779c1" },
    { name: "retro", label: "复古", color: "#ef9995" },
    { name: "cyberpunk", label: "赛博朋克", color: "#ff7598" },
    { name: "valentine", label: "情人节", color: "#e96d7b" },
    { name: "halloween", label: "万圣节", color: "#f28c18" },
    { name: "garden", label: "花园", color: "#5c7f67" },
    { name: "forest", label: "森林", color: "#1eb854" },
    { name: "aqua", label: "水色", color: "#09ecf3" },
    { name: "lofi", label: "低保真", color: "#808080" },
    { name: "pastel", label: "柔和", color: "#d1c1d7" },
    { name: "fantasy", label: "幻想", color: "#6e0b75" },
    { name: "wireframe", label: "线框", color: "#b8b8b8" },
    { name: "black", label: "纯黑", color: "#000000" },
    { name: "luxury", label: "奢华", color: "#171618" },
    { name: "dracula", label: "德古拉", color: "#ff79c6" },
    { name: "cmyk", label: "CMYK", color: "#45AEEE" },
    { name: "autumn", label: "秋天", color: "#D8A25B" },
    { name: "business", label: "商务", color: "#1C4E80" },
    { name: "acid", label: "酸性", color: "#FF00FF" },
    { name: "lemonade", label: "柠檬水", color: "#FFFF00" },
    { name: "night", label: "夜晚", color: "#192437" },
    { name: "coffee", label: "咖啡", color: "#6F4E37" },
    { name: "winter", label: "冬天", color: "#D0F0F7" },
  ]);

  // 设置主题
  const setTheme = (themeName) => {
    if (!themeName) return;

    document.documentElement.setAttribute("data-theme", themeName);
    localStorage.setItem("theme", themeName);
    currentTheme.value = themeName;

    // 检查是否是深色主题
    const isDarkTheme = ["dark", "night", "dracula", "black"].includes(
      themeName
    );

    // 同步darkMode状态
    if (
      isDarkTheme &&
      !document.documentElement.classList.contains("dark-mode")
    ) {
      document.documentElement.classList.add("dark-mode");
      localStorage.setItem("darkMode", "true");
    } else if (
      !isDarkTheme &&
      document.documentElement.classList.contains("dark-mode")
    ) {
      document.documentElement.classList.remove("dark-mode");
      localStorage.setItem("darkMode", "false");
    }

    // 更新主题颜色
    updateThemeColors();

    // 触发主题更改事件
    window.dispatchEvent(
      new CustomEvent("theme-changed", { detail: { theme: themeName } })
    );
  };

  return {
    currentTheme,
    availableThemes,
    setTheme,
  };
};
