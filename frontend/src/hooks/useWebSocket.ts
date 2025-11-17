/**
 * WebSocket 连接 Hook
 * 用于实时接收安装进度和日志
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getApiUrl } from '@/config/api'
import logger from '@/utils/logger'

const wsLogger = logger.withTag('WebSocket')

export interface WSMessage {
  type: 'log' | 'progress' | 'status' | 'error' | 'complete'
  timestamp: string
  [key: string]: any
}

export interface WSLogMessage extends WSMessage {
  type: 'log'
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export interface WSProgressMessage extends WSMessage {
  type: 'progress'
  current: number
  total: number
  percentage: number
  message: string
  status: string
}

export interface WSStatusMessage extends WSMessage {
  type: 'status'
  status: string
  message: string
}

export interface WSErrorMessage extends WSMessage {
  type: 'error'
  message: string
}

export interface WSCompleteMessage extends WSMessage {
  type: 'complete'
  message: string
}

interface UseWebSocketOptions {
  onLog?: (message: WSLogMessage) => void
  onProgress?: (message: WSProgressMessage) => void
  onStatus?: (message: WSStatusMessage) => void
  onError?: (message: WSErrorMessage) => void
  onComplete?: (message: WSCompleteMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  autoReconnect?: boolean
  reconnectDelayMs?: number
  reconnectAttempts?: number
}

export function useWebSocket(taskId: string | null, options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isManualCloseRef = useRef(false)
  const optionsRef = useRef(options)
  const reconnectCountRef = useRef(0)

  // 更新 options ref
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const connect = useCallback(() => {
    if (!taskId) {
      wsLogger.warn('taskId 为空，跳过连接')
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsLogger.warn('WebSocket 已连接')
      return
    }

    try {
      const api = new URL(getApiUrl())
      const isSecure = api.protocol === 'https:'
      api.protocol = isSecure ? 'wss:' : 'ws:'
      api.pathname = '/api/v1/ws/downloads/' + taskId
      const url = api.toString()

      wsLogger.info('正在连接 WebSocket', { url })

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        wsLogger.success('WebSocket 已连接')
        setIsConnected(true)
        setError(null)
        optionsRef.current.onConnect?.()
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage
          wsLogger.debug('收到消息', message)

          switch (message.type) {
            case 'log':
              optionsRef.current.onLog?.(message as WSLogMessage)
              break
            case 'progress':
              optionsRef.current.onProgress?.(message as WSProgressMessage)
              break
            case 'status':
              optionsRef.current.onStatus?.(message as WSStatusMessage)
              break
            case 'error':
              optionsRef.current.onError?.(message as WSErrorMessage)
              break
            case 'complete':
              optionsRef.current.onComplete?.(message as WSCompleteMessage)
              break
            default:
              wsLogger.warn('未知消息类型', message)
          }
        } catch (err) {
          wsLogger.error('解析消息失败', err)
        }
      }

      ws.onerror = (event) => {
        wsLogger.error('WebSocket 错误', event)
        setError('连接错误')
      }

      ws.onclose = (event) => {
        wsLogger.info('WebSocket 已断开', { code: event.code, reason: event.reason })
        setIsConnected(false)
        wsRef.current = null
        optionsRef.current.onDisconnect?.()

        if (!isManualCloseRef.current && optionsRef.current.autoReconnect) {
          const limit = optionsRef.current.reconnectAttempts ?? 1
          const delay = optionsRef.current.reconnectDelayMs ?? 1000
          if (reconnectCountRef.current < limit) {
            reconnectCountRef.current += 1
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current)
              reconnectTimeoutRef.current = null
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              connect()
            }, delay)
          }
        }
      }
    } catch (err) {
      wsLogger.error('创建 WebSocket 连接失败', err)
      setError(err instanceof Error ? err.message : '连接失败')
    }
  }, [taskId])

  const disconnect = useCallback(() => {
    isManualCloseRef.current = true
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsLogger.info('手动断开 WebSocket')
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }

    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      wsLogger.warn('WebSocket 未连接，无法发送消息')
    }
  }, [])

  useEffect(() => {
    if (taskId) {
      isManualCloseRef.current = false
      reconnectCountRef.current = 0
      connect()
    }

    return () => {
      // 组件卸载时断开连接
      isManualCloseRef.current = true
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount')
        wsRef.current = null
      }
    }
  }, [taskId, connect]) // 只依赖 taskId 和 connect

  return {
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage,
  }
}
