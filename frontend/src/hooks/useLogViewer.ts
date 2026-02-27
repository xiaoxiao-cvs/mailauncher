/**
 * 日志查看器自定义 Hook
 * 职责：管理日志加载、导出、清除等逻辑
 */

import { useState, useEffect } from 'react'
import { logManager } from '@/utils/logger'
import { tauriInvoke } from '@/services/tauriInvoke'

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
      const files = await tauriInvoke<LogFile[]>('list_log_files')
      setLogs(files)
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
      const result = await tauriInvoke<{ content: string }>('get_log_content', {
        fileName: filePath,
      })
      setLogContent(result.content)
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
      const zipPath = await tauriInvoke<string>('export_logs')
      // Rust 返回 zip 文件路径，提示用户
      alert(`日志已导出到: ${zipPath}`)
    } catch (error) {
      console.error('导出日志失败:', error)
      alert('导出日志失败')
    }
  }

  // 清除日志
  const handleClear = async () => {
    if (confirm('确定要清除所有前端日志吗？此操作不可恢复。')) {
      try {
        await tauriInvoke<void>('clear_logs')
        setLogs([])
        setSelectedLog(null)
        setLogContent('')
      } catch (error) {
        console.error('清除日志失败:', error)
        alert('清除日志失败')
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
