/**
 * Tauri 传输实现
 *
 * 用 @tauri-apps/api 的 invoke / listen 实现 Transport 契约。
 * invoke 的错误归一化逻辑由原 tauriInvoke.ts 迁移至此，作为统一边界。
 */
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Transport } from "./Transport";

export class TauriTransport implements Transport {
  async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    try {
      return await invoke<T>(command, args);
    } catch (error) {
      // Tauri 的 invoke 错误可能是字符串或对象，统一归一化为 Error
      const message =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : JSON.stringify(error);
      console.error(`[Tauri Command Error] ${command}:`, message);
      throw new Error(message);
    }
  }

  async listen<T>(
    event: string,
    handler: (payload: T) => void,
  ): Promise<() => void> {
    // Tauri 的 listen 回调收到 Event<T> 包装对象，向业务层只暴露裸 payload
    return listen<T>(event, (e) => handler(e.payload));
  }
}
