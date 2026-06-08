import type { ReactNode } from "react";

import { SystemCard } from "@/pages/home/system/SystemCard";
import { MessageHeroCard } from "@/pages/home/cards/MessageHeroCard";
import { KpiCard } from "@/pages/home/cards/KpiCard";
import { InstancesCard } from "@/pages/home/cards/InstancesCard";
import { ModelDistributionCard } from "@/pages/home/cards/ModelDistributionCard";
import { MessageActivityCard } from "@/pages/home/cards/MessageActivityCard";
import { ByInstanceCard } from "@/pages/home/cards/ByInstanceCard";
import { RequestTypesCard } from "@/pages/home/cards/RequestTypesCard";
import { DownloadsCard } from "@/pages/home/cards/DownloadsCard";
import { LauncherUpdateCard } from "@/pages/home/cards/LauncherUpdateCard";
import { SchedulesCard } from "@/pages/home/cards/SchedulesCard";
import { NetworkSourceCard } from "@/pages/home/cards/NetworkSourceCard";
import { VersionCard } from "@/pages/home/cards/VersionCard";
import { LogsCard } from "@/pages/home/cards/LogsCard";
import { HealthCard } from "@/pages/home/cards/HealthCard";
import { BackupsCard } from "@/pages/home/cards/BackupsCard";
import { EnvCard } from "@/pages/home/cards/EnvCard";
import { StatWidget } from "@/pages/home/widgets/StatWidget";

import type {
  ModelStats,
  StatsSummary,
  InstanceStats,
} from "@/hooks/queries/useStatsQueries";
import type { Instance } from "@/services/instanceApi";
import type { MessageQueueResponse } from "@/services/messageQueueApi";
import type { MetricKey, WidgetKind, WidgetSize } from "./types";

/**
 * 首页小组件注册表 —— kind 到"元信息 + 渲染"的单一映射。
 *
 * 壳/芯分离里这属于"芯"的索引:HomeView 集中取一次数据(单查询喂多卡,不放大 N+1),经
 * WidgetRenderContext 下发给 render;render 复用 develop 上既有的 15 张卡组件 + stat 通用小卡。
 * 重渲粒度由 HomeView 的 WidgetHost(memo,按 uid)控制,本表只声明"怎么渲染",不决定"何时重渲"。
 *
 * render 透传 size(P2 起 stat 按 size 调字号;富卡的密度适配留待 P2b)与 metric(仅 stat 用)。
 */

/** 富卡数据上下文:HomeView 集中取数后下发,供需要数据的卡渲染(自取数卡不读这些字段)。 */
export interface WidgetRenderContext {
  /** 经花费降序的头部模型(hero/kpi/models 共用)。 */
  sortedModels: ModelStats[];
  /** 统计概览原始 summary,缺数据时为 undefined(卡内自渲染占位)。 */
  summary: StatsSummary | undefined;
  runningInstances: number;
  totalInstances: number;
  instances: Instance[];
  byInstance: InstanceStats[];
  queues: MessageQueueResponse[];
  /** 英雄卡可选的每小时消息量历史序列;无则只展示总量(不编造序列)。 */
  messageHistory: number[] | undefined;
  /** 英雄卡可选的每小时回复量历史序列(与 messageHistory 同源等长);用于趋势图叠加回复对比线。 */
  replyHistory: number[] | undefined;
}

export interface WidgetDef {
  kind: WidgetKind;
  /** 画廊与编辑态展示名。 */
  title: string;
  /** Iconify 图标名(沿用 ph:*-thin 契约)。 */
  icon: string;
  /** 支持的离散尺寸(P2 起用于尺寸切换;P1 不读)。 */
  sizes: WidgetSize[];
  /** 默认尺寸。 */
  defaultSize: WidgetSize;
  /** stat 卡需选 metric:画廊"添加 stat 后选指标"用,富卡为 false。 */
  needsMetric?: boolean;
  /**
   * 渲染:复用既有卡组件;size 透传(P1 卡组件忽略 size,P2 起按 size 调密度)。
   * metric 仅 kind="stat" 用(决定显示哪个标量),富卡忽略。
   */
  render: (
    ctx: WidgetRenderContext,
    size: WidgetSize,
    metric?: MetricKey,
  ) => ReactNode;
}

