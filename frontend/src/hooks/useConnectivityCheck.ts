/**
 * 联通性检查自定义 Hook
 * 职责：管理后端、GitHub、Gitee 的连接状态检查
 */

import { useState, useEffect } from 'react'
import { connectivityLogger } from '@/utils/logger'
import { getApiBaseUrl, setApiBaseUrl } from '@/config/api'

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

  // 后端 URL 管理
  const [backendUrl, setBackendUrl] = useState(() => getApiBaseUrl())
  const [tempUrl, setTempUrl] = useState(backendUrl)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 连接状态
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

  // 保存后端地址
  const saveBackendUrl = (url: string) => {
    try {
      setApiBaseUrl(url)
      setBackendUrl(url)
      setTempUrl(url)
      setHasUnsavedChanges(false)
      setBackendStatus(prev => ({ ...prev, url, status: 'pending' }))
      connectivityLogger.success('后端地址已保存', { url })
    } catch (error) {
      connectivityLogger.error('保存后端地址失败', error)
    }
  }

  // 处理输入框变化
  const handleUrlChange = (newUrl: string) => {
    setTempUrl(newUrl)
    setHasUnsavedChanges(newUrl !== backendUrl)
  }

  // 处理失焦保存
  const handleBlur = () => {
    if (hasUnsavedChanges && tempUrl.trim()) {
      saveBackendUrl(tempUrl.trim())
    }
  }

  // 处理保存按钮
  const handleSave = () => {
    if (tempUrl.trim()) {
      saveBackendUrl(tempUrl.trim())
    }
  }

  // 检查后端连接
  const checkBackend = async () => {
    const currentUrl = getApiBaseUrl()
    setBackendUrl(currentUrl)
    
    setBackendStatus(prev => ({ ...prev, status: 'checking', url: currentUrl }))
    connectivityLogger.info('开始检查后端连接', { url: currentUrl })
    
    const startTime = performance.now()
    try {
      const response = await fetch(`${currentUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      const endTime = performance.now()
      const latency = Math.round(endTime - startTime)

      if (response.ok) {
        const data = await response.json()
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
      await fetch('https://github.com', {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
        mode: 'no-cors'
      })
      const endTime = performance.now()
      const latency = Math.round(endTime - startTime)

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

  // 当 backendUrl 更新后触发检查
  useEffect(() => {
    if (backendStatus.status === 'pending' && backendUrl) {
      const timer = setTimeout(() => {
        checkBackend()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [backendUrl, backendStatus.status])

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
    // URL 管理
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
