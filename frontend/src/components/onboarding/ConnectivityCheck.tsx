import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckCircle2Icon, XCircleIcon, LoaderIcon, AlertCircleIcon, WifiOffIcon, ServerIcon, CheckIcon } from 'lucide-react'
import { useConnectivityCheck, ConnectivityStatus } from '@/hooks/useConnectivityCheck'

interface ConnectivityCheckProps {
  stepColor: string
  onStatusChange?: (isBackendConnected: boolean) => void
  onRecheckRequest?: (checkFn: () => void) => void
}

/**
 * 联通性检查组件
 * 检查后端连接、GitHub 和 Gitee 的延迟
 */
export function ConnectivityCheck({ stepColor, onStatusChange, onRecheckRequest }: ConnectivityCheckProps) {
  // 使用原有的 hook 管理连接检查
  const {
    tempUrl,
    hasUnsavedChanges,
    handleUrlChange,
    handleBlur,
    handleSave,
    backendStatus,
    githubStatus,
    giteeStatus
  } = useConnectivityCheck({ onStatusChange, onRecheckRequest })

  // 渲染状态图标
  const renderStatusIcon = (status: ConnectivityStatus['status']) => {
    switch (status) {
      case 'checking':
        return <LoaderIcon className="w-4.5 h-4.5 animate-spin" />
      case 'success':
        return <CheckCircle2Icon className="w-4.5 h-4.5" />
      case 'error':
        return <XCircleIcon className="w-4.5 h-4.5" />
      default:
        return <WifiOffIcon className="w-4.5 h-4.5" />
    }
  }

  // 渲染单个检查项 - 紧凑设计
  const renderCheckItem = (status: ConnectivityStatus) => {
    const getStatusColor = () => {
      if (status.status === 'success') return 'text-green-600 dark:text-green-400'
      if (status.status === 'error') return 'text-red-600 dark:text-red-400'
      return 'text-[#023e8a]/50 dark:text-white/50'
    }

    const getLatencyColor = () => {
      if (!status.latency) return ''
      if (status.latency < 500) return 'text-green-600 dark:text-green-400'
      if (status.latency < 1000) return 'text-yellow-600 dark:text-yellow-400'
      return 'text-red-600 dark:text-red-400'
    }

    // 根据延迟判断网络质量
    const getNetworkQuality = () => {
      if (!status.latency) return ''
      if (status.latency < 200) return '极速'
      if (status.latency < 500) return '良好'
      if (status.latency < 1000) return '一般'
      return '较慢'
    }

    return (
      <div key={status.name} className="relative p-3 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a] hover:bg-white/80 dark:hover:bg-[#3a3a3a] transition-all">
        {/* 图标和标题 */}
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0"
            style={{ backgroundColor: stepColor }}
          >
            {renderStatusIcon(status.status)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[#023e8a] dark:text-white leading-tight">
              {status.name}
            </h3>
            <p className="text-xs text-[#023e8a]/50 dark:text-white/50 leading-tight">
              {status.url.replace('https://', '').replace('http://', '')}
            </p>
          </div>
        </div>

        {/* 状态和延迟 */}
        <div className="flex items-center justify-between pl-11">
          {status.status === 'success' && (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className={`text-xs font-medium ${getStatusColor()}`}>
                  连接正常
                </span>
              </div>
              {status.latency && (
                <span className="text-xs text-[#023e8a]/40 dark:text-white/40">
                  {getNetworkQuality()}
                </span>
              )}
            </div>
          )}
          {status.status === 'error' && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className={`text-xs font-medium ${getStatusColor()}`}>
                连接失败
              </span>
            </div>
          )}
          {status.status === 'checking' && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className={`text-xs font-medium ${getStatusColor()}`}>
                检查中...
              </span>
            </div>
          )}
          
          {status.latency && (
            <div className="flex flex-col items-end">
              <span className={`text-lg font-bold ${getLatencyColor()} leading-tight`}>
                {status.latency}<span className="text-xs ml-0.5">ms</span>
              </span>
            </div>
          )}
        </div>

        {/* 错误信息 - 紧凑显示 */}
        {status.error && (
          <div className="mt-2 pl-11 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{status.error}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* 后端服务配置和状态 - 合并为一个卡片 */}
      <div className="relative p-3 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a]">
        <div className="flex items-start gap-2 mb-2.5">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0"
            style={{ backgroundColor: stepColor }}
          >
            <ServerIcon className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[#023e8a] dark:text-white mb-1.5 leading-tight">
              后端服务地址
            </h3>
            <div className="flex items-center gap-2">
              <Input
                type="url"
                value={tempUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                onBlur={handleBlur}
                placeholder="http://localhost:11111"
                className="h-9 text-sm bg-white dark:bg-[#1f1f1f] border-[#023e8a]/20 dark:border-[#3a3a3a] focus-visible:ring-offset-0 flex-1"
              />
              {hasUnsavedChanges && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="h-9 w-9 p-0 bg-green-500 hover:bg-green-600 text-white border-0 flex-shrink-0"
                >
                  <CheckIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-[#023e8a]/50 dark:text-white/50 leading-tight mt-1.5">
              默认端口: 11111 | 修改后点击 ✓ 或失焦自动保存
            </p>
          </div>
        </div>

        {/* 后端服务连接状态 */}
        <div className="pl-11 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              {backendStatus.status === 'checking' ? (
                <LoaderIcon className="w-3 h-3 animate-spin text-blue-500" />
              ) : backendStatus.status === 'success' ? (
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              ) : backendStatus.status === 'error' ? (
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
              )}
              <span className={`text-xs font-medium ${
                backendStatus.status === 'success' ? 'text-green-600 dark:text-green-400' :
                backendStatus.status === 'error' ? 'text-red-600 dark:text-red-400' :
                backendStatus.status === 'checking' ? 'text-blue-600 dark:text-blue-400' :
                'text-[#023e8a]/50 dark:text-white/50'
              }`}>
                {backendStatus.status === 'checking' ? '检查中...' :
                 backendStatus.status === 'success' ? '服务运行正常' :
                 backendStatus.status === 'error' ? '服务连接失败' :
                 '等待检查'}
              </span>
            </div>
            {backendStatus.status === 'success' && backendStatus.latency && (
              <span className="text-xs text-[#023e8a]/40 dark:text-white/40 pl-5">
                {backendStatus.latency < 100 ? '响应极快' : 
                 backendStatus.latency < 300 ? '响应良好' : 
                 backendStatus.latency < 500 ? '响应正常' : '响应较慢'}
              </span>
            )}
          </div>
          
          {backendStatus.latency && (
            <div className="flex flex-col items-end">
              <span className={`text-lg font-bold leading-tight ${
                backendStatus.latency < 500 ? 'text-green-600 dark:text-green-400' :
                backendStatus.latency < 1000 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {backendStatus.latency}<span className="text-xs ml-0.5">ms</span>
              </span>
            </div>
          )}
        </div>

        {/* 错误信息 */}
        {backendStatus.error && (
          <div className="mt-2.5 pl-11 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 p-2 rounded-lg bg-red-50 dark:bg-red-900/10">
            <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{backendStatus.error}</span>
          </div>
        )}
      </div>

      {/* GitHub 和 Gitee 横向排列 */}
      <div className="grid grid-cols-2 gap-2">
        {renderCheckItem(githubStatus)}
        {renderCheckItem(giteeStatus)}
      </div>
    </div>
  )
}
