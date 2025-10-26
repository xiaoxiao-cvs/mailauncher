import { ref, watch } from "vue";

// 导入超级性能主题服务
let ultraThemeService = null;
import('../services/ultraPerformanceTheme.js').then(module => {
  ultraThemeService = module.default;
});

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
    } // 立即应用颜色
    updateThemeColors(savedColor);

    // 如果是暗色模式，修复文本颜色
    if (currentTheme === "dark") {
      // 立即执行一次
      fixDarkModeTextColor();

      // 页面完全加载后再执行一次，确保处理所有动态内容
      window.addEventListener("DOMContentLoaded", () => {
        setTimeout(fixDarkModeTextColor, 200);
      });
    }
  } catch (err) {
    console.error("初始化主题时出错:", err);
    // 使用默认颜色
    applyThemeColor("#3b82f6");
  }
}

/**
 * 性能优化的暗色模式文本颜色修复函数
 * 减少DOM查询和操作的次数
 */
export function fixDarkModeTextColor() {
  if (document.documentElement.getAttribute("data-theme") !== "dark") {
    return;
  }

  // 使用更精确的选择器，避免大量DOM查询
  const selectors = [
    '[style*="color: black"]',
    '[style*="color:#000"]', 
    '[style*="color: #000"]',
    '[style*="color:black"]',
    '[style*="color: rgb(0, 0, 0)"]'
  ];

  // 批量处理，减少重绘次数
  requestAnimationFrame(() => {
    let fixedCount = 0;
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        // 检查是否真的需要修改
        const currentColor = element.style.color;
        if (currentColor && (currentColor.includes('black') || currentColor.includes('#000') || currentColor.includes('rgb(0, 0, 0)'))) {
          element.style.color = "rgba(255, 255, 255, 0.87)";
          fixedCount++;
        }
      });
    });

    if (fixedCount > 0) {
      console.log(`已修复 ${fixedCount} 个黑色文本元素`);
    }
  });
}

// 使用主题配置
export const useTheme = () => {
  const currentTheme = ref(localStorage.getItem("theme") || "light");
  // DaisyUI的主题列表 - 只保留明暗色主题
  const availableThemes = ref([
    { name: "light", label: "明亮", color: "#FFFFFF" },
    { name: "dark", label: "深色", color: "#2a303c" },
  ]);  // 超级性能优化的主题设置函数
  const setTheme = (themeName) => {
    if (!themeName) return;

    // 检查当前主题，如果没有变化则不重复操作
    const currentDomTheme = document.documentElement.getAttribute("data-theme");
    if (currentDomTheme === themeName && currentTheme.value === themeName) {
      console.log(`主题已经是 ${themeName}，不需要重复设置`);
      return;
    }

    // 优先使用超级性能服务
    if (ultraThemeService) {
      console.log(`使用超级性能服务切换主题: ${themeName}`);
      ultraThemeService.switchThemeUltraFast(themeName).then(() => {
        currentTheme.value = themeName;
        localStorage.setItem("theme", themeName);
        localStorage.setItem("darkMode", (themeName === "dark").toString());
        
        // 触发事件
        window.dispatchEvent(
          new CustomEvent("theme-changed", { detail: { theme: themeName } })
        );
      });
      return;
    }

    console.log(`设置主题: ${themeName}`, new Date().toISOString());

    // 激进优化：完全禁用过渡和动画
    const style = document.createElement('style');
    style.id = 'theme-switch-disable';
    style.textContent = `
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
        will-change: auto !important;
      }
    `;
    document.head.appendChild(style);

    // 使用多重 requestAnimationFrame 确保异步执行
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // 批量设置CSS变量（最快的方式）
        const root = document.documentElement;
        if (themeName === 'dark') {
          root.style.setProperty('--theme-bg-primary', '#1a1d23');
          root.style.setProperty('--theme-text-primary', 'rgba(255, 255, 255, 0.87)');
          root.style.setProperty('--theme-border', '#343a40');
        } else {
          root.style.setProperty('--theme-bg-primary', '#ffffff');
          root.style.setProperty('--theme-text-primary', '#000000');
          root.style.setProperty('--theme-border', '#dee2e6');
        }

        // 立即应用主题到根元素
        root.setAttribute("data-theme", themeName);
        document.body.setAttribute("data-theme", themeName);

        // 批量处理容器元素 - 使用缓存的选择器结果
        const containers = document.querySelectorAll(
          ".app-container, .content-area, .settings-drawer-container, .home-view, .instances-panel"
        );
        
        const isDarkTheme = themeName === "dark";
        
        // 超级批量操作 - 减少DOM访问
        const elementsToUpdate = [root, document.body, ...containers];
        const classesToAdd = isDarkTheme ? ['dark-mode', 'theme-dark'] : ['theme-light'];
        const classesToRemove = isDarkTheme ? ['theme-light'] : ['dark-mode', 'theme-dark'];

        // 单次遍历完成所有操作
        elementsToUpdate.forEach((el) => {
          el.setAttribute("data-theme", themeName);
          el.classList.remove(...classesToRemove);
          el.classList.add(...classesToAdd);
        });

        // 存储到localStorage
        localStorage.setItem("theme", themeName);
        localStorage.setItem("darkMode", isDarkTheme.toString());
        currentTheme.value = themeName;

        // 移除禁用样式，恢复过渡
        setTimeout(() => {
          const disableStyle = document.getElementById('theme-switch-disable');
          if (disableStyle) {
            disableStyle.remove();
          }
        }, 30);

        // 触发主题更改事件
        window.dispatchEvent(
          new CustomEvent("theme-changed", { detail: { theme: themeName } })
        );

        // 延迟处理非关键操作
        setTimeout(() => {
          // 只在暗色模式下进行文本修复
          if (themeName === "dark") {
            fixDarkModeTextColor();
          }

          window.dispatchEvent(
            new CustomEvent("theme-changed-after", { detail: { theme: themeName } })
          );
        }, 50);
      });
    });
  };

  return {
    currentTheme,
    availableThemes,
    setTheme,
  };
};
