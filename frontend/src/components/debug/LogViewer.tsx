/**
 * 日志查看器组件
 * 用于开发环境调试和查看日志
 * 从后端 API 获取日志文件列表和内容
 */

import { Button } from '@/components/ui/button'
import { DownloadIcon, TrashIcon, RefreshCwIcon } from 'lucide-react'
import { useLogFilesQuery, useLogContentQuery, useExportLogsMutation, useClearLogsMutation } from '@/hooks/queries/useLogQueries'
import { useState } from 'react'

interface LogViewerProps {
  className?: string
}

export function LogViewer({ className }: LogViewerProps) {
  const [selectedLog, setSelectedLog] = useState<string>('')
  
  const { data: logs = [], isLoading: loading, refetch: loadLogs } = useLogFilesQuery()
  const { data: logContent } = useLogContentQuery(selectedLog)
  const exportMutation = useExportLogsMutation()
  const clearMutation = useClearLogsMutation()
  
  const handleDownload = () => {
    if (selectedLog) {
      exportMutation.mutate()
    }
  }
  
  const handleClear = () => {
    if (selectedLog && confirm('确定要清空所有日志吗？')) {
      clearMutation.mutate(undefined, {
        onSuccess: () => {
          setSelectedLog('')
          void loadLogs()
        },
      })
    }
  }
  
  const getParsedLogs = () => {
    if (!logContent) return []
    try {
      return logContent.split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line)
          } catch {
            return { timestamp: new Date().toISOString(), level: 'info', message: line }
          }
        })
    } catch {
      return []
    }
  }

  const renderLogContent = () => {
    if (!logContent) {
      return (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          请选择一个日志文件查看
        </div>
      )
    }

    const parsedLogs = getParsedLogs()

    if (parsedLogs.length === 0) {
      return (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          日志文件为空或格式不正确
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {parsedLogs.map((entry: any, index: number) => (
          <div
            key={index}
            className="p-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                  entry.level === 'error' || entry.level === 'fatal'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : entry.level === 'warn'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : entry.level === 'success' || entry.level === 'ready'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}
              >
                {entry.level.toUpperCase()}
              </span>
              {entry.tag && (
                <span className="px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  {entry.tag}
                </span>
              )}
            </div>
            <div className="text-gray-900 dark:text-gray-100 text-sm">
              {entry.message}
            </div>
            {entry.args && entry.args.length > 0 && (
              <div className="mt-1 text-gray-600 dark:text-gray-400 text-xs">
                {JSON.stringify(entry.args, null, 2)}
              </div>
            )}
            {entry.error && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                <div className="text-red-700 dark:text-red-300 font-semibold text-sm">
                  {entry.error.name}: {entry.error.message}
                </div>
                {entry.error.stack && (
                  <pre className="mt-1 text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
                    {entry.error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`p-4 bg-white dark:bg-[#1f1f1f] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          前端日志查看器
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadLogs()}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCwIcon className="w-4 h-4" />
            刷新
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={loading}
            className="gap-2"
          >
            <DownloadIcon className="w-4 h-4" />
            导出
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClear}
            disabled={loading}
            className="gap-2 text-red-600 hover:text-red-700"
          >
            <TrashIcon className="w-4 h-4" />
            清除
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* 左侧：日志文件列表 */}
        <div className="col-span-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            日志文件 ({logs.length})
          </h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <button
                key={log.path}
                onClick={() => setSelectedLog(log.path)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedLog === log.path
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="font-mono text-xs truncate">
                  {log.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                  <span>{(log.size / 1024).toFixed(1)} KB</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 右侧：日志详情 */}
        <div className="col-span-8">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            日志详情
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 max-h-96 overflow-y-auto font-mono text-xs">
            {loading ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                加载中...
              </div>
            ) : (
              renderLogContent()
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

