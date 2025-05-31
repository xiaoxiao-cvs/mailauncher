import { ref, watch } from "vue";

// 使用深色模式
export const useDarkMode = (emitter = null) => {
  const darkMode = ref(
    localStorage.getItem("darkMode") === "true" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
  ); // 切换深色模式
  const toggleDarkMode = () => {
    console.log("切换深色模式:", !darkMode.value, new Date().toISOString());
    darkMode.value = !darkMode.value;
    localStorage.setItem("darkMode", darkMode.value);

    // 使用统一的主题设置方法，避免重复DOM操作
    const newTheme = darkMode.value ? "dark" : "light";

    // 由于我们会调用setTheme，这里不需要直接操作DOM
    localStorage.setItem("theme", newTheme);

    // 调用统一的主题设置函数
    setTheme(newTheme);

    // 立即应用主题色
    updateThemeColors();

    // 通知主题变化 (setTheme中已经触发了全局事件)
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

    // 获取当前主题
    const currentTheme =
      localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");

    // 立即应用主题到HTML和body元素
    document.documentElement.setAttribute("data-theme", currentTheme);
    document.body.setAttribute("data-theme", currentTheme);

    // 设置暗色模式类
    if (currentTheme === "dark") {
      document.documentElement.classList.add("dark-mode");
      document.body.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
      document.body.classList.remove("dark-mode");
    }

    // 立即应用颜色
    updateThemeColors(savedColor);
  } catch (err) {
    console.error("初始化主题时出错:", err);
    // 使用默认颜色
    applyThemeColor("#3b82f6");
  }
}

// 使用主题配置
export const useTheme = () => {
  const currentTheme = ref(localStorage.getItem("theme") || "light");
  // DaisyUI的主题列表 - 只保留明暗色主题
  const availableThemes = ref([
    { name: "light", label: "明亮", color: "#FFFFFF" },
    { name: "dark", label: "深色", color: "#2a303c" },
  ]); // 设置主题
  const setTheme = (themeName) => {
    if (!themeName) return;

    // 检查当前主题，如果没有变化则不重复操作
    const currentDomTheme = document.documentElement.getAttribute("data-theme");
    if (currentDomTheme === themeName && currentTheme.value === themeName) {
      console.log(`主题已经是 ${themeName}，不需要重复设置`);
      return;
    }

    console.log(`设置主题: ${themeName}`, new Date().toISOString());

    // 立即应用主题，不等待任何过渡
    document.documentElement.setAttribute("data-theme", themeName);
    document.body.setAttribute("data-theme", themeName); // 同时应用到body

    // 应用到所有主要容器元素，确保主题得到广泛应用
    document
      .querySelectorAll(
        ".app-container, .content-area, .settings-drawer-container, .home-view, .instances-panel"
      )
      .forEach((el) => {
        el.setAttribute("data-theme", themeName);
      });

    localStorage.setItem("theme", themeName);
    currentTheme.value = themeName; // 检查是否是深色主题
    const isDarkTheme = themeName === "dark";

    // 同步darkMode状态并应用到所有主要容器
    if (isDarkTheme) {
      document.documentElement.classList.add("dark-mode");
      document.body.classList.add("dark-mode");
      document
        .querySelectorAll(
          ".app-container, .content-area, .home-view, .instances-panel"
        )
        .forEach((el) => {
          el.classList.add("dark-mode", "theme-dark");
          el.classList.remove("theme-light");
        });
      localStorage.setItem("darkMode", "true");
    } else {
      document.documentElement.classList.remove("dark-mode");
      document.body.classList.remove("dark-mode");
      document
        .querySelectorAll(
          ".app-container, .content-area, .home-view, .instances-panel"
        )
        .forEach((el) => {
          el.classList.remove("dark-mode", "theme-dark");
          el.classList.add("theme-light");
        });
      localStorage.setItem("darkMode", "false");
    }

    // 强制浏览器重新计算样式
    void document.documentElement.offsetHeight;

    // 对所有UI组件强制刷新应用主题
    document.querySelectorAll('[class*="settings-"]').forEach((el) => {
      // 重新应用样式
      if (el.classList.contains("settings-drawer-container")) {
        el.style.backgroundColor = `hsl(var(--b1) / 1)`;
        el.style.opacity = "1";
      }
    });

    // 触发主题更改事件 - 立即执行处理
    window.dispatchEvent(
      new CustomEvent("theme-changed", { detail: { theme: themeName } })
    );

    // 避免多次触发和事件循环
    clearTimeout(window.themeChangeTimeout);
    window.themeChangeTimeout = setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("theme-changed-after", { detail: { theme: themeName } })
      );
    }, 100);
  };

  return {
    currentTheme,
    availableThemes,
    setTheme,
  };
};
