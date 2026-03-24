import { useState } from 'react'
import { ChevronDownIcon, CheckCircle2Icon, XIcon, PlusIcon } from 'lucide-react'
import { ApiProvider } from '@/hooks/useApiProviderConfig'
// Note: 类型也可以从 '@/hooks/queries/useApiProviderQueries' 导入

interface ProviderSelectorProps {
  providers: ApiProvider[]
  selectedIndex: number
  onSelect: (index: number) => void
  onAddCustom: () => void
  onRemove: (index: number) => void
  stepColor: string
}

/**
 * 供应商选择下拉组件
 */
export function ProviderSelector({
  providers,
  selectedIndex,
  onSelect,
  onAddCustom,
  onRemove,
  stepColor
}: ProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const currentProvider = providers[selectedIndex]

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-foreground mb-2">
        选择供应商
      </label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-left flex items-center justify-between hover:border-ring transition-colors"
        >
          <span className="text-foreground">
            {currentProvider?.name || '选择供应商'}
          </span>
          <ChevronDownIcon 
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {/* 下拉菜单 */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            {/* 供应商列表 */}
            <div className="max-h-60 overflow-y-auto">
              {providers.map((provider, index) => (
                <div
                  key={index}
                  className={`px-4 py-2.5 flex items-center justify-between hover:bg-muted cursor-pointer transition-colors ${
                    selectedIndex === index ? 'bg-muted' : ''
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelect(index)
                      setIsOpen(false)
                    }}
                    className="flex-1 text-left text-foreground"
                  >
                    {provider.name}
                    {provider.isValid && (
                      <CheckCircle2Icon className="inline-block w-4 h-4 ml-2 text-green-500" />
                    )}
                  </button>
                  {/* 删除按钮 - 所有供应商都可删除,但至少保留一个 */}
                  {providers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove(index)
                        if (selectedIndex === index) {
                          setIsOpen(false)
                        }
                      }}
                      className="p-1.5 hover:bg-red-500/10 rounded transition-colors group"
                      title="删除供应商"
                    >
                      <XIcon className="w-4 h-4 text-muted-foreground group-hover:text-red-500 transition-colors" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* 添加自定义供应商按钮 */}
            <button
              onClick={() => {
                onAddCustom()
                setIsOpen(false)
              }}
              className="w-full px-4 py-2.5 border-t border-border flex items-center justify-center gap-2 hover:bg-muted transition-colors"
              style={{ color: stepColor }}
            >
              <PlusIcon className="w-4 h-4" />
              <span className="font-medium">添加自定义供应商</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
