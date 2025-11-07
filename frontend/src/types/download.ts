/**
 * 下载相关类型定义
 */

/**
 * 下载项类型
 */
export type DownloadItemType = 'maibot' | 'napcat' | 'adapter' | 'quick-algo'

/**
 * 下载项状态
 */
export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'installed'

/**
 * Maibot 版本来源类型
 */
export type MaibotVersionSource = 'latest' | 'tag' | 'branch'

/**
 * Maibot 版本信息
 */
export interface MaibotVersion {
  source: MaibotVersionSource
  value: string // latest, tag 名称, 或 branch 名称
  label: string // 显示用的标签
}

/**
 * 下载项接口
 */
export interface DownloadItem {
  id: string
  type: DownloadItemType
  name: string
  description: string
  version?: string // 当前版本
  status: DownloadStatus
  progress?: number // 0-100
  error?: string
  required: boolean // 是否必需
  platform?: 'all' | 'macos' | 'windows' | 'linux'
}

/**
 * 下载配置
 */
export interface DownloadConfig {
  deploymentPath: string // 部署路径
  items: DownloadItem[]
}
