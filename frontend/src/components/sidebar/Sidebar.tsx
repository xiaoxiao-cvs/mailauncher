import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { SidebarNavItemComponent } from './SidebarNavItem'
import { SIDEBAR_NAV_ITEMS, SIDEBAR_BOTTOM_ITEMS } from './constants'
import { cn } from '@/lib/utils'

const SIDEBAR_STORAGE_KEY = 'mailauncher-sidebar-collapsed'

/**
 * 侧边栏组件
 * 职责：提供应用导航，支持展开/收起状态切换
 * 
 * 设计特点：
 * - 默认展开状态
 * - 右侧圆角倒角设计
 * - 展开时显示图标+文字
 * - 收起时仅显示图标
 * - 当前页面高亮显示
 * - 状态持久化到 localStorage
 */
export function Sidebar() {
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
    } catch (error) {
      console.warn('Failed to save sidebar state:', error)
    }
  }, [isCollapsed])

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <aside
      className={cn(
        'h-screen bg-white dark:bg-[#0f0f0f] border-r border-[#023e8a]/10 dark:border-white/10',
        'flex flex-col transition-all duration-300 ease-in-out',
        'relative',
        // 右侧大圆角倒角
        'rounded-r-3xl',
        // 阴影效果
        'shadow-[4px_0_12px_rgba(3,4,94,0.08)] dark:shadow-[4px_0_12px_rgba(0,0,0,0.3)]',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* 顶部：Logo 区域 */}
      <div className="px-4 py-6 border-b border-[#023e8a]/10 dark:border-white/10 overflow-hidden">
        <div className={cn(
          'flex items-center gap-3 transition-all duration-200',
          'justify-center' // 始终居中
        )}>
          {/* Logo 图标 */}
          <div className="w-8 h-8 bg-gradient-to-br from-[#0077b6] to-[#00b4d8] rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">MAI</span>
          </div>
          
          {/* Logo 文字 - 平滑显示/隐藏，防止换行 */}
          <span 
            className={cn(
              'text-lg font-semibold text-[#03045e] dark:text-white whitespace-nowrap transition-all duration-200',
              isCollapsed ? 'opacity-0 w-0' : 'opacity-100'
            )}
          >
            mailauncher
          </span>
        </div>
      </div>

      {/* 中间：主导航区域 */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {SIDEBAR_NAV_ITEMS.map((item) => (
          <SidebarNavItemComponent
            key={item.id}
            item={item}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* 底部：设置和折叠按钮 */}
      <div className="px-3 pb-4 space-y-2 pt-4">
        {/* 设置按钮 */}
        {SIDEBAR_BOTTOM_ITEMS.map((item) => (
          <SidebarNavItemComponent
            key={item.id}
            item={item}
            isCollapsed={isCollapsed}
          />
        ))}

        {/* 分隔线 - 两边留空 */}
        <div className="px-3 py-2">
          <div className="h-px bg-[#023e8a]/10 dark:bg-white/10" />
        </div>

        {/* 折叠/展开按钮 */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'w-full flex items-center rounded-lg transition-all duration-200',
            'hover:bg-[#023e8a]/5 dark:hover:bg-white/5',
            'text-[#023e8a]/70 dark:text-white/70',
            'overflow-hidden', // 防止内容溢出
            'py-2.5',
            // 展开时：图标区域左右等距，文字在右侧
            !isCollapsed && 'pl-[18px] pr-4 gap-3',
            // 收起时：图标区域完全居中（左右等距）
            isCollapsed && 'px-[18px] justify-center'
          )}
          aria-label={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {/* 图标容器 - 与导航项图标对齐 */}
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            <Icon
              icon={isCollapsed ? 'ph:caret-right-thin' : 'ph:caret-left-thin'}
              className={cn(
                'transition-all duration-200',
                'text-xl' // 统一尺寸，与导航图标一致
              )}
            />
          </div>
          <span 
            className={cn(
              'text-sm font-medium whitespace-nowrap transition-all duration-200',
              isCollapsed ? 'opacity-0 w-0' : 'opacity-100'
            )}
          >
            收起
          </span>
        </button>
      </div>
    </aside>
  )
}
