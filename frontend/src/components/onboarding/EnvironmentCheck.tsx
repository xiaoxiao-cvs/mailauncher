import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2Icon, XCircleIcon, LoaderIcon, FolderOpenIcon, AlertCircleIcon } from 'lucide-react'
import { tauriInvoke } from '@/services/tauriInvoke'
import { environmentLogger } from '@/utils/logger'

interface GitInfo {
  is_available: boolean
  path: string
  version: string
}

interface EnvironmentCheckProps {
  stepColor: string
}

/**
 * 环境检查与配置组件
 * 负责检查 Git 环境和配置部署路径
 */
export function EnvironmentCheck({ stepColor }: EnvironmentCheckProps) {
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null)
  const [deploymentPath, setDeploymentPath] = useState<string>('')
  const [isCheckingGit, setIsCheckingGit] = useState(false)
  const [gitError, setGitError] = useState<string>('')
  const [pathError, setPathError] = useState<string>('')
  const [pathSuccess, setPathSuccess] = useState<string>('')
  const [isSavingPath, setIsSavingPath] = useState(false)

  const checkGitEnvironment = async () => {
    setIsCheckingGit(true)
    setGitError('')
    environmentLogger.info('开始检查 Git 环境')
    
    try {
      const result = await tauriInvoke<GitInfo>('check_git_environment')
      setGitInfo(result)
      environmentLogger.success('Git 环境检查完成', result)
    } catch (error) {
      setGitError('检查 Git 环境失败')
      environmentLogger.error('检查 Git 环境失败', error)
    } finally {
      setIsCheckingGit(false)
    }
  }

  const loadDeploymentPath = async () => {
    environmentLogger.info('加载部署路径配置')
    try {
      const path = await tauriInvoke<string | null>('get_path', { name: 'instances_dir' })
      if (path) {
        setDeploymentPath(path)
        environmentLogger.success('部署路径加载成功', { path })
      }
    } catch (error) {
      environmentLogger.error('加载部署路径失败', error)
    }
  }

  useEffect(() => {
    checkGitEnvironment()
    loadDeploymentPath()
  }, [])

  // 打开文件夹选择器
  const handleSelectFolder = async () => {
    environmentLogger.info('打开文件夹选择器')
    try {
      // 动态导入 Tauri API
      const { open } = await import('@tauri-apps/plugin-dialog')
      environmentLogger.debug('Tauri dialog 插件加载成功')
      
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择 Bot 实例部署目录'
      })
      
      environmentLogger.info('用户选择的路径', { path: selected })
      
      if (selected) {
        const selectedPath = selected as string
        setDeploymentPath(selectedPath)
        setPathError('')
        // 保存到后端
        await saveDeploymentPath(selectedPath)
      }
    } catch (error) {
      // 如果不在 Tauri 环境中，回退到提示用户手动输入
      environmentLogger.error('文件选择器错误', error)
      alert('文件夹选择器仅在桌面应用中可用。\n请直接在输入框中粘贴路径。')
    }
  }

  const saveDeploymentPath = async (path: string) => {
    setIsSavingPath(true)
    setPathError('')
    setPathSuccess('')
    environmentLogger.info('保存部署路径', { path })
    
    try {
      await tauriInvoke('set_path', {
        name: 'instances_dir',
        path: path,
        pathType: 'directory',
        isVerified: false,
        description: 'Bot 实例部署目录'
      })
      setPathSuccess('✓ 路径已保存')
      environmentLogger.success('部署路径保存成功')
      setTimeout(() => setPathSuccess(''), 3000)
    } catch (error) {
      environmentLogger.error('保存路径异常', error)
      setPathError('保存路径失败')
    } finally {
      setIsSavingPath(false)
    }
  }

  // 验证并保存路径
  const handlePathChange = (value: string) => {
    setDeploymentPath(value)
    setPathError('')
    setPathSuccess('')
    
    // 简单的路径验证
    if (value && !value.startsWith('/') && !value.match(/^[A-Z]:\\/i)) {
      setPathError('请输入有效的绝对路径')
    } else if (value) {
      // 路径有效，保存到后端
      saveDeploymentPath(value)
    }
  }

  return (
    <div className="space-y-4">
      {/* Git 环境检查 */}
      <div className="p-3.5 rounded-xl bg-card border border-border">
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: stepColor }}
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
            onClick={checkGitEnvironment}
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
            <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-muted">
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
                <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-muted">
                  <span className="text-xs text-muted-foreground">版本</span>
                  <span className="text-xs font-medium text-foreground font-mono">
                    {gitInfo.version}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-muted">
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

      {/* 部署路径配置 */}
      <div className="p-3.5 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm"
            style={{ backgroundColor: stepColor }}
          >
            <FolderOpenIcon className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              部署路径
            </h3>
            <p className="text-xs text-muted-foreground">
              Bot 实例将安装到此目录
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={deploymentPath}
                onChange={(e) => handlePathChange(e.target.value)}
                placeholder="/path/to/deployments"
                disabled={isSavingPath}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  pathError
                    ? 'border-red-300 dark:border-red-700 focus:ring-red-200 dark:focus:ring-red-800'
                    : pathSuccess
                    ? 'border-green-300 dark:border-green-700 focus:ring-green-200 dark:focus:ring-green-800'
                    : 'border-border focus:ring-ring/20'
                }`}
              />
              {pathError && (
                <p className="absolute -bottom-5 left-0 text-xs text-red-600 dark:text-red-400">
                  {pathError}
                </p>
              )}
              {isSavingPath && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <LoaderIcon className="w-4 h-4 animate-spin text-foreground" />
                </div>
              )}
            </div>
            <Button
              onClick={handleSelectFolder}
              size="sm"
              disabled={isSavingPath}
              className="text-white border-0 px-4 shadow-md hover:shadow-lg transition-all text-xs disabled:opacity-60"
              style={{ backgroundColor: stepColor }}
            >
              <FolderOpenIcon className="w-3.5 h-3.5 mr-1.5" />
              选择文件夹
            </Button>
          </div>

          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 提示：可以直接输入路径，或点击按钮选择文件夹。默认路径为后端同目录下的 deployments 文件夹。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
