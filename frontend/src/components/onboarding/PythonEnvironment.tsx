import { useState, useEffect } from 'react'
import { LoaderIcon, AlertCircleIcon, ChevronDownIcon, CheckCircle2Icon } from 'lucide-react'
import { getApiUrl } from '@/config/api'
import { environmentLogger } from '@/utils/logger'

interface PythonVersion {
  version: string
  path: string
  is_default: boolean
  is_selected: boolean
}

interface PythonEnvironmentProps {
  stepColor: string
}

const iconStyle = (color: string) => ({ backgroundColor: color })

const VENV_TYPES = [
  { value: 'venv', label: 'venv', description: 'Python 标准库' },
  { value: 'uv', label: 'uv', description: '快速的 Python 包管理器' },
  { value: 'conda', label: 'conda', description: 'Anaconda 环境管理' }
]

/**
 * Python 环境配置组件
 * 职责：选择默认 Python 版本（优化显示，避免滚动条）
 */
export function PythonEnvironment({ stepColor }: PythonEnvironmentProps) {
  const [pythonVersions, setPythonVersions] = useState<PythonVersion[]>([])
  const [selectedPython, setSelectedPython] = useState<string>('')
  const [isLoadingPython, setIsLoadingPython] = useState(false)
  const [pythonError, setPythonError] = useState<string>('')
  const [showPythonDropdown, setShowPythonDropdown] = useState(false)
  const [isSavingPython, setIsSavingPython] = useState(false)
  
  const [venvType, setVenvType] = useState<string>('venv')
  const [isLoadingVenv, setIsLoadingVenv] = useState(false)
  const [isSavingVenv, setIsSavingVenv] = useState(false)

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
        // 找到用户选择的版本或默认版本
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
        // 重新加载以更新状态
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

  useEffect(() => {
    loadPythonVersions()
    loadVenvType()
  }, [])

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Python 版本选择 - 优化布局，不超出区域 */}
      <div className="p-3.5 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a]">
        <div className="flex items-center gap-2.5 mb-3">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm"
            style={iconStyle(stepColor)}
          >
            {isLoadingPython ? (
              <LoaderIcon className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <span className="text-xs font-bold">Py</span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#023e8a] dark:text-white">
              默认 Python 版本
            </h3>
            <p className="text-xs text-[#023e8a]/70 dark:text-white/70">
              新建实例时使用的 Python 版本
            </p>
          </div>
        </div>

        {pythonError ? (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">{pythonError}</p>
          </div>
        ) : isLoadingPython ? (
          <div className="py-6 text-center">
            <LoaderIcon className="w-5 h-5 animate-spin mx-auto text-[#023e8a] dark:text-white" />
            <p className="text-xs text-[#023e8a]/70 dark:text-white/70 mt-2">加载中...</p>
          </div>
        ) : pythonVersions.length > 0 ? (
          <div className="space-y-3">
            {/* 当前选中的版本 */}
            <div className="relative">
              <button
                onClick={() => setShowPythonDropdown(!showPythonDropdown)}
                disabled={isSavingPython}
                className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-white/40 dark:bg-[#3a3a3a]/50 hover:bg-white/60 dark:hover:bg-[#3a3a3a]/70 transition-all disabled:opacity-60 border border-[#023e8a]/10 dark:border-[#3a3a3a]"
              >
                <div className="flex-1 text-left">
                  {selectedPython ? (
                    <div>
                      <div className="text-sm font-medium text-[#023e8a] dark:text-white">
                        {pythonVersions.find(v => v.path === selectedPython)?.version || '未选择'}
                      </div>
                      <div className="text-xs text-[#023e8a]/60 dark:text-white/60 font-mono truncate max-w-md">
                        {selectedPython}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-[#023e8a]/60 dark:text-white/60">
                      选择 Python 版本
                    </div>
                  )}
                </div>
                <ChevronDownIcon className={`w-4 h-4 text-[#023e8a] dark:text-white transition-transform ml-2 flex-shrink-0 ${showPythonDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* 下拉列表 - 优化高度，限制在 200px 内 */}
              {showPythonDropdown && (
                <div className="absolute z-10 w-full mt-1 py-1 rounded-lg bg-white dark:bg-[#2e2e2e] border border-[#023e8a]/20 dark:border-[#3a3a3a] shadow-lg max-h-[200px] overflow-y-auto">
                  {pythonVersions.map((version) => (
                    <button
                      key={version.path}
                      onClick={() => {
                        setSelectedPython(version.path)
                        savePythonDefault(version.path)
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-[#023e8a]/5 dark:hover:bg-white/5 transition-colors ${
                        version.path === selectedPython ? 'bg-[#023e8a]/10 dark:bg-white/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-[#023e8a] dark:text-white">
                            {version.version}
                            {version.is_default && (
                              <span className="ml-2 text-[10px] text-[#023e8a]/60 dark:text-white/60">
                                (默认)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#023e8a]/60 dark:text-white/60 font-mono truncate">
                            {version.path}
                          </div>
                        </div>
                        {version.path === selectedPython && (
                          <CheckCircle2Icon className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 提示信息 - 简化 */}
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 共 <span className="font-semibold">{pythonVersions.length}</span> 个版本可用
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              未检测到 Python 环境
            </p>
          </div>
        )}
      </div>

      {/* 虚拟环境类型选择 */}
      <div className="p-3.5 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a]">
        <div className="flex items-center gap-2.5 mb-3">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm"
            style={iconStyle(stepColor)}
          >
            <span className="text-xs font-bold">Env</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#023e8a] dark:text-white">
              虚拟环境类型
            </h3>
            <p className="text-xs text-[#023e8a]/70 dark:text-white/70">
              新建实例时使用的虚拟环境管理器
            </p>
          </div>
        </div>

        {isLoadingVenv ? (
          <div className="py-4 text-center">
            <LoaderIcon className="w-5 h-5 animate-spin mx-auto text-[#023e8a] dark:text-white" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {VENV_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => saveVenvType(type.value)}
                disabled={isSavingVenv}
                className={`p-2.5 rounded-lg border transition-all text-left ${
                  venvType === type.value
                    ? 'bg-[#023e8a]/10 dark:bg-white/10 border-[#023e8a] dark:border-white'
                    : 'bg-white/40 dark:bg-[#3a3a3a]/50 border-[#023e8a]/10 dark:border-[#3a3a3a] hover:bg-white/60 dark:hover:bg-[#3a3a3a]/70'
                } disabled:opacity-60`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-[#023e8a] dark:text-white">
                    {type.label}
                  </span>
                  {venvType === type.value && (
                    <CheckCircle2Icon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <p className="text-[10px] text-[#023e8a]/60 dark:text-white/60">
                  {type.description}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
