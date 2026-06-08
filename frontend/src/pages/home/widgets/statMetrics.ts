import {
  fmtCompact,
  fmtCost,
  fmtSeconds,
  fmtUptime,
} from "@/pages/home/cards/format";
import type { MetricKey } from "@/pages/home/widgets/types";
import type { WidgetRenderContext } from "@/pages/home/widgets/registry";

/**
 * 通用指标小卡(stat)的取数与格式化映射 —— 纯数据/纯函数(无组件导出)。
 *
 * 与 StatWidget 组件分离:满足 react-refresh(组件文件只导出组件),并让 metric -> 取数规则可被
 * 画廊(WidgetGallery 列指标)与组件(StatWidget 渲染)共用同一份真理来源。
 */

/** 一个指标的取数与呈现规则。read/sub 从集中取的 ctx 读标量并格式化;数据缺失返回 null(不编造 0)。 */
export interface MetricReader {
  icon: string;
  label: string;
  read: (ctx: WidgetRenderContext) => string | null;
  sub: (ctx: WidgetRenderContext) => string | null;
}

/**
 * metric -> 取数与格式化映射。仅覆盖可从集中数据(overview/summary + 实例计数)读出的标量;
 * errors 需 get_recent_errors(不在 ctx 内),留待 P4,故此处无 errors 条目、画廊也不列 errors。
 */
export const METRIC_READERS: Partial<Record<MetricKey, MetricReader>> = {
  cost: {
    icon: "ph:currency-cny-thin",
    label: "总花费",
    read: (ctx) => (ctx.summary ? fmtCost(ctx.summary.total_cost) : null),
    sub: (ctx) =>
      ctx.summary ? `${fmtCost(ctx.summary.cost_per_hour)} / 小时` : null,
  },
  replies: {
    icon: "ph:arrow-bend-up-left-thin",
    label: "回复数",
    read: (ctx) => (ctx.summary ? fmtCompact(ctx.summary.total_replies) : null),
    sub: (ctx) =>
      ctx.summary ? `消息 ${fmtCompact(ctx.summary.total_messages)}` : null,
  },
  tokens: {
    icon: "ph:coins-thin",
    label: "Token 总量",
    read: (ctx) => (ctx.summary ? fmtCompact(ctx.summary.total_tokens) : null),
    sub: (ctx) =>
      ctx.summary ? `${fmtCompact(ctx.summary.tokens_per_hour)} / 小时` : null,
  },
  avgResponse: {
    icon: "ph:timer-thin",
    label: "平均响应",
    read: (ctx) =>
      ctx.summary ? fmtSeconds(ctx.summary.avg_response_time) : null,
    sub: (ctx) =>
      ctx.summary ? `总请求 ${fmtCompact(ctx.summary.total_requests)}` : null,
  },
  totalMessages: {
    icon: "ph:chat-circle-dots-thin",
    label: "消息总量",
    read: (ctx) =>
      ctx.summary ? fmtCompact(ctx.summary.total_messages) : null,
    sub: (ctx) =>
      ctx.summary ? `回复 ${fmtCompact(ctx.summary.total_replies)}` : null,
  },
  totalRequests: {
    icon: "ph:share-network-thin",
    label: "请求总量",
    read: (ctx) =>
      ctx.summary ? fmtCompact(ctx.summary.total_requests) : null,
    sub: (ctx) =>
      ctx.summary
        ? `${fmtCompact(ctx.summary.tokens_per_hour)} Token / 小时`
        : null,
  },
  onlineTime: {
    icon: "ph:clock-thin",
    label: "在线时长",
    read: (ctx) => (ctx.summary ? fmtUptime(ctx.summary.online_time) : null),
    sub: (ctx) =>
      ctx.summary
        ? `平均响应 ${fmtSeconds(ctx.summary.avg_response_time)}`
        : null,
  },
  running: {
    icon: "ph:stack-thin",
    label: "运行实例",
    read: (ctx) => `${ctx.runningInstances} / ${ctx.totalInstances}`,
    sub: (ctx) => `共 ${ctx.totalInstances} 个实例`,
  },
};

/** 画廊可选 metric 序(与 METRIC_READERS 同集合,稳定顺序);用于"添加 stat 后选指标"。 */
export const STAT_METRICS: MetricKey[] = [
  "cost",
  "replies",
  "tokens",
  "avgResponse",
  "totalMessages",
  "totalRequests",
  "onlineTime",
  "running",
];

/** 画廊展示 metric 名:复用 reader 的 label,无对应 reader 时回落 metric 键本身。 */
export function metricLabel(metric: MetricKey): string {
  return METRIC_READERS[metric]?.label ?? metric;
}

/** 画廊展示 metric 图标:复用 reader 的 icon(与该 metric 在卡上的实际图标一致),无 reader 时回落问号。 */
export function metricIcon(metric: MetricKey): string {
  return METRIC_READERS[metric]?.icon ?? "ph:question-thin";
}
