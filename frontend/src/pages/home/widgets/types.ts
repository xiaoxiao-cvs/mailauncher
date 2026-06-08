/**
 * 首页小组件系统的数据模型 —— 纯类型 / 常量(无组件导出)。
 *
 * 把首页从"15 张写死用途的卡"演进为"手机小组件式系统":组件 = 离散尺寸槽 + 可换数据源。
 * P1 仅落地数据模型与按 WidgetInstance 渲染的地基,外观与现状一致;尺寸切换 / 通用 stat 小卡 /
 * 增删画廊在 P2,backups/env 与五缺口在 P4(见 docs/home-widget-redesign.md)。
 */

/** 离散尺寸槽:小 / 中 / 大(取代 RGL 自由缩放,P2 起生效)。 */
export type WidgetSize = "s" | "m" | "l";

/**
 * 组件种类。stat = 通用指标小卡(P2 起,metric 决定显示哪个标量);其余为 develop 上既有的
 * 15 种富卡。backups/env 在 P4 接入,届时再补入本联合。
 */
export type WidgetKind =
  | "stat"
  | "system"
  | "hero"
  | "kpi"
  | "instances"
  | "models"
  | "queue"
  | "byInstance"
  | "requestTypes"
  | "downloads"
  | "launcher"
  | "schedules"
  | "network"
  | "version"
  | "logs"
  | "health";

/**
 * 通用 stat 小卡可选的标量指标键(kind="stat" 用 metric 决定显示哪个标量)。
 * 除 errors 外均可从首页集中取的 overview/summary 读出(见 widgets/StatWidget 的 METRIC_READERS);
 * errors 需 get_recent_errors(不在集中数据里),留待 P4 补齐数据缺口后再纳入画廊可选项。
 */
export type MetricKey =
  | "cost"
  | "replies"
  | "tokens"
  | "avgResponse"
  | "totalMessages"
  | "totalRequests"
  | "onlineTime"
  | "running"
  | "errors";

/** 一个首页组件实例。允许同 kind 多实例(如多张 stat),故 uid 与 kind 解耦。 */
export interface WidgetInstance {
  /** 实例唯一 id;RGL layout 按此键定位。P1 默认每种 kind 一个实例,uid 直接用 kind 值。 */
  uid: string;
  kind: WidgetKind;
  size: WidgetSize;
  /** 仅 kind="stat" 用:决定显示哪个标量。 */
  metric?: MetricKey;
}
