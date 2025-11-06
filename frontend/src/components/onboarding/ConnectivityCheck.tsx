import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2Icon, XCircleIcon, LoaderIcon, AlertCircleIcon, WifiIcon, WifiOffIcon, ServerIcon } from 'lucide-react'

interface ConnectivityStatus {
  name: string
  url: string
  status: 'checking' | 'success' | 'error' | 'pending'
  latency?: number
  error?: string
}

interface ConnectivityCheckProps {
  stepColor: string
}

// 本地存储的键名
const BACKEND_URL_KEY = 'mai_launcher_backend_url'
const DEFAULT_BACKEND_URL = 'http://localhost:23232'

/**
 * 联通性检查组件
 * 检查后端连接、GitHub 和 Gitee 的延迟
 */
export function ConnectivityCheck({ stepColor }: ConnectivityCheckProps) {
  // 从 localStorage 读取保存的后端地址，如果没有则使用默认值
  const [backendUrl, setBackendUrl] = useState(() => {
    return localStorage.getItem(BACKEND_URL_KEY) || DEFAULT_BACKEND_URL
  })

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

  const [isChecking, setIsChecking] = useState(false)

  // 保存后端地址到 localStorage
  const saveBackendUrl = (url: string) => {
    localStorage.setItem(BACKEND_URL_KEY, url)
    setBackendUrl(url)
    setBackendStatus(prev => ({ ...prev, url, status: 'pending' }))
  }

  // 处理输入框变化
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value
    saveBackendUrl(newUrl)
  }

  // 检查后端连接
  const checkBackend = async () => {
    setBackendStatus(prev => ({ ...prev, status: 'checking' }))
    
    const startTime = performance.now()
    try {
      const response = await fetch(`${backendUrl}/api/v1/environment/system`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5秒超时
      })
      const endTime = performance.now()
      const latency = Math.round(endTime - startTime)

      if (response.ok) {
        setBackendStatus({
          name: '后端服务',
          url: backendUrl,
          status: 'success',
          latency
        })
      } else {
        setBackendStatus({
          name: '后端服务',
          url: backendUrl,
          status: 'error',
          error: `HTTP ${response.status}`
        })
      }
    } catch (error) {
      setBackendStatus({
        name: '后端服务',
        url: backendUrl,
        status: 'error',
        error: error instanceof Error ? error.message : '连接失败'
      })
    }
  }

  // 检查 GitHub 延迟
  const checkGitHub = async () => {
    setGithubStatus(prev => ({ ...prev, status: 'checking' }))
    
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
    } catch (error) {
      setGithubStatus({
        name: 'GitHub 发行版',
        url: 'https://github.com',
        status: 'error',
        error: '连接超时或失败'
      })
    }
  }

  // 检查 Gitee 延迟
  const checkGitee = async () => {
    setGiteeStatus(prev => ({ ...prev, status: 'checking' }))
    
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
    } catch (error) {
      setGiteeStatus({
        name: 'Gitee 发行版',
        url: 'https://gitee.com',
        status: 'error',
        error: '连接超时或失败'
      })
    }
  }

  // 执行所有检查
  const checkAll = async () => {
    setIsChecking(true)
    await Promise.all([
      checkBackend(),
      checkGitHub(),
      checkGitee()
    ])
    setIsChecking(false)
  }

  // 组件加载时自动检查
  useEffect(() => {
    checkAll()
  }, [])

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

    return (
      <div key={status.name} className="relative p-3 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a] hover:bg-white/80 dark:hover:bg-[#3a3a3a] transition-all">
        {/* 图标和标题 */}
        <div className="flex items-center gap-2.5 mb-2">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0"
            style={{ backgroundColor: stepColor }}
          >
            {renderStatusIcon(status.status)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[#023e8a] dark:text-white">
              {status.name}
            </h3>
          </div>
        </div>

        {/* 状态和延迟 */}
        <div className="flex items-center justify-between pl-11">
          {status.status === 'success' && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                正常
              </span>
            </div>
          )}
          {status.status === 'error' && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                失败
              </span>
            </div>
          )}
          {status.status === 'checking' && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                检查中
              </span>
            </div>
          )}
          
          {status.latency && (
            <span className={`text-lg font-bold ${getLatencyColor()}`}>
              {status.latency}<span className="text-xs ml-0.5">ms</span>
            </span>
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

  // 计算整体状态
  const allSuccess = backendStatus.status === 'success' && 
                     githubStatus.status === 'success' && 
                     giteeStatus.status === 'success'
  
  const hasError = backendStatus.status === 'error' || 
                   githubStatus.status === 'error' || 
                   giteeStatus.status === 'error'

  return (
    <div className="space-y-2.5">
      {/* 顶部标题和按钮 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm"
            style={{ backgroundColor: stepColor }}
          >
            {isChecking ? (
              <LoaderIcon className="w-4 h-4 animate-spin" />
            ) : allSuccess ? (
              <CheckCircle2Icon className="w-4 h-4" />
            ) : hasError ? (
              <XCircleIcon className="w-4 h-4" />
            ) : (
              <WifiIcon className="w-4 h-4" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-[#023e8a] dark:text-white">
              联通性检查
            </h2>
            <p className="text-xs text-[#023e8a]/60 dark:text-white/60">
              {isChecking ? '正在检查服务连接...' : allSuccess ? '✓ 所有服务正常' : hasError ? '⚠ 部分服务异常' : '等待检查'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkAll}
          disabled={isChecking}
          className="bg-white/60 dark:bg-[#3a3a3a] border-[#023e8a]/20 dark:border-[#3a3a3a] text-xs h-8 px-3"
        >
          {isChecking ? '检查中...' : '重新检查'}
        </Button>
      </div>

      {/* 后端地址配置 */}
      <div className="relative p-3 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a]">
        <div className="flex items-start gap-2.5 mb-2">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0"
            style={{ backgroundColor: stepColor }}
          >
            <ServerIcon className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[#023e8a] dark:text-white mb-2">
              后端服务地址
            </h3>
            <Input
              type="url"
              value={backendUrl}
              onChange={handleUrlChange}
              placeholder="http://localhost:23232"
              className="h-9 text-sm bg-white dark:bg-[#1f1f1f] border-[#023e8a]/20 dark:border-[#3a3a3a] focus-visible:ring-offset-0"
            />
            <p className="text-xs text-[#023e8a]/50 dark:text-white/50 mt-1.5">
              默认端口: 23232 | 配置将自动保存
            </p>
          </div>
        </div>
      </div>

      {/* 各项检查结果 */}
      <div className="space-y-2.5">
        {/* 后端服务检查 */}
        {renderCheckItem(backendStatus)}
        
        {/* GitHub 和 Gitee 横向排列 */}
        <div className="grid grid-cols-2 gap-2.5">
          {renderCheckItem(githubStatus)}
          {renderCheckItem(giteeStatus)}
        </div>
      </div>
    </div>
  )
}
