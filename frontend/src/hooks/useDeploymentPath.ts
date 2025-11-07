/**
 * 部署路径配置自定义 Hook
 * 职责：管理 Bot 实例部署路径的加载、保存和选择
 */

import { useState, useEffect } from 'react'
import { getApiUrl } from '@/config/api'
import { environmentLogger } from '@/utils/logger'

export function useDeploymentPath() {
  const [deploymentPath, setDeploymentPath] = useState<string>('')
  const [pathError, setPathError] = useState<string>('')
  const [pathSuccess, setPathSuccess] = useState<string>('')
  const [isSavingPath, setIsSavingPath] = useState(false)

  // 加载部署路径配置
  const loadDeploymentPath = async () => {
    environmentLogger.info('加载部署路径配置')
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/environment/config`)
      const data = await response.json()
      
      if (data.success) {
        setDeploymentPath(data.data.instances_dir)
        environmentLogger.success('部署路径加载成功', { path: data.data.instances_dir })
      }
    } catch (error) {
      environmentLogger.error('加载部署路径失败', error)
    }
  }

  // 打开文件夹选择器
  const handleSelectFolder = async () => {
    environmentLogger.info('打开文件夹选择器')
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      environmentLogger.debug('Tauri dialog 插件加载成功')
      
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择 Bot 实例部署目录'
      })
      
      environmentLogger.info('用户选择的路径', { path: selected })
      
      if (selected) {
        const selectedPath = selected as string
        setDeploymentPath(selectedPath)
        setPathError('')
        await saveDeploymentPath(selectedPath)
      }
    } catch (error) {
      environmentLogger.error('文件选择器错误', error)
      alert('文件夹选择器仅在桌面应用中可用。\n请直接在输入框中粘贴路径。')
    }
  }

  // 保存部署路径
  const saveDeploymentPath = async (path: string) => {
    setIsSavingPath(true)
    setPathError('')
    setPathSuccess('')
    environmentLogger.info('保存部署路径', { path })
    
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/config/paths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'instances_dir',
          path: path,
          path_type: 'directory',
          is_verified: false,
          description: 'Bot 实例部署目录'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPathSuccess('✓ 路径已保存')
        environmentLogger.success('部署路径保存成功')
        setTimeout(() => setPathSuccess(''), 3000)
      } else {
        setPathError('保存路径失败')
        environmentLogger.error('保存路径失败', data)
      }
    } catch (error) {
      environmentLogger.error('保存路径异常', error)
      setPathError('保存路径失败，请检查后端连接')
    } finally {
      setIsSavingPath(false)
    }
  }

  // 处理路径变化
  const handlePathChange = (value: string) => {
    setDeploymentPath(value)
    setPathError('')
    setPathSuccess('')
    
    if (value && !value.startsWith('/') && !value.match(/^[A-Z]:\\/i)) {
      setPathError('请输入有效的绝对路径')
    } else if (value) {
      saveDeploymentPath(value)
    }
  }

  // 初始化加载
  useEffect(() => {
    loadDeploymentPath()
  }, [])

  return {
    deploymentPath,
    setDeploymentPath,
    pathError,
    pathSuccess,
    isSavingPath,
    loadDeploymentPath,
    handleSelectFolder,
    saveDeploymentPath,
    handlePathChange
  }
}
