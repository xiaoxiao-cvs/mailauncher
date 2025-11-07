/**
 * 安装进度页面
 * 显示实时安装日志和进度
 */

import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { useWebSocket, WSLogMessage, WSProgressMessage, WSCompleteMessage, WSErrorMessage } from '@/hooks/useWebSocket'
import { ScaleTransition } from '@/components/PageTransition'
import logger from '@/utils/logger'

const pageLogger = logger.withTag('InstallProgress')

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export default function InstallProgressPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const taskId = searchParams.get('taskId')

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 100, percentage: 0, message: '等待连接...' })
  const [status, setStatus] = useState<'connecting' | 'installing' | 'completed' | 'failed'>('connecting')
  const [isConnected, setIsConnected] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到最新日志
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // WebSocket 连接
  const { error: wsError } = useWebSocket(taskId, {
    onConnect: () => {
      pageLogger.info('WebSocket 已连接')
      setIsConnected(true)
      addLog('info', '已连接到服务器，等待开始安装...')
    },

    onLog: (message: WSLogMessage) => {
      addLog(message.level, message.message)
    },

    onProgress: (message: WSProgressMessage) => {
      setProgress({
        current: message.current,
        total: message.total,
        percentage: message.percentage,
        message: message.message,
      })
      setStatus('installing')
    },

    onComplete: (message: WSCompleteMessage) => {
      addLog('success', message.message)
      setStatus('completed')
      setProgress(prev => ({ ...prev, percentage: 100, message: '安装完成' }))
    },

    onError: (message: WSErrorMessage) => {
      addLog('error', message.message)
      setStatus('failed')
    },

    onDisconnect: () => {
      pageLogger.warn('WebSocket 已断开')
      setIsConnected(false)
      if (status === 'installing') {
        addLog('warning', '与服务器的连接已断开')
      }
    },
  })

  const addLog = (level: LogEntry['level'], message: string) => {
    const log: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      level,
      message,
    }
    setLogs(prev => [...prev, log])
  }

  // 检查是否有 taskId
  useEffect(() => {
    if (!taskId) {
      pageLogger.error('缺少 taskId 参数')
      navigate('/downloads', { replace: true })
    }
  }, [taskId, navigate])

  const getStatusIcon = () => {
    switch (status) {
      case 'connecting':
        return <Icon icon="ph:circle-dashed" className="w-6 h-6 text-blue-500 animate-spin" />
      case 'installing':
        return <Icon icon="ph:spinner" className="w-6 h-6 text-blue-500 animate-spin" />
      case 'completed':
        return <Icon icon="ph:check-circle" className="w-6 h-6 text-green-500" />
      case 'failed':
        return <Icon icon="ph:x-circle" className="w-6 h-6 text-red-500" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'connecting':
        return '正在连接...'
      case 'installing':
        return '安装中'
      case 'completed':
        return '安装完成'
      case 'failed':
        return '安装失败'
    }
  }

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return <Icon icon="ph:info" className="w-4 h-4 text-blue-400 shrink-0" />
      case 'success':
        return <Icon icon="ph:check-circle" className="w-4 h-4 text-green-400 shrink-0" />
      case 'warning':
        return <Icon icon="ph:warning" className="w-4 h-4 text-yellow-400 shrink-0" />
      case 'error':
        return <Icon icon="ph:x-circle" className="w-4 h-4 text-red-400 shrink-0" />
    }
  }

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'text-gray-300'
      case 'success':
        return 'text-green-300'
      case 'warning':
        return 'text-yellow-300'
      case 'error':
        return 'text-red-300'
    }
  }

  return (
    <ScaleTransition duration={400}>
      <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* 顶部状态栏 */}
      <div className="shrink-0 border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon()}
              <div>
                <h1 className="text-xl font-semibold text-white">{getStatusText()}</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {isConnected ? '已连接' : '连接中...'}
                  {wsError && ` - ${wsError}`}
                </p>
              </div>
            </div>

            {(status === 'completed' || status === 'failed') && (
              <Button
                onClick={() => navigate('/downloads')}
                variant="outline"
                className="gap-2"
              >
                <Icon icon="ph:arrow-left" className="w-4 h-4" />
                返回
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-5xl mx-auto h-full px-6 py-6 flex flex-col gap-6">
          {/* 进度条 */}
          <div className="shrink-0 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300 font-medium">{progress.message}</span>
                <span className="text-gray-400 tabular-nums">{Math.round(progress.percentage)}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>步骤 {progress.current} / {progress.total}</span>
                <span>{status === 'completed' ? '已完成' : status === 'failed' ? '失败' : '进行中'}</span>
              </div>
            </div>
          </div>

          {/* 日志窗口 */}
          <div className="flex-1 bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden flex flex-col">
            <div className="shrink-0 px-4 py-3 border-b border-gray-700 bg-gray-800/50">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Icon icon="ph:terminal-window" className="w-4 h-4" />
                  安装日志
                </h2>
                <span className="text-xs text-gray-500">{logs.length} 条消息</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-sm">
              {logs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Icon icon="ph:hourglass" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>等待日志...</p>
                  </div>
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex items-start gap-2 hover:bg-gray-800/50 px-2 py-1 rounded">
                    <span className="text-gray-600 text-xs shrink-0 w-20">{log.timestamp}</span>
                    {getLogIcon(log.level)}
                    <span className={`flex-1 ${getLogColor(log.level)}`}>{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
    </ScaleTransition>
  )
}
