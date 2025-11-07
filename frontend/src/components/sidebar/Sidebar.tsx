import { Icon } from '@iconify/react'
import { SidebarNavItemComponent } from './SidebarNavItem'
import { SIDEBAR_NAV_ITEMS, SIDEBAR_BOTTOM_ITEMS } from './constants'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { NotificationPopover } from '@/components/notifications/NotificationPopover'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/hooks/useSidebar'
import { useNotifications } from '@/hooks/useNotifications'
import { useState, useEffect } from 'react'
import InstallLogModal from '../install/InstallLogModal'
import { Notification } from '@/types/notification'
import { registerNotificationHandlers, setupNotificationTestCommands } from '@/utils/notificationTestTool'

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
 * - 通知中心功能
 */
export function Sidebar() {
  // 使用自定义 hook 管理侧边栏状态
  const { isCollapsed, toggleSidebar } = useSidebar()
  
  // 通知管理
  const {
    notifications,
    unreadCount,
    isPopoverOpen,
    removeNotification,
    clearAllNotifications,
    togglePopover,
    closePopover,
    addMessageNotification,
    addWarningNotification,
    addErrorNotification,
    addTaskNotification,
    updateTaskProgress,
  } = useNotifications()

  // 注册测试工具（开发环境）
  useEffect(() => {
    if (import.meta.env.DEV) {
      registerNotificationHandlers({
        addMessageNotification,
        addWarningNotification,
        addErrorNotification,
        addTaskNotification,
        updateTaskProgress,
        clearAllNotifications,
      })
      setupNotificationTestCommands()
    }
  }, [
    addMessageNotification,
    addWarningNotification,
    addErrorNotification,
    addTaskNotification,
    updateTaskProgress,
    clearAllNotifications,
  ])

  // 调试日志
  useEffect(() => {
    console.log('🔔 通知列表更新:', notifications)
    console.log('🔢 未读数量:', unreadCount)
  }, [notifications, unreadCount])

  // 日志模态框状态
  const [logModal, setLogModal] = useState<{
    isOpen: boolean
    notification: Notification | null
  }>({
    isOpen: false,
    notification: null,
  })

  // 处理通知点击 - 所有类型的通知都可以点击查看详情
  const handleNotificationClick = (notification: Notification) => {
    setLogModal({
      isOpen: true,
      notification,
    })
    closePopover()
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

      {/* 底部：通知、设置和折叠按钮 */}
      <div className="px-3 pb-4 space-y-2 pt-4">
        {/* 通知铃铛 */}
        <NotificationBell
          unreadCount={unreadCount}
          isCollapsed={isCollapsed}
          onClick={togglePopover}
        />

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
            // 统一使用固定的左内边距，确保图标位置不变
            'pl-[18px]',
            // 展开时：右边距 + 间隙
            !isCollapsed && 'pr-4',
            // 收起时：右边距与左边距相等，实现居中
            isCollapsed && 'pr-[18px] justify-center'
          )}
          aria-label={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {/* 图标容器 - 与导航项图标对齐，固定宽度 */}
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            <Icon
              icon={isCollapsed ? 'ph:caret-right-thin' : 'ph:caret-left-thin'}
              className={cn(
                'transition-all duration-200',
                'text-xl' // 统一尺寸，与导航图标一致
              )}
            />
          </div>
          {/* 文字标签 - 使用 margin 代替 gap，确保位置过渡平滑 */}
          <span 
            className={cn(
              'text-sm font-medium whitespace-nowrap transition-all duration-200',
              isCollapsed ? 'opacity-0 w-0 ml-0' : 'opacity-100 ml-3'
            )}
          >
            收起
          </span>
        </button>
      </div>

      {/* 通知气泡 */}
      <NotificationPopover
        isOpen={isPopoverOpen}
        notifications={notifications}
        onRemove={removeNotification}
        onClearAll={clearAllNotifications}
        onClose={closePopover}
        onNotificationClick={handleNotificationClick}
        isCollapsed={isCollapsed}
      />

      {/* 通知详情模态框 */}
      <InstallLogModal
        isOpen={logModal.isOpen}
        notification={logModal.notification}
        onClose={() => setLogModal({ isOpen: false, notification: null })}
      />
    </aside>
  )
}
