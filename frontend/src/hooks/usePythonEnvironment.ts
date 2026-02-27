/**
 * Python 环境管理自定义 Hook
 * 职责：管理 Python 版本选择和虚拟环境类型配置
 *
 * 通过 Tauri invoke 直接调用 Rust 命令。
 */

import { useState, useEffect } from 'react'
import { tauriInvoke } from '@/services/tauriInvoke'
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

  // 加载虚拟环境类型配置
  const loadVenvType = async () => {
    setIsLoadingVenv(true)
    environmentLogger.info('加载虚拟环境类型配置')
    
    try {
      const value = await tauriInvoke<string | null>('get_config', { key: 'venv_type' })
      setVenvType(value ?? 'venv')
      environmentLogger.success('虚拟环境类型加载成功', { venv_type: value ?? 'venv' })
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
      await tauriInvoke('set_config', { key: 'venv_type', value: type })
      setVenvType(type)
      environmentLogger.success('虚拟环境类型保存成功')
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
