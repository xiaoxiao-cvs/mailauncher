/**
 * 环境配置自定义 Hook
 * 职责：综合管理 Git 环境检查和部署路径配置
 * 注意：这是一个组合 hook，同时管理 Git 和部署路径两个功能
 *
 * 通过 Tauri invoke 直接调用 Rust 命令。
 */

import { useState, useEffect } from 'react'
import { tauriInvoke } from '@/services/tauriInvoke'
import { environmentLogger } from '@/utils/logger'

export interface GitInfo {
  is_available: boolean
  path: string
  version: string
}

interface UseEnvironmentConfigOptions {
  onGitStatusChange?: (isAvailable: boolean) => void
}

export function useEnvironmentConfig(options: UseEnvironmentConfigOptions = {}) {
  const { onGitStatusChange } = options

  // Git 环境状态
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null)
  const [isCheckingGit, setIsCheckingGit] = useState(false)
  const [gitError, setGitError] = useState<string>('')
  
  // 部署路径状态
  const [deploymentPath, setDeploymentPath] = useState<string>('')
  const [pathError, setPathError] = useState<string>('')
  const [pathSuccess, setPathSuccess] = useState<string>('')
  const [isSavingPath, setIsSavingPath] = useState(false)

  // 检查 Git 环境
  const checkGitEnvironment = async () => {
    setIsCheckingGit(true)
    setGitError('')
    environmentLogger.info('开始检查 Git 环境')
    
    try {
      const result = await tauriInvoke<GitInfo>('check_git_environment')
      setGitInfo(result)
      environmentLogger.success('Git 环境检查完成', result)
      onGitStatusChange?.(result.is_available)
    } catch (error) {
      setGitError('检查 Git 环境失败')
      environmentLogger.error('检查 Git 环境失败', error)
      onGitStatusChange?.(false)
    } finally {
      setIsCheckingGit(false)
    }
  }

  // 加载部署路径配置
  const loadDeploymentPath = async () => {
    environmentLogger.info('加载部署路径配置')
    try {
      const path = await tauriInvoke<string | null>('get_path', { name: 'instances_dir' })
      if (path) {
        setDeploymentPath(path)
        environmentLogger.success('部署路径加载成功', { path })
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
      await tauriInvoke('set_path', {
        name: 'instances_dir',
        path: path,
        pathType: 'directory',
        isVerified: false,
        description: 'Bot 实例部署目录'
      })
      setPathSuccess('✓ 路径已保存')
      environmentLogger.success('部署路径保存成功')
      setTimeout(() => setPathSuccess(''), 3000)
    } catch (error) {
      environmentLogger.error('保存路径异常', error)
      setPathError('保存路径失败')
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
    checkGitEnvironment()
    loadDeploymentPath()
  }, [])

  return {
    // Git 相关
    gitInfo,
    isCheckingGit,
    gitError,
    checkGitEnvironment,
    
    // 部署路径相关
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
