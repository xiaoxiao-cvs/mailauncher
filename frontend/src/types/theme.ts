/**
 * 主题类型定义
 */
export type Theme = 'light' | 'dark' | 'system'

/**
 * 主题上下文类型
 */
export interface ThemeContextType {
  /** 当前主题设置 (light | dark | system) */
  theme: Theme
  /** 实际应用的主题 (light | dark)，当 theme 为 system 时会自动解析 */
  resolvedTheme: 'light' | 'dark'
  /** 设置主题 */
  setTheme: (theme: Theme) => void
}
