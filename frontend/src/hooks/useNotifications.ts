import { useState, useCallback, useEffect } from 'react'
import { Notification, NotificationType, TaskStatus } from '@/types/notification'

/**
 * 通知管理 Hook
 * 职责：
 * - 管理所有通知列表
 * - 提供添加、删除、更新通知的方法
 * - 计算未读通知数量
 * - WebSocket 消息转换为通知
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  // 计算未读通知数量（只计算进行中的任务）
  const unreadCount = notifications.filter(
    n => !n.read && n.type === NotificationType.TASK && 
    n.task && [TaskStatus.PENDING, TaskStatus.DOWNLOADING, TaskStatus.INSTALLING].includes(n.task.status)
  ).length

  // 添加任务通知
  const addTaskNotification = useCallback((data: {
    taskId: string
    instanceName: string
    version: string
    components: string[]
    deploymentPath: string
  }) => {
    const notification: Notification = {
      id: `task_${data.taskId}`,
      type: NotificationType.TASK,
      title: `正在安装 ${data.instanceName}`,
      message: `版本 ${data.version}`,
      createdAt: new Date(),
      read: false,
      task: {
        taskId: data.taskId,
        status: TaskStatus.PENDING,
        progress: 0,
        instanceName: data.instanceName,
        version: data.version,
        components: data.components,
        deploymentPath: data.deploymentPath,
      },
    }

    setNotifications(prev => [notification, ...prev])
  }, [])

  // 更新任务进度
  const updateTaskProgress = useCallback((taskId: string, progress: number, status: TaskStatus) => {
    setNotifications(prev =>
      prev.map(n => {
        if (n.id === `task_${taskId}` && n.task) {
          return {
            ...n,
            task: {
              ...n.task,
              progress,
              status,
            },
            title: status === TaskStatus.SUCCESS 
              ? `安装成功 ${n.task.instanceName}`
              : status === TaskStatus.FAILED
              ? `安装失败 ${n.task.instanceName}`
              : `正在安装 ${n.task.instanceName}`,
          }
        }
        return n
      })
    )
  }, [])

  // 添加消息通知
  const addMessageNotification = useCallback((title: string, message: string) => {
    const notification: Notification = {
      id: `msg_${Date.now()}`,
      type: NotificationType.MESSAGE,
      title,
      message,
      createdAt: new Date(),
      read: false,
    }

    setNotifications(prev => [notification, ...prev])
  }, [])

  // 添加警告通知
  const addWarningNotification = useCallback((title: string, message: string) => {
    const notification: Notification = {
      id: `warn_${Date.now()}`,
      type: NotificationType.WARNING,
      title,
      message,
      createdAt: new Date(),
      read: false,
    }

    setNotifications(prev => [notification, ...prev])
  }, [])

  // 添加错误通知
  const addErrorNotification = useCallback((title: string, message: string) => {
    const notification: Notification = {
      id: `err_${Date.now()}`,
      type: NotificationType.ERROR,
      title,
      message,
      createdAt: new Date(),
      read: false,
    }

    setNotifications(prev => [notification, ...prev])
  }, [])

  // 标记通知为已读
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  // 删除单个通知
  const removeNotification = useCallback((id: string) => {
    // 如果删除的是欢迎消息，记录状态防止再次显示
    if (id === 'welcome_msg') {
      localStorage.setItem('welcome_notification_dismissed', 'true')
    }
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // 清空所有通知
  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // 切换气泡显示状态
  const togglePopover = useCallback(() => {
    setIsPopoverOpen(prev => !prev)
  }, [])

  // 关闭气泡
  const closePopover = useCallback(() => {
    setIsPopoverOpen(false)
  }, [])

  // 打开气泡
  const openPopover = useCallback(() => {
    setIsPopoverOpen(true)
  }, [])

  // 初始化时添加欢迎消息（用户删除后不再显示）
  useEffect(() => {
    const timer = setTimeout(() => {
      // 检查用户是否已经删除过欢迎消息
      const welcomeDismissed = localStorage.getItem('welcome_notification_dismissed')
      if (welcomeDismissed === 'true') {
        return // 用户已删除，不再显示
      }

      const hasWelcomeMessage = notifications.some(n => n.id === 'welcome_msg')
      if (!hasWelcomeMessage && notifications.length === 0) {
        const welcomeNotification: Notification = {
          id: 'welcome_msg',
          type: NotificationType.MESSAGE,
          title: '提示',
          message: '点击任务可查看详细日志',
          createdAt: new Date(),
          read: false,
        }
        setNotifications([welcomeNotification])
      }
    }, 100)

    return () => clearTimeout(timer)
  }, []) // 只在组件挂载时执行一次

  return {
    notifications,
    unreadCount,
    isPopoverOpen,
    addTaskNotification,
    updateTaskProgress,
    addMessageNotification,
    addWarningNotification,
    addErrorNotification,
    markAsRead,
    removeNotification,
    clearAllNotifications,
    togglePopover,
    closePopover,
    openPopover,
  }
}
