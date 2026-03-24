import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import type { DownloadItem } from '@/types/download'

interface ComponentSelectItemProps {
  item: DownloadItem
  selected: boolean
  disabled: boolean
  locked?: boolean
  onToggle: () => void
  badge?: React.ReactNode
}

export function ComponentSelectItem({ item, selected, disabled, locked, onToggle, badge }: ComponentSelectItemProps) {
  return (
    <div
      onClick={() => !disabled && !locked && item.status !== 'completed' && onToggle()}
      className={cn(
        "group p-3.5 rounded-card border transition-all duration-200",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        selected
          ? "bg-brand-muted border-brand/20"
          : "bg-transparent border-transparent hover:bg-muted/60"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 flex-shrink-0",
          selected
            ? "bg-brand border-brand"
            : "border-border group-hover:border-muted-foreground"
        )}>
          {selected && <Icon icon="ph:check-bold" className="w-3 h-3 text-brand-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-sm font-medium text-foreground">{item.name}</h3>
            {item.status === 'completed' && (
              <Icon icon="ph:check-circle-fill" className="w-4 h-4 text-success" />
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
          {badge}
        </div>
      </div>
    </div>
  )
}
