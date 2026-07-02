import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock @tauri-apps/api/core globally
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock @tauri-apps/api/event globally
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
  emit: vi.fn(),
}));

// jsdom 在本环境下的 localStorage 缺少可用的 clear() 等方法,补一个 Map 支撑的完整实现,
// 保证依赖 localStorage 的用例(如 useOnboardingState)行为确定、可 clear。
const __lsStore = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => (__lsStore.has(k) ? __lsStore.get(k)! : null),
  setItem: (k: string, v: string) => {
    __lsStore.set(k, String(v));
  },
  removeItem: (k: string) => {
    __lsStore.delete(k);
  },
  clear: () => {
    __lsStore.clear();
  },
  key: (i: number) => Array.from(__lsStore.keys())[i] ?? null,
  get length() {
    return __lsStore.size;
  },
});
