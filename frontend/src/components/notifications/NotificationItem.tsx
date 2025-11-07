import { Icon } from '@iconify/react'
import { Notification, NotificationType, TaskStatus } from '@/types/notification'
import { cn } from '@/lib/utils'

interface NotificationItemProps {
  notification: Notification
  onRemove: (id: string) => void
  onClick: (notification: Notification) => void
}

/**
 * 单个通知项组件
 * 职责：
 * - 渲染单个通知卡片
 * - 根据通知类型显示不同样式
 * - 任务通知显示进度条
 * - 支持删除操作
 */
export function NotificationItem({ notification, onRemove, onClick }: NotificationItemProps) {
  const { type, title, message, task } = notification

  // 获取背景颜色
  const getBgColor = () => {
    switch (type) {
      case NotificationType.TASK:
        return 'bg-white dark:bg-[#1a1a1a]'
      case NotificationType.MESSAGE:
        return 'bg-[#e3f2fd] dark:bg-[#0d47a1]/20'
      case NotificationType.WARNING:
        return 'bg-[#fff3e0] dark:bg-[#e65100]/20'
      case NotificationType.ERROR:
        return 'bg-[#ffebee] dark:bg-[#c62828]/20'
      default:
        return 'bg-white dark:bg-[#1a1a1a]'
    }
  }

  // 获取图标
  const getIcon = () => {
    if (type === NotificationType.TASK && task) {
      switch (task.status) {
        case TaskStatus.SUCCESS:
          return <Icon icon="ph:check-circle" className="w-5 h-5 text-green-500" />
        case TaskStatus.FAILED:
          return <Icon icon="ph:x-circle" className="w-5 h-5 text-red-500" />
        case TaskStatus.DOWNLOADING:
        case TaskStatus.INSTALLING:
          return <Icon icon="ph:arrow-circle-down" className="w-5 h-5 text-[#0077b6] animate-pulse" />
        default:
          return <Icon icon="ph:clock" className="w-5 h-5 text-[#023e8a]/50" />
      }
    }

    switch (type) {
      case NotificationType.MESSAGE:
        return <Icon icon="ph:info" className="w-5 h-5 text-[#0077b6]" />
      case NotificationType.WARNING:
        return <Icon icon="ph:warning" className="w-5 h-5 text-orange-500" />
      case NotificationType.ERROR:
        return <Icon icon="ph:x-circle" className="w-5 h-5 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div
      className={cn(
        'p-3 rounded-lg shadow-sm border transition-all duration-200',
        getBgColor(),
        'border-[#023e8a]/10 dark:border-white/10',
        'cursor-pointer hover:shadow-md hover:scale-[1.02]'
      )}
      onClick={() => onClick(notification)}
    >
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-semibold text-[#03045e] dark:text-white truncate">
              {title}
            </h4>
            
            {/* 删除按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove(notification.id)
              }}
              className="flex-shrink-0 p-1 rounded hover:bg-[#023e8a]/10 dark:hover:bg-white/10 transition-colors"
              aria-label="删除通知"
            >
              <Icon icon="ph:x" className="w-4 h-4 text-[#023e8a]/50 dark:text-white/50" />
            </button>
          </div>

          <p className="text-xs text-[#023e8a]/70 dark:text-white/70 mb-2">
            {message}
          </p>

          {/* 任务进度条 */}
          {type === NotificationType.TASK && task && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-[#023e8a]/60 dark:text-white/60">
                <span>{getStatusText(task.status)}</span>
                <span>{task.progress}%</span>
              </div>
              <div className="h-1.5 bg-[#023e8a]/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    task.status === TaskStatus.FAILED 
                      ? 'bg-red-500' 
                      : task.status === TaskStatus.SUCCESS
                      ? 'bg-green-500'
                      : 'bg-gradient-to-r from-[#0077b6] to-[#00b4d8]'
                  )}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 获取状态文本
function getStatusText(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.PENDING:
      return '等待中'
    case TaskStatus.DOWNLOADING:
      return '下载中'
    case TaskStatus.INSTALLING:
      return '安装中'
    case TaskStatus.SUCCESS:
      return '安装成功'
    case TaskStatus.FAILED:
      return '安装失败'
    default:
      return ''
  }
}
