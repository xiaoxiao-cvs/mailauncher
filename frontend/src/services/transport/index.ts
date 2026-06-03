/**
 * 传输层单例入口
 *
 * 业务层统一从这里取 transport，不感知底层是 Tauri 还是 HTTP。
 *
 * 当前运行时仅 Tauri，故固定使用 TauriTransport。
 * 未来 Web 版 WebUI 时，可在此按 isTauri 分支返回 HttpTransport（HTTP/WS 实现），
 * 届时再新增 HttpTransport.ts，现在不建空壳文件。
 */
import type { Transport } from "./Transport";
import { TauriTransport } from "./TauriTransport";

/** 是否运行在 Tauri 宿主中（注入了内部桥接对象） */
export const isTauri = "__TAURI_INTERNALS__" in window;

export const transport: Transport = new TauriTransport();

export type { Transport } from "./Transport";
