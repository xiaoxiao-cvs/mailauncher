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

/**
 * 应用主题颜色
 * @param {string} color 颜色值
 */
export function applyThemeColor(color) {
  try {
    // 检查颜色格式是否有效
    if (!color || typeof color !== "string") {
      console.error("无效的颜色格式:", color);
      return;
    }

    // 如果颜色是HSL格式的字符串(例如: "58.92% 0.199 134.6")
    if (color.includes("%") || color.split(" ").length === 3) {
      try {
        // 尝试将其转换为有效的HSL格式
        const parts = color.replace(/%/g, "").trim().split(/\s+/);
        if (parts.length === 3) {
          const h = parseFloat(parts[2]) || 0; // 色相
          const s = parseFloat(parts[1]) || 0; // 饱和度
          const l = parseFloat(parts[0]) / 100 || 0; // 亮度

          // 构建正确的CSS HSL格式字符串
          const hslColor = `hsl(${h}, ${s * 100}%, ${l * 100}%)`;

          // 设置CSS变量
          document.documentElement.style.setProperty(
            "--primary-color",
            hslColor
          );
          document.documentElement.style.setProperty(
            "--p",
            `${h} ${s * 100}% ${l * 100}%`
          );

          console.log("应用HSL颜色:", hslColor);
          return;
        }
      } catch (err) {
        console.error("解析HSL颜色时出错:", err);
      }
    }

    // 处理Hex颜色
    if (color.startsWith("#")) {
      document.documentElement.style.setProperty("--primary-color", color);

      // 转换Hex为HSL
      const { h, s, l } = hexToHSL(color);
      document.documentElement.style.setProperty("--p", `${h} ${s}% ${l}%`);

      console.log("应用Hex颜色:", color, `转换为HSL: ${h} ${s}% ${l}%`);
      return;
    }

    // 处理CSS颜色名称
    document.documentElement.style.setProperty("--primary-color", color);
    console.log("应用CSS颜色名称:", color);
  } catch (e) {
    console.error("应用颜色主题时发生错误:", e);
  }
}

/**
 * 将十六进制颜色转换为HSL格式
 * @param {string} hex 十六进制颜色
 * @returns {object} 包含h, s, l属性的对象
 */
function hexToHSL(hex) {
  // 确保hex格式正确
  hex = hex.replace(/^#/, "");

  // 将hex转换为RGB
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16) / 255;
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16) / 255;
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16) / 255;
  } else {
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  }

  // 计算HSL值
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // 灰色
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h = Math.round(h * 60);
  }

  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return { h, s, l };
}

// 更新主题颜色逻辑
export function updateThemeColors(primaryColor) {
  try {
    // 如果是无效颜色,使用默认值
    if (!primaryColor || typeof primaryColor !== "string") {
      primaryColor = "#3b82f6"; // 默认蓝色
    }

    // 保存颜色到localStorage
    localStorage.setItem("themeColor", primaryColor);

    // 应用颜色
    applyThemeColor(primaryColor);

    // 触发颜色变化事件
    window.dispatchEvent(
      new CustomEvent("theme-color-change", {
        detail: { color: primaryColor },
      })
    );
  } catch (err) {
    console.error("更新主题颜色时出错:", err);
  }
}

// 初始化主题
export function initTheme() {
  try {
    // 获取保存的颜色设置
    const savedColor = localStorage.getItem("themeColor") || "#3b82f6";

    // 添加一个小延迟,确保DOM已完全加载
    setTimeout(() => {
      updateThemeColors(savedColor);
    }, 0);
  } catch (err) {
    console.error("初始化主题时出错:", err);
    // 使用默认颜色
    applyThemeColor("#3b82f6");
  }
}

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
