/**
 * Git 环境检查自定义 Hook
 * 职责：检查 Git 环境和 Python 版本管理
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

export interface PythonVersion {
  version: string
  path: string
  is_default: boolean
  is_selected: boolean
}

interface UseGitCheckOptions {
  onGitStatusChange?: (isAvailable: boolean) => void
}

export function useGitCheck(options: UseGitCheckOptions = {}) {
  const { onGitStatusChange } = options

  // Git 环境状态
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null)
  const [isCheckingGit, setIsCheckingGit] = useState(false)
  const [gitError, setGitError] = useState<string>('')
  
  // Python 版本状态
  const [pythonVersions, setPythonVersions] = useState<PythonVersion[]>([])
  const [selectedPython, setSelectedPython] = useState<string>('')
  const [isLoadingPython, setIsLoadingPython] = useState(false)
  const [pythonError, setPythonError] = useState<string>('')
  const [showPythonDropdown, setShowPythonDropdown] = useState(false)
  const [isSavingPython, setIsSavingPython] = useState(false)

  // 检查 Git 环境
  const checkGitEnvironment = async () => {
    setIsCheckingGit(true)
    setGitError('')
    environmentLogger.info('开始检查 Git 环境')
    
    try {
      const info = await tauriInvoke<GitInfo>('check_git_environment')
      setGitInfo(info)
      environmentLogger.success('Git 环境检查完成', info)
      onGitStatusChange?.(info.is_available)
    } catch (error) {
      setGitError('检查 Git 环境失败')
      environmentLogger.error('检查 Git 环境失败', error)
      onGitStatusChange?.(false)
    } finally {
      setIsCheckingGit(false)
    }
  }

  // 加载 Python 版本列表
  const loadPythonVersions = async () => {
    setIsLoadingPython(true)
    setPythonError('')
    environmentLogger.info('加载 Python 版本列表')
    
    try {
      const envs = await tauriInvoke<Array<{ path: string; version: string; is_selected: boolean; is_default?: boolean }>>('get_python_environments')
      const versions: PythonVersion[] = envs.map(e => ({
        version: e.version,
        path: e.path,
        is_default: e.is_default ?? false,
        is_selected: e.is_selected,
      }))
      setPythonVersions(versions)
      const selectedVersion = versions.find(v => v.is_selected)
      const defaultVersion = versions.find(v => v.is_default)
      const targetVersion = selectedVersion || defaultVersion
      
      if (targetVersion) {
        setSelectedPython(targetVersion.path)
      }
      environmentLogger.success('Python 版本加载成功', versions)
    } catch (error) {
      setPythonError('获取 Python 版本失败')
      environmentLogger.error('加载 Python 版本失败', error)
    } finally {
      setIsLoadingPython(false)
    }
  }

  // 保存默认 Python 版本
  const savePythonDefault = async (path: string) => {
    setIsSavingPython(true)
    environmentLogger.info('保存默认 Python 版本', { path })
    
    try {
      await tauriInvoke('select_python', { path })
      environmentLogger.success('默认 Python 版本保存成功')
      await loadPythonVersions()
    } catch (error) {
      environmentLogger.error('保存默认 Python 版本异常', error)
    } finally {
      setIsSavingPython(false)
      setShowPythonDropdown(false)
    }
  }

  // 初始化加载
  useEffect(() => {
    checkGitEnvironment()
    loadPythonVersions()
  }, [])

  return {
    // Git 相关
    gitInfo,
    isCheckingGit,
    gitError,
    checkGitEnvironment,
    
    // Python 相关
    pythonVersions,
    selectedPython,
    setSelectedPython,
    isLoadingPython,
    pythonError,
    showPythonDropdown,
    setShowPythonDropdown,
    isSavingPython,
    loadPythonVersions,
    savePythonDefault
  }
}
