import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { TaskStatus } from '@/types/notification'

interface InstallTask {
  taskId: string
  instanceName: string
  version: string
  components: string[]
  deploymentPath: string
  status: TaskStatus
  isActive: boolean
}

interface InstallTaskContextType {
  currentTask: InstallTask | null
  startTask: (task: Omit<InstallTask, 'status' | 'isActive'>) => void
  updateTaskStatus: (status: TaskStatus) => void
  completeTask: () => void
  cancelTask: () => void
  hasActiveTask: boolean
}

const InstallTaskContext = createContext<InstallTaskContextType | null>(null)

export function InstallTaskProvider({ children }: { children: ReactNode }) {
  const [currentTask, setCurrentTask] = useState<InstallTask | null>(() => {
    // 从 sessionStorage 恢复任务状态
    const saved = sessionStorage.getItem('currentInstallTask')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return null
      }
    }
    return null
  })

  // 持久化到 sessionStorage
  useEffect(() => {
    if (currentTask) {
      sessionStorage.setItem('currentInstallTask', JSON.stringify(currentTask))
    } else {
      sessionStorage.removeItem('currentInstallTask')
    }
  }, [currentTask])

  const startTask = useCallback((task: Omit<InstallTask, 'status' | 'isActive'>) => {
    console.log('[InstallTask] 开始任务:', task)
    setCurrentTask({
      ...task,
      status: TaskStatus.PENDING,
      isActive: true,
    })
  }, [])

  const updateTaskStatus = useCallback((status: TaskStatus) => {
    console.log('[InstallTask] 更新状态:', status)
    setCurrentTask(prev => prev ? { ...prev, status } : null)
  }, [])

  const completeTask = useCallback(() => {
    console.log('[InstallTask] 完成任务')
    setCurrentTask(prev => prev ? { ...prev, isActive: false } : null)
    // 1.5秒后清除任务
    setTimeout(() => {
      setCurrentTask(null)
    }, 1500)
  }, [])

  const cancelTask = useCallback(() => {
    console.log('[InstallTask] 取消任务')
    setCurrentTask(null)
  }, [])

  const hasActiveTask = currentTask?.isActive ?? false

  return (
    <InstallTaskContext.Provider
      value={{
        currentTask,
        startTask,
        updateTaskStatus,
        completeTask,
        cancelTask,
        hasActiveTask,
      }}
    >
      {children}
    </InstallTaskContext.Provider>
  )
}

export function useInstallTask() {
  const context = useContext(InstallTaskContext)
  if (!context) {
    throw new Error('useInstallTask must be used within InstallTaskProvider')
  }
  return context
}
