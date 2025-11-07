import { LoaderIcon, AlertCircleIcon } from 'lucide-react'
import { useApiProviderConfig } from '@/hooks/useApiProviderConfig'
import { ProviderSelector } from './ProviderSelector'
import { ProviderForm } from './ProviderForm'

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
        <h3 className="text-lg font-semibold text-[#03045e] dark:text-white">
          AI 模型供应商
        </h3>
        <p className="text-sm text-[#023e8a]/60 dark:text-white/60 mt-1">
          配置 AI 服务的 API 端点和密钥
        </p>
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