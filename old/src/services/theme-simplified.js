import { ref, watch } from "vue";

// 全局主题状态 - 确保所有组件使用同一个响应式状态，默认亮色主题
const globalThemeState = ref(localStorage.getItem("theme") === "dark" ? "dark" : "light");

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

// 简化的主题设置函数，完全兼容DaisyUI，确保CSS变量立即生效
export function setTheme(themeName) {
  if (!themeName || !["light", "dark"].includes(themeName)) {
    themeName = "light";
  }

  // 检查当前主题，如果没有变化则不重复操作
  const currentDomTheme = document.documentElement.getAttribute("data-theme");
  if (currentDomTheme === themeName && globalThemeState.value === themeName) {
    console.log("主题未变化，跳过设置:", themeName);
    return;
  }

  console.log("设置主题:", themeName);

  // 立即更新全局状态
  globalThemeState.value = themeName;

  // 批量更新DOM属性，减少重绘次数
  const updates = () => {
    // 设置DaisyUI主题属性
    document.documentElement.setAttribute("data-theme", themeName);
    document.body.setAttribute("data-theme", themeName);

    // 设置暗色模式类（为了兼容现有CSS）
    if (themeName === "dark") {
      document.documentElement.classList.add("dark-mode");
      document.body.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
      document.body.classList.remove("dark-mode");
    }

    // 强制刷新样式
    document.documentElement.style.colorScheme = themeName === "dark" ? "dark" : "light";
    
    // 手动更新CSS变量以确保立即生效
    forceCSSVariablesUpdate(themeName);
  };

  // 立即执行更新
  updates();

  // 更新存储
  localStorage.setItem("theme", themeName);

  // 强制样式重新计算和重绘
  forceStyleRecalculation();

  // 触发主题变更事件
  window.dispatchEvent(
    new CustomEvent("theme-changed", { detail: { theme: themeName } })
  );

  console.log("主题已设置并强制刷新:", themeName);
}

// 强制CSS变量更新函数
function forceCSSVariablesUpdate(themeName) {
  try {
    const root = document.documentElement;
    
    // 临时移除然后重新添加data-theme属性，强制CSS变量重新计算
    const currentTheme = root.getAttribute("data-theme");
    root.removeAttribute("data-theme");
    
    // 强制浏览器重新计算样式
    root.offsetHeight; // 触发重绘
    
    // 重新设置主题
    root.setAttribute("data-theme", themeName);
    
    // 对body也执行相同操作
    document.body.removeAttribute("data-theme");
    document.body.offsetHeight; // 触发重绘
    document.body.setAttribute("data-theme", themeName);
    
    console.log("强制更新CSS变量完成:", themeName);
  } catch (error) {
    console.warn("强制更新CSS变量时出错:", error);
  }
}

// 强制样式重新计算函数
function forceStyleRecalculation() {
  try {
    // 方法1: 强制重新计算样式
    const computedStyle = window.getComputedStyle(document.documentElement);
    computedStyle.getPropertyValue('color'); // 触发样式计算

    // 方法2: 使用多个requestAnimationFrame确保渲染完成
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // 触发所有元素的样式重新计算
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          if (el.offsetParent !== null) { // 只处理可见元素
            el.offsetHeight; // 触发重绘
          }
        });
        
        console.log("样式重新计算完成");
      });
    });

    // 方法3: 强制重绘整个页面
    setTimeout(() => {
      document.body.style.transform = "translateZ(0)";
      requestAnimationFrame(() => {
        document.body.style.transform = "";
      });
    }, 10);
    
  } catch (error) {
    console.warn("强制样式重新计算时出错:", error);
  }
}

// 初始化主题
export function initTheme() {
  try {
    // 强制默认使用亮色主题，除非用户明确选择了暗色主题
    const savedTheme = localStorage.getItem("theme");
    let currentTheme = "light"; // 默认亮色主题
    
    // 只有当用户明确保存了暗色主题时才使用暗色
    if (savedTheme === "dark") {
      currentTheme = "dark";
    }

    // 更新全局状态
    globalThemeState.value = currentTheme;

    // 应用主题
    setTheme(currentTheme);

    console.log("主题初始化完成:", currentTheme, "(强制默认亮色主题)");
  } catch (err) {
    console.error("初始化主题时出错:", err);
    // 使用默认亮色主题
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
    if (currentDomTheme === themeName && currentTheme.value === themeName) {
      console.log("主题未变化，跳过重复设置:", themeName);
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
