import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2Icon, XCircleIcon, LoaderIcon, AlertCircleIcon, ChevronDownIcon } from 'lucide-react'
import { getApiUrl } from '@/config/api'
import { environmentLogger } from '@/utils/logger'

interface GitInfo {
  is_available: boolean
  path: string
  version: string
}

interface PythonVersion {
  version: string
  path: string
  is_default: boolean
  is_selected: boolean
}

interface GitCheckProps {
  stepColor: string
  onGitStatusChange?: (isAvailable: boolean) => void
}

const iconStyle = (color: string) => ({ backgroundColor: color })

/**
 * Git 环境检查与 Python 选择组件
 * 职责：检查 Git 环境并选择默认 Python 版本
 */
export function GitCheck({ stepColor, onGitStatusChange }: GitCheckProps) {
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null)
  const [isCheckingGit, setIsCheckingGit] = useState(false)
  const [gitError, setGitError] = useState<string>('')
  
  const [pythonVersions, setPythonVersions] = useState<PythonVersion[]>([])
  const [selectedPython, setSelectedPython] = useState<string>('')
  const [isLoadingPython, setIsLoadingPython] = useState(false)
  const [pythonError, setPythonError] = useState<string>('')
  const [showPythonDropdown, setShowPythonDropdown] = useState(false)
  const [isSavingPython, setIsSavingPython] = useState(false)

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

  useEffect(() => {
    checkGitEnvironment()
    loadPythonVersions()
  }, [])

  return (
    <div className="space-y-4">
      {/* Git 环境检查 */}
      <div className="p-3.5 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a]">
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm"
              style={iconStyle(stepColor)}
            >
              {isCheckingGit ? (
                <LoaderIcon className="w-4.5 h-4.5 animate-spin" />
              ) : gitInfo?.is_available ? (
                <CheckCircle2Icon className="w-4.5 h-4.5" />
              ) : (
                <XCircleIcon className="w-4.5 h-4.5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#023e8a] dark:text-white">
                Git 环境
              </h3>
              <p className="text-xs text-[#023e8a]/70 dark:text-white/70">
                克隆和更新 Bot 实例所需
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkGitEnvironment}
            disabled={isCheckingGit}
            className="bg-white/60 dark:bg-[#3a3a3a] border-[#023e8a]/20 dark:border-[#3a3a3a] text-xs h-8"
          >
            {isCheckingGit ? '检查中...' : '重新检查'}
          </Button>
        </div>

        {gitError ? (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">{gitError}</p>
          </div>
        ) : gitInfo ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/40 dark:bg-[#3a3a3a]/50">
              <span className="text-xs text-[#023e8a]/70 dark:text-white/70">状态</span>
              <span className="text-xs font-medium text-[#023e8a] dark:text-white">
                {gitInfo.is_available ? (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle2Icon className="w-4 h-4" />
                    已安装
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <XCircleIcon className="w-4 h-4" />
                    未安装
                  </span>
                )}
              </span>
            </div>
            
            {gitInfo.is_available && (
              <>
                <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/40 dark:bg-[#3a3a3a]/50">
                  <span className="text-xs text-[#023e8a]/70 dark:text-white/70">版本</span>
                  <span className="text-xs font-medium text-[#023e8a] dark:text-white font-mono">
                    {gitInfo.version}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/40 dark:bg-[#3a3a3a]/50">
                  <span className="text-xs text-[#023e8a]/70 dark:text-white/70">路径</span>
                  <span className="text-xs font-mono text-[#023e8a] dark:text-white truncate max-w-xs">
                    {gitInfo.path}
                  </span>
                </div>
              </>
            )}
          </div>
        ) : null}

        {gitInfo && !gitInfo.is_available && (
          <div className="mt-2.5 p-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              未检测到 Git。请先安装 Git：
              <a 
                href="https://git-scm.com/downloads" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 underline hover:text-yellow-900 dark:hover:text-yellow-100"
              >
                下载 Git
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Python 版本选择 */}
      <div className="p-3.5 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a]">
        <div className="flex items-center gap-2.5 mb-2.5">
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
          <div className="py-3 text-center">
            <LoaderIcon className="w-5 h-5 animate-spin mx-auto text-[#023e8a] dark:text-white" />
            <p className="text-xs text-[#023e8a]/70 dark:text-white/70 mt-2">加载 Python 版本...</p>
          </div>
        ) : pythonVersions.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setShowPythonDropdown(!showPythonDropdown)}
              disabled={isSavingPython}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-white/40 dark:bg-[#3a3a3a]/50 hover:bg-white/60 dark:hover:bg-[#3a3a3a]/70 transition-all disabled:opacity-60"
            >
              <div className="flex-1 text-left">
                {selectedPython ? (
                  <div>
                    <div className="text-xs font-medium text-[#023e8a] dark:text-white">
                      {pythonVersions.find(v => v.path === selectedPython)?.version || '未选择'}
                    </div>
                    <div className="text-xs text-[#023e8a]/60 dark:text-white/60 font-mono truncate">
                      {selectedPython}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[#023e8a]/60 dark:text-white/60">
                    选择 Python 版本
                  </div>
                )}
              </div>
              <ChevronDownIcon className={`w-4 h-4 text-[#023e8a] dark:text-white transition-transform ${showPythonDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showPythonDropdown && (
              <div className="absolute z-10 w-full mt-1 py-1 rounded-lg bg-white dark:bg-[#2e2e2e] border border-[#023e8a]/20 dark:border-[#3a3a3a] shadow-lg max-h-60 overflow-y-auto">
                {pythonVersions.map((version) => (
                  <button
                    key={version.path}
                    onClick={() => {
                      setSelectedPython(version.path)
                      savePythonDefault(version.path)
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-[#023e8a]/5 dark:hover:bg-white/5 transition-colors ${
                      version.path === selectedPython ? 'bg-[#023e8a]/10 dark:bg-white/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-xs font-medium text-[#023e8a] dark:text-white">
                          {version.version}
                        </div>
                        <div className="text-xs text-[#023e8a]/60 dark:text-white/60 font-mono truncate">
                          {version.path}
                        </div>
                      </div>
                      {version.path === selectedPython && (
                        <CheckCircle2Icon className="w-4 h-4 text-green-600 dark:text-green-400 ml-2 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              未检测到 Python 环境
            </p>
          </div>
        )}

        <div className="mt-2.5 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            💡 提示：默认 Python 版本将在创建新实例时使用。每个实例也可以单独配置 Python 版本。
          </p>
        </div>
      </div>
    </div>
  )
}
