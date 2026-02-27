/**
 * MAIBot 配置 API 服务
 *
 * 通过 Tauri invoke 直接调用 Rust 命令，替代原有的 HTTP API。
 * Rust 端返回纯 JSON 数据，此处包装为 ConfigWithComments 以保持前端兼容。
 */
import { tauriInvoke } from '@/services/tauriInvoke'

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

// ==================== 工具函数 ====================

/**
 * 将 Rust 返回的 JSON 数据包装为 ConfigWithComments 格式
 * Rust 端不提取注释，comments 字段为空对象
 */
function wrapAsConfigWithComments(data: Record<string, any>): ConfigWithComments {
  return { data, comments: {}, file_path: '' }
}

// ==================== Bot Config API ====================

/**
 * 获取 Bot 配置
 */
export async function getBotConfig(
  instanceId?: string,
  _includeComments: boolean = true
): Promise<ConfigWithComments> {
  const data = await tauriInvoke<Record<string, any>>('get_toml_config', {
    instanceId: instanceId ?? null,
    configType: 'bot',
    filename: 'bot_config.toml',
  })
  return wrapAsConfigWithComments(data)
}

/**
 * 获取 Bot 配置原始文本 (TOML)
 */
export async function getBotConfigRaw(instanceId?: string): Promise<string> {
  return tauriInvoke<string>('get_toml_config_raw', {
    instanceId: instanceId ?? null,
    configType: 'bot',
    filename: 'bot_config.toml',
  })
}

/**
 * 保存 Bot 配置原始文本 (TOML)
 */
export async function saveBotConfigRaw(
  content: string,
  instanceId?: string
): Promise<void> {
  await tauriInvoke('save_toml_config_raw', {
    instanceId: instanceId ?? null,
    configType: 'bot',
    filename: 'bot_config.toml',
    content,
  })
}

/**
 * 更新 Bot 配置
 */
export async function updateBotConfig(
  request: ConfigUpdateRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const data = await tauriInvoke<Record<string, any>>('update_toml_config_value', {
    instanceId: instanceId ?? null,
    configType: 'bot',
    filename: 'bot_config.toml',
    keyPath: request.key_path,
    value: request.value,
  })
  return wrapAsConfigWithComments(data)
}

/**
 * 删除 Bot 配置键
 */
export async function deleteBotConfigKey(
  request: ConfigDeleteRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const data = await tauriInvoke<Record<string, any>>('delete_toml_config_key', {
    instanceId: instanceId ?? null,
    configType: 'bot',
    filename: 'bot_config.toml',
    keyPath: request.key_path,
  })
  return wrapAsConfigWithComments(data)
}

/**
 * 添加 Bot 配置数组项
 */
export async function addBotConfigArrayItem(
  request: ArrayItemAddRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const data = await tauriInvoke<Record<string, any>>('add_toml_array_item', {
    instanceId: instanceId ?? null,
    configType: 'bot',
    filename: 'bot_config.toml',
    arrayPath: request.array_path,
    item: request.item,
  })
  return wrapAsConfigWithComments(data)
}

// ==================== Model Config API ====================

/**
 * 获取模型配置
 */
export async function getModelConfig(
  instanceId?: string,
  _includeComments: boolean = true
): Promise<ConfigWithComments> {
  const data = await tauriInvoke<Record<string, any>>('get_toml_config', {
    instanceId: instanceId ?? null,
    configType: 'model',
    filename: 'model_config.toml',
  })
  return wrapAsConfigWithComments(data)
}

/**
 * 获取模型配置原始文本 (TOML)
 */
export async function getModelConfigRaw(instanceId?: string): Promise<string> {
  return tauriInvoke<string>('get_toml_config_raw', {
    instanceId: instanceId ?? null,
    configType: 'model',
    filename: 'model_config.toml',
  })
}

/**
 * 保存模型配置原始文本 (TOML)
 */
export async function saveModelConfigRaw(
  content: string,
  instanceId?: string
): Promise<void> {
  await tauriInvoke('save_toml_config_raw', {
    instanceId: instanceId ?? null,
    configType: 'model',
    filename: 'model_config.toml',
    content,
  })
}

/**
 * 更新模型配置
 */
export async function updateModelConfig(
  request: ConfigUpdateRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const data = await tauriInvoke<Record<string, any>>('update_toml_config_value', {
    instanceId: instanceId ?? null,
    configType: 'model',
    filename: 'model_config.toml',
    keyPath: request.key_path,
    value: request.value,
  })
  return wrapAsConfigWithComments(data)
}

/**
 * 删除模型配置键
 */
export async function deleteModelConfigKey(
  request: ConfigDeleteRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const data = await tauriInvoke<Record<string, any>>('delete_toml_config_key', {
    instanceId: instanceId ?? null,
    configType: 'model',
    filename: 'model_config.toml',
    keyPath: request.key_path,
  })
  return wrapAsConfigWithComments(data)
}

/**
 * 添加模型配置数组项
 */
export async function addModelConfigArrayItem(
  request: ArrayItemAddRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const data = await tauriInvoke<Record<string, any>>('add_toml_array_item', {
    instanceId: instanceId ?? null,
    configType: 'model',
    filename: 'model_config.toml',
    arrayPath: request.array_path,
    item: request.item,
  })
  return wrapAsConfigWithComments(data)
}

// ==================== Adapter Config API ====================

export async function getAdapterConfig(
  instanceId?: string,
  _includeComments: boolean = true
): Promise<ConfigWithComments> {
  const data = await tauriInvoke<Record<string, any>>('get_toml_config', {
    instanceId: instanceId ?? null,
    configType: 'adapter',
    filename: 'config.toml',
  })
  return wrapAsConfigWithComments(data)
}

export async function updateAdapterConfig(
  request: ConfigUpdateRequest,
  instanceId?: string
): Promise<ConfigWithComments> {
  const data = await tauriInvoke<Record<string, any>>('update_toml_config_value', {
    instanceId: instanceId ?? null,
    configType: 'adapter',
    filename: 'config.toml',
    keyPath: request.key_path,
    value: request.value,
  })
  return wrapAsConfigWithComments(data)
}

export async function getAdapterConfigRaw(instanceId?: string): Promise<string> {
  return tauriInvoke<string>('get_toml_config_raw', {
    instanceId: instanceId ?? null,
    configType: 'adapter',
    filename: 'config.toml',
  })
}

export async function saveAdapterConfigRaw(
  content: string,
  instanceId?: string
): Promise<void> {
  await tauriInvoke('save_toml_config_raw', {
    instanceId: instanceId ?? null,
    configType: 'adapter',
    filename: 'config.toml',
    content,
  })
}
