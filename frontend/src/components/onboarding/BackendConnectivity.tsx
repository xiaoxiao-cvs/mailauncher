import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LoaderIcon, CheckIcon, XIcon } from 'lucide-react'
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
export function BackendConnectivity({ onStatusChange, onRecheckRequest }: BackendConnectivityProps) {
  const {
    tempUrl,
    hasUnsavedChanges,
    handleUrlChange,
    handleBlur,
    handleSave,
    backendStatus
  } = useConnectivityCheck({ onStatusChange, onRecheckRequest })

  // 状态颜色
  const statusColor = backendStatus.status === 'success'
    ? 'text-success'
    : backendStatus.status === 'error'
    ? 'text-destructive'
    : 'text-brand'

  return (
    <div className="space-y-6">
      {/* 服务地址配置 */}
      <div className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-muted-foreground mb-2">
            后端服务地址
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="url"
              value={tempUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              onBlur={handleBlur}
              placeholder="http://localhost:11111"
              className="h-12 text-[15px] bg-muted/50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-brand/30 placeholder:text-muted-foreground transition-all"
            />
            {hasUnsavedChanges && (
              <Button
                size="sm"
                onClick={handleSave}
                className="h-12 w-12 p-0 bg-success hover:bg-success/90 text-success-foreground border-0 rounded-xl flex-shrink-0 transition-colors shadow-sm"
              >
                <CheckIcon className="w-5 h-5" />
              </Button>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground mt-2">
            默认端口 11111 · 修改后点击 ✓ 或失焦自动保存
          </p>
        </div>
      </div>

      {/* 连接状态 */}
      <div className="flex items-center gap-4 p-5 rounded-card bg-card shadow-panel dark:bg-white/[0.05] dark:shadow-none">
        {/* 状态指示器 */}
        <div className="relative">
          {backendStatus.status === 'checking' ? (
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
              <LoaderIcon className="w-5 h-5 text-brand animate-spin" />
            </div>
          ) : backendStatus.status === 'success' ? (
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <CheckIcon className="w-5 h-5 text-success" />
            </div>
          ) : backendStatus.status === 'error' ? (
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <XIcon className="w-5 h-5 text-destructive" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* 状态信息 */}
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] font-medium ${statusColor}`}>
            {backendStatus.status === 'checking' ? '正在检查连接...' :
             backendStatus.status === 'success' ? '后端服务运行正常' :
             backendStatus.status === 'error' ? '无法连接后端服务' :
             '等待检查'}
          </p>
          {backendStatus.status === 'success' && backendStatus.latency && (
            <p className="text-[13px] text-muted-foreground mt-0.5">
              延迟 {backendStatus.latency}ms · {
                backendStatus.latency < 100 ? '响应极快' : 
                backendStatus.latency < 300 ? '响应良好' : 
                backendStatus.latency < 500 ? '响应正常' : '响应较慢'
              }
            </p>
          )}
          {backendStatus.error && (
            <p className="text-[13px] text-destructive mt-0.5">
              {backendStatus.error}
            </p>
          )}
        </div>

        {/* 延迟数值 */}
        {backendStatus.latency && backendStatus.status === 'success' && (
          <div className="flex items-baseline gap-0.5 flex-shrink-0">
            <span className={`text-2xl font-semibold tabular-nums ${
              backendStatus.latency < 500 ? 'text-success' :
              backendStatus.latency < 1000 ? 'text-warning' :
              'text-destructive'
            }`}>
              {backendStatus.latency}
            </span>
            <span className="text-[13px] text-muted-foreground">ms</span>
          </div>
        )}
      </div>

      {/* 提示信息 */}
      <p className="text-[13px] text-muted-foreground text-center">
        后端服务用于管理 Bot 实例、处理配置和执行部署任务
      </p>
    </div>
  )
}
