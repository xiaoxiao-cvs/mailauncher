import { ref, watch } from 'vue'

// 主题状态
const theme = ref('dark')

// 初始化主题
export function initTheme() {
  // 从 localStorage 读取主题设置
  const savedTheme = localStorage.getItem('theme') || 'dark'
  theme.value = savedTheme
  applyTheme(savedTheme)
}

// 应用主题
function applyTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName)
}

// 切换主题
export function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

// 设置主题
export function setTheme(themeName) {
  if (['light', 'dark'].includes(themeName)) {
    theme.value = themeName
  }
}

// 监听主题变化
watch(theme, (newTheme) => {
  applyTheme(newTheme)
  localStorage.setItem('theme', newTheme)
})

// 导出主题状态
export function useTheme() {
  return {
    theme,
    toggleTheme,
    setTheme
  }
}
