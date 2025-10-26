import { inject } from "vue";

/**
 * 获取事件总线
 * @returns 事件总线实例
 */
export function useEventBus() {
  const emitter = inject("emitter");

  if (!emitter) {
    console.warn("事件总线未注入，确保在主应用中提供了emitter");
    return null;
  }

  return emitter;
}
