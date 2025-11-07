/**
 * 部署路径显示和选择组件
 * 职责：显示当前部署路径并提供修改功能
 */

import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DeploymentPathSelectorProps {
  path: string
  onSelectPath: () => void
  onChange: (path: string) => void
  isLoading?: boolean
  disabled?: boolean
  compact?: boolean // 紧凑模式
}

export function DeploymentPathSelector({
  path,
  onSelectPath,
  onChange,
  isLoading,
  disabled,
  compact = false
}: DeploymentPathSelectorProps) {
  return (
    <div className={cn(
      'rounded-xl border transition-all',
      'bg-white dark:bg-[#1a1a1a]',
      'border-[#023e8a]/10 dark:border-white/10',
      compact ? 'p-3' : 'p-4'
    )}>
      <div className={cn('flex items-center gap-3', compact ? 'mb-2' : 'mb-3')}>
        <div className={cn(
          'rounded-lg bg-gradient-to-br from-[#0077b6] to-[#00b4d8] flex items-center justify-center text-white shadow-sm flex-shrink-0',
          compact ? 'w-8 h-8' : 'w-9 h-9'
        )}>
          <Icon icon="ph:folder-open" className={cn(compact ? 'w-4 h-4' : 'w-5 h-5')} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn('font-semibold text-[#03045e] dark:text-white', compact ? 'text-sm' : 'text-sm')}>
            部署路径
          </h3>
          <p className={cn('text-[#023e8a]/70 dark:text-white/70', compact ? 'text-xs' : 'text-xs')}>
            所有组件将安装到此目录
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={path}
            onChange={(e) => onChange(e.target.value)}
            placeholder="请选择部署路径..."
            disabled={disabled || isLoading}
            className={cn(
              'w-full px-3 text-sm rounded-lg border',
              'bg-white dark:bg-[#2a2a2a]',
              'text-[#023e8a] dark:text-white',
              'placeholder:text-[#023e8a]/40 dark:placeholder:text-white/40',
              'border-[#023e8a]/20 dark:border-white/20',
              'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/30',
              'transition-all',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              compact ? 'py-1.5' : 'py-2'
            )}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Icon icon="ph:spinner" className="w-4 h-4 animate-spin text-[#023e8a] dark:text-white" />
            </div>
          )}
        </div>
        
        <Button
          onClick={onSelectPath}
          size="sm"
          disabled={disabled || isLoading}
          className="bg-gradient-to-r from-[#0077b6] to-[#00b4d8] hover:from-[#023e8a] hover:to-[#0077b6] text-white border-0 shadow-sm"
        >
          <Icon icon="ph:folder-open" className="w-4 h-4 mr-1" />
          选择
        </Button>
      </div>

      {!compact && (
        <div className="mt-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            💡 此路径在引导页已配置。您可以使用默认路径，也可以重新选择。
          </p>
        </div>
      )}
    </div>
  )
}
