/**
 * 版本管理 API
 * 提供组件版本检查、更新、备份管理接口
 */
import { apiJson } from '@/config/api';

// ==================== 类型定义 ====================

export interface ComponentVersionInfo {
  component: 'main' | 'napcat' | 'napcat-ada';
  installed: boolean;
  local_version?: string;
  local_commit?: string;
  local_commit_full?: string;
  status: 'checking' | 'up_to_date' | 'update_available' | 'not_installed' | 'check_failed';
  has_update?: boolean;
  commits_behind?: number;
  latest_version?: string;
  latest_commit?: string;
  latest_commit_full?: string;
  github_info?: GitHubInfo;
}

export interface GitHubInfo {
  latest_version?: string;
  latest_commit?: string;
  latest_commit_short?: string;
  commit_message?: string;
  commit_date?: string;
  changelog?: string;
  release_url?: string;
  published_at?: string;
  author?: string;
  html_url?: string;
  assets?: ReleaseAsset[];
}

export interface ReleaseAsset {
  name: string;
  size: number;
  download_url: string;
}

export interface CommitComparison {
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: CommitInfo[];
  files_changed: number;
  files: FileChange[];
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface FileChange {
  filename: string;
  status: 'added' | 'modified' | 'removed';
  additions: number;
  deletions: number;
  changes: number;
}

export interface UpdateCheckResult {
  component: string;
  local_version?: string;
  local_commit?: string;
  github_info: GitHubInfo;
  has_update: boolean;
  comparison?: CommitComparison;
}

export interface VersionBackup {
  id: string;
  component: string;
  version?: string;
  commit_hash?: string;
  backup_size: number;
  created_at: string;
  description?: string;
}

export interface UpdateHistory {
  id: number;
  component: string;
  from_version?: string;
  to_version?: string;
  from_commit?: string;
  to_commit?: string;
  status: 'success' | 'failed' | 'rollback';
  backup_id?: string;
  error_message?: string;
  updated_at: string;
}

export interface Release {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  html_url: string;
  prerelease: boolean;
}

// ==================== API 函数 ====================

/**
 * 获取实例所有组件的版本信息
 */
export async function getInstanceComponentsVersion(instanceId: string): Promise<ComponentVersionInfo[]> {
  return apiJson<ComponentVersionInfo[]>(`/versions/instances/${instanceId}/components`);
}

/**
 * 检查单个组件的更新详情
 */
export async function checkComponentUpdate(
  instanceId: string,
  component: string
): Promise<UpdateCheckResult> {
  return apiJson<UpdateCheckResult>(
    `/versions/instances/${instanceId}/components/${component}/check`,
    { method: 'POST' }
  );
}

/**
 * 执行组件更新
 */
export async function updateComponent(
  instanceId: string,
  component: string,
  createBackup: boolean = true,
  updateMethod: 'git' | 'release' = 'git'
): Promise<{
  backup_id?: string;
  old_version?: string;
  new_version?: string;
  old_commit?: string;
  new_commit?: string;
}> {
  const params = new URLSearchParams({
    create_backup: String(createBackup),
    update_method: updateMethod,
  });
  
  return apiJson(
    `/versions/instances/${instanceId}/components/${component}/update?${params}`,
    { method: 'POST' }
  );
}

/**
 * 获取实例的备份列表
 */
export async function getBackups(
  instanceId: string,
  component?: string
): Promise<VersionBackup[]> {
  const params = component ? `?component=${component}` : '';
  return apiJson<VersionBackup[]>(`/versions/instances/${instanceId}/backups${params}`);
}

/**
 * 从备份恢复组件
 */
export async function restoreBackup(
  instanceId: string,
  backupId: string
): Promise<{
  backup_id: string;
  component: string;
  restored_version?: string;
}> {
  return apiJson(
    `/versions/instances/${instanceId}/backups/${backupId}/restore`,
    { method: 'POST' }
  );
}

/**
 * 获取更新历史记录
 */
export async function getUpdateHistory(
  instanceId: string,
  component?: string,
  limit: number = 20
): Promise<UpdateHistory[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (component) params.append('component', component);
  
  return apiJson<UpdateHistory[]>(`/versions/instances/${instanceId}/update-history?${params}`);
}

/**
 * 获取组件的 Release 历史列表
 */
export async function getComponentReleases(
  component: string,
  limit: number = 10
): Promise<Release[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  return apiJson<Release[]>(`/versions/components/${component}/releases?${params}`);
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 获取组件显示名称
 */
export function getComponentDisplayName(component: string): string {
  const names: Record<string, string> = {
    main: 'Maibot',
    napcat: 'NapCat',
    'napcat-ada': 'Adapter',
  };
  return names[component] || component;
}
