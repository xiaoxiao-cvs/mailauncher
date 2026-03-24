import type { DownloadItem } from '@/types/download'
import { ComponentSelectItem } from './ComponentSelectItem'

interface DownloadComponentSelectorProps {
  downloadItems: DownloadItem[]
  selectedItems: Set<string>
  hasDownloading: boolean
  toggleItemSelection: (id: string) => void
}

export function DownloadComponentSelector({
  downloadItems,
  selectedItems,
  hasDownloading,
  toggleItemSelection,
}: DownloadComponentSelectorProps) {
  const adapterItem = downloadItems.find(item => item.type === 'adapter')
  const napcatItem = downloadItems.find(item => item.type === 'napcat')
  const quickAlgoItem = downloadItems.find(item => item.type === 'quick-algo')

  const isMacOS = window.navigator.platform.toLowerCase().includes('mac')
  const isWindows = window.navigator.platform.toLowerCase().includes('win')

  return (
    <div className="lg:col-span-5 animate-item">
      <div className="glass-panel p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">组件选择</h2>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            已选 {selectedItems.size}
          </span>
        </div>

        <div className="space-y-2 flex-1">
          {adapterItem && (
            <ComponentSelectItem
              item={adapterItem}
              selected={selectedItems.has(adapterItem.id)}
              disabled={hasDownloading}
              onToggle={() => toggleItemSelection(adapterItem.id)}
            />
          )}

          {napcatItem && (
            <ComponentSelectItem
              item={napcatItem}
              selected={selectedItems.has(napcatItem.id)}
              disabled={hasDownloading}
              onToggle={() => toggleItemSelection(napcatItem.id)}
            />
          )}

          {quickAlgoItem && (
            <ComponentSelectItem
              item={quickAlgoItem}
              selected={isMacOS || selectedItems.has(quickAlgoItem.id)}
              disabled={isWindows || hasDownloading}
              locked={isMacOS}
              onToggle={() => toggleItemSelection(quickAlgoItem.id)}
              badge={
                isMacOS ? (
                  <span className="inline-block mt-1.5 text-[10px] font-medium text-brand bg-brand-muted px-2 py-0.5 rounded">
                    macOS 必需
                  </span>
                ) : isWindows ? (
                  <span className="inline-block mt-1.5 text-[10px] text-muted-foreground">
                    Windows 无需编译
                  </span>
                ) : undefined
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
