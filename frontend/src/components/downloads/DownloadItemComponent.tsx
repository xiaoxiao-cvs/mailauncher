/**
 * 下载项组件
 * 职责：显示单个下载项的状态和操作
 */

import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import type { DownloadItem } from '@/types/download'
import { cn } from '@/lib/utils'

interface DownloadItemComponentProps {
  item: DownloadItem
  onDownload: (itemId: string) => void
  onRetry: (itemId: string) => void
  disabled?: boolean
}

/**
 * 获取状态图标
 */
const getStatusIcon = (status: DownloadItem['status']) => {
  switch (status) {
    case 'pending':
      return 'ph:circle-dashed'
    case 'downloading':
      return 'ph:arrow-circle-down'
    case 'completed':
      return 'ph:check-circle-fill'
    case 'failed':
      return 'ph:x-circle-fill'
    case 'installed':
      return 'ph:check-circle-fill'
    default:
      return 'ph:circle'
  }
}

/**
 * 获取状态颜色
 */
const getStatusColor = (status: DownloadItem['status']) => {
  switch (status) {
    case 'pending':
      return 'text-gray-400 dark:text-gray-500'
    case 'downloading':
      return 'text-blue-500 dark:text-blue-400'
    case 'completed':
      return 'text-green-500 dark:text-green-400'
    case 'failed':
      return 'text-red-500 dark:text-red-400'
    case 'installed':
      return 'text-green-600 dark:text-green-500'
    default:
      return 'text-gray-400'
  }
}

/**
 * 获取状态文本
 */
const getStatusText = (status: DownloadItem['status']) => {
  switch (status) {
    case 'pending':
      return '待下载'
    case 'downloading':
      return '下载中...'
    case 'completed':
      return '下载完成'
    case 'failed':
      return '下载失败'
    case 'installed':
      return '已安装'
    default:
      return '未知'
  }
}

export function DownloadItemComponent({ 
  item, 
  onDownload, 
  onRetry, 
  disabled 
}: DownloadItemComponentProps) {
  const statusIcon = getStatusIcon(item.status)
  const statusColor = getStatusColor(item.status)
  const statusText = getStatusText(item.status)

  return (
    <div className={cn(
      'p-4 rounded-xl border transition-all duration-200',
      'bg-white dark:bg-[#1a1a1a]',
      'border-[#023e8a]/10 dark:border-white/10',
      'hover:border-[#023e8a]/20 dark:hover:border-white/20',
      'hover:shadow-sm'
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* 左侧：图标和信息 */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* 状态图标 */}
          <div className={cn('mt-0.5 flex-shrink-0', statusColor)}>
            <Icon 
              icon={statusIcon} 
              className={cn(
                'w-6 h-6',
                item.status === 'downloading' && 'animate-pulse'
              )} 
            />
          </div>

          {/* 信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-[#03045e] dark:text-white">
                {item.name}
              </h3>
              {item.required && (
                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  必需
                </span>
              )}
              {item.version && (
                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  {item.version}
                </span>
              )}
            </div>
            
            <p className="text-xs text-[#023e8a]/70 dark:text-white/70 mb-2">
              {item.description}
            </p>

            {/* 进度条 */}
            {item.status === 'downloading' && item.progress !== undefined && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#023e8a]/60 dark:text-white/60">
                    下载进度
                  </span>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {item.progress}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 rounded-full"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 错误信息 */}
            {item.error && (
              <div className="mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-600 dark:text-red-400">
                  {item.error}
                </p>
              </div>
            )}

            {/* 状态文本 */}
            <div className={cn('text-xs font-medium', statusColor)}>
              {statusText}
            </div>
          </div>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex-shrink-0">
          {item.status === 'pending' && (
            <Button
              size="sm"
              onClick={() => onDownload(item.id)}
              disabled={disabled}
              className="bg-gradient-to-r from-[#0077b6] to-[#00b4d8] hover:from-[#023e8a] hover:to-[#0077b6] text-white border-0 shadow-sm"
            >
              <Icon icon="ph:download-simple" className="w-4 h-4 mr-1" />
              下载
            </Button>
          )}
          
          {item.status === 'downloading' && (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="cursor-not-allowed"
            >
              <Icon icon="ph:spinner" className="w-4 h-4 mr-1 animate-spin" />
              下载中
            </Button>
          )}
          
          {item.status === 'failed' && (
            <Button
              size="sm"
              onClick={() => onRetry(item.id)}
              disabled={disabled}
              variant="outline"
              className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Icon icon="ph:arrow-clockwise" className="w-4 h-4 mr-1" />
              重试
            </Button>
          )}
          
          {(item.status === 'completed' || item.status === 'installed') && (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium px-3 py-1.5">
              <Icon icon="ph:check-circle-fill" className="w-4 h-4" />
              完成
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
