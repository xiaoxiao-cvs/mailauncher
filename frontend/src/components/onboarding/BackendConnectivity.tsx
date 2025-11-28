import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LoaderIcon, AlertCircleIcon, ServerIcon, CheckIcon } from 'lucide-react'
import { useConnectivityCheck } from '@/hooks/useConnectivityCheck'

interface BackendConnectivityProps {
  stepColor: string
  onStatusChange?: (isBackendConnected: boolean) => void
  onRecheckRequest?: (checkFn: () => void) => void
}

/**
 * 后端联通性检查组件
 * 仅检查后端服务连接状态，配置后端地址
 */
export function BackendConnectivity({ stepColor, onStatusChange, onRecheckRequest }: BackendConnectivityProps) {
  const {
    tempUrl,
    hasUnsavedChanges,
    handleUrlChange,
    handleBlur,
    handleSave,
    backendStatus
  } = useConnectivityCheck({ onStatusChange, onRecheckRequest })

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 后端服务配置 */}
      <div className="relative p-3 sm:p-4 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a]">
        <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0"
            style={{ backgroundColor: stepColor }}
          >
            <ServerIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-[#023e8a] dark:text-white mb-0.5 sm:mb-1">
              后端服务地址
            </h3>
            <p className="text-xs sm:text-sm text-[#023e8a]/60 dark:text-white/60">
              配置 MAI Launcher 后端服务的连接地址
            </p>
          </div>
        </div>

        {/* URL 输入框 */}
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <Input
            type="url"
            value={tempUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="http://localhost:11111"
            className="h-9 sm:h-10 text-xs sm:text-sm bg-white dark:bg-[#1f1f1f] border-[#023e8a]/20 dark:border-[#3a3a3a] focus-visible:ring-offset-0 flex-1"
          />
          {hasUnsavedChanges && (
            <Button
              size="sm"
              onClick={handleSave}
              className="h-9 w-9 sm:h-10 sm:w-10 p-0 bg-green-500 hover:bg-green-600 text-white border-0 flex-shrink-0"
            >
              <CheckIcon className="w-4 h-4" />
            </Button>
          )}
        </div>

        <p className="text-xs text-[#023e8a]/50 dark:text-white/50 mb-3 sm:mb-4">
          默认端口: 11111 | 修改后点击 ✓ 或失焦自动保存
        </p>

        {/* 连接状态卡片 */}
        <div className="p-2 sm:p-3 rounded-lg bg-white/40 dark:bg-[#3a3a3a]/50 border border-[#023e8a]/5 dark:border-[#3a3a3a]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {backendStatus.status === 'checking' ? (
                <LoaderIcon className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
              ) : backendStatus.status === 'success' ? (
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              ) : backendStatus.status === 'error' ? (
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
              )}
              <span className={`text-xs sm:text-sm font-medium truncate ${
                backendStatus.status === 'success' ? 'text-green-600 dark:text-green-400' :
                backendStatus.status === 'error' ? 'text-red-600 dark:text-red-400' :
                backendStatus.status === 'checking' ? 'text-blue-600 dark:text-blue-400' :
                'text-[#023e8a]/50 dark:text-white/50'
              }`}>
                {backendStatus.status === 'checking' ? '正在检查连接...' :
                 backendStatus.status === 'success' ? '后端服务运行正常' :
                 backendStatus.status === 'error' ? '无法连接后端服务' :
                 '等待检查'}
              </span>
            </div>
            
            {backendStatus.latency && backendStatus.status === 'success' && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`text-base sm:text-lg font-bold ${
                  backendStatus.latency < 500 ? 'text-green-600 dark:text-green-400' :
                  backendStatus.latency < 1000 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {backendStatus.latency}
                </span>
                <span className="text-xs text-[#023e8a]/50 dark:text-white/50">ms</span>
              </div>
            )}
          </div>

          {backendStatus.status === 'success' && backendStatus.latency && (
            <p className="text-xs text-[#023e8a]/40 dark:text-white/40 mt-1 sm:mt-1.5 pl-4">
              {backendStatus.latency < 100 ? '响应极快，连接质量优秀' : 
               backendStatus.latency < 300 ? '响应良好，连接稳定' : 
               backendStatus.latency < 500 ? '响应正常' : '响应较慢，请检查网络'}
            </p>
          )}
        </div>

        {/* 错误信息 */}
        {backendStatus.error && (
          <div className="mt-2 sm:mt-3 p-2 sm:p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 break-words">{backendStatus.error}</p>
                <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
                  请确保后端服务已启动，并检查地址是否正确
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 提示信息 */}
      <div className="p-2 sm:p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          💡 后端服务用于管理 Bot 实例、处理配置和执行部署任务。确保后端正常运行后再继续。
        </p>
      </div>
    </div>
  )
}
