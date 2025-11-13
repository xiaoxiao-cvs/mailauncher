/**
 * MAIBot 配置 API 服务
 */
import { apiJson, apiText } from '@/config/api'

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
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  params.append('include_comments', String(includeComments))
  return apiJson<ConfigWithComments>(`maibot/bot-config?${params.toString()}`)
}

/**
 * 获取 Bot 配置原始文本 (TOML)
 */
export async function getBotConfigRaw(instanceId?: string): Promise<string> {
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  return apiText(`maibot/bot-config/raw?${params.toString()}`)
}

/**
 * 保存 Bot 配置原始文本 (TOML)
 */
export async function saveBotConfigRaw(
  content: string,
  instanceId?: string
): Promise<void> {
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  await apiText(`maibot/bot-config/raw?${params.toString()}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: content,
  })
}

/**
 * 更新 Bot 配置
 */
export async function updateBotConfig(
  request: ConfigUpdateRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  return apiJson<ConfigWithComments>(`maibot/bot-config?${params.toString()}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

/**
 * 删除 Bot 配置键
 */
export async function deleteBotConfigKey(
  request: ConfigDeleteRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  return apiJson<ConfigWithComments>(`maibot/bot-config?${params.toString()}`, {
    method: 'DELETE',
    body: JSON.stringify(request),
  })
}

/**
 * 添加 Bot 配置数组项
 */
export async function addBotConfigArrayItem(
  request: ArrayItemAddRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  return apiJson<ConfigWithComments>(`maibot/bot-config/array-item?${params.toString()}`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// ==================== Model Config API ====================

/**
 * 获取模型配置
 */
export async function getModelConfig(
  instanceId?: string,
  includeComments: boolean = true
): Promise<ConfigWithComments> {
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  params.append('include_comments', String(includeComments))
  return apiJson<ConfigWithComments>(`maibot/model-config?${params.toString()}`)
}

/**
 * 获取模型配置原始文本 (TOML)
 */
export async function getModelConfigRaw(instanceId?: string): Promise<string> {
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  return apiText(`maibot/model-config/raw?${params.toString()}`)
}

/**
 * 保存模型配置原始文本 (TOML)
 */
export async function saveModelConfigRaw(
  content: string,
  instanceId?: string
): Promise<void> {
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  await apiText(`maibot/model-config/raw?${params.toString()}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: content,
  })
}

/**
 * 更新模型配置
 */
export async function updateModelConfig(
  request: ConfigUpdateRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  return apiJson<ConfigWithComments>(`maibot/model-config?${params.toString()}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

/**
 * 删除模型配置键
 */
export async function deleteModelConfigKey(
  request: ConfigDeleteRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  return apiJson<ConfigWithComments>(`maibot/model-config?${params.toString()}`, {
    method: 'DELETE',
    body: JSON.stringify(request),
  })
}

/**
 * 添加模型配置数组项
 */
export async function addModelConfigArrayItem(
  request: ArrayItemAddRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  return apiJson<ConfigWithComments>(`maibot/model-config/array-item?${params.toString()}`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// ==================== Adapter Config API ====================

export async function getAdapterConfig(
  instanceId?: string,
  includeComments: boolean = true
): Promise<ConfigWithComments> {
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  params.append('include_comments', String(includeComments))
  return apiJson<ConfigWithComments>(`maibot/adapter-config?${params.toString()}`)
}

export async function updateAdapterConfig(
  request: ConfigUpdateRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  return apiJson<ConfigWithComments>(`maibot/adapter-config?${params.toString()}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

export async function getAdapterConfigRaw(instanceId?: string): Promise<string> {
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  return apiText(`maibot/adapter-config/raw?${params.toString()}`)
}

export async function saveAdapterConfigRaw(
  content: string,
  instanceId?: string
): Promise<void> {
  const params = new URLSearchParams()
  if (instanceId) params.append('instance_id', instanceId)
  await apiText(`maibot/adapter-config/raw?${params.toString()}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: content,
  })
}
