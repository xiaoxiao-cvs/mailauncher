import { Icon } from '@iconify/react'
import { Notification } from '@/types/notification'
import { NotificationItem } from './NotificationItem'
import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'

interface NotificationPopoverProps {
  /** 是否显示 */
  isOpen: boolean
  /** 通知列表 */
  notifications: Notification[]
  /** 删除单个通知 */
  onRemove: (id: string) => void
  /** 清空所有通知 */
  onClearAll: () => void
  /** 关闭气泡 */
  onClose: () => void
  /** 点击通知项 */
  onNotificationClick: (notification: Notification) => void
}

/**
 * 通知气泡弹窗组件
 * 职责：
 * - 显示通知列表
 * - 支持删除单个通知
 * - 支持清空所有通知
 * - 点击外部区域关闭
 */
export function NotificationPopover({
  isOpen,
  notifications,
  onRemove,
  onClearAll,
  onClose,
  onNotificationClick,
}: NotificationPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={popoverRef}
      className={cn(
        'fixed z-50',
        'w-80 max-h-[32rem]',
        'bg-white dark:bg-[#1a1a1a]',
        'rounded-xl shadow-2xl',
        'border border-[#023e8a]/10 dark:border-white/10',
        'flex flex-col',
        'animate-in fade-in slide-in-from-left-2 duration-200'
      )}
      style={{
        left: '4.5rem',
        bottom: '5rem',
      }}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-[#023e8a]/10 dark:border-white/10">
        <h3 className="text-base font-semibold text-[#03045e] dark:text-white">
          通知中心
        </h3>
        
        {notifications.length > 0 && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#023e8a]/5 dark:hover:bg-white/5 transition-colors text-[#023e8a]/70 dark:text-white/70"
          >
            <Icon icon="ph:trash" className="w-4 h-4" />
            <span className="text-xs font-medium">全部删除</span>
          </button>
        )}
      </div>

      {/* 通知列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#023e8a]/50 dark:text-white/50">
            <Icon icon="ph:bell-slash" className="w-12 h-12 mb-2" />
            <p className="text-sm">暂无通知</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRemove={onRemove}
              onClick={onNotificationClick}
            />
          ))
        )}
      </div>

      {/* 气泡箭头指示器 - 深色模式适配 */}
      <div
        className="absolute left-[-8px] bottom-12 w-0 h-0 border-8 border-transparent border-r-white dark:border-r-[#1a1a1a]"
        style={{
          borderTopWidth: '8px',
          borderBottomWidth: '8px',
          borderLeftWidth: '0',
          borderRightWidth: '8px',
        }}
      />
    </div>
  )
}
