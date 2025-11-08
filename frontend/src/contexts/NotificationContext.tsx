/**
 * 通知上下文
 * 职责：全局共享通知状态
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Notification, NotificationType, TaskStatus } from '@/types/notification'

interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  isPopoverOpen: boolean
  setIsPopoverOpen: (open: boolean) => void
  togglePopover: () => void
  closePopover: () => void
  addTaskNotification: (data: {
    taskId: string
    instanceName: string
    version: string
    components: string[]
    deploymentPath: string
  }) => void
  updateTaskProgress: (taskId: string, progress: number, status: TaskStatus, message?: string) => void
  updateTaskId: (oldTaskId: string, newTaskId: string) => void
  addMessageNotification: (title: string, message: string) => void
  addWarningNotification: (title: string, message: string) => void
  addErrorNotification: (title: string, message: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAllNotifications: () => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  // 计算未读通知数量（只计算进行中的任务）
  const unreadCount = notifications.filter(
    n => !n.read && n.type === NotificationType.TASK && 
    n.task && [TaskStatus.PENDING, TaskStatus.DOWNLOADING, TaskStatus.INSTALLING].includes(n.task.status)
  ).length

  const togglePopover = useCallback(() => {
    setIsPopoverOpen(prev => !prev)
  }, [])

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false)
  }, [])

  // 添加任务通知
  const addTaskNotification = useCallback((data: {
    taskId: string
    instanceName: string
    version: string
    components: string[]
    deploymentPath: string
  }) => {
    console.log('[NotificationContext] 添加任务通知', data)
    
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

    console.log('[NotificationContext] 创建的通知对象:', notification)
    setNotifications(prev => {
      const newNotifications = [notification, ...prev]
      console.log('[NotificationContext] 更新后的通知列表:', newNotifications)
      return newNotifications
    })
  }, [])

  // 更新任务进度
  const updateTaskProgress = useCallback((taskId: string, progress: number, status: TaskStatus, message?: string) => {
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
            message: message || n.message,
          }
        }
        return n
      })
    )
  }, [])

  // 更新任务 ID
  const updateTaskId = useCallback((oldTaskId: string, newTaskId: string) => {
    console.log('[NotificationContext] 更新任务ID:', { oldTaskId, newTaskId })
    setNotifications(prev =>
      prev.map(n => {
        if (n.id === `task_${oldTaskId}` && n.task) {
          return {
            ...n,
            id: `task_${newTaskId}`,
            task: {
              ...n.task,
              taskId: newTaskId,
            },
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

  // 标记为已读
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  // 标记所有为已读
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  // 删除单个通知
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // 清空所有通知
  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    isPopoverOpen,
    setIsPopoverOpen,
    togglePopover,
    closePopover,
    addTaskNotification,
    updateTaskProgress,
    updateTaskId,
    addMessageNotification,
    addWarningNotification,
    addErrorNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within NotificationProvider')
  }
  return context
}
