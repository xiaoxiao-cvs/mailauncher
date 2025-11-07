import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
  /** 未读通知数量 */
  unreadCount: number
  /** 是否收起状态 */
  isCollapsed: boolean
  /** 点击事件 */
  onClick: () => void
}

/**
 * 通知铃铛组件
 * 职责：
 * - 显示铃铛图标
 * - 显示未读数量徽章
 * - 支持侧边栏收起/展开状态
 */
export function NotificationBell({ unreadCount, isCollapsed, onClick }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center rounded-lg transition-all duration-200',
        'hover:bg-[#023e8a]/5 dark:hover:bg-white/5',
        'text-[#023e8a]/70 dark:text-white/70',
        'overflow-hidden',
        'py-2.5 relative',
        'pl-[18px]',
        !isCollapsed && 'pr-4',
        isCollapsed && 'pr-[18px] justify-center'
      )}
      aria-label="通知中心"
    >
      {/* 图标容器 */}
      <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 relative">
        <Icon
          icon="ph:bell-thin"
          className="text-xl transition-all duration-200"
        />
        
        {/* 未读徽章 - 红点或数字 */}
        {unreadCount > 0 && (
          <div className={cn(
            'absolute -top-1 -right-1',
            'bg-red-500 rounded-full',
            'flex items-center justify-center',
            'text-white text-[10px] font-bold',
            'shadow-sm',
            unreadCount > 9 ? 'w-4 h-4' : 'w-3 h-3'
          )}>
            {unreadCount > 9 ? '9+' : unreadCount > 0 ? unreadCount : ''}
          </div>
        )}
      </div>

      {/* 文字标签 */}
      <span 
        className={cn(
          'text-sm font-medium whitespace-nowrap transition-all duration-200',
          isCollapsed ? 'opacity-0 w-0 ml-0' : 'opacity-100 ml-3'
        )}
      >
        通知
      </span>
    </button>
  )
}
