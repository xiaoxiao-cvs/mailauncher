/**
 * 版本管理 API
 *
 * 通过 Tauri invoke 直接调用 Rust 命令，替代原有的 HTTP API。
 */
import { tauriInvoke } from "@/services/tauriInvoke";

// ==================== 类型定义 ====================

/**
 * 组件版本信息 —— 与 Rust `ComponentVersionInfo`(models/update.rs)逐字段一致。
 * 仅来自本地 component_versions 表的只读快照,不含任何更新检查结果。
 */
export interface ComponentVersionInfo {
  /** 组件名称(后端按已安装组件原样返回,不限定枚举) */
  component: string;
  /** 版本号(未记录时为空) */
  version?: string;
  /** Commit hash */
  commit_hash?: string;
  /** 安装方式(git / release 等) */
  install_method: string;
  /** 安装时间 */
  installed_at?: string;
}

/**
 * 单组件更新检查结果 —— 与 Rust `ComponentUpdateCheck`(models/update.rs)逐字段一致。
 * 走网络(GitHub),由 check_component_update 返回,需按需触发。
 */
export interface ComponentUpdateCheck {
  /** 组件名称 */
  component: string;
  /** 当前版本 */
  current_version?: string;
  /** 当前 commit hash */
  current_commit?: string;
  /** 最新版本 */
  latest_version?: string;
  /** 最新 commit hash */
  latest_commit?: string;
  /** 是否有更新 */
  has_update: boolean;
  /** 更新说明 */
  update_notes?: string;
  /** 落后的提交数 */
  commits_behind?: number;
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
  status: "success" | "failed" | "rollback";
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
export async function getInstanceComponentsVersion(
  instanceId: string,
): Promise<ComponentVersionInfo[]> {
  return tauriInvoke<ComponentVersionInfo[]>(
    "get_instance_components_version",
    { instanceId },
  );
}

/**
 * 检查单个组件的更新详情
 */
export async function checkComponentUpdate(
  instanceId: string,
  component: string,
): Promise<ComponentUpdateCheck> {
  return tauriInvoke<ComponentUpdateCheck>("check_component_update", {
    instanceId,
    component,
  });
}

/**
 * 执行组件更新
 */
export async function updateComponent(
  instanceId: string,
  component: string,
  createBackup: boolean = true,
): Promise<{
  backup_id?: string;
  old_version?: string;
  new_version?: string;
  old_commit?: string;
  new_commit?: string;
}> {
  // Rust 命令返回 SuccessResponse，此处适配为兼容返回格式
  await tauriInvoke("update_component", {
    instanceId,
    component,
    createBackup,
  });
  return {};
}

/**
 * 获取实例的备份列表
 */
export async function getBackups(
  instanceId: string,
  component?: string,
): Promise<VersionBackup[]> {
  return tauriInvoke<VersionBackup[]>("get_backups", {
    instanceId,
    component: component ?? null,
  });
}

/**
 * 从备份恢复组件
 */
export async function restoreBackup(
  instanceId: string,
  backupId: string,
): Promise<{
  backup_id: string;
  component: string;
  restored_version?: string;
}> {
  // Rust 命令返回 SuccessResponse，此处适配为兼容返回格式
  await tauriInvoke("restore_backup", { instanceId, backupId });
  return { backup_id: backupId, component: "" };
}

/**
 * 获取更新历史记录
 */
export async function getUpdateHistory(
  instanceId: string,
  component?: string,
  limit: number = 20,
): Promise<UpdateHistory[]> {
  return tauriInvoke<UpdateHistory[]>("get_update_history", {
    instanceId,
    component: component ?? null,
    limit,
  });
}

/**
 * 获取组件的 Release 历史列表
 */
export async function getComponentReleases(
  component: string,
  limit: number = 10,
): Promise<Release[]> {
  return tauriInvoke<Release[]>("get_component_releases", { component, limit });
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 获取组件显示名称
 */
export function getComponentDisplayName(component: string): string {
  const names: Record<string, string> = {
    MaiBot: "MaiBot",
    NapCat: "NapCat",
    "MaiBot-Napcat-Adapter": "Adapter",
  };
  return names[component] || component;
}
