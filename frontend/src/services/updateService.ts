/**
 * 更新服务
 * 负责检查更新、下载安装新版本
 */
import { getApiUrl } from '@/config/api'
import type { UpdateCheckResponse, ChannelVersionsResponse } from '@/types/update'
import logger from '@/utils/logger'

const updateLogger = logger.withTag('Update')

/**
 * 检查是否在 Tauri 环境中
 */
function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

/**
 * 从后端 API 检查更新
 */
export async function checkUpdateFromBackend(channel: string = 'main'): Promise<UpdateCheckResponse | null> {
  try {
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/update/check?channel=${channel}`)
    
    if (!response.ok) {
      updateLogger.error('检查更新失败', { status: response.status })
      return null
    }
    
    const data = await response.json()
    updateLogger.info('检查更新成功', data)
    return data
  } catch (error) {
    updateLogger.error('检查更新异常', error)
    return null
  }
}

/**
 * 获取指定通道的版本列表
 */
export async function getChannelVersions(
  channel: string = 'main',
  limit: number = 10
): Promise<ChannelVersionsResponse | null> {
  try {
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/update/channels/${channel}/versions?limit=${limit}`)
    
    if (!response.ok) {
      updateLogger.error('获取版本列表失败', { status: response.status })
      return null
    }
    
    const data = await response.json()
    updateLogger.info('获取版本列表成功', data)
    return data
  } catch (error) {
    updateLogger.error('获取版本列表异常', error)
    return null
  }
}

/**
 * 使用 Tauri Updater 检查更新
 * 这会直接使用 Tauri 的内置更新器
 */
export async function checkUpdateWithTauri() {
  if (!isTauriEnvironment()) {
    updateLogger.warn('不在 Tauri 环境中,无法使用 Tauri Updater')
    return null
  }

  try {
    // 动态导入 Tauri API
    const { check } = await import('@tauri-apps/plugin-updater')
    const { relaunch } = await import('@tauri-apps/plugin-process')
    
    updateLogger.info('开始检查更新...')
    const update = await check()
    
    if (update) {
      updateLogger.info('发现新版本', {
        version: update.version,
        date: update.date,
        body: update.body
      })
      
      return {
        available: true,
        version: update.version,
        date: update.date,
        body: update.body,
        download: async (onProgress?: (progress: number) => void) => {
          updateLogger.info('开始下载更新...')
          
          await update.downloadAndInstall((event: any) => {
            switch (event.event) {
              case 'Started':
                updateLogger.info('开始下载', { contentLength: event.data.contentLength })
                break
              case 'Progress':
                const progress = (event.data.chunkLength / event.data.contentLength!) * 100
                updateLogger.info('下载进度', { progress: progress.toFixed(2) + '%' })
                onProgress?.(progress)
                break
              case 'Finished':
                updateLogger.info('下载完成')
                break
            }
          })
          
          updateLogger.info('更新安装完成,准备重启应用')
          await relaunch()
        }
      }
    } else {
      updateLogger.info('已是最新版本')
      return { available: false }
    }
  } catch (error) {
    updateLogger.error('Tauri 更新检查失败', error)
    throw error
  }
}

/**
 * 获取当前版本
 */
export async function getCurrentVersion(): Promise<string> {
  try {
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/update/current-version`)
    
    if (!response.ok) {
      return '0.1.0' // 默认版本
    }
    
    const data = await response.json()
    return data.data.version
  } catch (error) {
    updateLogger.error('获取当前版本失败', error)
    return '0.1.0'
  }
}
