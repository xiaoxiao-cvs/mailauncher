import type { Layout, ResponsiveLayouts } from "react-grid-layout";

import { WIDGET_REGISTRY } from "@/pages/home/widgets/registry";
import type {
  MetricKey,
  WidgetInstance,
  WidgetKind,
  WidgetSize,
} from "@/pages/home/widgets/types";

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

/** 持久化布局所覆盖的断点(xs 由 RGL 从 sm 自动派生,不显式存)。 */
type SeededBreakpoint = "lg" | "md" | "sm";

/** 一个尺寸槽在某断点的网格占位(w/h 单元数);minW/minH 锁定为同值(自由 resize 已关,仅作守卫)。 */
interface SizeCell {
  w: number;
  h: number;
}

/**
 * 离散尺寸 S/M/L 在各断点的网格占位预设(取代 RGL 自由缩放)。
 *
 * 高度按 ROW_HEIGHT=88 + GRID_MARGIN.y=12 推算实际像素(h 行 → h*88 + (h-1)*12),调到内容不挤不空:
 * - S=2x2 → 188px:stat 单读数 / instances·queue 状态点串折叠态正好,不空。
 * - M=4x3 → 288px(P5:从 h2=188 调高):支持档为 [m,l] 的富卡(kpi/hero/models/byInstance/
 *   requestTypes 等)折叠态多为 2x2 象限或带走势图,h2 时象限只 ~78px 偏挤;h3 后象限 ~130px,
 *   与既有蓝图里这些卡的呼吸感对齐。stat 在 M 仅垂直居中留白、不显空,且 stat 默认档为 S。
 * - L=6x4 → 388px(P5:从 h3=288 调高):对齐系统卡蓝图 h4(进程表/分区表自适应行数铺满更从容)。
 * md(8 列)同档高;sm(4 列)整列竖叠,L 宽不超 4 列。
 */
export const SIZE_PRESETS: Record<
  WidgetSize,
  Record<SeededBreakpoint, SizeCell>
> = {
  s: {
    lg: { w: 2, h: 2 },
    md: { w: 2, h: 2 },
    sm: { w: 2, h: 2 },
  },
  m: {
    lg: { w: 4, h: 3 },
    md: { w: 4, h: 3 },
    sm: { w: 4, h: 3 },
  },
  l: {
    lg: { w: 6, h: 4 },
    md: { w: 6, h: 4 },
    sm: { w: 4, h: 4 },
  },
};

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

/** 持久化整份配置(组件集 + 布局)。增删 / 改尺寸均经此整体写回。 */
function saveConfig(config: HomeConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** 本配置覆盖的断点序(派生自 SIZE_PRESETS.s 的键,单一来源避免漏断点)。 */
const SEEDED_BREAKPOINTS = Object.keys(SIZE_PRESETS.s) as SeededBreakpoint[];

/** 某断点布局里"追加到末尾"的 y(取最底卡的 y+h;空布局为 0)。 */
function nextRow(items: Layout): number {
  return items.reduce((max, it) => Math.max(max, it.y + it.h), 0);
}

/** 按尺寸预设为某 uid 在某断点构造一个布局项(放在该断点末尾整行起始)。 */
function presetItem(
  uid: string,
  size: WidgetSize,
  bp: SeededBreakpoint,
  y: number,
) {
  const cell = SIZE_PRESETS[size][bp];
  return {
    i: uid,
    x: 0,
    y,
    w: cell.w,
    h: cell.h,
    minW: cell.w,
    minH: cell.h,
  };
}

/** 生成一个新组件实例 uid(允许同 kind 多个,如多张 stat)。 */
function newUid(kind: WidgetKind): string {
  return `${kind}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * 添加一个组件:分配 uid、取注册表默认尺寸,按尺寸预设追加到各断点布局末尾,整体写回。
 * 返回更新后的配置(HomeView 据此换 seedKey 重挂网格)。
 */
export function addWidget(kind: WidgetKind, metric?: MetricKey): HomeConfig {
  const current = loadConfig();
  const size = WIDGET_REGISTRY[kind].defaultSize;
  const uid = newUid(kind);
  const widget: WidgetInstance = { uid, kind, size, metric };

  const layouts: ResponsiveLayouts = { ...current.layouts };
  for (const bp of SEEDED_BREAKPOINTS) {
    const items = current.layouts[bp] ?? [];
    layouts[bp] = [...items, presetItem(uid, size, bp, nextRow(items))];
  }

  const next: HomeConfig = { widgets: [...current.widgets, widget], layouts };
  saveConfig(next);
  return next;
}

/** 删除一个组件:从组件集与各断点布局移除该 uid,整体写回。返回更新后的配置。 */
export function removeWidget(uid: string): HomeConfig {
  const current = loadConfig();
  const layouts: ResponsiveLayouts = { ...current.layouts };
  for (const bp of SEEDED_BREAKPOINTS) {
    const items = current.layouts[bp];
    if (items) layouts[bp] = items.filter((it) => it.i !== uid);
  }
  const next: HomeConfig = {
    widgets: current.widgets.filter((w) => w.uid !== uid),
    layouts,
  };
  saveConfig(next);
  return next;
}

/**
 * 切换某组件尺寸:更新组件 size + 按预设改各断点该 uid 的 w/h(位置 x/y 保留,重挂后 RGL 解碰撞)。
 * 返回更新后的配置。
 */
export function setWidgetSize(uid: string, size: WidgetSize): HomeConfig {
  const current = loadConfig();
  const layouts: ResponsiveLayouts = { ...current.layouts };
  for (const bp of SEEDED_BREAKPOINTS) {
    const items = current.layouts[bp];
    if (!items) continue;
    const cell = SIZE_PRESETS[size][bp];
    layouts[bp] = items.map((it) =>
      it.i === uid
        ? { ...it, w: cell.w, h: cell.h, minW: cell.w, minH: cell.h }
        : it,
    );
  }
  const next: HomeConfig = {
    widgets: current.widgets.map((w) => (w.uid === uid ? { ...w, size } : w)),
    layouts,
  };
  saveConfig(next);
  return next;
}
