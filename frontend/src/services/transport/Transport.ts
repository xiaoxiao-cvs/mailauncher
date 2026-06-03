/**
 * 传输抽象层契约
 *
 * 业务层（services / hooks / 组件）只依赖此接口，不直接 import @tauri-apps。
 * 当前由 TauriTransport 实现；未来 Web 版 WebUI 可提供 HttpTransport（HTTP + WS）。
 *
 * 设计要点：
 * - invoke / listen 的签名镜像 Tauri 契约，使现有调用零改动迁移。
 * - listen 返回 unlisten 函数（而非订阅对象），与 Tauri 的 UnlistenFn 一致。
 * - listen 的 handler 接收的是「裸 payload」而非事件包装对象，屏蔽底层差异。
 */
export interface Transport {
  /**
   * 调用后端命令并返回结果。
   *
   * @param command - 命令名（如 "get_all_instances"）
   * @param args - 传给命令的参数对象（键名与后端参数名匹配）
   * @returns 命令的返回值
   * @throws Error 当命令失败时（错误已归一化为 Error）
   */
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;

  /**
   * 订阅后端事件。
   *
   * @param event - 事件名
   * @param handler - 收到事件时调用，参数为事件载荷
   * @returns 解除订阅的函数（unlisten）
   */
  listen<T>(event: string, handler: (payload: T) => void): Promise<() => void>;
}
