/**
 * Maibot 版本选择组件
 * 职责：让用户选择要下载的 Maibot 版本
 */

import { Icon } from '@iconify/react'
import type { MaibotVersion } from '@/types/download'
import { cn } from '@/lib/utils'

interface MaibotVersionSelectorProps {
  versions: MaibotVersion[]
  selectedVersion: MaibotVersion
  onSelectVersion: (version: MaibotVersion) => void
  disabled?: boolean
}

export function MaibotVersionSelector({
  versions,
  selectedVersion,
  onSelectVersion,
  disabled
}: MaibotVersionSelectorProps) {
  return (
    <div className={cn(
      'p-4 rounded-xl border transition-all',
      'bg-white dark:bg-[#1a1a1a]',
      'border-[#023e8a]/10 dark:border-white/10'
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0077b6] to-[#00b4d8] flex items-center justify-center text-white shadow-sm flex-shrink-0">
          <Icon icon="ph:git-branch" className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#03045e] dark:text-white">
            Maibot 版本
          </h3>
          <p className="text-xs text-[#023e8a]/70 dark:text-white/70">
            选择要下载的版本或分支
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {versions.map((version) => (
          <button
            key={version.value}
            onClick={() => onSelectVersion(version)}
            disabled={disabled}
            className={cn(
              'w-full px-3 py-2.5 rounded-lg border transition-all text-left',
              'flex items-center justify-between gap-2',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              selectedVersion.value === version.value
                ? 'bg-gradient-to-r from-[#0077b6]/10 to-[#00b4d8]/10 dark:from-[#0077b6]/20 dark:to-[#00b4d8]/20 border-[#0077b6] dark:border-[#00b4d8]'
                : 'bg-white dark:bg-[#2a2a2a] border-[#023e8a]/20 dark:border-white/20 hover:border-[#0077b6]/50 dark:hover:border-[#00b4d8]/50'
            )}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <Icon 
                icon={
                  version.source === 'latest' 
                    ? 'ph:code' 
                    : version.source === 'tag' 
                    ? 'ph:tag' 
                    : 'ph:git-branch'
                } 
                className={cn(
                  'w-4 h-4 flex-shrink-0',
                  selectedVersion.value === version.value
                    ? 'text-[#0077b6] dark:text-[#00b4d8]'
                    : 'text-[#023e8a]/60 dark:text-white/60'
                )}
              />
              <div className="flex-1 min-w-0">
                <div className={cn(
                  'text-sm font-medium truncate',
                  selectedVersion.value === version.value
                    ? 'text-[#0077b6] dark:text-[#00b4d8]'
                    : 'text-[#023e8a] dark:text-white'
                )}>
                  {version.label}
                </div>
                <div className="text-xs text-[#023e8a]/60 dark:text-white/60">
                  {version.source === 'latest' && '从主分支获取最新代码'}
                  {version.source === 'tag' && '稳定版本发布'}
                  {version.source === 'branch' && '开发分支'}
                </div>
              </div>
            </div>
            
            {selectedVersion.value === version.value && (
              <Icon 
                icon="ph:check-circle-fill" 
                className="w-5 h-5 text-[#0077b6] dark:text-[#00b4d8] flex-shrink-0" 
              />
            )}
          </button>
        ))}
      </div>

      <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          ⚠️ 推荐选择"最新代码"以获取最新功能和修复。Tag 版本为稳定发布版。
        </p>
      </div>
    </div>
  )
}
