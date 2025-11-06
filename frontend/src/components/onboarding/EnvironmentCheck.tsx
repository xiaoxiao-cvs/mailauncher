import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2Icon, XCircleIcon, LoaderIcon, FolderOpenIcon, AlertCircleIcon } from 'lucide-react'

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

  // 检查 Git 环境
  const checkGitEnvironment = async () => {
    setIsCheckingGit(true)
    setGitError('')
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/environment/git')
      const data = await response.json()
      
      if (data.success) {
        setGitInfo(data.data)
      } else {
        setGitError('无法获取 Git 信息')
      }
    } catch (error) {
      setGitError('连接后端服务失败，请确保后端正在运行')
      console.error('Failed to check Git:', error)
    } finally {
      setIsCheckingGit(false)
    }
  }

  // 获取默认部署路径
  const loadDeploymentPath = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/environment/config')
      const data = await response.json()
      
      if (data.success) {
        setDeploymentPath(data.data.instances_dir)
      }
    } catch (error) {
      console.error('Failed to load deployment path:', error)
    }
  }

  // 组件加载时自动检查
  useEffect(() => {
    checkGitEnvironment()
    loadDeploymentPath()
  }, [])

  // 打开文件夹选择器
  const handleSelectFolder = async () => {
    console.log('handleSelectFolder called')
    try {
      // 动态导入 Tauri API
      const { open } = await import('@tauri-apps/plugin-dialog')
      console.log('Tauri dialog plugin loaded')
      
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择 Bot 实例部署目录'
      })
      
      console.log('Selected path:', selected)
      
      if (selected) {
        const selectedPath = selected as string
        setDeploymentPath(selectedPath)
        setPathError('')
        // 保存到后端
        await saveDeploymentPath(selectedPath)
      }
    } catch (error) {
      // 如果不在 Tauri 环境中，回退到提示用户手动输入
      console.error('File picker error:', error)
      alert('文件夹选择器仅在桌面应用中可用。\n请直接在输入框中粘贴路径。')
    }
  }

  // 保存路径到后端
  const saveDeploymentPath = async (path: string) => {
    setIsSavingPath(true)
    setPathError('')
    setPathSuccess('')
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/config/paths', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'instances_dir',
          path: path,
          path_type: 'directory',
          is_verified: false,
          description: 'Bot 实例部署目录'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPathSuccess('✓ 路径已保存')
        // 3秒后清除成功提示
        setTimeout(() => setPathSuccess(''), 3000)
      } else {
        setPathError('保存路径失败')
      }
    } catch (error) {
      console.error('Failed to save deployment path:', error)
      setPathError('保存路径失败，请检查后端连接')
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
      <div className="p-3.5 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a]">
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

      {/* 部署路径配置 */}
      <div className="p-3.5 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a]">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm"
            style={{ backgroundColor: stepColor }}
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
                value={deploymentPath}
                onChange={(e) => handlePathChange(e.target.value)}
                placeholder="/path/to/deployments"
                disabled={isSavingPath}
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
              {isSavingPath && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <LoaderIcon className="w-4 h-4 animate-spin text-[#023e8a] dark:text-white" />
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
