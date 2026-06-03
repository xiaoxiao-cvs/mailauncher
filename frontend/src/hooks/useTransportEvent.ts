/**
 * 传输事件订阅 Hook
 *
 * 封装 transport.listen 的订阅与清理，处理异步订阅与卸载之间的竞态：
 * - 订阅是异步的（返回 Promise<unlisten>），若组件在 Promise resolve 前卸载，
 *   需在 resolve 后立即调用 unlisten，避免泄漏与对已卸载组件触发回调。
 * - handler 用 ref 持有，使其变化不触发重新订阅（行为对齐常见事件 hook 约定）。
 */
import { useEffect, useRef } from "react";
import { transport } from "@/services/transport";

/**
 * 订阅一个传输层事件。
 *
 * @param event - 事件名；传 null 时不订阅（用于条件订阅）
 * @param handler - 事件载荷回调
 */
export function useTransportEvent<T>(
  event: string | null,
  handler: (payload: T) => void,
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!event) return;

    let cancelled = false;
    let unlisten: (() => void) | null = null;

    transport
      .listen<T>(event, (payload) => {
        if (cancelled) return;
        handlerRef.current(payload);
      })
      .then((fn) => {
        if (cancelled) {
          // 订阅完成时组件已卸载，立即解除
          fn();
        } else {
          unlisten = fn;
        }
      });

    return () => {
      cancelled = true;
      if (unlisten) {
        unlisten();
        unlisten = null;
      }
    };
  }, [event]);
}
