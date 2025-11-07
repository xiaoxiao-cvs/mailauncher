import { useState } from 'react'
import { ChevronDownIcon, CheckCircle2Icon, XIcon, PlusIcon } from 'lucide-react'
import { ApiProvider, PRESET_PROVIDERS } from '@/hooks/useApiProviderConfig'

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
      <label className="block text-sm font-medium text-[#03045e] dark:text-white mb-2">
        选择供应商
      </label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2.5 bg-white dark:bg-[#2e2e2e] border border-[#023e8a]/20 dark:border-[#3a3a3a] rounded-lg text-left flex items-center justify-between hover:border-[#023e8a]/40 dark:hover:border-white/40 transition-colors"
        >
          <span className="text-[#03045e] dark:text-white">
            {currentProvider?.name || '选择供应商'}
          </span>
          <ChevronDownIcon 
            className={`w-4 h-4 text-[#023e8a]/60 dark:text-white/60 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {/* 下拉菜单 */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#2e2e2e] border border-[#023e8a]/20 dark:border-[#3a3a3a] rounded-lg shadow-lg overflow-hidden">
            {/* 供应商列表 */}
            <div className="max-h-60 overflow-y-auto">
              {providers.map((provider, index) => (
                <div
                  key={index}
                  className={`px-4 py-2.5 flex items-center justify-between hover:bg-[#023e8a]/5 dark:hover:bg-white/5 cursor-pointer transition-colors ${
                    selectedIndex === index ? 'bg-[#023e8a]/10 dark:bg-white/10' : ''
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelect(index)
                      setIsOpen(false)
                    }}
                    className="flex-1 text-left text-[#03045e] dark:text-white"
                  >
                    {provider.name}
                    {provider.isValid && (
                      <CheckCircle2Icon className="inline-block w-4 h-4 ml-2 text-green-500" />
                    )}
                  </button>
                  {/* 删除按钮 - 仅对自定义供应商显示 */}
                  {!PRESET_PROVIDERS.some(p => p.name === provider.name) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove(index)
                        if (selectedIndex === index) {
                          setIsOpen(false)
                        }
                      }}
                      className="p-1 hover:bg-red-500/10 rounded transition-colors"
                      title="删除供应商"
                    >
                      <XIcon className="w-4 h-4 text-red-500" />
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
              className="w-full px-4 py-2.5 border-t border-[#023e8a]/10 dark:border-[#3a3a3a] flex items-center justify-center gap-2 hover:bg-[#023e8a]/5 dark:hover:bg-white/5 transition-colors"
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
