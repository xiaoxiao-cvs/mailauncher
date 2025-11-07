import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { Notification, NotificationType, TaskStatus } from '@/types/notification'

interface InstallLogModalProps {
  isOpen: boolean
  notification: Notification | null
  onClose: () => void
}

interface LogEntry {
  time: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  message: string
}

/**
 * 通知详情全屏模态框
 * 支持所有类型的通知（TASK/MESSAGE/WARNING/ERROR）
 */
export default function InstallLogModal({ isOpen, notification, onClose }: InstallLogModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到最新日志
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // 按 ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // WebSocket 连接（仅任务通知）
  useEffect(() => {
    if (!isOpen || !notification || notification.type !== NotificationType.TASK) {
      setLogs([]) // 清空日志
      return
    }
    
    const taskId = notification.task?.taskId
    if (!taskId) return

    // TODO: 连接 WebSocket 接收日志
    // const ws = new WebSocket(`ws://localhost:11111/api/v1/ws/downloads/${taskId}`)
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data)
    //   // 处理日志、进度、状态等消息
    // }

    // 模拟日志（测试用）
    const mockLogs: LogEntry[] = [
      { time: '12:00:01', level: 'INFO', message: 'Starting installation process...' },
      { time: '12:00:02', level: 'INFO', message: 'Cloning repository from GitHub...' },
      { time: '12:00:05', level: 'INFO', message: 'Repository cloned successfully' },
      { time: '12:00:06', level: 'INFO', message: 'Installing Python dependencies...' },
      { time: '12:00:10', level: 'INFO', message: 'Dependencies installed' },
    ]

    setLogs(mockLogs)

    return () => {
      // ws?.close()
      setLogs([])
    }
  }, [isOpen, notification])

  if (!isOpen || !notification) return null

  // 根据通知类型获取标题
  const getTitle = () => {
    switch (notification.type) {
      case NotificationType.TASK:
        return notification.task?.instanceName || '安装任务'
      case NotificationType.MESSAGE:
        return notification.title
      case NotificationType.WARNING:
        return notification.title
      case NotificationType.ERROR:
        return notification.title
    }
  }

  // 根据通知类型获取图标
  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.TASK:
        return 'ph:terminal-window'
      case NotificationType.MESSAGE:
        return 'ph:info'
      case NotificationType.WARNING:
        return 'ph:warning'
      case NotificationType.ERROR:
        return 'ph:x-circle'
    }
  }

  // 根据通知类型获取图标颜色
  const getIconColor = () => {
    switch (notification.type) {
      case NotificationType.TASK:
        return 'from-[#0077b6] to-[#00b4d8]'
      case NotificationType.MESSAGE:
        return 'from-[#0077b6] to-[#00b4d8]'
      case NotificationType.WARNING:
        return 'from-yellow-500 to-orange-500'
      case NotificationType.ERROR:
        return 'from-red-500 to-pink-500'
    }
  }

  const isTaskNotification = notification.type === NotificationType.TASK

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* 背景模糊遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 模态框主体 */}
      <div
        className={cn(
          'relative z-10',
          'w-full max-w-4xl max-h-[80vh]',
          'bg-white dark:bg-[#1a1a1a]',
          'rounded-2xl shadow-2xl',
          'border border-[#023e8a]/10 dark:border-white/10',
          'flex flex-col',
          'animate-in zoom-in-95 duration-200'
        )}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-[#023e8a]/10 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center text-white',
              `bg-gradient-to-br ${getIconColor()}`
            )}>
              <Icon icon={getIcon()} className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#03045e] dark:text-white">
                {getTitle()}
              </h3>
              <p className="text-sm text-[#023e8a]/70 dark:text-white/70">
                {notification.createdAt.toLocaleString('zh-CN')}
              </p>
            </div>
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#023e8a]/5 dark:hover:bg-white/5 transition-colors"
            aria-label="关闭"
          >
            <Icon icon="ph:x" className="w-6 h-6 text-[#023e8a]/70 dark:text-white/70" />
          </button>
        </div>

        {/* 任务通知：显示进度条 */}
        {isTaskNotification && notification.task && (
          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-[#023e8a] dark:text-white">
                {getStatusText(notification.task.status)}
              </span>
              <span className="text-[#023e8a]/60 dark:text-white/60">
                {notification.task.progress}%
              </span>
            </div>
            <div className="h-2 bg-[#023e8a]/10 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  notification.task.status === TaskStatus.FAILED 
                    ? 'bg-red-500' 
                    : notification.task.status === TaskStatus.SUCCESS
                    ? 'bg-green-500'
                    : 'bg-gradient-to-r from-[#0077b6] to-[#00b4d8]'
                )}
                style={{ width: `${notification.task.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isTaskNotification ? (
            // 任务通知：显示日志
            <div className="bg-[#1e1e1e] dark:bg-[#0a0a0a] rounded-lg p-4 font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  等待日志输出...
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="flex gap-3">
                      <span className="text-gray-500 flex-shrink-0">{log.time}</span>
                      <span className={cn(
                        'flex-shrink-0 font-semibold',
                        log.level === 'ERROR' && 'text-red-400',
                        log.level === 'WARN' && 'text-yellow-400',
                        log.level === 'INFO' && 'text-blue-400',
                        log.level === 'DEBUG' && 'text-gray-400'
                      )}>
                        [{log.level}]
                      </span>
                      <span className="text-gray-300">{log.message}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          ) : (
            // 其他通知类型：显示消息内容
            <div className={cn(
              'p-6 rounded-lg',
              notification.type === NotificationType.MESSAGE && 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800',
              notification.type === NotificationType.WARNING && 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800',
              notification.type === NotificationType.ERROR && 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800'
            )}>
              <p className={cn(
                'text-base leading-relaxed whitespace-pre-wrap',
                notification.type === NotificationType.MESSAGE && 'text-blue-900 dark:text-blue-100',
                notification.type === NotificationType.WARNING && 'text-yellow-900 dark:text-yellow-100',
                notification.type === NotificationType.ERROR && 'text-red-900 dark:text-red-100'
              )}>
                {notification.message}
              </p>
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-6 py-3 border-t border-[#023e8a]/10 dark:border-white/10 text-xs text-[#023e8a]/50 dark:text-white/50 text-center">
          按 ESC 键关闭窗口
        </div>
      </div>
    </div>
  )
}

// 获取任务状态文本
function getStatusText(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.PENDING:
      return '准备中...'
    case TaskStatus.DOWNLOADING:
      return '正在下载...'
    case TaskStatus.INSTALLING:
      return '正在安装...'
    case TaskStatus.SUCCESS:
      return '安装成功'
    case TaskStatus.FAILED:
      return '安装失败'
  }
}
