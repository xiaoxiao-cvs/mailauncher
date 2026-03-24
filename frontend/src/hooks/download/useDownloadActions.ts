import { useState, useEffect, useCallback } from 'react'
import { tauriInvoke } from '@/services/tauriInvoke'
import type { DownloadItem, MaibotVersion } from '@/types/download'
import logger from '@/utils/logger'
import { getPlatform, initializeDownloadItems } from './constants'

const downloadLogger = logger.withTag('Download')

interface UseDownloadActionsParams {
  deploymentPath: string
  instanceName: string
  selectedMaibotVersion: MaibotVersion
  pythonPath: string | null
}

export function useDownloadActions(params: UseDownloadActionsParams) {
  const { deploymentPath, instanceName, selectedMaibotVersion, pythonPath } = params

  const [downloadItems, setDownloadItems] = useState<DownloadItem[]>(initializeDownloadItems())
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    const platform = getPlatform()
    const requiredIds = downloadItems
      .filter(item => {
        if (item.status === 'completed' || item.status === 'installed') return false
        if (platform === 'macos' && item.type === 'quick-algo') return true
        return item.required && item.type !== 'quick-algo'
      })
      .map(item => item.id)
    setSelectedItems(new Set(requiredIds))
  }, [downloadItems])

  const toggleItemSelection = useCallback((itemId: string) => {
    const platform = getPlatform()
    const item = downloadItems.find(i => i.id === itemId)

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

  const updateItemStatus = useCallback((itemId: string, status: Partial<Pick<DownloadItem, 'status' | 'progress' | 'error' | 'version'>>) => {
    setDownloadItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, ...status } : item
    ))
  }, [])

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
      const selectedItemsArray = Array.from(selectedItems)
      const data = {
        instance_name: instanceName.trim(),
        deployment_path: null,
        maibot_version_source: selectedMaibotVersion.source,
        maibot_version_value: selectedMaibotVersion.value,
        selected_items: selectedItemsArray.map(itemId => {
          const item = downloadItems.find(i => i.id === itemId)
          if (!item) return itemId
          switch (item.type) {
            case 'maibot': return 'maibot'
            case 'adapter': return 'napcat-adapter'
            case 'napcat': return 'napcat'
            case 'quick-algo': return 'lpmm'
            default: return item.type
          }
        }),
        python_path: pythonPath,
      }

      downloadLogger.info('创建下载任务', data)

      // Rust 命令直接返回 DownloadTask，无 {success, data} 包装
      const task = await tauriInvoke<{ id: string }>('create_download_task', { data })

      const taskId = task.id
      downloadLogger.success('下载任务已创建', { taskId })

      return taskId

    } catch (error) {
      downloadLogger.error('下载任务执行失败', error)
      setIsDownloading(false)

      selectedItems.forEach(itemId => {
        updateItemStatus(itemId, {
          status: 'failed',
          error: error instanceof Error ? error.message : '下载失败'
        })
      })

      return null
    }
  }, [deploymentPath, instanceName, downloadItems, selectedMaibotVersion, selectedItems, pythonPath, updateItemStatus])

  const retryDownload = useCallback(async (itemId: string) => {
    updateItemStatus(itemId, { status: 'pending', error: undefined, progress: 0 })
    await downloadItem(itemId)
  }, [downloadItem, updateItemStatus])

  return {
    downloadItems,
    isDownloading,
    selectedItems,
    toggleItemSelection,
    updateItemStatus,
    downloadItem,
    downloadAll,
    retryDownload,
  }
}