export const WIDGET_REGISTRY: Record<WidgetKind, WidgetDef> = {
  stat: {
    kind: "stat",
    title: "指标小卡",
    icon: "ph:number-square-one-thin",
    sizes: ["s", "m"],
    defaultSize: "s",
    needsMetric: true,
    render: (ctx, size, metric) => (
      <StatWidget ctx={ctx} metric={metric} size={size} />
    ),
  },
  system: {
    kind: "system",
    title: "系统资源",
    icon: "ph:cpu-thin",
    sizes: ["m", "l"],
    defaultSize: "l",
    render: (_ctx, size) => <SystemCard size={size} />,
  },
  hero: {
    kind: "hero",
    title: "消息处理总量",
    icon: "ph:chat-circle-dots-thin",
    sizes: ["m", "l"],
    defaultSize: "m",
    render: (ctx, size) => (
      <MessageHeroCard
        summary={ctx.summary}
        history={ctx.messageHistory}
        replyHistory={ctx.replyHistory}
        size={size}
      />
    ),
  },
  kpi: {
    kind: "kpi",
    title: "KPI 概览",
    icon: "ph:gauge-thin",
    sizes: ["m", "l"],
    defaultSize: "m",
    render: (ctx, size) => (
      <KpiCard summary={ctx.summary} models={ctx.sortedModels} size={size} />
    ),
  },
  instances: {
    kind: "instances",
    title: "实例总览",
    icon: "ph:stack-thin",
    sizes: ["s", "m", "l"],
    defaultSize: "m",
    render: (ctx, size) => (
      <InstancesCard
        instances={ctx.instances}
        runningInstances={ctx.runningInstances}
        totalInstances={ctx.totalInstances}
        size={size}
      />
    ),
  },
  models: {
    kind: "models",
    title: "模型分布",
    icon: "ph:chart-pie-slice-thin",
    sizes: ["m", "l"],
    defaultSize: "m",
    render: (ctx, size) => (
      <ModelDistributionCard models={ctx.sortedModels} size={size} />
    ),
  },
  queue: {
    kind: "queue",
    title: "麦麦活动",
    icon: "ph:pulse-thin",
    sizes: ["s", "m", "l"],
    defaultSize: "m",
    render: (ctx, size) => (
      <MessageActivityCard queues={ctx.queues} size={size} />
    ),
  },
  byInstance: {
    kind: "byInstance",
    title: "按实例对比",
    icon: "ph:chart-bar-thin",
    sizes: ["m", "l"],
    defaultSize: "l",
    render: (ctx, size) => (
      <ByInstanceCard byInstance={ctx.byInstance} size={size} />
    ),
  },
  requestTypes: {
    kind: "requestTypes",
    title: "请求类型",
    icon: "ph:share-network-thin",
    sizes: ["m", "l"],
    defaultSize: "m",
    render: (ctx, size) => (
      <RequestTypesCard byInstance={ctx.byInstance} size={size} />
    ),
  },
  downloads: {
    kind: "downloads",
    title: "下载任务",
    icon: "ph:download-simple-thin",
    sizes: ["s", "m"],
    defaultSize: "m",
    render: (_ctx, size) => <DownloadsCard size={size} />,
  },
  launcher: {
    kind: "launcher",
    title: "启动器",
    icon: "ph:rocket-launch-thin",
    sizes: ["s", "m"],
    defaultSize: "m",
    render: (_ctx, size) => <LauncherUpdateCard size={size} />,
  },
  schedules: {
    kind: "schedules",
    title: "计划任务",
    icon: "ph:calendar-check-thin",
    sizes: ["s", "m"],
    defaultSize: "m",
    render: (_ctx, size) => <SchedulesCard size={size} />,
  },
  network: {
    kind: "network",
    title: "网络与源",
    icon: "ph:globe-simple-thin",
    sizes: ["s", "m"],
    defaultSize: "m",
    render: (_ctx, size) => <NetworkSourceCard size={size} />,
  },
  version: {
    kind: "version",
    title: "组件版本",
    icon: "ph:package-thin",
    sizes: ["m", "l"],
    defaultSize: "m",
    render: (_ctx, size) => <VersionCard size={size} />,
  },
  logs: {
    kind: "logs",
    title: "日志",
    icon: "ph:warning-octagon-thin",
    sizes: ["m", "l"],
    defaultSize: "m",
    render: (_ctx, size) => <LogsCard size={size} />,
  },
  health: {
    kind: "health",
    title: "看门狗",
    icon: "ph:heartbeat-thin",
    sizes: ["m", "l"],
    defaultSize: "m",
    render: (_ctx, size) => <HealthCard size={size} />,
  },
  backups: {
    kind: "backups",
    title: "备份",
    icon: "ph:archive-thin",
    sizes: ["m", "l"],
    defaultSize: "m",
    render: (_ctx, size) => <BackupsCard size={size} />,
  },
  env: {
    kind: "env",
    title: "环境就绪",
    icon: "ph:wrench-thin",
    sizes: ["m", "l"],
    defaultSize: "m",
    render: (_ctx, size) => <EnvCard size={size} />,
  },
};
