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
