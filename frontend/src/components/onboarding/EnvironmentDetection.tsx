import { Button } from '@/components/ui/button'
import { CheckIcon, XIcon, LoaderIcon, RefreshCwIcon } from 'lucide-react'
import { useGitEnvironmentQuery, usePythonVersionsQuery } from '@/hooks/queries/useEnvironmentQueries'

interface EnvironmentDetectionProps {
  stepColor: string
  onEnvironmentReady?: (isReady: boolean) => void
}

/**
 * 环境检测组件
 * 职责：检测 Git 和 Python 是否已安装
 */
export function EnvironmentDetection({ onEnvironmentReady }: EnvironmentDetectionProps) {
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

  // 状态图标组件
  const StatusIcon = ({ isLoading, isSuccess, hasError }: { isLoading: boolean; isSuccess: boolean; hasError: boolean }) => {
    if (isLoading) {
      return (
        <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center">
          <LoaderIcon className="w-3.5 h-3.5 text-brand animate-spin" />
        </div>
      )
    }
    if (hasError || !isSuccess) {
      return (
        <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
          <XIcon className="w-3.5 h-3.5 text-destructive" />
        </div>
      )
    }
    return (
      <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
        <CheckIcon className="w-3.5 h-3.5 text-success" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 检测项列表 */}
      <div className="space-y-3">
        {/* Git 环境检测 */}
        <div className="group flex items-center gap-4 p-5 rounded-2xl bg-card shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:bg-white/[0.05] dark:shadow-none transition-all duration-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          <StatusIcon isLoading={isCheckingGit} isSuccess={isGitAvailable} hasError={!!gitError} />
          
          <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <h3 className="text-[15px] font-medium text-foreground">
                Git
              </h3>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {isCheckingGit ? '正在检测...' : 
                 gitError ? '检测失败' :
                 isGitAvailable ? '已安装' : 
                 '未检测到'}
              </p>
            </div>
            {isGitAvailable && !isCheckingGit && (
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded-md">
                {gitInfo?.version}
              </span>
            )}
          </div>

          {!isGitAvailable && !isCheckingGit && (
            <a 
              href="https://git-scm.com/downloads" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[13px] text-brand hover:underline flex-shrink-0"
            >
              下载
            </a>
          )}
        </div>

        {/* Python 环境检测 */}
        <div className="group flex items-center gap-4 p-5 rounded-2xl bg-card shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:bg-white/[0.05] dark:shadow-none transition-all duration-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          <StatusIcon isLoading={isCheckingPython} isSuccess={isPythonAvailable} hasError={!!pythonError} />
          
          <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <h3 className="text-[15px] font-medium text-foreground">
                Python
              </h3>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {isCheckingPython ? '正在检测...' : 
                 pythonError ? '检测失败' :
                 isPythonAvailable ? '已安装' : 
                 '未检测到'}
              </p>
            </div>
            {isPythonAvailable && !isCheckingPython && (
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded-md">
                {pythonVersions.length} 个版本
              </span>
            )}
          </div>

          {!isPythonAvailable && !isCheckingPython && (
            <a 
              href="https://www.python.org/downloads/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[13px] text-brand hover:underline flex-shrink-0"
            >
              下载
            </a>
          )}
        </div>
      </div>

      {/* 重新检测按钮 */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRecheckAll}
          disabled={isChecking}
          className="text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded-full px-4 h-9 transition-colors"
        >
          <RefreshCwIcon className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          重新检测
        </Button>
      </div>

      {/* 状态总结 */}
      {!isChecking && (
        <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl ${
          isAllReady
            ? 'bg-success/10'
            : 'bg-warning/10'
        }`}>
          {isAllReady ? (
            <CheckIcon className="w-4 h-4 text-success" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-warning" />
          )}
          <p className={`text-[13px] font-medium ${
            isAllReady
              ? 'text-success'
              : 'text-warning'
          }`}>
            {isAllReady 
              ? '环境检测通过，所有必要组件已安装' 
              : '部分环境组件未安装，建议安装后再继续'}
          </p>
        </div>
      )}
    </div>
  )
}
