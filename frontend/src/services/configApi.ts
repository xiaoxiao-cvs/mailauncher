/**
 * MAIBot 配置 API 服务
 */
import { getApiBaseUrl } from '@/config/api'

// ==================== 类型定义 ====================

export interface ConfigWithComments {
  data: Record<string, any>
  comments: Record<string, string>
  file_path: string
}

export interface ConfigUpdateRequest {
  key_path: string
  value: any
}

export interface ConfigDeleteRequest {
  key_path: string
}

export interface ConfigAddRequest {
  section?: string
  key: string
  value: any
  comment?: string
}

export interface ArrayItemAddRequest {
  array_path: string
  item: Record<string, any>
  comment?: string
}

export interface ArrayItemUpdateRequest {
  array_path: string
  index: number
  updates: Record<string, any>
}

export interface ArrayItemDeleteRequest {
  array_path: string
  index: number
}

// ==================== Bot Config API ====================

/**
 * 获取 Bot 配置
 */
export async function getBotConfig(
  instanceId?: string,
  includeComments: boolean = true
): Promise<ConfigWithComments> {
  const baseUrl = getApiBaseUrl()
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  params.append('include_comments', String(includeComments))
  
  const response = await fetch(
    `${baseUrl}/api/v1/maibot/bot-config?${params.toString()}`
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '获取配置失败' }))
    throw new Error(error.detail || '获取配置失败')
  }
  
  return response.json()
}

/**
 * 获取 Bot 配置原始文本 (TOML)
 */
export async function getBotConfigRaw(instanceId?: string): Promise<string> {
  const baseUrl = getApiBaseUrl()
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  
  const response = await fetch(
    `${baseUrl}/api/v1/maibot/bot-config/raw?${params.toString()}`
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '获取配置文件失败' }))
    throw new Error(error.detail || '获取配置文件失败')
  }
  
  return response.text()
}

/**
 * 保存 Bot 配置原始文本 (TOML)
 */
export async function saveBotConfigRaw(
  content: string,
  instanceId?: string
): Promise<void> {
  const baseUrl = getApiBaseUrl()
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  
  const response = await fetch(
    `${baseUrl}/api/v1/maibot/bot-config/raw?${params.toString()}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: content,
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '保存配置文件失败' }))
    throw new Error(error.detail || '保存配置文件失败')
  }
}

/**
 * 更新 Bot 配置
 */
export async function updateBotConfig(
  request: ConfigUpdateRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const baseUrl = getApiBaseUrl()
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  
  const response = await fetch(
    `${baseUrl}/api/v1/maibot/bot-config?${params.toString()}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '更新配置失败' }))
    throw new Error(error.detail || '更新配置失败')
  }
  
  return response.json()
}

/**
 * 删除 Bot 配置键
 */
export async function deleteBotConfigKey(
  request: ConfigDeleteRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const baseUrl = getApiBaseUrl()
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  
  const response = await fetch(
    `${baseUrl}/api/v1/maibot/bot-config?${params.toString()}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '删除配置失败' }))
    throw new Error(error.detail || '删除配置失败')
  }
  
  return response.json()
}

/**
 * 添加 Bot 配置数组项
 */
export async function addBotConfigArrayItem(
  request: ArrayItemAddRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const baseUrl = getApiBaseUrl()
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  
  const response = await fetch(
    `${baseUrl}/api/v1/maibot/bot-config/array-item?${params.toString()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '添加配置项失败' }))
    throw new Error(error.detail || '添加配置项失败')
  }
  
  return response.json()
}

// ==================== Model Config API ====================

/**
 * 获取模型配置
 */
export async function getModelConfig(
  instanceId?: string,
  includeComments: boolean = true
): Promise<ConfigWithComments> {
  const baseUrl = getApiBaseUrl()
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  params.append('include_comments', String(includeComments))
  
  const response = await fetch(
    `${baseUrl}/api/v1/maibot/model-config?${params.toString()}`
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '获取配置失败' }))
    throw new Error(error.detail || '获取配置失败')
  }
  
  return response.json()
}

/**
 * 获取模型配置原始文本 (TOML)
 */
export async function getModelConfigRaw(instanceId?: string): Promise<string> {
  const baseUrl = getApiBaseUrl()
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  
  const response = await fetch(
    `${baseUrl}/api/v1/maibot/model-config/raw?${params.toString()}`
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '获取配置文件失败' }))
    throw new Error(error.detail || '获取配置文件失败')
  }
  
  return response.text()
}

/**
 * 保存模型配置原始文本 (TOML)
 */
export async function saveModelConfigRaw(
  content: string,
  instanceId?: string
): Promise<void> {
  const baseUrl = getApiBaseUrl()
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  
  const response = await fetch(
    `${baseUrl}/api/v1/maibot/model-config/raw?${params.toString()}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: content,
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '保存配置文件失败' }))
    throw new Error(error.detail || '保存配置文件失败')
  }
}

/**
 * 更新模型配置
 */
export async function updateModelConfig(
  request: ConfigUpdateRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const baseUrl = getApiBaseUrl()
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  
  const response = await fetch(
    `${baseUrl}/api/v1/maibot/model-config?${params.toString()}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '更新配置失败' }))
    throw new Error(error.detail || '更新配置失败')
  }
  
  return response.json()
}

/**
 * 删除模型配置键
 */
export async function deleteModelConfigKey(
  request: ConfigDeleteRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const baseUrl = getApiBaseUrl()
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  
  const response = await fetch(
    `${baseUrl}/api/v1/maibot/model-config?${params.toString()}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '删除配置失败' }))
    throw new Error(error.detail || '删除配置失败')
  }
  
  return response.json()
}

/**
 * 添加模型配置数组项
 */
export async function addModelConfigArrayItem(
  request: ArrayItemAddRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const baseUrl = getApiBaseUrl()
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  
  const response = await fetch(
    `${baseUrl}/api/v1/maibot/model-config/array-item?${params.toString()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '添加配置项失败' }))
    throw new Error(error.detail || '添加配置项失败')
  }
  
  return response.json()
}
