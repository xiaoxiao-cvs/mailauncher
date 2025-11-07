import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckCircle2Icon, XCircleIcon, LoaderIcon, AlertCircleIcon, WifiOffIcon, ServerIcon, CheckIcon } from 'lucide-react'
import { connectivityLogger } from '@/utils/logger'
import { getApiBaseUrl, setApiBaseUrl } from '@/config/api'

interface ConnectivityStatus {
  name: string
  url: string
  status: 'checking' | 'success' | 'error' | 'pending'
  latency?: number
  error?: string
}

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
  // 使用统一的 API 配置管理
  const [backendUrl, setBackendUrl] = useState(() => getApiBaseUrl())

  const [backendStatus, setBackendStatus] = useState<ConnectivityStatus>({
    name: '后端服务',
    url: backendUrl,
    status: 'pending'
  })

  const [githubStatus, setGithubStatus] = useState<ConnectivityStatus>({
    name: 'GitHub 发行版',
    url: 'https://github.com',
    status: 'pending'
  })

  const [giteeStatus, setGiteeStatus] = useState<ConnectivityStatus>({
    name: 'Gitee 发行版',
    url: 'https://gitee.com',
    status: 'pending'
  })
  
  // 用于跟踪 URL 是否被修改但未保存
  const [tempUrl, setTempUrl] = useState(backendUrl)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 保存后端地址 - 使用统一的 API 配置管理
  const saveBackendUrl = (url: string) => {
    try {
      setApiBaseUrl(url) // 使用统一的配置管理
      setBackendUrl(url)
      setTempUrl(url)
      setHasUnsavedChanges(false)
      setBackendStatus(prev => ({ ...prev, url, status: 'pending' }))
      connectivityLogger.success('后端地址已保存', { url })
    } catch (error) {
      connectivityLogger.error('保存后端地址失败', error)
    }
  }

  // 当 backendUrl 更新后触发检查
  useEffect(() => {
    // 只有当状态是 pending 时才检查（表示刚刚保存）
    if (backendStatus.status === 'pending' && backendUrl) {
      const timer = setTimeout(() => {
        checkBackend()
      }, 100) // 短暂延迟确保状态已更新
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUrl, backendStatus.status])

  // 处理输入框变化 - 仅更新临时状态
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value
    setTempUrl(newUrl)
    setHasUnsavedChanges(newUrl !== backendUrl)
  }

  // 处理失焦事件 - 自动保存
  const handleBlur = () => {
    if (hasUnsavedChanges && tempUrl.trim()) {
      saveBackendUrl(tempUrl.trim())
    }
  }

  // 处理保存按钮点击
  const handleSave = () => {
    if (tempUrl.trim()) {
      saveBackendUrl(tempUrl.trim())
    }
  }

  // 检查后端连接
  const checkBackend = async () => {
    // 每次检查时都从配置中获取最新的地址，确保使用用户设置的地址
    const currentUrl = getApiBaseUrl()
    setBackendUrl(currentUrl) // 同步更新状态
    
    setBackendStatus(prev => ({ ...prev, status: 'checking', url: currentUrl }))
    connectivityLogger.info('开始检查后端连接', { url: currentUrl })
    
    const startTime = performance.now()
    try {
      // 使用根路径健康检查端点,更简单可靠
      const response = await fetch(`${currentUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5秒超时
      })
      const endTime = performance.now()
      const latency = Math.round(endTime - startTime)

      if (response.ok) {
        const data = await response.json()
        // 检查返回的数据格式是否正确
        if (data.status === 'ok') {
          setBackendStatus({
            name: '后端服务',
            url: currentUrl,
            status: 'success',
            latency
          })
          connectivityLogger.success('后端连接成功', { latency })
        } else {
          setBackendStatus({
            name: '后端服务',
            url: currentUrl,
            status: 'error',
            error: '响应格式错误'
          })
          connectivityLogger.error('后端响应格式错误', { data })
        }
      } else {
        setBackendStatus({
          name: '后端服务',
          url: currentUrl,
          status: 'error',
          error: `HTTP ${response.status}`
        })
        connectivityLogger.error('后端连接失败', { status: response.status })
      }
    } catch (error) {
      setBackendStatus({
        name: '后端服务',
        url: currentUrl,
        status: 'error',
        error: error instanceof Error ? error.message : '连接失败'
      })
      connectivityLogger.error('后端连接异常', error)
    }
  }

  // 检查 GitHub 延迟
  const checkGitHub = async () => {
    setGithubStatus(prev => ({ ...prev, status: 'checking' }))
    connectivityLogger.info('开始检查 GitHub 连接')
    
    const startTime = performance.now()
    try {
      // 使用 GitHub 的 releases 页面来测试连接性（不需要 API 认证）
      await fetch('https://github.com', {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000), // 10秒超时
        mode: 'no-cors' // 避免 CORS 问题
      })
      const endTime = performance.now()
      const latency = Math.round(endTime - startTime)

      // no-cors 模式下 response.ok 总是 false，但能测延迟
      setGithubStatus({
        name: 'GitHub 发行版',
        url: 'https://github.com',
        status: 'success',
        latency
      })
      connectivityLogger.success('GitHub 连接成功', { latency })
    } catch (error) {
      setGithubStatus({
        name: 'GitHub 发行版',
        url: 'https://github.com',
        status: 'error',
        error: '连接超时或失败'
      })
      connectivityLogger.error('GitHub 连接失败', error)
    }
  }

  // 检查 Gitee 延迟
  const checkGitee = async () => {
    setGiteeStatus(prev => ({ ...prev, status: 'checking' }))
    connectivityLogger.info('开始检查 Gitee 连接')
    
    const startTime = performance.now()
    try {
      // 使用 Gitee 主页来测试连接性
      await fetch('https://gitee.com', {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000), // 10秒超时
        mode: 'no-cors' // 避免 CORS 问题
      })
      const endTime = performance.now()
      const latency = Math.round(endTime - startTime)

      // no-cors 模式下只要不抛出错误就说明连接成功
      setGiteeStatus({
        name: 'Gitee 发行版',
        url: 'https://gitee.com',
        status: 'success',
        latency
      })
      connectivityLogger.success('Gitee 连接成功', { latency })
    } catch (error) {
      setGiteeStatus({
        name: 'Gitee 发行版',
        url: 'https://gitee.com',
        status: 'error',
        error: '连接超时或失败'
      })
      connectivityLogger.error('Gitee 连接失败', error)
    }
  }

  // 执行所有检查
  const checkAll = async () => {
    connectivityLogger.info('开始执行联通性检查')
    await Promise.all([
      checkBackend(),
      checkGitHub(),
      checkGitee()
    ])
    connectivityLogger.success('联通性检查完成')
  }

  // 组件加载时自动检查
  useEffect(() => {
    checkAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 注册重新检查功能
  useEffect(() => {
    if (onRecheckRequest) {
      onRecheckRequest(checkAll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRecheckRequest])

  // 监听后端状态变化,通知父组件
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(backendStatus.status === 'success')
    }
  }, [backendStatus.status, onStatusChange])

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
                onChange={handleUrlChange}
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
