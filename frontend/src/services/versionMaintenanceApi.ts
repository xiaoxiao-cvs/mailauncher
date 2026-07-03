/**
 * 版本维护类 API —— 依赖重装 / 历史 commit 回滚 / 手动备份 / 重置实例数据。
 *
 * 独立于 versionApi.ts 单独成文件：这几个能力（P1-13 / P2-19 / P2-20 / P2-23 / P2-26）
 * 全部落在同一批次改动里，单独成文件避免与既有版本管理主链路文件产生并发编辑冲突；
 * 待后续统一整理时可考虑并入 versionApi.ts / useVersionQueries.ts。
 *
 * 事件日志的实时订阅由调用方（组件）用 `useTransportEvent` 完成，本文件只负责发起 invoke。
 */
import { tauriInvoke } from "@/services/tauriInvoke";

/**
 * 单条 git 提交摘要 —— 与 Rust `ComponentCommitInfo`(services/version_service.rs)
 * 逐字段一致（该结构体标了 `#[serde(rename_all = "camelCase")]`）。
 */
export interface ComponentCommitInfo {
  /** 完整 commit hash */
  hash: string;
  /** 短 hash（7 位） */
  shortHash: string;
  /** 提交说明首行 */
  subject: string;
  /** 提交时间（含时区） */
  date: string;
}

/**
 * 重装实例依赖（P2-19）：删除并重建虚拟环境，逐组件重新安装 requirements.txt。
 *
 * 实时日志经 `reinstall-deps-log-{instanceId}` 事件推送，调用方自行用
 * `useTransportEvent` 订阅（事件名需与本函数的 instanceId 拼接规则一致）。
 */
export async function reinstallInstanceDependencies(
  instanceId: string,
  pythonPath?: string,
): Promise<void> {
  await tauriInvoke("reinstall_instance_dependencies", {
    instanceId,
    pythonPath: pythonPath ?? null,
  });
}

/**
 * 列出组件仓库本地可见的历史提交（P2-23），供前端选择回滚目标。
 *
 * 只读。注意组件仓库为 `git clone --depth 1` 浅克隆，历史随后续更新逐步累积，
 * 并非完整远程历史。
 */
export async function listComponentCommits(
  instanceId: string,
  component: string,
  limit: number = 30,
): Promise<ComponentCommitInfo[]> {
  return tauriInvoke<ComponentCommitInfo[]>("list_component_commits", {
    instanceId,
    component,
    limit,
  });
}

/**
 * 回滚组件到指定历史 commit（P2-23）。
 *
 * 直接调用 `update_component` 命令并显式传 `targetVersion`，绕过 versionApi.ts 的
 * `updateComponent`（其当前实现未透传 targetVersion 参数，仅支持更新到最新）。
 * 更新日志复用与常规更新相同的 `update-log-{instanceId}-{component}` 事件。
 */
export async function rollbackComponent(
  instanceId: string,
  component: string,
  targetCommit: string,
): Promise<void> {
  await tauriInvoke("update_component", {
    instanceId,
    component,
    createBackup: true,
    targetVersion: targetCommit,
  });
}

/**
 * 立即手动备份组件的 config/data（P2-26），`manualbak_` 前缀，不受自动裁剪影响。
 *
 * 返回备份 id；组件目录下既无 config 也无 data 时返回 `undefined`。
 */
export async function createManualBackup(
  instanceId: string,
  component: string,
): Promise<string | undefined> {
  const backupId = await tauriInvoke<string | null>("create_manual_backup", {
    instanceId,
    component,
  });
  return backupId ?? undefined;
}

/**
 * 重置实例数据（P1-13）：要求实例已停止，清空 `MaiBot/data` 目录（保留 `webui.json`），
 * 不动配置 / 代码 / 实例记录。
 */
export async function resetInstanceData(instanceId: string): Promise<void> {
  await tauriInvoke("reset_instance_data", { instanceId });
}

/**
 * MaiBot/data 单个数据类别的占用统计（G8-3）—— 与 Rust `MaiBotDataCategory`
 * （services/maibot_data_service.rs，标了 `#[serde(rename_all = "camelCase")]`）逐字段一致。
 */
export interface MaiBotDataCategory {
  /** 类别 id（稳定标识，clearMaiBotDataCategory 的 category 入参） */
  id: string;
  /** 类别中文显示名 */
  displayName: string;
  /** 类别说明 */
  description: string;
  /** 是否允许清理（false 仅展示占用） */
  cleanable: boolean;
  /** 该类别占用字节数 */
  sizeBytes: number;
  /** 该类别文件数（递归，不含目录本身） */
  fileCount: number;
}

/** 实例 MaiBot/data 的分类占用快照（G8-3）。 */
export interface MaiBotDataStats {
  instanceId: string;
  /** MaiBot/data 绝对路径 */
  dataDir: string;
  /** data 目录是否存在（实例从未运行时为 false，各类别均 0） */
  dataDirExists: boolean;
  totalSizeBytes: number;
  totalFileCount: number;
  /** 扫描时刻（本地 ISO 字符串） */
  scannedAt: string;
  categories: MaiBotDataCategory[];
}

/** 清理某类别的结果（G8-3）。 */
export interface ClearDataResult {
  /** 被清理的类别 id */
  category: string;
  /** 释放的字节数 */
  removedBytes: number;
  /** 实际删除的顶层条目名 */
  removedEntries: string[];
  /** 清理完成时刻（本地 ISO 字符串） */
  clearedAt: string;
}

/** 获取实例 MaiBot/data 的分类占用统计（G8-3，只读）。 */
export async function getMaiBotDataStats(
  instanceId: string,
): Promise<MaiBotDataStats> {
  return tauriInvoke<MaiBotDataStats>("get_maibot_data_stats", { instanceId });
}

/**
 * 清空指定类别的 MaiBot/data 数据（G8-3，危险操作）。
 *
 * 后端强制要求实例已停止，且仅 cleanable 类别可清（images/emoji/temp/html_imgs）；
 * 未停机 / 类别不可清 / 未知类别均会抛错。调用方须先用 useConfirm 二次确认。
 */
export async function clearMaiBotDataCategory(
  instanceId: string,
  category: string,
): Promise<ClearDataResult> {
  return tauriInvoke<ClearDataResult>("clear_maibot_data_category", {
    instanceId,
    category,
  });
}
