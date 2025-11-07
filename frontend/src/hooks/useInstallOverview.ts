import { useState, useCallback } from 'react'
import { InstallOverviewState, TaskStatus } from '@/types/notification'

/**
 * 安装概要状态管理 Hook
 * 职责：
 * - 管理概要卡片的显示/隐藏
 * - 管理安装任务的基本信息
 * - 监听任务状态变化
 * - 保持状态持久化（切换页面后保持）
 */
export function useInstallOverview() {
  const [state, setState] = useState<InstallOverviewState>({
    visible: false,
    taskId: null,
    instanceName: '',
    version: '',
    components: [],
    deploymentPath: '',
    status: TaskStatus.PENDING,
    loading: false,
  })

  // 显示概要卡片
  const showOverview = useCallback((data: {
    taskId: string
    instanceName: string
    version: string
    components: string[]
    deploymentPath: string
  }) => {
    setState({
      visible: true,
      taskId: data.taskId,
      instanceName: data.instanceName,
      version: data.version,
      components: data.components,
      deploymentPath: data.deploymentPath,
      status: TaskStatus.PENDING,
      loading: true,
    })

    // 模拟加载完成（骨架屏展示 500ms）
    setTimeout(() => {
      setState(prev => ({ ...prev, loading: false }))
    }, 500)
  }, [])

  // 更新任务状态
  const updateStatus = useCallback((status: TaskStatus) => {
    setState(prev => ({ ...prev, status }))

    // 如果任务完成或失败，1.5 秒后隐藏概要卡片
    if (status === TaskStatus.SUCCESS || status === TaskStatus.FAILED) {
      setTimeout(() => {
        setState(prev => ({ ...prev, visible: false }))
      }, 1500)
    }
  }, [])

  // 隐藏概要卡片
  const hideOverview = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }))
  }, [])

  // 重置状态
  const resetOverview = useCallback(() => {
    setState({
      visible: false,
      taskId: null,
      instanceName: '',
      version: '',
      components: [],
      deploymentPath: '',
      status: TaskStatus.PENDING,
      loading: false,
    })
  }, [])

  return {
    state,
    showOverview,
    updateStatus,
    hideOverview,
    resetOverview,
  }
}
