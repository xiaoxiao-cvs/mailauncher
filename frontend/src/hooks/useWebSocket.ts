/**
 * WebSocket → Tauri Events 替代 Hook
 *
 * 原实现通过 WebSocket 连接 Python 后端接收下载进度。
 * 现改为监听 Rust 后端通过 app.emit() 发送的 Tauri 事件：
 * - `download-log-{taskId}` — 日志消息
 * - `download-status-{taskId}` — 状态变更
 * - `download-progress-{taskId}` — 结构化进度
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import logger from '@/utils/logger'
import type { DownloadProgressPayload } from '@/types/tauriEvents'
import {
  downloadLogEvent,
  downloadStatusEvent,
  downloadProgressEvent,
} from '@/types/tauriEvents'

const wsLogger = logger.withTag('TauriEvents')

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

export interface UseWebSocketOptions {
  onLog?: (message: WSLogMessage) => void
  onProgress?: (message: WSProgressMessage) => void
  onStatus?: (message: WSStatusMessage) => void
  onError?: (message: WSErrorMessage) => void
  onComplete?: (message: WSCompleteMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  /** @deprecated Tauri 事件无需重连，保留以兼容接口 */
  autoReconnect?: boolean
  /** @deprecated 保留以兼容接口 */
  reconnectDelayMs?: number
  /** @deprecated 保留以兼容接口 */
  reconnectAttempts?: number
}

export function useWebSocket(taskId: string | null, options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const optionsRef = useRef(options)
  const unlistenRefs = useRef<UnlistenFn[]>([])

  // 更新 options ref
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // 设置 Tauri 事件监听
  useEffect(() => {
    if (!taskId) return

    let cancelled = false

    const setupListeners = async () => {
      const unlisteners: UnlistenFn[] = []

      try {
        // 监听日志事件
        const unLog = await listen<string>(downloadLogEvent(taskId), (event) => {
          if (cancelled) return
          const now = new Date().toISOString()
          const message = event.payload

          // 日志消息统一转为 WSLogMessage
          optionsRef.current.onLog?.({
            type: 'log',
            timestamp: now,
            level: 'info',
            message,
          })
        })
        unlisteners.push(unLog)

        // 监听状态事件
        const unStatus = await listen<string>(downloadStatusEvent(taskId), (event) => {
          if (cancelled) return
          const now = new Date().toISOString()
          const status = event.payload

          if (status === 'completed') {
            optionsRef.current.onComplete?.({
              type: 'complete',
              timestamp: now,
              message: '安装完成',
            })
          } else if (status === 'failed') {
            optionsRef.current.onError?.({
              type: 'error',
              timestamp: now,
              message: '安装失败',
            })
          } else {
            optionsRef.current.onStatus?.({
              type: 'status',
              timestamp: now,
              status,
              message: status,
            })
          }
        })
        unlisteners.push(unStatus)

        // 监听结构化进度事件
        const unProgress = await listen<DownloadProgressPayload>(
          downloadProgressEvent(taskId),
          (event) => {
            if (cancelled) return
            const now = new Date().toISOString()
            const { percentage, message, status } = event.payload

            optionsRef.current.onProgress?.({
              type: 'progress',
              timestamp: now,
              current: Math.round(percentage),
              total: 100,
              percentage,
              message,
              status,
            })
          },
        )
        unlisteners.push(unProgress)

        if (!cancelled) {
          unlistenRefs.current = unlisteners
          setIsConnected(true)
          setError(null)
          wsLogger.info('Tauri 事件监听已建立', { taskId })
          optionsRef.current.onConnect?.()
        } else {
          // 如果在 setup 过程中已取消，立即清理
          unlisteners.forEach((fn) => fn())
        }
      } catch (err) {
        if (!cancelled) {
          wsLogger.error('建立事件监听失败', err)
          setError(err instanceof Error ? err.message : '监听失败')
        }
      }
    }

    setupListeners()

    return () => {
      cancelled = true
      unlistenRefs.current.forEach((fn) => fn())
      unlistenRefs.current = []
      setIsConnected(false)
      optionsRef.current.onDisconnect?.()
    }
  }, [taskId])

  const disconnect = useCallback(() => {
    unlistenRefs.current.forEach((fn) => fn())
    unlistenRefs.current = []
    setIsConnected(false)
  }, [])

  // sendMessage 不再需要（Tauri 事件是单向的，输入通过 invoke 发送）
  const sendMessage = useCallback((_message: unknown) => {
    wsLogger.warn('sendMessage 已弃用，请使用 tauriInvoke 发送命令')
  }, [])

  return {
    isConnected,
    error,
    connect: () => {}, // 保留接口兼容
    disconnect,
    sendMessage,
  }
}

