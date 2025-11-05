import { createContext, useState, useEffect, useContext, ReactNode } from 'react'
import type { Theme, ThemeContextType } from '@/types/theme'

/**
 * 主题上下文
 */
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

/**
 * 本地存储键名
 */
const THEME_STORAGE_KEY = 'mailauncher-theme'

/**
 * 默认主题
 */
const DEFAULT_THEME: Theme = 'system'

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * 主题提供者组件
 * 
 * 功能：
 * 1. 管理主题状态 (light | dark | system)
 * 2. 持久化主题设置到 localStorage
 * 3. 监听系统主题变化
 * 4. 自动应用主题到 DOM
 * 
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  // 从 localStorage 读取主题设置
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored
      }
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error)
    }
    return DEFAULT_THEME
  })

  // 解析后的实际主题 (light | dark)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  })

  /**
   * 设置主题
   */
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error)
    }
  }

  /**
   * 应用主题到 DOM
   */
  useEffect(() => {
    const root = document.documentElement

    if (theme === 'system') {
      // 跟随系统主题
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const updateSystemTheme = (e: MediaQueryList | MediaQueryListEvent) => {
        const isDark = e.matches
        setResolvedTheme(isDark ? 'dark' : 'light')
        
        if (isDark) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }

      // 初始化
      updateSystemTheme(mediaQuery)

      // 监听系统主题变化
      mediaQuery.addEventListener('change', updateSystemTheme)
      
      return () => {
        mediaQuery.removeEventListener('change', updateSystemTheme)
      }
    } else {
      // 手动设置主题
      setResolvedTheme(theme)
      
      if (theme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [theme])

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * 主题 Hook
 * 用于在组件中访问和控制主题
 * 
 * @example
 * ```tsx
 * const { theme, setTheme, resolvedTheme } = useTheme()
 * 
 * // 切换到暗色模式
 * setTheme('dark')
 * 
 * // 跟随系统
 * setTheme('system')
 * ```
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  
  return context
}
