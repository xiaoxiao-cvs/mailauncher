/**
 * 日志查看器自定义 Hook
 * 职责：管理日志加载、导出、清除等逻辑
 */

import { useState, useEffect } from 'react'
import { logManager } from '@/utils/logger'
import { getApiUrl } from '@/config/api'

export interface LogFile {
  name: string
  path: string
  size: number
  modified: string
  compressed: boolean
}

export function useLogViewer() {
  const [logs, setLogs] = useState<LogFile[]>([])
  const [selectedLog, setSelectedLog] = useState<string | null>(null)
  const [logContent, setLogContent] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // 加载日志文件列表
  const loadLogs = async () => {
    setLoading(true)
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/logger/frontend/files`)
      const data = await response.json()
      if (data.success) {
        setLogs(data.data)
      }
    } catch (error) {
      console.error('加载日志列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 加载日志文件内容
  const loadLogContent = async (filePath: string) => {
    setLoading(true)
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/logger/frontend/content?path=${encodeURIComponent(filePath)}`)
      const data = await response.json()
      if (data.success) {
        setLogContent(data.data)
      }
    } catch (error) {
      console.error('加载日志内容失败:', error)
      setLogContent('加载日志失败')
    } finally {
      setLoading(false)
    }
  }

  // 导出日志
  const handleDownload = async () => {
    await logManager.flush()
    
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/logger/frontend/export`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mai-launcher-frontend-logs-${new Date().toISOString()}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('导出日志失败:', error)
      alert('导出日志失败，请检查后端连接')
    }
  }

  // 清除日志
  const handleClear = async () => {
    if (confirm('确定要清除所有前端日志吗？此操作不可恢复。')) {
      try {
        const apiUrl = getApiUrl()
        const response = await fetch(`${apiUrl}/logger/frontend/clear`, {
          method: 'DELETE'
        })
        const data = await response.json()
        if (data.success) {
          setLogs([])
          setSelectedLog(null)
          setLogContent('')
        }
      } catch (error) {
        console.error('清除日志失败:', error)
        alert('清除日志失败，请检查后端连接')
      }
    }
  }

  // 解析日志行
  const parseLogLine = (line: string) => {
    try {
      return JSON.parse(line)
    } catch {
      return null
    }
  }

  // 获取解析后的日志
  const getParsedLogs = () => {
    if (!logContent) return []
    const lines = logContent.trim().split('\n')
    return lines.map(parseLogLine).filter(Boolean)
  }

  // 初始加载日志列表
  useEffect(() => {
    loadLogs()
  }, [])

  // 选中日志后加载内容
  useEffect(() => {
    if (selectedLog) {
      loadLogContent(selectedLog)
    }
  }, [selectedLog])

  return {
    logs,
    selectedLog,
    setSelectedLog,
    logContent,
    loading,
    loadLogs,
    handleDownload,
    handleClear,
    parseLogLine,
    getParsedLogs
  }
}
