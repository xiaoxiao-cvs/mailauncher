import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { Notification, NotificationType, TaskStatus } from '@/types/notification'
import { useWebSocket } from '@/hooks'
import { useNotificationContext } from '@/contexts/NotificationContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface InstallLogModalProps {
  isOpen: boolean
  notification: Notification | null
  onClose: () => void
}

interface LogEntry {
  time: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
}

/**
 * 通知详情全屏模态框
 * 支持所有类型的通知（TASK/MESSAGE/WARNING/ERROR）
 */
export default function InstallLogModal({ isOpen, notification, onClose }: InstallLogModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)
  const { updateTaskProgress, notifications } = useNotificationContext()
  
  // 🎯 从 context 中实时获取最新的通知数据（包含最新进度）
  const currentNotification = notification 
    ? notifications.find(n => n.id === notification.id) || notification
    : null

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

  // 获取任务 ID（使用实时的 currentNotification）
  const taskId = currentNotification?.type === NotificationType.TASK ? currentNotification.task?.taskId || null : null

  // WebSocket 连接（仅任务通知）
  useWebSocket(isOpen ? taskId : null, {
    onLog: (message) => {
      const logEntry: LogEntry = {
        time: new Date(message.timestamp).toLocaleTimeString(),
        level: message.level,
        message: message.message
      }
      setLogs(prev => [...prev, logEntry])
    },
    onProgress: (message) => {
      const logEntry: LogEntry = {
        time: new Date(message.timestamp).toLocaleTimeString(),
        level: 'info',
        message: `[${message.percentage.toFixed(0)}%] ${message.message}`
      }
      setLogs(prev => [...prev, logEntry])
      
      // 更新通知的进度 ⭐ 实时更新进度条
      if (taskId) {
        const statusMap: Record<string, TaskStatus> = {
          'pending': TaskStatus.PENDING,
          'downloading': TaskStatus.DOWNLOADING,
          'installing': TaskStatus.INSTALLING,
        }
        const status = statusMap[message.status] || TaskStatus.DOWNLOADING
        updateTaskProgress(taskId, message.percentage, status, message.message)
      }
    },
    onStatus: (message) => {
      const logEntry: LogEntry = {
        time: new Date(message.timestamp).toLocaleTimeString(),
        level: 'info',
        message: `状态变更: ${message.message}`
      }
      setLogs(prev => [...prev, logEntry])
      
      // 更新通知的状态 ⭐
      if (taskId && currentNotification?.task) {
        const statusMap: Record<string, TaskStatus> = {
          'pending': TaskStatus.PENDING,
          'downloading': TaskStatus.DOWNLOADING,
          'installing': TaskStatus.INSTALLING,
        }
        const status = statusMap[message.status] || currentNotification.task.status
        updateTaskProgress(taskId, currentNotification.task.progress, status, message.message)
      }
    },
    onError: (message) => {
      const logEntry: LogEntry = {
        time: new Date(message.timestamp).toLocaleTimeString(),
        level: 'error',
        message: message.message
      }
      setLogs(prev => [...prev, logEntry])
      
      // 更新为失败状态 ⭐
      if (taskId && currentNotification?.task) {
        updateTaskProgress(taskId, currentNotification.task.progress, TaskStatus.FAILED, message.message)
      }
    },
    onComplete: (message) => {
      const logEntry: LogEntry = {
        time: new Date(message.timestamp).toLocaleTimeString(),
        level: 'success',
        message: message.message
      }
      setLogs(prev => [...prev, logEntry])
      
      // 更新为成功状态 ⭐
      if (taskId) {
        updateTaskProgress(taskId, 100, TaskStatus.SUCCESS, message.message)
      }
    }
  })

  // 清空日志
  useEffect(() => {
    if (!isOpen) {
      setLogs([])
    }
  }, [isOpen])

  if (!isOpen || !currentNotification) return null

  // 根据通知类型获取标题
  const getTitle = () => {
    switch (currentNotification.type) {
      case NotificationType.TASK:
        return currentNotification.task?.instanceName || '安装任务'
      case NotificationType.MESSAGE:
        return currentNotification.title
      case NotificationType.WARNING:
        return currentNotification.title
      case NotificationType.ERROR:
        return currentNotification.title
    }
  }

  // 根据通知类型获取图标
  const getIcon = () => {
    switch (currentNotification.type) {
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
    switch (currentNotification.type) {
      case NotificationType.TASK:
        return 'from-brand to-brand/70'
      case NotificationType.MESSAGE:
        return 'from-brand to-brand/70'
      case NotificationType.WARNING:
        return 'from-yellow-500 to-orange-500'
      case NotificationType.ERROR:
        return 'from-red-500 to-pink-500'
    }
  }

  const isTaskNotification = currentNotification.type === NotificationType.TASK

  return createPortal(
    <>
      {/* 背景遮罩 - 仅覆盖主显示区域，避开 Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 left-0 md:left-64 z-[40]", 
          "backdrop-blur-md", // 纯磨砂，无背景色
          "animate-in fade-in duration-300"
        )}
        onClick={onClose}
      />

      {/* 模态框主体容器 - 限制在主显示区域内居中 */}
      <div className="fixed top-0 right-0 bottom-0 left-0 md:left-64 z-[60] flex items-center justify-center pointer-events-none">
        {/* 模态框主体 */}
        <div
          className={cn(
            "relative",
            "w-full max-w-2xl mx-4", // 移除 md:ml-[18rem]，因为容器已经定位
            "bg-popover backdrop-blur-xl",
            "rounded-panel shadow-overlay",
            "border border-white/20 dark:border-white/10",
            "flex flex-col overflow-hidden",
            "animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300 ease-out-expo",
            // 任务通知固定高度以避免切换 Tab 时跳动，其他通知自适应
            isTaskNotification ? "h-[600px] max-h-[85vh]" : "h-auto max-h-[85vh]",
            "pointer-events-auto" // 恢复点击事件
          )}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-white/50 dark:bg-white/10", getIconColor())}>
                <Icon icon={getIcon()} className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                {getTitle()}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-muted-foreground"
            >
              <Icon icon="ph:x" className="w-5 h-5" />
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {isTaskNotification ? (
              <Tabs defaultValue="details" className="flex-1 flex flex-col h-full">
                <div className="px-6 pt-4">
                  <TabsList className="grid w-full grid-cols-2 bg-black/5 dark:bg-white/5">
                    <TabsTrigger value="details">任务详情</TabsTrigger>
                    <TabsTrigger value="logs">实时日志</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-hidden relative">
                  <TabsContent value="details" className="h-full m-0 p-6 overflow-y-auto space-y-6">
                    {/* 状态卡片 */}
                    <div className="p-6 rounded-card bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5 flex flex-col items-center text-center space-y-4">
                      <div className={cn("w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br shadow-lg", 
                        currentNotification.task?.status === TaskStatus.SUCCESS ? "from-green-400 to-green-600" :
                        currentNotification.task?.status === TaskStatus.FAILED ? "from-red-400 to-red-600" :
                        "from-blue-400 to-blue-600"
                      )}>
                        <Icon icon={
                          currentNotification.task?.status === TaskStatus.SUCCESS ? "ph:check-bold" :
                          currentNotification.task?.status === TaskStatus.FAILED ? "ph:x-bold" :
                          "ph:spinner-gap-bold"
                        } className={cn("w-8 h-8 text-white", 
                          (currentNotification.task?.status === TaskStatus.DOWNLOADING || currentNotification.task?.status === TaskStatus.INSTALLING) && "animate-spin"
                        )} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-1">
                          {currentNotification.task?.status === TaskStatus.SUCCESS ? "安装完成" :
                           currentNotification.task?.status === TaskStatus.FAILED ? "安装失败" :
                           "正在处理..."}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {currentNotification.message}
                        </p>
                      </div>
                      
                      {/* 进度条 */}
                      {(currentNotification.task?.status === TaskStatus.DOWNLOADING || currentNotification.task?.status === TaskStatus.INSTALLING) && (
                        <div className="w-full max-w-xs space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>进度</span>
                            <span>{currentNotification.task?.progress?.toFixed(0) || '0'}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-300 ease-out"
                              style={{ width: `${currentNotification.task?.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 详细信息列表 */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">详细信息</h4>
                      <div className="grid grid-cols-1 gap-3">
                        <InfoItem label="任务 ID" value={currentNotification.task?.taskId || '-'} />
                        <InfoItem label="实例名称" value={currentNotification.task?.instanceName || '-'} />
                        <InfoItem label="开始时间" value={new Date(currentNotification.createdAt).toLocaleString()} />
                        <InfoItem label="当前状态" value={currentNotification.task?.status || '-'} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="logs" className="h-full m-0 flex flex-col">
                    <div className="flex-1 bg-[#1e1e1e] p-4 overflow-y-auto font-mono text-xs space-y-1">
                      {logs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          等待日志连接...
                        </div>
                      ) : (
                        logs.map((log, index) => (
                          <div key={index} className="flex gap-2 hover:bg-white/5 px-1 rounded">
                            <span className="text-gray-500 shrink-0 select-none">[{log.time}]</span>
                            <span className={cn(
                              "break-all",
                              log.level === 'error' ? 'text-red-400' :
                              log.level === 'warning' ? 'text-yellow-400' :
                              log.level === 'success' ? 'text-green-400' :
                              'text-gray-300'
                            )}>
                              {log.message}
                            </span>
                          </div>
                        ))
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            ) : (
              // 非任务通知的简单视图
              <div className="p-8 flex flex-col items-center text-center space-y-6">
                <div className={cn("w-20 h-20 rounded-full flex items-center justify-center bg-opacity-10", 
                  currentNotification.type === NotificationType.ERROR ? "bg-red-500 text-red-500" :
                  currentNotification.type === NotificationType.WARNING ? "bg-yellow-500 text-yellow-500" :
                  "bg-blue-500 text-blue-500"
                )}>
                  <Icon icon={getIcon()} className="w-10 h-10" />
                </div>
                <div className="space-y-2 max-w-md">
                  <h3 className="text-2xl font-bold text-foreground">
                    {currentNotification.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {currentNotification.message}
                  </p>
                </div>
                <div className="pt-4 text-sm text-muted-foreground">
                  {new Date(currentNotification.createdAt).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

function InfoItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center p-3 rounded-lg bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground font-mono">{value}</span>
    </div>
  )
}
