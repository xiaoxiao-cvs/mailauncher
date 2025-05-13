import { ref, watch } from 'vue';
import { adjustColorBrightness } from '../utils/formatters';

// 默认主题色映射
export const themeColors = {
  blue: '#4a7eff',
  green: '#42b983',
  purple: '#9370db',
  orange: '#e67e22',
  pink: '#e84393',
  teal: '#00b894'
};

// 创建响应式状态
const darkMode = ref(false);
const currentTheme = ref('blue');

// 初始化主题
export const initTheme = () => {
  // 初始化深色模式
  const savedDarkMode = localStorage.getItem('darkMode');
  if (savedDarkMode !== null) {
    darkMode.value = savedDarkMode === 'true';
  } else {
    // 检查系统偏好
    darkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  // 应用深色模式
  applyDarkMode(darkMode.value);
  
  // 初始化主题色
  const savedTheme = localStorage.getItem('themeColor');
  if (savedTheme && themeColors[savedTheme]) {
    currentTheme.value = savedTheme;
    applyThemeColor(themeColors[savedTheme]);
  } else {
    // 应用默认主题色
    applyThemeColor(themeColors.blue);
  }

  // 监听系统深色模式变化
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      // 只有当用户未明确设置时，才跟随系统变化
      if (localStorage.getItem('darkMode') === null) {
        toggleDarkMode(e.matches);
      }
    });
};

// 应用深色模式
export const applyDarkMode = (isDark) => {
  darkMode.value = isDark;
  
  // 更新DOM
  if (isDark) {
    document.documentElement.classList.add('dark-mode');
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark-mode');
    document.documentElement.setAttribute('data-theme', 'light');
  }
  
  // 触发自定义事件，通知其他组件更新颜色
  window.dispatchEvent(new Event('theme-mode-changed'));
  
  // 触发窗口resize事件，使得图表等组件重绘
  window.dispatchEvent(new Event('resize'));
};

// 切换深色模式
export const toggleDarkMode = (value) => {
  const newValue = typeof value === 'boolean' ? value : !darkMode.value;
  
  // 保存到本地存储
  localStorage.setItem('darkMode', newValue);
  
  // 应用深色模式
  applyDarkMode(newValue);
  
  return newValue;
};

// 应用主题色
export const applyThemeColor = (color) => {
  // 保存到全局变量
  window.currentThemeColor = color;
  
  // 更新CSS变量
  document.documentElement.style.setProperty('--el-color-primary', color);
  document.documentElement.style.setProperty('--primary-color', color);
  
  // 生成主题色的亮色和暗色变体
  const lightenColor = adjustColorBrightness(color, 20);
  const darkenColor = adjustColorBrightness(color, -20);
  
  document.documentElement.style.setProperty('--primary-light', lightenColor);
  document.documentElement.style.setProperty('--primary-dark', darkenColor);
  
  // 图表颜色绑定到主题色
  document.documentElement.style.setProperty('--chart-line', color);
  document.documentElement.style.setProperty('--chart-secondary', lightenColor);
  
  // 找到该颜色对应的主题名称
  for (const [name, value] of Object.entries(themeColors)) {
    if (value === color) {
      currentTheme.value = name;
      localStorage.setItem('themeColor', name);
      break;
    }
  }
  
  // 触发窗口resize事件，使得图表等组件重绘
  window.dispatchEvent(new Event('resize'));
};

// 选择主题色
export const selectTheme = (name, color) => {
  currentTheme.value = name;
  localStorage.setItem('themeColor', name);
  applyThemeColor(color);
};

// 创建useDarkMode组合式函数
export const useDarkMode = (emitter) => {
  // 监听深色模式变化，通过事件总线通知其他组件
  watch(darkMode, (newVal) => {
    if (emitter) {
      emitter.emit('dark-mode-changed', newVal);
    }
  });

  return {
    darkMode,
    toggleDarkMode
  };
};

// 创建useTheme组合式函数
export const useTheme = (emitter) => {
  // 监听主题色变化，通过事件总线通知其他组件
  watch(currentTheme, (newVal) => {
    if (emitter && themeColors[newVal]) {
      emitter.emit('theme-color-changed', themeColors[newVal]);
    }
  });

  return {
    currentTheme,
    themeColors,
    selectTheme,
    applyThemeColor
  };
};

export default {
  darkMode,
  currentTheme,
  themeColors,
  initTheme,
  toggleDarkMode,
  selectTheme,
  applyThemeColor,
  useDarkMode,
  useTheme
};
