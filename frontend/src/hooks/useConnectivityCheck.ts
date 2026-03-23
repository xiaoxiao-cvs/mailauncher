/**
 * 联通性检查自定义 Hook
 * 职责：管理 Rust 后端连接状态检查
 *
 * Tauri 模式下，Rust 后端嵌入在应用内，始终可用。
 * 通过简单 invoke 验证后端可达性。
 */

import { useState, useEffect } from 'react'
import { connectivityLogger } from '@/utils/logger'
import { tauriInvoke } from '@/services/tauriInvoke'

export interface ConnectivityStatus {
  name: string
  url: string
  status: 'checking' | 'success' | 'error' | 'pending'
  latency?: number
  error?: string
}

interface UseConnectivityCheckOptions {
  onStatusChange?: (isBackendConnected: boolean) => void
  onRecheckRequest?: (checkFn: () => void) => void
}

export function useConnectivityCheck(options: UseConnectivityCheckOptions = {}) {
  const { onStatusChange, onRecheckRequest } = options

  // Tauri 模式下后端地址为内置 IPC，保留变量兼容 UI
  const [backendUrl] = useState('tauri://localhost')
  const [tempUrl, setTempUrl] = useState(backendUrl)
  const [hasUnsavedChanges] = useState(false)

  // 连接状态
  const [backendStatus, setBackendStatus] = useState<ConnectivityStatus>({
    name: 'Rust 后端',
    url: backendUrl,
    status: 'pending'
  })

  // URL 管理（Tauri 模式下为空操作，保留接口兼容 UI）
  const handleUrlChange = (newUrl: string) => {
    setTempUrl(newUrl)
  }
  const handleBlur = () => {}
  const handleSave = () => {}
  const saveBackendUrl = (_url: string) => {}

  // 检查 Rust 后端连接
  const checkBackend = async () => {
    setBackendStatus(prev => ({ ...prev, status: 'checking' }))
    connectivityLogger.info('检查 Rust 后端连接')

    const startTime = performance.now()
    try {
      await tauriInvoke<{ github: boolean; pypi: boolean }>('check_connectivity')
      const latency = Math.round(performance.now() - startTime)

      setBackendStatus({
        name: 'Rust 后端',
        url: backendUrl,
        status: 'success',
        latency
      })
      connectivityLogger.success('Rust 后端连接成功', { latency })
    } catch (error) {
      setBackendStatus({
        name: 'Rust 后端',
        url: backendUrl,
        status: 'error',
        error: error instanceof Error ? error.message : '连接失败'
      })
      connectivityLogger.error('Rust 后端连接异常', error)
    }
  }

  // 执行检查
  const checkAll = async () => {
    connectivityLogger.info('开始执行联通性检查')
    await checkBackend()
    connectivityLogger.success('联通性检查完成')
  }

  // 组件加载时自动检查
  useEffect(() => {
    checkAll()
  }, [])

  // 注册重新检查功能
  useEffect(() => {
    if (onRecheckRequest) {
      onRecheckRequest(checkAll)
    }
  }, [onRecheckRequest])

  // 监听后端状态变化
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(backendStatus.status === 'success')
    }
  }, [backendStatus.status, onStatusChange])

  return {
    // URL 管理（保留接口兼容）
    backendUrl,
    tempUrl,
    hasUnsavedChanges,
    handleUrlChange,
    handleBlur,
    handleSave,
    saveBackendUrl,

    // 连接状态
    backendStatus,

    // 检查方法
    checkBackend,
    checkAll
  }
}
