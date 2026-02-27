import { useState, useEffect } from 'react'
import { tauriInvoke } from '@/services/tauriInvoke'
import { environmentLogger } from '@/utils/logger'

export interface ApiProvider {
  id?: number
  name: string
  base_url: string
  api_key: string
  is_enabled: boolean
  balance?: string
  model_count?: number
  models_updated_at?: string
  isValid?: boolean
  isValidating?: boolean
}

// 预设供应商配置
export const PRESET_PROVIDERS = [
  {
    name: '硅基流动',
    base_url: 'https://api.siliconflow.cn/v1',
    placeholder_key: 'sk-...'
  },
  {
    name: '阿里百炼',
    base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    placeholder_key: 'sk-...'
  },
  {
    name: 'DeepSeek',
    base_url: 'https://api.deepseek.com/v1',
    placeholder_key: 'sk-...'
  }
]

interface SaveStatus {
  success: boolean
  message: string
}

/**
 * API 供应商配置逻辑 Hook
 *
 * 通过 Tauri invoke 直接调用 Rust 命令。
 */
export function useApiProviderConfig() {
  const [providers, setProviders] = useState<ApiProvider[]>([])
  const [selectedProviderIndex, setSelectedProviderIndex] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null)
  const [validationTimer, setValidationTimer] = useState<NodeJS.Timeout | null>(null)
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)

  // 加载已保存的供应商
  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    setIsLoading(true)
    environmentLogger.info('加载 API 供应商配置')
    
    try {
      const result = await tauriInvoke<ApiProvider[]>('get_api_providers')
      setProviders(result ?? [])
      environmentLogger.success('API 供应商加载成功', result)
    } catch (error) {
      environmentLogger.error('加载 API 供应商失败', error)
      setProviders([])
    } finally {
      setIsLoading(false)
    }
  }

  const addCustomProvider = () => {
    const newProvider: ApiProvider = {
      name: '自定义供应商',
      base_url: '',
      api_key: '',
      is_enabled: true
    }
    setProviders([...providers, newProvider])
    setSelectedProviderIndex(providers.length)
  }

  const removeProvider = async (index: number) => {
    const provider = providers[index]
    
    // 如果供应商有ID（已保存到数据库），则调用后端删除
    if (provider.id) {
      try {
        await tauriInvoke('delete_api_provider', { id: provider.id })
        environmentLogger.success('供应商已删除', { name: provider.name, id: provider.id })
      } catch (error) {
        environmentLogger.error('删除供应商失败', error)
        setSaveStatus({
          success: false,
          message: '删除供应商失败'
        })
        return
      }
    }
    
    // 从本地状态中移除
    const newProviders = providers.filter((_, i) => i !== index)
    setProviders(newProviders)
    if (selectedProviderIndex >= newProviders.length) {
      setSelectedProviderIndex(Math.max(0, newProviders.length - 1))
    }
  }

  const updateProvider = (index: number, field: keyof ApiProvider, value: string | boolean) => {
    const newProviders = [...providers]
    newProviders[index] = { ...newProviders[index], [field]: value }
    setProviders(newProviders)

    // 清除之前的自动保存计时器
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }

    // 如果更新的是 api_key，触发自动验证
    if (field === 'api_key' && typeof value === 'string' && value.length > 10) {
      // 清除之前的验证计时器
      if (validationTimer) {
        clearTimeout(validationTimer)
      }
      
      // 设置新的计时器，延迟1秒后验证
      const timer = setTimeout(() => {
        validateApiKey(index, newProviders[index])
      }, 1000)
      
      setValidationTimer(timer)
      
      // 设置验证中状态
      newProviders[index].isValidating = true
      newProviders[index].isValid = undefined
      setProviders([...newProviders])
    }

    // 只有当必填字段都填写后才自动保存
    const provider = newProviders[index]
    if (provider.name.trim() && provider.base_url.trim() && provider.api_key.trim()) {
      // 设置自动保存计时器，延迟1.5秒后自动保存
      const saveTimer = setTimeout(() => {
        autoSaveProviders(newProviders)
      }, 1500)
      
      setAutoSaveTimer(saveTimer)
    }
  }

  const validateApiKey = async (index: number, provider: ApiProvider) => {
    // 检查所有必填字段是否都已填写
    if (!provider.api_key || !provider.base_url || !provider.name.trim()) {
      environmentLogger.warn('验证跳过：必填字段未完整', { 
        name: provider.name, 
        hasApiKey: !!provider.api_key, 
        hasBaseUrl: !!provider.base_url 
      })
      return
    }

    environmentLogger.info('开始验证 API Key', { 
      provider: provider.name, 
      hasId: !!provider.id,
      apiKey: provider.api_key.substring(0, 10) + '...'
    })

    try {
      // 首先保存配置（如果还没有ID）
      if (!provider.id) {
        environmentLogger.info('供应商无ID，先保存以获取ID', { provider: provider.name })
        
        const created = await tauriInvoke<ApiProvider>('create_api_provider', {
          name: provider.name,
          baseUrl: provider.base_url,
          apiKey: provider.api_key,
          isEnabled: provider.is_enabled
        })
        
        provider.id = created.id
        environmentLogger.success('获取到供应商ID', { id: provider.id })
      }

      // 测试连接 — 远程获取模型列表
      const data = await tauriInvoke<{ models: string[]; modelsCount: number }>('fetch_provider_models', {
        providerId: provider.id
      })

      const newProviders = [...providers]
      newProviders[index].isValidating = false
      newProviders[index].isValid = true
      newProviders[index].model_count = data.modelsCount
      newProviders[index].models_updated_at = new Date().toISOString()
      environmentLogger.success('API Key 验证成功', data)
      setProviders(newProviders)
    } catch (error) {
      const newProviders = [...providers]
      newProviders[index].isValidating = false
      newProviders[index].isValid = false
      setProviders(newProviders)
      environmentLogger.error('API Key 验证异常', error)
    }
  }

  const autoSaveProviders = async (providersToSave: ApiProvider[]) => {
    environmentLogger.info('自动保存 API 供应商配置', { count: providersToSave.length })
    
    // 过滤出有效的供应商（必填字段都已填写）
    const validProviders = providersToSave.filter(p => 
      p.name.trim() && p.base_url.trim() && p.api_key.trim()
    )
    
    if (validProviders.length === 0) {
      environmentLogger.warn('没有可保存的供应商（必填字段未完整填写）')
      return
    }
    
    environmentLogger.info('准备保存的供应商', { validCount: validProviders.length, providers: validProviders.map(p => p.name) })
    
    try {
      // 将 ApiProvider 映射为 ProviderInput 格式（Rust 端 save_all_providers 的参数）
      const providerInputs = validProviders.map(p => ({
        name: p.name,
        base_url: p.base_url,
        api_key: p.api_key,
        is_enabled: p.is_enabled
      }))
      
      await tauriInvoke('save_all_providers', { providers: providerInputs })
      setSaveStatus({ success: true, message: '✓ 已自动保存' })
      environmentLogger.success('API 供应商配置自动保存成功')
      // 重新加载以获取ID
      await loadProviders()
      setTimeout(() => setSaveStatus(null), 2000)
    } catch (error) {
      setSaveStatus({ success: false, message: '自动保存失败' })
      environmentLogger.error('自动保存 API 供应商配置异常', error)
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  return {
    providers,
    selectedProviderIndex,
    setSelectedProviderIndex,
    isLoading,
    saveStatus,
    addCustomProvider,
    removeProvider,
    updateProvider,
    currentProvider: providers[selectedProviderIndex]
  }
}
