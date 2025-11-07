/**
 * Git 环境检查自定义 Hook
 * 职责：检查 Git 环境和 Python 版本管理
 */

import { useState, useEffect } from 'react'
import { getApiUrl } from '@/config/api'
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
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/environment/git`)
      const data = await response.json()
      
      if (data.success) {
        setGitInfo(data.data)
        environmentLogger.success('Git 环境检查完成', data.data)
        onGitStatusChange?.(data.data.is_available)
      } else {
        setGitError('无法获取 Git 信息')
        environmentLogger.error('无法获取 Git 信息', data)
        onGitStatusChange?.(false)
      }
    } catch (error) {
      setGitError('连接后端服务失败，请确保后端正在运行')
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
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/environment/python/versions`)
      const data = await response.json()
      
      if (data.success) {
        setPythonVersions(data.data)
        const selectedVersion = data.data.find((v: PythonVersion) => v.is_selected)
        const defaultVersion = data.data.find((v: PythonVersion) => v.is_default)
        const targetVersion = selectedVersion || defaultVersion
        
        if (targetVersion) {
          setSelectedPython(targetVersion.path)
        }
        environmentLogger.success('Python 版本加载成功', data.data)
      } else {
        setPythonError('无法获取 Python 版本信息')
        environmentLogger.error('无法获取 Python 版本信息', data)
      }
    } catch (error) {
      setPythonError('连接后端服务失败')
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
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/environment/python/default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ python_path: path })
      })
      
      const data = await response.json()
      
      if (data.success) {
        environmentLogger.success('默认 Python 版本保存成功')
        await loadPythonVersions()
      } else {
        environmentLogger.error('保存默认 Python 版本失败', data)
      }
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
