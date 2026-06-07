/**
 * 下载/安装任务相关的 React Query hooks
 *
 * 下载任务为内存态(后端不持久化,启动器重启即清空),故轮询拉取全量列表即可,
 * 不做缓存失效编排;空列表是正常状态(无在进行/历史任务)。
 */

import { useQuery } from "@tanstack/react-query";

import { tauriInvoke } from "@/services/tauriInvoke";

// ==================== Types ====================

/**
 * 下载任务状态。与后端 Rust `DownloadStatus`(serde snake_case)一一对应。
 * 进行中 = Pending/Downloading/Installing/Configuring;终态 = Completed/Failed/Cancelled。
 */
export type DownloadStatus =
  | "pending"
  | "downloading"
  | "installing"
  | "configuring"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * 下载进度。对应后端 `DownloadProgress`(默认 serde 命名,字段即 Rust 字段名)。
 * 注意百分比字段名为 `progress`(0-100 的 f64),非 `percentage`。
 */
export interface DownloadProgress {
  task_id: string;
  status: DownloadStatus;
  /** 已下载字节数 */
  downloaded: number;
  /** 总字节数(可能未知) */
  total: number | null;
  /** 下载速度(字节/秒) */
  speed: number;
  /** 进度百分比(0-100) */
  progress: number;
  /** 当前步骤描述 */
  message: string | null;
  /** 错误信息 */
  error: string | null;
}

/**
 * 下载任务详情。对应后端 `DownloadTask`(默认 serde 命名)。
 * 仅声明卡片实际消费的字段;其余建任务用字段(deployment_path 等)未消费故不列,避免臆造。
 */
export interface DownloadTask {
  /** 任务 ID(格式 download_xxxxxxxxxxxx) */
  id: string;
  instance_name: string;
  status: DownloadStatus;
  progress: DownloadProgress;
  /** 任务级错误信息(与 progress.error 可能并存,优先展示任务级) */
  error_message: string | null;
  /** 任务完成后填入的实例 ID */
  instance_id: string | null;
}

// ==================== Queries ====================

/**
 * 获取全部下载任务(内存态全量)。
 * refetchInterval 2s 与后端进度推送节奏匹配;staleTime 1s 抑制窗口聚焦等抖动重拉。
 */
export function useDownloadTasksQuery() {
  return useQuery({
    queryKey: ["download", "tasks"] as const,
    queryFn: () => tauriInvoke<DownloadTask[]>("get_all_download_tasks"),
    refetchInterval: 2000,
    staleTime: 1000,
  });
}
