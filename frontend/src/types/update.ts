/**
 * 更新相关类型定义
 */

export interface UpdateChannel {
  name: string
  label: string
  description: string
}

export interface VersionInfo {
  version: string
  label: string
  date: string
  channel: string
  notes: string
  download_url?: string
}

export interface UpdateCheckResponse {
  current_version: string
  latest_version?: string
  has_update: boolean
  update_available?: VersionInfo
  channels: UpdateChannel[]
}

export interface ChannelVersionsResponse {
  channel: string
  versions: VersionInfo[]
}

export interface UpdateProgress {
  status: 'checking' | 'downloading' | 'installing' | 'done' | 'error'
  progress?: number
  message?: string
  error?: string
}
