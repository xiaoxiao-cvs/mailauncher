import type { Layout, ResponsiveLayouts } from "react-grid-layout";

/**
 * 首页 bento 网格的布局蓝图 —— 单一数据源(壳/芯分离的"壳"侧)。
 *
 * 卡片放置全部由这里的 LayoutItem(x/y/w/h 以网格单元计)决定,HomeGrid 喂给
 * react-grid-layout 的 Responsive。用户在编辑模式拖/缩后的布局持久化到 localStorage,
 * "恢复默认"即回到本蓝图。新增卡片在此登记一项即可(三档断点各给一个落位)。
 */

/** 全部首页卡片 id(蓝图与渲染共用的稳定键)。 */
export type CardId =
  | "system"
  | "hero"
  | "kpi"
  | "models"
  | "queue"
  | "small"
  | "instances"
  | "byInstance"
  | "requestTypes"
  | "downloads"
  | "launcher"
  | "schedules"
  | "network"
  | "version"
  | "logs"
  | "health";

/** 断点 → 触发的最小容器宽(px);取 width >= 阈值 的最大断点。 */
export const BREAKPOINTS = { lg: 1200, md: 860, sm: 620, xs: 0 } as const;
/** 各断点列数。 */
export const COLS = { lg: 12, md: 8, sm: 4, xs: 2 } as const;
/** 单行高(px):88 是不挤的基线(系统卡 h4≈388、摘要卡 h2≈188 内容都放得开)。
   摘要卡偏空不靠压全局行高治(会把内容挤撞,见 v7 教训),改由各卡内容自适应填满。 */
export const ROW_HEIGHT = 88;
/** 卡片间距 [x, y] px。 */
export const GRID_MARGIN: [number, number] = [12, 12];
/** 容器内边距 [x, y] px(画布外层已给留白,这里置 0 避免双重)。 */
export const CONTAINER_PADDING: [number, number] = [0, 0];

/** 持久化键;蓝图结构变更时升版以弃旧缓存(v8:行高退回 88 解决拥挤)。 */
export const STORAGE_KEY = "mailauncher.home.layouts.v8";

// lg(12 列):系统卡为 h4 主展;其余多为 h2 贴合摘要(详情自适应行数),byInstance/请求类型 h3 容表格。
const LG: Layout = [
  { i: "system", x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
  { i: "hero", x: 4, y: 0, w: 8, h: 2, minW: 3, minH: 2 },
  { i: "kpi", x: 4, y: 2, w: 8, h: 2, minW: 3, minH: 2 },
  { i: "instances", x: 0, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
  { i: "models", x: 4, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
  { i: "queue", x: 8, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "byInstance", x: 0, y: 6, w: 8, h: 3, minW: 3, minH: 2 },
  { i: "requestTypes", x: 8, y: 6, w: 4, h: 3, minW: 3, minH: 2 },
  { i: "downloads", x: 0, y: 9, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "launcher", x: 3, y: 9, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "schedules", x: 6, y: 9, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "network", x: 9, y: 9, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "version", x: 0, y: 11, w: 4, h: 2, minW: 3, minH: 2 },
  { i: "logs", x: 4, y: 11, w: 4, h: 2, minW: 3, minH: 2 },
  { i: "health", x: 8, y: 11, w: 4, h: 2, minW: 3, minH: 2 },
];

// md(8 列)。
const MD: Layout = [
  { i: "system", x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
  { i: "hero", x: 4, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
  { i: "kpi", x: 4, y: 2, w: 4, h: 2, minW: 3, minH: 2 },
  { i: "instances", x: 0, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
  { i: "models", x: 4, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
  { i: "queue", x: 0, y: 6, w: 8, h: 2, minW: 2, minH: 2 },
  { i: "byInstance", x: 0, y: 8, w: 8, h: 3, minW: 3, minH: 2 },
  { i: "requestTypes", x: 0, y: 11, w: 8, h: 2, minW: 3, minH: 2 },
  { i: "downloads", x: 0, y: 13, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "launcher", x: 4, y: 13, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "schedules", x: 0, y: 15, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "network", x: 4, y: 15, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "version", x: 0, y: 17, w: 4, h: 2, minW: 3, minH: 2 },
  { i: "logs", x: 4, y: 17, w: 4, h: 2, minW: 3, minH: 2 },
  { i: "health", x: 0, y: 19, w: 8, h: 2, minW: 3, minH: 2 },
];

// sm(4 列):整列竖叠。xs(2 列)由 RGL 从 sm 自动生成。
const SM: Layout = [
  { i: "system", x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 3 },
  { i: "hero", x: 0, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "kpi", x: 0, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "instances", x: 0, y: 8, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "models", x: 0, y: 10, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "queue", x: 0, y: 12, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "byInstance", x: 0, y: 14, w: 4, h: 3, minW: 2, minH: 2 },
  { i: "requestTypes", x: 0, y: 17, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "downloads", x: 0, y: 19, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "launcher", x: 0, y: 21, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "schedules", x: 0, y: 23, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "network", x: 0, y: 25, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "version", x: 0, y: 27, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "logs", x: 0, y: 29, w: 4, h: 2, minW: 2, minH: 2 },
  { i: "health", x: 0, y: 31, w: 4, h: 2, minW: 2, minH: 2 },
];

export const DEFAULT_LAYOUTS: ResponsiveLayouts = { lg: LG, md: MD, sm: SM };

/** 读取持久化布局;无缓存或缓存损坏则回退蓝图(损坏时保留诊断,不静默)。 */
export function loadLayouts(): ResponsiveLayouts {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_LAYOUTS;
  try {
    return JSON.parse(raw) as ResponsiveLayouts;
  } catch (e) {
    console.warn("[home-grid] 布局缓存解析失败,回退默认布局", e);
    return DEFAULT_LAYOUTS;
  }
}

export function saveLayouts(layouts: ResponsiveLayouts): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
}

export function clearLayouts(): void {
  localStorage.removeItem(STORAGE_KEY);
}
