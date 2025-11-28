import { Button } from '@/components/ui/button'
import { CheckCircle2Icon, XCircleIcon, LoaderIcon, AlertCircleIcon } from 'lucide-react'
import { useGitEnvironmentQuery, usePythonVersionsQuery } from '@/hooks/queries/useEnvironmentQueries'

interface EnvironmentDetectionProps {
  stepColor: string
  onEnvironmentReady?: (isReady: boolean) => void
}

const iconStyle = (color: string) => ({ backgroundColor: color })

/**
 * 环境检测组件
 * 职责：检测 Git 和 Python 是否已安装
 */
export function EnvironmentDetection({ stepColor, onEnvironmentReady }: EnvironmentDetectionProps) {
  // Git 环境检查
  const { 
    data: gitInfo, 
    isLoading: isCheckingGit, 
    error: gitErrorObj, 
    refetch: checkGitEnvironment 
  } = useGitEnvironmentQuery()
  const gitError = gitErrorObj ? String(gitErrorObj) : null

  // Python 环境检查
  const { 
    data: pythonVersions = [], 
    isLoading: isCheckingPython, 
    error: pythonErrorObj,
    refetch: checkPythonEnvironment
  } = usePythonVersionsQuery()
  const pythonError = pythonErrorObj ? String(pythonErrorObj) : null

  const isGitAvailable = gitInfo?.is_available ?? false
  const isPythonAvailable = pythonVersions.length > 0
  const isAllReady = isGitAvailable && isPythonAvailable
  const isChecking = isCheckingGit || isCheckingPython

  // 通知父组件环境状态
  if (onEnvironmentReady && !isChecking) {
    onEnvironmentReady(isAllReady)
  }

  // 重新检查所有环境
  const handleRecheckAll = () => {
    checkGitEnvironment()
    checkPythonEnvironment()
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Git 环境检测 */}
      <div className="p-3 sm:p-4 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a]">
        <div className="flex items-start sm:items-center justify-between mb-2 sm:mb-3 gap-2">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0"
              style={iconStyle(stepColor)}
            >
              {isCheckingGit ? (
                <LoaderIcon className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : isGitAvailable ? (
                <CheckCircle2Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <XCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-semibold text-[#023e8a] dark:text-white truncate">
                Git
              </h3>
              <p className="text-xs sm:text-sm text-[#023e8a]/60 dark:text-white/60 line-clamp-2">
                版本控制工具，用于克隆和更新 Bot
              </p>
            </div>
          </div>
        </div>

        {gitError ? (
          <div className="flex items-start gap-2 p-2 sm:p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 break-words">{gitError}</p>
          </div>
        ) : isCheckingGit ? (
          <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <LoaderIcon className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">正在检测 Git 环境...</span>
          </div>
        ) : isGitAvailable ? (
          <div className="p-2 sm:p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2Icon className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">已安装</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-green-600/80 dark:text-green-400/80 pl-5 sm:pl-6">
              <span>版本: <code className="font-mono bg-green-100 dark:bg-green-900/40 px-1 sm:px-1.5 py-0.5 rounded text-xs">{gitInfo?.version}</code></span>
            </div>
          </div>
        ) : (
          <div className="p-2 sm:p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <AlertCircleIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-yellow-700 dark:text-yellow-300">未检测到 Git</span>
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 pl-5 sm:pl-6">
              请先安装 Git：
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

      {/* Python 环境检测 */}
      <div className="p-3 sm:p-4 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a]">
        <div className="flex items-start sm:items-center justify-between mb-2 sm:mb-3 gap-2">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0"
              style={iconStyle(stepColor)}
            >
              {isCheckingPython ? (
                <LoaderIcon className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : isPythonAvailable ? (
                <CheckCircle2Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <XCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-semibold text-[#023e8a] dark:text-white truncate">
                Python
              </h3>
              <p className="text-xs sm:text-sm text-[#023e8a]/60 dark:text-white/60 line-clamp-2">
                运行环境，Bot 实例依赖 Python 运行
              </p>
            </div>
          </div>
        </div>

        {pythonError ? (
          <div className="flex items-start gap-2 p-2 sm:p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 break-words">{pythonError}</p>
          </div>
        ) : isCheckingPython ? (
          <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <LoaderIcon className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">正在检测 Python 环境...</span>
          </div>
        ) : isPythonAvailable ? (
          <div className="p-2 sm:p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2Icon className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">已安装</span>
            </div>
            <div className="text-xs text-green-600/80 dark:text-green-400/80 pl-5 sm:pl-6">
              检测到 <span className="font-semibold">{pythonVersions.length}</span> 个 Python 版本可用
            </div>
          </div>
        ) : (
          <div className="p-2 sm:p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <AlertCircleIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-yellow-700 dark:text-yellow-300">未检测到 Python</span>
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 pl-5 sm:pl-6">
              请先安装 Python 3.9+：
              <a 
                href="https://www.python.org/downloads/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 underline hover:text-yellow-900 dark:hover:text-yellow-100"
              >
                下载 Python
              </a>
            </p>
          </div>
        )}
      </div>

      {/* 重新检测按钮 */}
      <div className="flex justify-center pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRecheckAll}
          disabled={isChecking}
          className="bg-white/60 dark:bg-[#3a3a3a] border-[#023e8a]/20 dark:border-[#3a3a3a] text-xs sm:text-sm"
        >
          {isChecking ? (
            <>
              <LoaderIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
              检测中...
            </>
          ) : (
            '重新检测'
          )}
        </Button>
      </div>

      {/* 状态总结 */}
      {!isChecking && (
        <div className={`p-2 sm:p-3 rounded-lg border ${
          isAllReady 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          <p className={`text-xs sm:text-sm ${
            isAllReady 
              ? 'text-green-700 dark:text-green-300' 
              : 'text-yellow-700 dark:text-yellow-300'
          }`}>
            {isAllReady 
              ? '✓ 环境检测通过，所有必要组件已安装' 
              : '⚠ 部分环境组件未安装，建议安装后再继续'}
          </p>
        </div>
      )}
    </div>
  )
}
