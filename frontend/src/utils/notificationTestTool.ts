/**
 * 通知系统测试工具
 * 在浏览器控制台中使用以下命令测试通知系统：
 * 
 * testNotification.info('标题', '这是一条信息')
 * testNotification.warning('警告', '这是一条警告')
 * testNotification.error('错误', '这是一条错误')
 * testNotification.task('测试任务', 'v1.0.0', ['组件1', '组件2'])
 * testNotification.updateTask(taskId, 50, 'installing')
 * testNotification.clearAll()
 */

import { TaskStatus } from '@/types/notification'

interface NotificationHandlers {
  addMessageNotification: (title: string, message: string) => void
  addWarningNotification: (title: string, message: string) => void
  addErrorNotification: (title: string, message: string) => void
  addTaskNotification: (data: {
    taskId: string
    instanceName: string
    version: string
    components: string[]
    deploymentPath: string
  }) => void
  updateTaskProgress: (taskId: string, progress: number, status: TaskStatus) => void
  clearAllNotifications: () => void
}

let notificationHandlers: NotificationHandlers | null = null
let lastTaskId = ''

export function registerNotificationHandlers(handlers: NotificationHandlers) {
  notificationHandlers = handlers
  console.log('✅ 通知测试工具已注册')
}

// 创建全局测试接口
export function setupNotificationTestCommands() {
  if (typeof window === 'undefined') return

  const testNotification = {
    /**
     * 发送消息通知
     * @example testNotification.info('提示', '这是一条信息')
     */
    info: (title: string, message: string) => {
      if (!notificationHandlers) {
        console.error('❌ 通知系统未初始化')
        return
      }
      console.log(`📨 发送消息通知: ${title} - ${message}`)
      notificationHandlers.addMessageNotification(title, message)
    },

    /**
     * 发送警告通知
     * @example testNotification.warning('注意', '这是一条警告')
     */
    warning: (title: string, message: string) => {
      if (!notificationHandlers) {
        console.error('❌ 通知系统未初始化')
        return
      }
      console.log(`⚠️ 发送警告通知: ${title} - ${message}`)
      notificationHandlers.addWarningNotification(title, message)
    },

    /**
     * 发送错误通知
     * @example testNotification.error('错误', '这是一条错误')
     */
    error: (title: string, message: string) => {
      if (!notificationHandlers) {
        console.error('❌ 通知系统未初始化')
        return
      }
      console.log(`🚨 发送错误通知: ${title} - ${message}`)
      notificationHandlers.addErrorNotification(title, message)
    },

    /**
     * 创建任务通知
     * @example testNotification.task('我的机器人', 'v2.0.0', ['Maibot', 'Napcat'])
     */
    task: (instanceName: string, version: string, components: string[]) => {
      if (!notificationHandlers) {
        console.error('❌ 通知系统未初始化')
        return
      }
      const taskId = `test_task_${Date.now()}`
      lastTaskId = taskId
      console.log(`📦 创建任务通知: ${instanceName} (${taskId})`)
      notificationHandlers.addTaskNotification({
        taskId,
        instanceName,
        version,
        components,
        deploymentPath: '/test/path',
      })
      console.log(`💡 提示: 使用 testNotification.updateTask('${taskId}', 进度, '状态') 更新进度`)
      return taskId
    },

    /**
     * 更新任务进度
     * @example testNotification.updateTask('task_123', 50, 'installing')
     * 状态: 'pending' | 'downloading' | 'installing' | 'success' | 'failed'
     */
    updateTask: (taskId: string | undefined, progress: number, status: string) => {
      if (!notificationHandlers) {
        console.error('❌ 通知系统未初始化')
        return
      }
      const id = taskId || lastTaskId
      if (!id) {
        console.error('❌ 没有任务 ID，请先创建任务或提供任务 ID')
        return
      }
      
      const statusMap: Record<string, TaskStatus> = {
        'pending': TaskStatus.PENDING,
        'downloading': TaskStatus.DOWNLOADING,
        'installing': TaskStatus.INSTALLING,
        'success': TaskStatus.SUCCESS,
        'failed': TaskStatus.FAILED,
      }
      
      const taskStatus = statusMap[status.toLowerCase()] || TaskStatus.PENDING
      console.log(`🔄 更新任务进度: ${id} - ${progress}% (${status})`)
      notificationHandlers.updateTaskProgress(id, progress, taskStatus)
    },

    /**
     * 清空所有通知
     * @example testNotification.clearAll()
     */
    clearAll: () => {
      if (!notificationHandlers) {
        console.error('❌ 通知系统未初始化')
        return
      }
      console.log('🗑️ 清空所有通知')
      notificationHandlers.clearAllNotifications()
    },

    /**
     * 模拟完整的安装流程
     * @example testNotification.demo()
     */
    demo: () => {
      if (!notificationHandlers) {
        console.error('❌ 通知系统未初始化')
        return
      }
      console.log('🎬 开始演示完整安装流程...')
      
      const taskId = testNotification.task('演示机器人', 'v2.0.0', ['Maibot', 'Napcat', 'Adapter'])
      
      setTimeout(() => {
        testNotification.updateTask(taskId, 20, 'downloading')
      }, 1000)
      
      setTimeout(() => {
        testNotification.updateTask(taskId, 50, 'downloading')
      }, 2000)
      
      setTimeout(() => {
        testNotification.updateTask(taskId, 70, 'installing')
      }, 3000)
      
      setTimeout(() => {
        testNotification.updateTask(taskId, 90, 'installing')
      }, 4000)
      
      setTimeout(() => {
        testNotification.updateTask(taskId, 100, 'success')
        console.log('✅ 演示完成！')
      }, 5000)
    },

    /**
     * 显示帮助信息
     */
    help: () => {
      console.log(`
📚 通知系统测试命令帮助

基础通知:
  testNotification.info('标题', '消息内容')     - 发送消息通知（浅蓝色）
  testNotification.warning('标题', '消息内容')  - 发送警告通知（黄色）
  testNotification.error('标题', '消息内容')    - 发送错误通知（红色）

任务通知:
  testNotification.task('实例名', '版本', ['组件1', '组件2'])  - 创建任务
  testNotification.updateTask(taskId, 进度, '状态')          - 更新任务进度
    状态选项: 'pending', 'downloading', 'installing', 'success', 'failed'

工具命令:
  testNotification.clearAll()  - 清空所有通知
  testNotification.demo()      - 播放完整演示动画

示例:
  testNotification.info('提示', '这是一条测试消息')
  testNotification.warning('警告', '磁盘空间不足')
  testNotification.error('错误', '网络连接失败')
  
  const taskId = testNotification.task('我的机器人', 'v2.0.0', ['Maibot'])
  testNotification.updateTask(taskId, 50, 'installing')
  testNotification.updateTask(taskId, 100, 'success')
      `)
    }
  }

  // 注册到全局
  ;(window as any).testNotification = testNotification
  
  console.log('🧪 通知测试工具已加载！输入 testNotification.help() 查看帮助')
}
