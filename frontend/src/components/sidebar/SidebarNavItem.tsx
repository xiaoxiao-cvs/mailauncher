import { Icon } from '@iconify/react'
import { Link, useLocation } from 'react-router-dom'
import type { SidebarNavItem } from '@/types/sidebar'
import { cn } from '@/lib/utils'

interface SidebarNavItemComponentProps {
  item: SidebarNavItem
  isCollapsed: boolean
}

/**
 * 侧边栏导航项组件
 * 职责：渲染单个导航项，支持展开/收起状态
 */
export function SidebarNavItemComponent({ item, isCollapsed }: SidebarNavItemComponentProps) {
  const location = useLocation()
  const isActive = location.pathname === item.path

  return (
    <Link
      to={item.path}
      className={cn(
        'relative flex items-center rounded-lg transition-all duration-200',
        'hover:bg-[#023e8a]/5 dark:hover:bg-white/5',
        isActive && 'bg-[#023e8a]/10 dark:bg-white/10',
        'overflow-hidden', // 防止内容溢出
        'py-2.5',
        // 展开时：图标区域左右等距，文字在右侧
        !isCollapsed && 'pl-[18px] pr-4 gap-3',
        // 收起时：图标区域完全居中（左右等距）
        isCollapsed && 'px-[18px] justify-center'
      )}
    >
      {/* 图标容器 - 固定宽度确保垂直居中对齐 */}
      <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
        <Icon
          icon={item.icon}
          className={cn(
            'transition-colors duration-200',
            'text-xl', // 统一尺寸
            isActive 
              ? 'text-[#0077b6] dark:text-[#00b4d8]' 
              : 'text-[#023e8a]/70 dark:text-white/70'
          )}
        />
      </div>

      {/* 文字标签 - 仅在展开时显示，防止换行 */}
      <span
        className={cn(
          'text-sm font-medium transition-all duration-200 whitespace-nowrap',
          isActive 
            ? 'text-[#03045e] dark:text-white' 
            : 'text-[#023e8a]/70 dark:text-white/70',
          // 收起时完全隐藏（opacity + width），展开时平滑出现
          isCollapsed ? 'opacity-0 w-0' : 'opacity-100'
        )}
      >
        {item.label}
      </span>

      {/* 收起状态的高亮框 - 四边等宽 */}
      {isActive && isCollapsed && (
        <div className="absolute inset-0 border-2 border-[#0077b6]/30 dark:border-[#00b4d8]/30 rounded-lg pointer-events-none" />
      )}
    </Link>
  )
}
