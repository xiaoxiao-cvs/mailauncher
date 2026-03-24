import { Button } from '@/components/ui/button'
import { CheckCircle2Icon, XCircleIcon, LoaderIcon, AlertCircleIcon, ChevronDownIcon } from 'lucide-react'
import { 
  useGitEnvironmentQuery,
  usePythonVersionsQuery,
  usePythonDefaultQuery,
  useSetPythonDefaultMutation
} from '@/hooks/queries/useEnvironmentQueries'
import { useState, useEffect } from 'react'

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
  // Git 环境检查
  const { data: gitInfo, isLoading: isCheckingGit, error: gitErrorObj, refetch: checkGitEnvironment } = useGitEnvironmentQuery()
  const gitError = gitErrorObj ? String(gitErrorObj) : null
  
  // Python 版本管理
  const { data: pythonVersions = [], isLoading: isLoadingPython, error: pythonErrorObj } = usePythonVersionsQuery()
  const pythonError = pythonErrorObj ? String(pythonErrorObj) : null
  const { data: selectedPython } = usePythonDefaultQuery()
  const savePythonMutation = useSetPythonDefaultMutation()
  
  // 本地状态
  const [showPythonDropdown, setShowPythonDropdown] = useState(false)
  const [localSelectedPython, setLocalSelectedPython] = useState(selectedPython || '')
  
  // 同步 selectedPython 到本地状态
  useEffect(() => {
    if (selectedPython) {
      setLocalSelectedPython(selectedPython)
    }
  }, [selectedPython])
  
  // 通知父组件 Git 状态变化
  useEffect(() => {
    if (gitInfo && onGitStatusChange) {
      onGitStatusChange(gitInfo.is_available)
    }
  }, [gitInfo, onGitStatusChange])

  return (
    <div className="space-y-4">
      {/* Git 环境检查 */}
      <div className="p-3.5 rounded-card bg-card border border-border">
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
              <h3 className="text-sm font-semibold text-foreground">
                Git 环境
              </h3>
              <p className="text-xs text-muted-foreground">
                克隆和更新 Bot 实例所需
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkGitEnvironment()}
            disabled={isCheckingGit}
            className="bg-card border-border text-xs h-8"
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
            <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground">状态</span>
              <span className="text-xs font-medium text-foreground">
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
                <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-muted/50">
                  <span className="text-xs text-muted-foreground">版本</span>
                  <span className="text-xs font-medium text-foreground font-mono">
                    {gitInfo.version}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-muted/50">
                  <span className="text-xs text-muted-foreground">路径</span>
                  <span className="text-xs font-mono text-foreground truncate max-w-xs">
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
      <div className="p-3.5 rounded-card bg-card border border-border">
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
            <h3 className="text-sm font-semibold text-foreground">
              默认 Python 版本
            </h3>
            <p className="text-xs text-muted-foreground">
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
            <LoaderIcon className="w-5 h-5 animate-spin mx-auto text-foreground" />
            <p className="text-xs text-muted-foreground mt-2">加载 Python 版本...</p>
          </div>
        ) : pythonVersions.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setShowPythonDropdown(!showPythonDropdown)}
              disabled={savePythonMutation.isPending}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-all disabled:opacity-60"
            >
              <div className="flex-1 text-left">
                {localSelectedPython ? (
                  <div>
                    <div className="text-xs font-medium text-foreground">
                      {pythonVersions.find(v => v.path === localSelectedPython)?.version || '未选择'}
                    </div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {typeof localSelectedPython === 'string' ? localSelectedPython : ''}
                      </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    选择 Python 版本
                  </div>
                )}
              </div>
              <ChevronDownIcon className={`w-4 h-4 text-foreground transition-transform ${showPythonDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showPythonDropdown && (
              <div className="absolute z-10 w-full mt-1 py-1 rounded-lg bg-popover border border-border shadow-lg max-h-60 overflow-y-auto">
                {pythonVersions.map((version) => (
                  <button
                    key={version.path}
                    onClick={() => {
                      setLocalSelectedPython(version.path)
                      setShowPythonDropdown(false)
                      savePythonMutation.mutate(version.path)
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors ${
                      version.path === localSelectedPython ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-xs font-medium text-foreground">
                          {version.version}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {version.path}
                        </div>
                      </div>
                      {version.path === localSelectedPython && (
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
