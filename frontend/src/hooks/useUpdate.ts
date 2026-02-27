/**
 * 更新管理 Hook
 * 管理更新检查、版本列表和更新安装
 */
import { useState, useEffect, useCallback } from 'react'
import {
  checkUpdateFromBackend,
  checkUpdateWithTauri,
  getChannelVersions,
  getCurrentVersion
} from '@/services/updateService'
import type { UpdateCheckResponse, VersionInfo } from '@/types/update'
import logger from '@/utils/logger'

const updateLogger = logger.withTag('useUpdate')
const UPDATE_CHANNEL_STORAGE_KEY = 'mailauncher-update-channel'

export function useUpdate() {
  const [currentVersion, setCurrentVersion] = useState<string>('0.1.0')
  // 从 localStorage 读取用户上次选择的更新通道，默认为 'main'
  const [selectedChannel, setSelectedChannel] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(UPDATE_CHANNEL_STORAGE_KEY)
      return stored || 'main'
    } catch (error) {
      updateLogger.warn('读取更新通道失败，使用默认值', error)
      return 'main'
    }
  })
  const [selectedVersion, setSelectedVersion] = useState<string>('latest')
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResponse | null>(null)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState<any>(null)

  // 加载当前版本
  useEffect(() => {
    loadCurrentVersion()
  }, [])

  // 当通道改变时,加载该通道的版本列表并保存到 localStorage
  useEffect(() => {
    loadChannelVersions(selectedChannel)
    // 保存用户选择的通道到 localStorage
    try {
      localStorage.setItem(UPDATE_CHANNEL_STORAGE_KEY, selectedChannel)
      updateLogger.debug('更新通道已保存', { selectedChannel })
    } catch (error) {
      updateLogger.warn('保存更新通道失败', error)
    }
  }, [selectedChannel])

  const loadCurrentVersion = async () => {
    const version = await getCurrentVersion()
    setCurrentVersion(version)
  }

  const loadChannelVersions = async (channel: string) => {
    try {
      const response = await getChannelVersions(channel, 20)
      if (response) {
        setVersions(response.versions)
        // 自动选择最新版本
        if (response.versions.length > 0) {
          setSelectedVersion(response.versions[0].version)
        }
        updateLogger.info(`加载 ${channel} 通道版本`, { count: response.versions.length })
        
        // 加载版本列表后，自动检查是否有更新
        try {
          const backendUpdate = await checkUpdateFromBackend(channel)
          setUpdateInfo(backendUpdate)
          
          if (backendUpdate?.has_update) {
            updateLogger.info('发现新版本', backendUpdate.update_available)
          }
        } catch (error) {
          updateLogger.warn('自动检查更新失败', error)
        }
      }
    } catch (error) {
      updateLogger.error('加载版本列表失败', error)
    }
  }

  const checkForUpdates = useCallback(async () => {
    setIsChecking(true)
    updateLogger.info('检查更新', { channel: selectedChannel })

    try {
      // 先从后端 API 检查
      const backendUpdate = await checkUpdateFromBackend(selectedChannel)
      setUpdateInfo(backendUpdate)

      if (backendUpdate?.has_update) {
        updateLogger.info('发现新版本', backendUpdate.update_available)
        
        // 如果在 Tauri 环境,尝试使用 Tauri Updater
        try {
          const tauriUpdate = await checkUpdateWithTauri()
          if (tauriUpdate?.available) {
            setPendingUpdate(tauriUpdate)
            setShowUpdateDialog(true)
          }
        } catch (error) {
          updateLogger.warn('Tauri 更新器不可用,使用手动下载', error)
          // 显示手动下载的对话框
          if (backendUpdate.update_available) {
            setShowUpdateDialog(true)
          }
        }
      } else {
        updateLogger.info('已是最新版本')
      }
    } catch (error) {
      updateLogger.error('检查更新失败', error)
    } finally {
      setIsChecking(false)
    }
  }, [selectedChannel])

  const installUpdate = useCallback(async (onProgress: (progress: number) => void) => {
    if (!pendingUpdate) {
      throw new Error('没有可用的更新')
    }

    try {
      updateLogger.info('开始安装更新')
      await pendingUpdate.download(onProgress)
    } catch (error) {
      updateLogger.error('安装更新失败', error)
      throw error
    }
  }, [pendingUpdate])

  const downloadManually = useCallback(() => {
    if (updateInfo?.update_available?.download_url) {
      window.open(updateInfo.update_available.download_url, '_blank')
      updateLogger.info('打开下载链接', { url: updateInfo.update_available.download_url })
    }
  }, [updateInfo])

  return {
    currentVersion,
    selectedChannel,
    setSelectedChannel,
    selectedVersion,
    setSelectedVersion,
    versions,
    isChecking,
    updateInfo,
    checkForUpdates,
    showUpdateDialog,
    setShowUpdateDialog,
    installUpdate,
    downloadManually,
    pendingUpdate
  }
}
