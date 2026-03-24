import { Button } from '@/components/ui/button'
import { FolderOpenIcon, LoaderIcon } from 'lucide-react'
import { useDeploymentPathQuery, useSavePathMutation } from '@/hooks/queries/useEnvironmentQueries'
import { open } from '@tauri-apps/plugin-dialog'
import { useState, useEffect } from 'react'

interface DeploymentPathConfigProps {
  stepColor: string
}

const iconStyle = (color: string) => ({ backgroundColor: color })

/**
 * 部署路径配置组件
 * 职责：配置 Bot 实例的部署目录
 */
export function DeploymentPathConfig({ stepColor }: DeploymentPathConfigProps) {
  // 部署路径管理
  const { data: deploymentPath = '' } = useDeploymentPathQuery()
  const savePathMutation = useSavePathMutation()
  
  // 本地状态
  const [localPath, setLocalPath] = useState(deploymentPath)
  const [pathError, setPathError] = useState<string | null>(null)
  const [pathSuccess, setPathSuccess] = useState(false)
  
  // 同步路径
  useEffect(() => {
    setLocalPath(deploymentPath)
  }, [deploymentPath])
  
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
          setPathSuccess(true)
          setPathError(null)
        },
        onError: (error) => {
          setPathError(String(error))
          setPathSuccess(false)
        },
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-3.5 rounded-card bg-card border border-border">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm"
            style={iconStyle(stepColor)}
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
                value={localPath}
                onChange={(e) => handlePathChange(e.target.value)}
                placeholder="/path/to/deployments"
                disabled={savePathMutation.isPending}
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
              {savePathMutation.isPending && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <LoaderIcon className="w-4 h-4 animate-spin text-foreground" />
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
              选择文件夹
            </Button>
          </div>

          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 提示：可以直接输入路径，或点击按钮选择文件夹。默认路径为后端同目录下的 deployments 文件夹。
            </p>
          </div>

          {pathSuccess && (
            <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
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
