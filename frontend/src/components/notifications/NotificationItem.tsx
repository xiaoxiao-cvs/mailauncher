import { Icon } from '@iconify/react'
import { Notification, NotificationType, TaskStatus } from '@/types/notification'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

interface NotificationItemProps {
  notification: Notification
  onRemove: (id: string) => void
  onClick: (notification: Notification) => void
  className?: string
  style?: React.CSSProperties
}

/**
 * 单个通知项组件 - Apple 风格
 */
export function NotificationItem({ notification, onRemove, onClick, className, style }: NotificationItemProps) {
  const { type, title, message, task, createdAt } = notification

  // 计算相对时间
  const timeString = useMemo(() => {
    if (!createdAt) return ''
    const date = new Date(createdAt)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return '现在'
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`
    return `${date.getMonth() + 1}/${date.getDate()}`
  }, [createdAt])

  // 获取图标
  const getIcon = () => {
    if (type === NotificationType.TASK && task) {
      switch (task.status) {
        case TaskStatus.SUCCESS:
          return <Icon icon="ph:check-circle-fill" className="w-5 h-5 text-green-500" />
        case TaskStatus.FAILED:
          return <Icon icon="ph:x-circle-fill" className="w-5 h-5 text-red-500" />
        case TaskStatus.DOWNLOADING:
        case TaskStatus.INSTALLING:
          return <Icon icon="ph:arrow-circle-down-fill" className="w-5 h-5 text-blue-500 animate-pulse" />
        default:
          return <Icon icon="ph:clock-fill" className="w-5 h-5 text-gray-400" />
      }
    }

    switch (type) {
      case NotificationType.MESSAGE:
        return <Icon icon="ph:info-fill" className="w-5 h-5 text-blue-500" />
      case NotificationType.WARNING:
        return <Icon icon="ph:warning-fill" className="w-5 h-5 text-orange-500" />
      case NotificationType.ERROR:
        return <Icon icon="ph:x-circle-fill" className="w-5 h-5 text-red-500" />
      default:
        return <Icon icon="ph:bell-fill" className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden',
        'bg-white/80 dark:bg-[#2c2c2e]/80 backdrop-blur-xl', // Glassmorphism
        'rounded-[18px]', // Apple-like rounded corners
        'shadow-sm hover:shadow-md transition-all duration-200',
        'border border-white/40 dark:border-white/10',
        'p-3 cursor-pointer',
        className
      )}
      style={style}
      onClick={() => onClick(notification)}
    >
      {/* 头部：图标 + 标题 + 时间 */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center bg-white dark:bg-white/10 shadow-sm">
            {getIcon()}
          </div>
          <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 opacity-90 truncate max-w-[180px]">
            {title}
          </span>
        </div>
        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
          {timeString}
        </span>
      </div>

      {/* 内容区域 */}
      <div className="pl-8">
        <p className="text-[13px] text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">
          {message}
        </p>

        {/* 任务进度条 */}
        {type === NotificationType.TASK && task && (
          <div className="space-y-1 mt-2">
            <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
              <span>{getStatusText(task.status)}</span>
              <span>{task.progress}%</span>
            </div>
            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  task.status === TaskStatus.FAILED 
                    ? 'bg-red-500' 
                    : task.status === TaskStatus.SUCCESS
                    ? 'bg-green-500'
                    : 'bg-blue-500'
                )}
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 删除按钮 - 悬停显示 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove(notification.id)
        }}
        className="absolute top-2 right-2 p-1 rounded-full bg-gray-200/50 dark:bg-gray-700/50 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-gray-300 dark:hover:bg-gray-600"
        aria-label="删除通知"
      >
        <Icon icon="ph:x" className="w-3 h-3 text-gray-500 dark:text-gray-400" />
      </button>
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
