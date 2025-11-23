import { useEffect } from 'react'
import { useWebSocket } from '@/hooks'
import { useInstallTask } from '@/contexts/InstallTaskContext'
import { useNotificationContext } from '@/contexts/NotificationContext'
import { TaskStatus } from '@/types/notification'
import { mapServerStatusToTaskStatus } from '@/utils/taskStatus'

/**
 * 全局 WebSocket 管理器组件
 * 职责：
 * - 在任何页面都保持 WebSocket 连接
 * - 监听全局任务状态
 * - 实时更新通知
 */
export function GlobalWebSocketManager() {
  const { currentTask, updateTaskStatus, completeTask } = useInstallTask()
  const { updateTaskProgress } = useNotificationContext()

  // 只在有活跃任务时才传递 taskId，避免无效连接
  const taskId = currentTask?.isActive ? currentTask.taskId : null

  // WebSocket 连接
  useWebSocket(taskId, {
    onProgress: (message) => {
      if (message.percentage !== undefined && taskId) {
        const taskStatus = mapServerStatusToTaskStatus(message.status)
        
        updateTaskProgress(taskId, message.percentage, taskStatus, message.message)
        updateTaskStatus(taskStatus)
      }
    },
    onStatus: (message) => {
      const taskStatus = mapServerStatusToTaskStatus(message.status)
      
      updateTaskStatus(taskStatus)
    },
    onComplete: () => {
      if (taskId) {
        updateTaskProgress(taskId, 100, TaskStatus.SUCCESS)
        updateTaskStatus(TaskStatus.SUCCESS)
        completeTask()
      }
    },
    onError: () => {
      if (taskId) {
        updateTaskProgress(taskId, 0, TaskStatus.FAILED)
        updateTaskStatus(TaskStatus.FAILED)
        completeTask()
      }
    }
  })

  useEffect(() => {
    if (currentTask?.isActive) {
      console.log('[GlobalWebSocket] 活跃任务:', currentTask.taskId)
    }
  }, [currentTask])

  return null // 这是一个无 UI 的组件
}
