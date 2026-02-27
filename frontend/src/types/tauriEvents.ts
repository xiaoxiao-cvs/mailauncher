/**
 * Tauri 事件载荷类型定义
 *
 * 对应 Rust 后端通过 app.emit() 发送的事件。
 * 事件名格式：`{category}-{type}-{id}`
 */

// ==================== 终端输出事件 ====================

/**
 * 终端输出事件
 * 事件名: `terminal-output-{instanceId}_{component}`
 *
 * Rust 端通过 `spawn_output_reader` 推送 PTY 输出
 */
export type TerminalOutputPayload = string

// ==================== 下载任务事件 ====================

/**
 * 下载日志事件
 * 事件名: `download-log-{taskId}`
 *
 * Rust 端在下载/安装流程中推送日志消息
 */
export type DownloadLogPayload = string

/**
 * 下载状态事件
 * 事件名: `download-status-{taskId}`
 *
 * Rust 端在状态变更时推送（如 downloading → installing → completed）
 */
export type DownloadStatusPayload = string

/**
 * 下载进度事件（结构化）
 * 事件名: `download-progress-{taskId}`
 *
 * Rust 端在进度更新时推送百分比、当前步骤等信息
 */
export interface DownloadProgressPayload {
  /** 当前百分比 0-100 */
  percentage: number
  /** 进度描述消息 */
  message: string
  /** 当前状态（downloading / installing / configuring） */
  status: string
}

// ==================== 实例状态变化事件 ====================

/**
 * 实例状态变化事件
 * 事件名: `instance-status-changed`
 *
 * 全局广播，用于更新实例列表状态
 */
export interface InstanceStatusChangedPayload {
  instanceId: string
  status: string
}

// ==================== 事件名构造工具 ====================

/** 构造终端输出事件名 */
export function terminalOutputEvent(instanceId: string, component: string): string {
  return `terminal-output-${instanceId}_${component}`
}

/** 构造下载日志事件名 */
export function downloadLogEvent(taskId: string): string {
  return `download-log-${taskId}`
}

/** 构造下载状态事件名 */
export function downloadStatusEvent(taskId: string): string {
  return `download-status-${taskId}`
}

/** 构造下载进度事件名 */
export function downloadProgressEvent(taskId: string): string {
  return `download-progress-${taskId}`
}
