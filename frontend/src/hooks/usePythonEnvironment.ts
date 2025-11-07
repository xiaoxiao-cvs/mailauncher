/**
 * Python 环境管理自定义 Hook
 * 职责：管理 Python 版本选择和虚拟环境类型配置
 */

import { useState, useEffect } from 'react'
import { getApiUrl } from '@/config/api'
import { environmentLogger } from '@/utils/logger'

export interface PythonVersion {
  version: string
  path: string
  is_default: boolean
  is_selected: boolean
}

export const VENV_TYPES = [
  { value: 'venv', label: 'venv', description: 'Python 标准库' },
  { value: 'uv', label: 'uv', description: '快速的 Python 包管理器' },
  { value: 'conda', label: 'conda', description: 'Anaconda 环境管理' }
]

export function usePythonEnvironment() {
  // Python 版本管理
  const [pythonVersions, setPythonVersions] = useState<PythonVersion[]>([])
  const [selectedPython, setSelectedPython] = useState<string>('')
  const [isLoadingPython, setIsLoadingPython] = useState(false)
  const [pythonError, setPythonError] = useState<string>('')
  const [showPythonDropdown, setShowPythonDropdown] = useState(false)
  const [isSavingPython, setIsSavingPython] = useState(false)
  
  // 虚拟环境类型管理
  const [venvType, setVenvType] = useState<string>('venv')
  const [isLoadingVenv, setIsLoadingVenv] = useState(false)
  const [isSavingVenv, setIsSavingVenv] = useState(false)

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

  // 加载虚拟环境类型配置
  const loadVenvType = async () => {
    setIsLoadingVenv(true)
    environmentLogger.info('加载虚拟环境类型配置')
    
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/environment/venv/type`)
      const data = await response.json()
      
      if (data.success) {
        setVenvType(data.data.venv_type)
        environmentLogger.success('虚拟环境类型加载成功', data.data)
      } else {
        environmentLogger.error('无法获取虚拟环境类型', data)
      }
    } catch (error) {
      environmentLogger.error('加载虚拟环境类型失败', error)
    } finally {
      setIsLoadingVenv(false)
    }
  }

  // 保存虚拟环境类型
  const saveVenvType = async (type: string) => {
    setIsSavingVenv(true)
    environmentLogger.info('保存虚拟环境类型', { type })
    
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/environment/venv/type`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ venv_type: type })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setVenvType(type)
        environmentLogger.success('虚拟环境类型保存成功')
      } else {
        environmentLogger.error('保存虚拟环境类型失败', data)
      }
    } catch (error) {
      environmentLogger.error('保存虚拟环境类型异常', error)
    } finally {
      setIsSavingVenv(false)
    }
  }

  // 初始化加载
  useEffect(() => {
    loadPythonVersions()
    loadVenvType()
  }, [])

  return {
    // Python 版本相关
    pythonVersions,
    selectedPython,
    setSelectedPython,
    isLoadingPython,
    pythonError,
    showPythonDropdown,
    setShowPythonDropdown,
    isSavingPython,
    loadPythonVersions,
    savePythonDefault,
    
    // 虚拟环境类型相关
    venvType,
    isLoadingVenv,
    isSavingVenv,
    loadVenvType,
    saveVenvType
  }
}
