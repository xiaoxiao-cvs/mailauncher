/**
 * 联通性检查自定义 Hook
 * 职责：管理 Rust 后端、GitHub、Gitee 的连接状态检查
 *
 * Tauri 模式下，Rust 后端嵌入在应用内，始终可用。
 * GitHub/PyPI 通过 Rust check_connectivity 命令检查，Gitee 通过浏览器 fetch 检查。
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

  // URL 管理（Tauri 模式下为空操作，保留接口兼容 UI）
  const handleUrlChange = (newUrl: string) => {
    setTempUrl(newUrl)
  }
  const handleBlur = () => {}
  const handleSave = () => {}
  const saveBackendUrl = (_url: string) => {}

  // 检查 Rust 后端连接（Tauri 内置后端始终可用，通过简单 invoke 验证）
  const checkBackend = async () => {
    setBackendStatus(prev => ({ ...prev, status: 'checking' }))
    connectivityLogger.info('检查 Rust 后端连接')
    
    const startTime = performance.now()
    try {
      // 通过调用 check_connectivity 命令来验证 Rust 后端可用性
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

  // 检查 GitHub 连接（通过 Rust check_connectivity）
  const checkGitHub = async () => {
    setGithubStatus(prev => ({ ...prev, status: 'checking' }))
    connectivityLogger.info('开始检查 GitHub 连接')
    
    const startTime = performance.now()
    try {
      const result = await tauriInvoke<{ github: boolean; pypi: boolean }>('check_connectivity')
      const latency = Math.round(performance.now() - startTime)

      if (result.github) {
        setGithubStatus({
          name: 'GitHub 发行版',
          url: 'https://github.com',
          status: 'success',
          latency
        })
        connectivityLogger.success('GitHub 连接成功', { latency })
      } else {
        setGithubStatus({
          name: 'GitHub 发行版',
          url: 'https://github.com',
          status: 'error',
          error: '无法访问 GitHub'
        })
        connectivityLogger.error('GitHub 连接失败')
      }
    } catch (error) {
      setGithubStatus({
        name: 'GitHub 发行版',
        url: 'https://github.com',
        status: 'error',
        error: '连接超时或失败'
      })
      connectivityLogger.error('GitHub 连接检查异常', error)
    }
  }

  // 检查 Gitee 延迟（浏览器 fetch，Rust 不支持 Gitee 检查）
  const checkGitee = async () => {
    setGiteeStatus(prev => ({ ...prev, status: 'checking' }))
    connectivityLogger.info('开始检查 Gitee 连接')
    
    const startTime = performance.now()
    try {
      await fetch('https://gitee.com', {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
        mode: 'no-cors'
      })
      const endTime = performance.now()
      const latency = Math.round(endTime - startTime)

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
    githubStatus,
    giteeStatus,
    
    // 检查方法
    checkBackend,
    checkGitHub,
    checkGitee,
    checkAll
  }
}
