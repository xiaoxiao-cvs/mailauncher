/**
 * 下载管理自定义 Hook
 * 职责:管理下载项的状态和操作
 */

import { useState, useEffect, useCallback } from 'react'
import { getApiUrl } from '@/config/api'
import type { DownloadItem, MaibotVersion } from '@/types/download'
import logger from '@/utils/logger'

const downloadLogger = logger.withTag('Download')

/**
 * 获取操作系统类型
 */
const getPlatform = (): 'macos' | 'windows' | 'linux' => {
  const platform = window.navigator.platform.toLowerCase()
  if (platform.includes('mac')) return 'macos'
  if (platform.includes('win')) return 'windows'
  return 'linux'
}

/**
 * 初始化下载项列表
 */
const initializeDownloadItems = (): DownloadItem[] => {
  const platform = getPlatform()
  
  const items: DownloadItem[] = [
    {
      id: 'maibot',
      type: 'maibot',
      name: 'Maibot',
      description: 'MAI 机器人核心框架',
      status: 'pending',
      required: true,
      platform: 'all'
    },
    {
      id: 'adapter',
      type: 'adapter',
      name: 'MaiBot-Napcat-Adapter',
      description: 'Napcat 适配器',
      status: 'pending',
      required: true,
      platform: 'all'
    },
    {
      id: 'napcat',
      type: 'napcat',
      name: 'Napcat',
      description: 'Shell 版本',
      status: 'pending',
      required: true,
      platform: 'all'
    }
  ]

  // macOS 需要额外安装 Quick-algo 编译依赖
  if (platform === 'macos') {
    items.push({
      id: 'quick-algo',
      type: 'quick-algo',
      name: 'MaiMBot-LPMM',
      description: '编译 Quick-algo',
      status: 'pending',
      required: true,
      platform: 'macos'
    })
  }

  return items
}

/**
 * Maibot 可用版本列表
 */
const MAIBOT_VERSIONS: MaibotVersion[] = [
  {
    source: 'latest',
    value: 'latest',
    label: '最新代码 (main)'
  },
  // 这些将从后端 API 获取
  // {
  //   source: 'tag',
  //   value: 'v1.0.0',
  //   label: 'v1.0.0'
  // },
  // {
  //   source: 'branch',
  //   value: 'develop',
  //   label: 'develop 分支'
  // }
]

