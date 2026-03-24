import { Button } from '@/components/ui/button'
import { LoaderIcon, FolderOpenIcon, CheckCircle2Icon, AlertCircleIcon } from 'lucide-react'
import { useSavePathMutation, useDeploymentPathQuery } from '@/hooks/queries/useEnvironmentQueries'
import { open } from '@tauri-apps/plugin-dialog'
import { useState, useEffect } from 'react'

interface InstallPathConfigProps {
  stepColor: string
}

const iconStyle = (color: string) => ({ backgroundColor: color })

/**
 * 安装路径配置组件
 * 职责：配置 Bot 实例的部署/安装路径
 */
export function InstallPathConfig({ stepColor }: InstallPathConfigProps) {
  // 部署路径管理
  const { data: deploymentPath = '', isLoading: isLoadingPath } = useDeploymentPathQuery()
  const savePathMutation = useSavePathMutation()
  
  // 本地状态
  const [localPath, setLocalPath] = useState(deploymentPath)
  const [pathError, setPathError] = useState<string | null>(null)
  const [pathSuccess, setPathSuccess] = useState<string | null>(null)
  
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
        title: '选择安装路径',
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
    setPathSuccess(null)
    
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
    <div className="space-y-4 sm:space-y-6">
      {/* 安装路径配置 */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-none">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
            style={iconStyle(stepColor)}
          >
            <FolderOpenIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              安装路径
            </h3>
            <p className="text-sm text-muted-foreground">
              Bot 实例将被安装到此目录
            </p>
          </div>
        </div>

        {isLoadingPath ? (
          <div className="py-6 sm:py-8 text-center">
            <LoaderIcon className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mx-auto text-brand" />
            <p className="text-sm text-muted-foreground mt-2">加载中...</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {/* 路径输入和选择 */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={localPath}
                  onChange={(e) => handlePathChange(e.target.value)}
                  placeholder="选择或输入安装路径"
                  disabled={savePathMutation.isPending}
                  className={`w-full px-4 py-3 text-sm sm:text-base rounded-xl border-0 bg-muted text-foreground placeholder:text-muted-foreground focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed font-mono ${
                    pathError
                      ? 'focus:ring-red-500/30 bg-red-50/50'
                      : pathSuccess
                      ? 'focus:ring-green-500/30 bg-green-50/50'
                      : 'focus:ring-brand/30'
                  }`}
                />
                {savePathMutation.isPending && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <LoaderIcon className="w-4 h-4 animate-spin text-brand" />
                  </div>
                )}
              </div>
              <Button
                onClick={handleSelectFolder}
                disabled={savePathMutation.isPending}
                className="h-12 px-6 rounded-xl bg-muted hover:bg-muted/80 text-foreground border-0 transition-colors shadow-none"
              >
                浏览...
              </Button>
            </div>

            {/* 错误信息 */}
            {pathError && (
              <div className="p-2 sm:p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-2">
                  <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 break-words">{pathError}</p>
                </div>
              </div>
            )}

            {/* 成功信息 */}
            {pathSuccess && (
              <div className="p-2 sm:p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2Icon className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">{pathSuccess}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 说明信息 */}
      <div className="p-2 sm:p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          💡 所有 Bot 实例将安装在此目录下的独立子文件夹中。建议选择一个有足够空间的位置。
        </p>
      </div>

      {/* 路径结构预览 */}
      {localPath && (
        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border">
          <h4 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">
            目录结构预览
          </h4>
          <div className="font-mono text-xs text-muted-foreground space-y-1 bg-muted p-2 sm:p-3 rounded-lg overflow-x-auto">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <FolderOpenIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span className="truncate">{localPath.split('/').pop() || localPath}</span>
            </div>
            <div className="pl-4 sm:pl-5 border-l border-dashed border-border ml-1 sm:ml-1.5 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground/70">
                <FolderOpenIcon className="w-3 h-3 flex-shrink-0" />
                <span>instance-1/</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground/70">
                <FolderOpenIcon className="w-3 h-3 flex-shrink-0" />
                <span>instance-2/</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground/50">
                <span className="pl-4 sm:pl-5">...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
