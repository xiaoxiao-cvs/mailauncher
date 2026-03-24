import { useState } from 'react'
import { EyeIcon, EyeOffIcon, CheckCircle2Icon, LoaderIcon, AlertCircleIcon } from 'lucide-react'
import { ApiProvider } from '@/hooks/useApiProviderConfig'
// Note: 类型也可以从 '@/hooks/queries/useApiProviderQueries' 导入

interface ProviderFormProps {
  provider: ApiProvider
  providerIndex: number
  onUpdate: (index: number, field: keyof ApiProvider, value: string | boolean) => void
  saveStatus?: { success: boolean; message: string } | null
}

/**
 * 供应商配置表单组件
 */
export function ProviderForm({ provider, providerIndex, onUpdate, saveStatus }: ProviderFormProps) {
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="flex-1 space-y-4">
      {/* 供应商名称 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          供应商名称
        </label>
        <input
          type="text"
          value={provider.name}
          onChange={(e) => onUpdate(providerIndex, 'name', e.target.value)}
          placeholder="输入供应商名称"
          className="w-full px-4 py-2.5 bg-card border border-border rounded-lg outline-none focus:border-ring text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* API 端点 URL */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          端点地址
        </label>
        <input
          type="text"
          value={provider.base_url}
          onChange={(e) => onUpdate(providerIndex, 'base_url', e.target.value)}
          placeholder="https://api.example.com/v1"
          className="w-full px-4 py-2.5 bg-card border border-border rounded-lg outline-none focus:border-ring text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* API Key */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">
            API 密钥
          </label>
          {/* 保存状态提示 - 显示在标签右侧 */}
          {saveStatus && (
            <div className={`flex items-center gap-1 text-xs ${
              saveStatus.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {saveStatus.success ? (
                <CheckCircle2Icon className="w-3.5 h-3.5" />
              ) : (
                <AlertCircleIcon className="w-3.5 h-3.5" />
              )}
              <span>{saveStatus.message}</span>
            </div>
          )}
        </div>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={provider.api_key}
            onChange={(e) => onUpdate(providerIndex, 'api_key', e.target.value)}
            placeholder="sk-..."
            className={`w-full px-4 py-2.5 pr-20 bg-card border rounded-lg outline-none text-foreground placeholder:text-muted-foreground font-mono transition-colors ${
              provider.isValid
                ? 'border-green-500 focus:border-green-600'
                : provider.isValid === false
                ? 'border-red-500 focus:border-red-600'
                : 'border-border focus:border-ring'
            }`}
          />
          
          {/* 右侧图标组 */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* 验证状态图标 */}
            {provider.isValidating ? (
              <LoaderIcon className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : provider.isValid ? (
              <div title="API Key 可用">
                <CheckCircle2Icon className="w-4 h-4 text-green-500" />
              </div>
            ) : provider.isValid === false ? (
              <div title="API Key 不可用">
                <AlertCircleIcon className="w-4 h-4 text-red-500" />
              </div>
            ) : null}
            
            {/* 显示/隐藏按钮 */}
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-1 hover:bg-muted rounded transition-colors"
              title={showKey ? '隐藏 API Key' : '显示 API Key'}
            >
              {showKey ? (
                <EyeOffIcon className="w-4 h-4 text-muted-foreground" />
              ) : (
                <EyeIcon className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
        
        {/* 验证提示信息 */}
        {provider.isValid && provider.model_count && (
          <p className="mt-2 text-sm text-green-600 dark:text-green-400">
            ✓ 已找到 {provider.model_count} 个可用模型
          </p>
        )}
        {provider.isValid === false && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            ✗ API Key 验证失败，请检查密钥是否正确
          </p>
        )}
      </div>
    </div>
  )
}