export function useDownload() {
  const [deploymentPath, setDeploymentPath] = useState<string>('')
  const [instanceName, setInstanceName] = useState<string>('')
  const [downloadItems, setDownloadItems] = useState<DownloadItem[]>(initializeDownloadItems())
  const [selectedMaibotVersion, setSelectedMaibotVersion] = useState<MaibotVersion>(MAIBOT_VERSIONS[0])
  const [maibotVersions] = useState<MaibotVersion[]>(MAIBOT_VERSIONS)
  const [isLoadingPath, setIsLoadingPath] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  /**
   * 初始化时选中所有必需项
   */
  useEffect(() => {
    const platform = getPlatform()
    const requiredIds = downloadItems
      .filter(item => {
        // 已完成或已安装的不自动选中
        if (item.status === 'completed' || item.status === 'installed') return false
        // macOS 下 quick-algo 选中
        if (platform === 'macos' && item.type === 'quick-algo') return true
        // 其他必需项
        return item.required && item.type !== 'quick-algo'
      })
      .map(item => item.id)
    setSelectedItems(new Set(requiredIds))
  }, [downloadItems])

  /**
   * 切换组件选择状态
   */
  const toggleItemSelection = useCallback((itemId: string) => {
    const platform = getPlatform()
    const item = downloadItems.find(i => i.id === itemId)
    
    // macOS 下不允许取消选择 quick-algo
    if (platform === 'macos' && item?.type === 'quick-algo') {
      return
    }
    
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [downloadItems])

  /**
   * 从后端加载部署路径
   */
  const loadDeploymentPath = useCallback(async () => {
    downloadLogger.info('加载部署路径配置')
    setIsLoadingPath(true)
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/environment/config`)
      const data = await response.json()
      
      if (data.success) {
        setDeploymentPath(data.data.instances_dir)
        downloadLogger.success('部署路径加载成功', { path: data.data.instances_dir })
      } else {
        throw new Error(data.message || '加载失败')
      }
    } catch (error) {
      downloadLogger.error('加载部署路径失败', error)
      // 使用默认值
      setDeploymentPath('')
    } finally {
      setIsLoadingPath(false)
    }
  }, [])

  /**
   * 选择部署路径文件夹
   */
  const selectDeploymentPath = useCallback(async () => {
    downloadLogger.info('打开文件夹选择器')
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择部署目录'
      })
      
      if (selected) {
        const selectedPath = selected as string
        setDeploymentPath(selectedPath)
        downloadLogger.success('用户选择路径', { path: selectedPath })
        
        // TODO: 保存到后端
        // await saveDeploymentPath(selectedPath)
      }
    } catch (error) {
      downloadLogger.error('选择文件夹失败', error)
    }
  }, [])

  /**
   * 更新下载项状态
   */
  const updateItemStatus = useCallback((itemId: string, status: Partial<Pick<DownloadItem, 'status' | 'progress' | 'error' | 'version'>>) => {
    setDownloadItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...status } : item
    ))
  }, [])

  /**
   * 开始下载单个项目
   */
  const downloadItem = useCallback(async (itemId: string) => {
    const item = downloadItems.find(i => i.id === itemId)
    if (!item) return

    downloadLogger.info(`开始下载: ${item.name}`)
    updateItemStatus(itemId, { status: 'downloading', progress: 0 })

    try {
      // TODO: 调用后端 API 进行下载
      // 这里先模拟下载过程
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      updateItemStatus(itemId, { 
        status: 'completed', 
        progress: 100,
        version: item.type === 'maibot' ? selectedMaibotVersion.label : 'latest'
      })
      downloadLogger.success(`下载完成: ${item.name}`)
    } catch (error) {
      downloadLogger.error(`下载失败: ${item.name}`, error)
      updateItemStatus(itemId, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : '下载失败'
      })
    }
  }, [downloadItems, selectedMaibotVersion, updateItemStatus])

  /**
   * 开始下载所有项目
   * @returns 返回任务 ID，如果失败则返回 null
   */
  const downloadAll = useCallback(async (): Promise<string | null> => {
    if (!deploymentPath) {
      downloadLogger.error('请先选择部署路径')
      return null
    }

    if (!instanceName || instanceName.trim() === '') {
      downloadLogger.error('请输入实例名称')
      return null
    }

    if (selectedItems.size === 0) {
      downloadLogger.error('请选择要下载的组件')
      return null
    }

    setIsDownloading(true)
    downloadLogger.info('开始批量下载和安装')

    try {
      const apiUrl = getApiUrl()
      
      // 构建下载任务数据
      const selectedItemsArray = Array.from(selectedItems)
      const taskData = {
        instance_name: instanceName.trim(),
        deployment_path: deploymentPath,
        maibot_version_source: selectedMaibotVersion.source,
        maibot_version_value: selectedMaibotVersion.value,
        selected_items: selectedItemsArray.map(itemId => {
          const item = downloadItems.find(i => i.id === itemId)
          if (!item) return itemId
          // 转换前端 ID 到后端枚举值
          switch (item.type) {
            case 'maibot': return 'maibot'
            case 'adapter': return 'napcat-adapter'
            case 'napcat': return 'napcat'
            case 'quick-algo': return 'lpmm'
            default: return item.type
          }
        })
        // 注意: venv_type 不需要前端传递，后端会从数据库读取用户在引导页配置的值
      }

      downloadLogger.info('创建下载任务', taskData)

      // 创建下载任务
      const response = await fetch(`${apiUrl}/downloads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || '创建下载任务失败')
      }

      const task = result.data
      const taskId = task.id
      downloadLogger.success('下载任务已创建', { taskId })

      // 返回任务 ID 供调用方使用
      return taskId

    } catch (error) {
      downloadLogger.error('下载任务执行失败', error)
      setIsDownloading(false)
      
      // 将所有选中项标记为失败
      selectedItems.forEach(itemId => {
        updateItemStatus(itemId, {
          status: 'failed',
          error: error instanceof Error ? error.message : '下载失败'
        })
      })
      
      return null
    }
  }, [deploymentPath, instanceName, downloadItems, selectedMaibotVersion, selectedItems, updateItemStatus])

  /**
   * 重试下载
   */
  const retryDownload = useCallback(async (itemId: string) => {
    updateItemStatus(itemId, { status: 'pending', error: undefined, progress: 0 })
    await downloadItem(itemId)
  }, [downloadItem, updateItemStatus])

  // 页面加载时获取部署路径
  useEffect(() => {
    loadDeploymentPath()
  }, [loadDeploymentPath])

  return {
    deploymentPath,
    instanceName,
    downloadItems,
    selectedMaibotVersion,
    maibotVersions,
    isLoadingPath,
    isDownloading,
    selectedItems,
    setDeploymentPath,
    setInstanceName,
    selectDeploymentPath,
    setSelectedMaibotVersion,
    downloadItem,
    downloadAll,
    retryDownload,
    updateItemStatus,
    toggleItemSelection
  }
}
