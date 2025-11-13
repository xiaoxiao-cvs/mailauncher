/**
 * API 配置
 * 支持动态更新后端地址
 */

const BACKEND_URL_KEY = 'mai_launcher_backend_url'
const DEFAULT_BACKEND_URL = 'http://localhost:11111'

/**
 * 获取当前的后端基础URL
 * 优先级：localStorage > 环境变量 > 默认值
 */
export function getApiBaseUrl(): string {
  // 从 localStorage 读取用户设置的地址
  const saved = localStorage.getItem(BACKEND_URL_KEY)
  if (saved) {
    try {
      const url = new URL(saved)
      // 必须是 http 或 https 协议，且有完整的 host
      if ((url.protocol === 'http:' || url.protocol === 'https:') && url.host) {
        return saved
      }
    } catch {
      // URL 格式错误，忽略
    }
  }
  
  // 使用环境变量或默认值
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_BACKEND_URL
}

/**
 * 设置后端基础URL
 * @param url 新的后端地址
 */
export function setApiBaseUrl(url: string): void {
  try {
    const urlObj = new URL(url)
    if ((urlObj.protocol === 'http:' || urlObj.protocol === 'https:') && urlObj.host) {
      localStorage.setItem(BACKEND_URL_KEY, url)
      // 触发存储事件，通知其他标签页或组件
      window.dispatchEvent(new StorageEvent('storage', {
        key: BACKEND_URL_KEY,
        newValue: url,
        storageArea: localStorage
      }))
    } else {
      throw new Error('Invalid URL format')
    }
  } catch (error) {
    console.error('Failed to set API base URL:', error)
    throw error
  }
}

/**
 * 获取完整的API URL（包含前缀）
 */
export function getApiUrl(): string {
  return `${getApiBaseUrl()}/api/v1`
}

// 导出常量用于向后兼容（但不推荐使用，应该使用函数）
export const API_PREFIX = '/api/v1'
export const BACKEND_URL_STORAGE_KEY = BACKEND_URL_KEY
export const DEFAULT_BACKEND_URL_VALUE = DEFAULT_BACKEND_URL

/**
 * @deprecated 使用 getApiBaseUrl() 代替，以支持动态配置
 */
export const API_BASE_URL = getApiBaseUrl()

/**
 * @deprecated 使用 getApiUrl() 代替，以支持动态配置
 */
export const API_URL = getApiUrl()

function buildApiUrl(path: string): string {
  const base = new URL(getApiUrl())
  const clean = path.startsWith('/') ? path.slice(1) : path
  const [pathnamePart, searchPart] = clean.split('?')
  base.pathname = base.pathname.replace(/\/$/, '') + '/' + pathnamePart
  if (searchPart && searchPart.length > 0) {
    base.search = searchPart
  }
  return base.toString()
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildApiUrl(path)
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init && init.headers ? init.headers : {}),
    },
  })
  if (!res.ok) {
    let detail: any = undefined
    try {
      detail = await res.json()
    } catch {}
    throw new Error((detail && (detail.detail || detail.message)) || res.statusText)
  }
  return res.json()
}

export async function apiText(path: string, init?: RequestInit): Promise<string> {
  const url = buildApiUrl(path)
  const res = await fetch(url, init)
  if (!res.ok) {
    let detail: any = undefined
    try {
      detail = await res.json()
    } catch {}
    throw new Error((detail && (detail.detail || detail.message)) || res.statusText)
  }
  return res.text()
}
