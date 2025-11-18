import { Icon } from '@iconify/react'
import { Notification } from '@/types/notification'
import { NotificationItem } from './NotificationItem'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { animate } from 'animejs'

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
  /** 侧边栏是否收起 */
  isCollapsed: boolean
}

/**
 * 职责：
 * - 显示通知列表
 * - 支持删除单个通知
 * - 支持清空所有通知
 * - 点击外部区域关闭
 * - 已完成任务堆叠显示
 */
export function NotificationPopover({
  isOpen,
  notifications,
  onRemove,
  onClearAll,
  onClose,
  onNotificationClick,
  isCollapsed,
}: NotificationPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [isStackExpanded, setIsStackExpanded] = useState(false)

  // 关闭时重置堆叠状态
  useEffect(() => {
    if (!isOpen) setIsStackExpanded(false)
  }, [isOpen])

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

  // 堆叠展开动画
  useEffect(() => {
    if (isStackExpanded) {
      animate('.stack-item', {
        translateY: [20, 0],
        opacity: [0, 1],
        scale: [0.9, 1],
        delay: (_el: any, i: number) => i * 50,
        ease: 'outExpo',
        duration: 400
      })
    }
  }, [isStackExpanded])

  if (!isOpen) return null

  // 根据侧边栏状态计算气泡位置
  const popoverLeft = isCollapsed ? '4.5rem' : '17rem'
  
  // 是否显示堆叠视图
  const showStack = notifications.length > 1 && !isStackExpanded

  return (
    <div
      ref={popoverRef}
      className={cn(
        'fixed z-50',
        'w-[400px]', // 增加宽度
        'max-h-[60vh]', // 增加最大高度
        'flex flex-col',
        // Glassmorphism 容器样式
        'bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-2xl',
        'rounded-2xl shadow-2xl',
        'border border-white/20 dark:border-white/10',
        'animate-in fade-in slide-in-from-left-2 duration-200',
        'transition-all duration-300'
      )}
      style={{
        left: popoverLeft,
        bottom: '1.2rem',
      }}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 dark:border-white/5 bg-white/10 dark:bg-white/5">
        <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white tracking-wide">
          {notifications.length > 1 ? `共 ${notifications.length} 个通知` : '通知中心'}
        </h3>
        
        {notifications.length > 0 && (
          <button
            onClick={onClearAll}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400"
            title="全部清除"
          >
            <Icon icon="ph:trash" className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 通知列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
            <Icon icon="ph:bell-slash" className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-xs">暂无通知</p>
          </div>
        ) : (
          <>
            {showStack ? (
              // 堆叠视图
              <div 
                className="group relative cursor-pointer select-none pt-2 px-1"
                onClick={() => setIsStackExpanded(true)}
              >
                {/* 堆叠背景卡片 */}
                <div className="absolute top-0 left-2 right-2 h-full bg-white/40 dark:bg-white/5 rounded-[14px] transform scale-[0.96] translate-y-1 z-0 border border-white/20 dark:border-white/5 shadow-sm transition-transform duration-300 group-hover:translate-y-2" />
                <div className="absolute top-2 left-4 right-4 h-full bg-white/20 dark:bg-white/5 rounded-[14px] transform scale-[0.92] translate-y-2 -z-10 border border-white/20 dark:border-white/5 shadow-sm transition-transform duration-300 group-hover:translate-y-4" />

                {/* 顶部卡片 - 点击展开 */}
                <div className="relative z-10">
                  <NotificationItem
                    notification={notifications[0]}
                    onRemove={onRemove}
                    onClick={() => setIsStackExpanded(true)} // 覆盖点击事件为展开
                  />
                </div>
              </div>
            ) : (
              // 展开列表视图
              <div className="space-y-2">
                {isStackExpanded && (
                  <div className="flex justify-end px-1">
                    <button 
                      onClick={() => setIsStackExpanded(false)}
                      className="text-[10px] text-blue-500 hover:text-blue-600 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full transition-colors"
                    >
                      折叠
                    </button>
                  </div>
                )}
                {notifications.map((notification) => (
                  <div key={notification.id} className="stack-item">
                    <NotificationItem
                      notification={notification}
                      onRemove={onRemove}
                      onClick={onNotificationClick}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )

}

