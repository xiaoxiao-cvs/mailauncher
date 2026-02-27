/**
 * Tauri Invoke 工具封装
 *
 * 提供统一的 invoke 调用接口，替换原有的 HTTP apiJson/apiText。
 * Rust 命令直接返回数据（无 {success, data} 包装），错误通过 reject 抛出。
 */
import { invoke } from '@tauri-apps/api/core'

/**
 * 调用 Tauri 命令并返回结果
 *
 * @param command - Rust 命令名（如 "get_all_instances"）
 * @param args - 传给 Rust 命令的参数对象（键名需与 Rust 参数名匹配，使用 snake_case）
 * @returns Rust 命令的返回值
 * @throws Error 当 Rust 命令返回 Err 时
 *
 * @example
 * ```ts
 * const instances = await tauriInvoke<InstanceList>('get_all_instances')
 * const instance = await tauriInvoke<Instance>('get_instance', { instanceId: 'abc' })
 * ```
 */
export async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    const result = await invoke<T>(command, args)
    return result
  } catch (error) {
    // Tauri 的 invoke 错误可能是字符串或对象
    const message = typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : JSON.stringify(error)
    console.error(`[Tauri Command Error] ${command}:`, message)
    throw new Error(message)
  }
}
