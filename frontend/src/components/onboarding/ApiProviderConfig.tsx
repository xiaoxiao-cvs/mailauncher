import { LoaderIcon, AlertCircleIcon } from 'lucide-react'
import { useApiProviderConfig } from '@/hooks/useApiProviderConfig'
import { ProviderSelector } from './ProviderSelector'
import { ProviderForm } from './ProviderForm'

// Note: ApiProviderConfig \u4f7f\u7528\u4e86\u590d\u6742\u7684\u72b6\u6001\u7ba1\u7406\u903b\u8f91,\u4fdd\u7559\u539f\u6709 hook \u4ee5\u907f\u514d\u91cd\u5927\u91cd\u6784
// \u53ef\u4ee5\u540e\u7eed\u9010\u6b65\u8fc1\u79fb\u5230 useApiProviderQueries

interface ApiProviderConfigProps {
  stepColor: string
}

/**
 * API 供应商配置组件
 * 职责：配置 AI 模型供应商的 API 端点和密钥
 */
export function ApiProviderConfig({ stepColor }: ApiProviderConfigProps) {
  const {
    providers,
    selectedProviderIndex,
    setSelectedProviderIndex,
    isLoading,
    saveStatus,
    addCustomProvider,
    removeProvider,
    updateProvider,
    currentProvider
  } = useApiProviderConfig()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderIcon className="w-8 h-8 animate-spin" style={{ color: stepColor }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 标题区域 */}
      <div className="mb-4">
        
      </div>

      {/* 供应商选择下拉菜单 */}
      <ProviderSelector
        providers={providers}
        selectedIndex={selectedProviderIndex}
        onSelect={setSelectedProviderIndex}
        onAddCustom={addCustomProvider}
        onRemove={removeProvider}
        stepColor={stepColor}
      />

      {/* 当前选中的供应商配置 */}
      {currentProvider ? (
        <ProviderForm
          provider={currentProvider}
          providerIndex={selectedProviderIndex}
          onUpdate={updateProvider}
          saveStatus={saveStatus}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-[#023e8a]/40 dark:text-white/40">
          <AlertCircleIcon className="w-12 h-12 mb-2" />
          <p>暂无供应商</p>
          <p className="text-sm mt-1">请从上方下拉菜单中添加</p>
        </div>
      )}
    </div>
  )
}