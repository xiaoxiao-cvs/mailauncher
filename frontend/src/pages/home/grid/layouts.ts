import type { Layout, ResponsiveLayouts } from "react-grid-layout";

import { WIDGET_REGISTRY } from "@/pages/home/widgets/registry";
import type { WidgetInstance, WidgetKind } from "@/pages/home/widgets/types";

/**
 * 首页 bento 网格的布局蓝图 + 小组件配置 —— 单一数据源(壳/芯分离的"壳"侧)。
 *
 * 卡片放置由这里的 LayoutItem(x/y/w/h 以网格单元计)决定,HomeGrid 喂给 react-grid-layout 的
 * Responsive;渲染哪些卡由 WidgetInstance[] 决定(uid 为 RGL layout 键)。P1 默认每种 kind 一个
 * 实例、uid 直接用 kind 值,故默认 layouts 可沿用既有蓝图(其 i 即 kind=uid),外观零变化。
 * 用户在编辑模式拖/缩后的布局持久化到 localStorage,"恢复默认"即回到本蓝图与默认组件集。
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

/** 持久化键;结构变更时升版以弃旧缓存(v9:从纯 layouts 升为 { widgets, layouts } 组件配置)。 */
export const STORAGE_KEY = "mailauncher.home.v9";

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

/**
 * 默认组件序(等同 LG 蓝图的卡序),决定首屏渲染顺序;每种 kind 一个实例,uid 直接用 kind。
 * 与 DEFAULT_LAYOUTS 的 i 一一对应,保证默认外观与现状一致。
 */
const DEFAULT_WIDGET_ORDER: WidgetKind[] = LG.map(
  (item) => item.i as WidgetKind,
);

/** 默认组件集:每种 kind 一个实例,uid=kind,尺寸取注册表 defaultSize。 */
export const DEFAULT_WIDGETS: WidgetInstance[] = DEFAULT_WIDGET_ORDER.map(
  (kind) => ({
    uid: kind,
    kind,
    size: WIDGET_REGISTRY[kind].defaultSize,
  }),
);

/** 首页持久化对象:组件集 + 布局。布局按 uid 键(默认 uid=kind,沿用既有蓝图)。 */
export interface HomeConfig {
  widgets: WidgetInstance[];
  layouts: ResponsiveLayouts;
}

export const DEFAULT_CONFIG: HomeConfig = {
  widgets: DEFAULT_WIDGETS,
  layouts: DEFAULT_LAYOUTS,
};

/** 读取持久化配置;无缓存或缓存损坏则回退默认(损坏时保留诊断,不静默)。 */
export function loadConfig(): HomeConfig {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(raw) as Partial<HomeConfig>;
    return {
      widgets: parsed.widgets ?? DEFAULT_WIDGETS,
      layouts: parsed.layouts ?? DEFAULT_LAYOUTS,
    };
  } catch (e) {
    console.warn("[home-grid] 首页配置缓存解析失败,回退默认配置", e);
    return DEFAULT_CONFIG;
  }
}

/** 读取持久化的组件集(渲染哪些卡)。 */
export function loadWidgets(): WidgetInstance[] {
  return loadConfig().widgets;
}

/** 读取持久化的布局(仅作 RGL 种子;见 HomeView 注释:不回灌)。 */
export function loadLayouts(): ResponsiveLayouts {
  return loadConfig().layouts;
}

/** 仅持久化布局变更,保留已存组件集(P1 组件集恒为默认)。 */
export function saveLayouts(layouts: ResponsiveLayouts): void {
  const current = loadConfig();
  const next: HomeConfig = { widgets: current.widgets, layouts };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** 恢复默认:清缓存,下次读取回退默认配置(HomeView 用换 key 重挂触发重读)。 */
export function clearLayouts(): void {
  localStorage.removeItem(STORAGE_KEY);
}
