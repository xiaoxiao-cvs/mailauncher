import { useState, useEffect, useCallback } from 'react'
import { tauriInvoke } from '@/services/tauriInvoke'
import type { MaibotVersion } from '@/types/download'
import logger from '@/utils/logger'
import { MAIBOT_VERSIONS } from './constants'

const downloadLogger = logger.withTag('Download')

export function useDownloadInit() {
  const [deploymentPath, setDeploymentPath] = useState<string>('')
  const [instanceName, setInstanceName] = useState<string>('')
  const [selectedMaibotVersion, setSelectedMaibotVersion] = useState<MaibotVersion>(MAIBOT_VERSIONS[0])
  const [maibotVersions, setMaibotVersions] = useState<MaibotVersion[]>(MAIBOT_VERSIONS)
  const [pythonPath, setPythonPath] = useState<string | null>(null)
  const [isLoadingPath, setIsLoadingPath] = useState(false)

  const loadDeploymentPath = useCallback(async () => {
    downloadLogger.info('加载部署路径配置')
    setIsLoadingPath(true)
    try {
      const pathConfig = await tauriInvoke<{ path: string } | null>('get_path', { name: 'instances_dir' })

      if (pathConfig) {
        setDeploymentPath(pathConfig.path)
        downloadLogger.success('部署路径加载成功', { path: pathConfig.path })
      } else {
        downloadLogger.info('未找到已保存的部署路径')
        setDeploymentPath('')
      }
    } catch (error) {
      downloadLogger.error('加载部署路径失败', error)
      setDeploymentPath('')
    } finally {
      setIsLoadingPath(false)
    }
  }, [])

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

        try {
          await tauriInvoke('set_path', {
            name: 'instances_dir',
            path: selectedPath,
            pathType: 'directory',
            isVerified: false,
            description: 'Bot 实例部署目录',
          })
          downloadLogger.success('部署路径已保存到后端')
        } catch (err) {
          downloadLogger.error('保存部署路径失败', err)
        }
      }
    } catch (error) {
      downloadLogger.error('选择文件夹失败', error)
    }
  }, [])

  const loadVersions = useCallback(async () => {
    try {
      const response = await tauriInvoke<{ tags: string[]; branches: string[] }>('get_maibot_versions')
      const versions: MaibotVersion[] = [
        { source: 'latest', value: 'latest', label: '最新代码 (main)' },
        ...response.tags.map(tag => ({
          source: 'tag' as const,
          value: tag,
          label: tag,
        })),
        ...response.branches
          .filter(b => b !== 'main' && b !== 'master')
          .map(branch => ({
            source: 'branch' as const,
            value: branch,
            label: `${branch} 分支`,
          })),
      ]
      setMaibotVersions(versions)
      downloadLogger.success('版本列表加载完成', { count: versions.length })
    } catch (error) {
      downloadLogger.error('加载版本列表失败，使用默认列表', error)
    }
  }, [])

  const loadPythonPath = useCallback(async () => {
    try {
      const result = await tauriInvoke<{ path: string } | null>('get_selected_python')
      if (result) {
        setPythonPath(result.path)
        downloadLogger.info('已加载 Python 路径', { path: result.path })
      }
    } catch (error) {
      downloadLogger.error('加载 Python 路径失败', error)
    }
  }, [])

  useEffect(() => {
    loadDeploymentPath()
  }, [loadDeploymentPath])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  useEffect(() => {
    loadPythonPath()
  }, [loadPythonPath])

  return {
    deploymentPath,
    setDeploymentPath,
    instanceName,
    setInstanceName,
    selectedMaibotVersion,
    setSelectedMaibotVersion,
    maibotVersions,
    pythonPath,
    isLoadingPath,
    selectDeploymentPath,
  }
}
