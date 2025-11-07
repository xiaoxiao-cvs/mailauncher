/**
 * 侧边栏状态管理自定义 Hook
 * 职责：管理侧边栏的展开/收起状态及持久化
 */

import { useState, useEffect } from 'react'
import { storageLogger } from '@/utils/logger'

const SIDEBAR_STORAGE_KEY = 'mailauncher-sidebar-collapsed'

export function useSidebar() {
  // 从 localStorage 读取状态，默认为展开（false）
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      return stored === 'true'
    } catch {
      return false
    }
  })

  // 保存状态到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed))
      storageLogger.debug('侧边栏状态已保存', { isCollapsed })
    } catch (error) {
      storageLogger.warn('保存侧边栏状态失败', error)
    }
  }, [isCollapsed])

  // 切换侧边栏状态
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  // 展开侧边栏
  const expandSidebar = () => {
    setIsCollapsed(false)
  }

  // 收起侧边栏
  const collapseSidebar = () => {
    setIsCollapsed(true)
  }

  return {
    isCollapsed,
    toggleSidebar,
    expandSidebar,
    collapseSidebar,
    setIsCollapsed
  }
}
