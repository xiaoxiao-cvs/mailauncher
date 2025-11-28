import { Button } from '@/components/ui/button'
import { CheckCircle2Icon, XCircleIcon, LoaderIcon, AlertCircleIcon, FolderOpenIcon } from 'lucide-react'
import { useGitEnvironmentQuery, useSavePathMutation, useDeploymentPathQuery } from '@/hooks/queries/useEnvironmentQueries'
import { open } from '@tauri-apps/plugin-dialog'
import { useState, useEffect } from 'react'

interface EnvironmentConfigProps {
  stepColor: string
  onGitStatusChange?: (isAvailable: boolean) => void
}

const iconStyle = (color: string) => ({ backgroundColor: color })

/**
 * 环境配置组件（首页）
 * 职责：检查 Git 环境并配置部署路径
 */
export function EnvironmentConfig({ stepColor, onGitStatusChange }: EnvironmentConfigProps) {
  // Git 环境检查
  const { data: gitInfo, isLoading: isCheckingGit, error: gitErrorObj, refetch: checkGitEnvironment } = useGitEnvironmentQuery()
  const gitError = gitErrorObj ? String(gitErrorObj) : null
  
  // 部署路径管理
  const { data: deploymentPath = '' } = useDeploymentPathQuery()
  const savePathMutation = useSavePathMutation()
  
  // 本地状态
  const [localPath, setLocalPath] = useState(deploymentPath)
  const [pathError, setPathError] = useState<string | null>(null)
  const [pathSuccess, setPathSuccess] = useState<string | null>(null)
  
  // 同步路径
  useEffect(() => {
    setLocalPath(deploymentPath)
  }, [deploymentPath])
  
  // 通知父组件 Git 状态变化
  useEffect(() => {
    if (gitInfo && onGitStatusChange) {
      onGitStatusChange(gitInfo.is_available)
    }
  }, [gitInfo, onGitStatusChange])
  
  // 选择文件夹
  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择部署路径',
      })
      if (selected && typeof selected === 'string') {
        handlePathChange(selected)
      }
    } catch (error) {
      console.error('选择文件夹失败:', error)
    }
  }
  
  // 处理路径变化
  const handlePathChange = (newPath: string) => {
    setLocalPath(newPath)
    setPathError(null)
    setPathSuccess(false)
    
    if (newPath) {
      savePathMutation.mutate(newPath, {
        onSuccess: () => {
          setPathSuccess('路径保存成功')
          setPathError(null)
        },
        onError: (error) => {
          setPathError(String(error))
          setPathSuccess(null)
        },
      })
    }
  }

  return (
    <div className="space-y-4 h-full overflow-hidden">
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
            onClick={() => checkGitEnvironment()}
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

      {/* 部署路径配置 */}
      <div className="p-3.5 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a]">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm"
            style={iconStyle(stepColor)}
          >
            <FolderOpenIcon className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#023e8a] dark:text-white">
              部署路径
            </h3>
            <p className="text-xs text-[#023e8a]/70 dark:text-white/70">
              Bot 实例将安装到此目录
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={localPath}
                onChange={(e) => handlePathChange(e.target.value)}
                placeholder="/path/to/deployments"
                disabled={savePathMutation.isPending}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-[#3a3a3a] text-[#023e8a] dark:text-white placeholder:text-[#023e8a]/40 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  pathError
                    ? 'border-red-300 dark:border-red-700 focus:ring-red-200 dark:focus:ring-red-800'
                    : pathSuccess
                    ? 'border-green-300 dark:border-green-700 focus:ring-green-200 dark:focus:ring-green-800'
                    : 'border-[#023e8a]/20 dark:border-[#3a3a3a] focus:ring-[#023e8a]/20'
                }`}
              />
              {pathError && (
                <p className="absolute -bottom-5 left-0 text-xs text-red-600 dark:text-red-400">
                  {pathError}
                </p>
              )}
              {savePathMutation.isPending && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <LoaderIcon className="w-4 h-4 animate-spin text-[#023e8a] dark:text-white" />
                </div>
              )}
            </div>
            <Button
              onClick={handleSelectFolder}
              size="sm"
              disabled={savePathMutation.isPending}
              className="text-white border-0 px-4 shadow-md hover:shadow-lg transition-all text-xs disabled:opacity-60"
              style={iconStyle(stepColor)}
            >
              <FolderOpenIcon className="w-3.5 h-3.5 mr-1.5" />
              选择
            </Button>
          </div>

          {pathSuccess && (
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-700 dark:text-green-300">
                {pathSuccess}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
