import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Icon } from "@iconify/react";
import type { ResponsiveLayouts } from "react-grid-layout";

import { SegmentControl } from "@/components/ls";
import { springSoft } from "@/design/motion";
import type {
  StatsSummary,
  ModelStats,
  InstanceStats,
} from "@/hooks/queries/useStatsQueries";
import type { MessageQueueResponse } from "@/services/messageQueueApi";
import type { Instance } from "@/services/instanceApi";

import { HomeGrid, type HomeCard } from "@/pages/home/grid/HomeGrid";
import {
  loadLayouts,
  loadWidgets,
  saveLayouts,
  clearLayouts,
} from "@/pages/home/grid/layouts";
import { WIDGET_REGISTRY } from "@/pages/home/widgets/registry";
import type { WidgetRenderContext } from "@/pages/home/widgets/registry";
import type { WidgetKind } from "@/pages/home/widgets/types";

/**
 * 首页纯展示层 —— Living Surfaces 数据看板,签名 bento 卡矩阵。
 *
 * 按 WidgetInstance[] 渲染:每个组件实例的 uid 既是 React key 也是 RGL layout 键;渲染走
 * WIDGET_REGISTRY[kind].render,复用既有 15 张卡组件。每个 kind 的节点单独 memo、引用稳定:
 * 数据卡按各自数据切片(summary/instances/byInstance/queues 等)隔离重渲,自取数卡(system 每秒、
 * downloads 等)无数据依赖、memo([]) 仅建一次,绝不带动整页/整网格高频重渲。
 *
 * "编辑布局"开启后可拖拽并持久化,"恢复默认"用 seedKey 换 key 重挂回默认配置(见 grid/layouts.ts)。
 * 本层不含数据请求,数据与回调由容器 HomePage 注入(便于无 Tauri 也能 Preview)。
 */

const RANGES = ["24h", "7d", "30d"] as const;
export type HomeRange = (typeof RANGES)[number];

export interface HomeOverview {
  totalInstances: number;
  runningInstances: number;
  summary: StatsSummary | undefined;
  topModels: ModelStats[];
}

export interface HomeViewProps {
  /** 实例数 / 在线数 / 统计概览 / 头部模型,均来自 get_stats_overview。 */
  overview: HomeOverview;
  /** 全实例列表,用于实例总览卡(状态/资源/组件)。 */
  instances: Instance[];
  /** 按实例聚合统计(get_aggregated_stats.by_instance),喂按实例对比 / 请求类型分布两卡。 */
  byInstance: InstanceStats[];
  /** 全实例消息队列快照,用于麦麦活动卡与在途/已处理计数。 */
  queues: MessageQueueResponse[];
  /** 当前统计时间窗。 */
  range: HomeRange;
  onRangeChange: (range: HomeRange) => void;
  /**
   * 消息处理时间序列(可选)。后端统计概览目前不提供时间序列,故容器传 undefined,
   * 此时英雄卡只展示总量 + 单值,不渲染走势图(不编造序列数据);Preview 可传 mock 序列。
   */
  messageHistory?: number[];
}

/**
 * 渲染上下文的中性占位:供各卡按自身数据切片构造最小 ctx,未读到的字段取这些稳定缺省值。
 * 各卡 render 只读自己关心的切片(如 hero 只读 summary/messageHistory),故占位字段对结果无影响,
 * 仅用于满足 WidgetRenderContext 形状,使每个节点的 useMemo 仅依赖其真实数据切片、隔离重渲。
 */
const NEUTRAL_CTX: WidgetRenderContext = {
  sortedModels: [],
  summary: undefined,
  runningInstances: 0,
  totalInstances: 0,
  instances: [],
  byInstance: [],
  queues: [],
  messageHistory: undefined,
};

export function HomeView({
  overview,
  instances,
  byInstance,
  queues,
  range,
  onRangeChange,
  messageHistory,
}: HomeViewProps) {
  const { summary, topModels, runningInstances, totalInstances } = overview;

  // topModels 已由后端按花费排序;此处仅做一次防御性副本排序,避免依赖后端顺序假设。
  const sortedModels = useMemo(
    () => [...topModels].sort((a, b) => b.total_cost - a.total_cost),
    [topModels],
  );

  // 布局:layouts 仅作"种子"喂给 RGL(RGL 内部自管 layout state),onLayoutChange 只持久化、
  // 绝不 setState 回灌——回灌会触发重渲风暴,在"按下→移动 5px 阈值"窗口里 activeDrag 守卫尚未生效,
  // 内层 sync effect 会把刚起步的拖动重置回原位(表现为拖不动)。"恢复默认"用 seedKey 换 key 重挂
  // HomeGrid,以新种子重置 RGL,而非回灌 prop。组件集同样仅在 seedKey 变化时重读(P1 恒为默认)。
  const [editing, setEditing] = useState(false);
  const [seedKey, setSeedKey] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在 seedKey 变化时重读种子(读 localStorage)
  const layouts = useMemo<ResponsiveLayouts>(() => loadLayouts(), [seedKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在 seedKey 变化时重读组件集(读 localStorage)
  const widgets = useMemo(() => loadWidgets(), [seedKey]);
  const handleLayoutsChange = useCallback((next: ResponsiveLayouts) => {
    saveLayouts(next);
  }, []);
  const handleReset = useCallback(() => {
    clearLayouts();
    setSeedKey((k) => k + 1);
  }, []);

  // 各 kind 节点单独 memo:走注册表 render(复用既有卡组件),deps 取该卡真实数据切片;ctx 由
  // NEUTRAL_CTX 叠加切片即时构造,故节点仅在其切片变化时重建、引用稳定。自取数卡 ctx 无关、memo([]) 仅建一次。
  const systemNode = useMemo(
    () =>
      WIDGET_REGISTRY.system.render(
        NEUTRAL_CTX,
        WIDGET_REGISTRY.system.defaultSize,
      ),
    [],
  );
  const heroNode = useMemo(
    () =>
      WIDGET_REGISTRY.hero.render(
        { ...NEUTRAL_CTX, summary, messageHistory },
        WIDGET_REGISTRY.hero.defaultSize,
      ),
    [summary, messageHistory],
  );
  const kpiNode = useMemo(
    () =>
      WIDGET_REGISTRY.kpi.render(
        { ...NEUTRAL_CTX, summary, sortedModels },
        WIDGET_REGISTRY.kpi.defaultSize,
      ),
    [summary, sortedModels],
  );
  const instancesNode = useMemo(
    () =>
      WIDGET_REGISTRY.instances.render(
        { ...NEUTRAL_CTX, instances, runningInstances, totalInstances },
        WIDGET_REGISTRY.instances.defaultSize,
      ),
    [instances, runningInstances, totalInstances],
  );
  const modelsNode = useMemo(
    () =>
      WIDGET_REGISTRY.models.render(
        { ...NEUTRAL_CTX, sortedModels },
        WIDGET_REGISTRY.models.defaultSize,
      ),
    [sortedModels],
  );
  const queueNode = useMemo(
    () =>
      WIDGET_REGISTRY.queue.render(
        { ...NEUTRAL_CTX, queues },
        WIDGET_REGISTRY.queue.defaultSize,
      ),
    [queues],
  );
  const byInstanceNode = useMemo(
    () =>
      WIDGET_REGISTRY.byInstance.render(
        { ...NEUTRAL_CTX, byInstance },
        WIDGET_REGISTRY.byInstance.defaultSize,
      ),
    [byInstance],
  );
  const requestTypesNode = useMemo(
    () =>
      WIDGET_REGISTRY.requestTypes.render(
        { ...NEUTRAL_CTX, byInstance },
        WIDGET_REGISTRY.requestTypes.defaultSize,
      ),
    [byInstance],
  );
  const downloadsNode = useMemo(
    () =>
      WIDGET_REGISTRY.downloads.render(
        NEUTRAL_CTX,
        WIDGET_REGISTRY.downloads.defaultSize,
      ),
    [],
  );
  const launcherNode = useMemo(
    () =>
      WIDGET_REGISTRY.launcher.render(
        NEUTRAL_CTX,
        WIDGET_REGISTRY.launcher.defaultSize,
      ),
    [],
  );
  const schedulesNode = useMemo(
    () =>
      WIDGET_REGISTRY.schedules.render(
        NEUTRAL_CTX,
        WIDGET_REGISTRY.schedules.defaultSize,
      ),
    [],
  );
  const networkNode = useMemo(
    () =>
      WIDGET_REGISTRY.network.render(
        NEUTRAL_CTX,
        WIDGET_REGISTRY.network.defaultSize,
      ),
    [],
  );
  const versionNode = useMemo(
    () =>
      WIDGET_REGISTRY.version.render(
        NEUTRAL_CTX,
        WIDGET_REGISTRY.version.defaultSize,
      ),
    [],
  );
  const logsNode = useMemo(
    () =>
      WIDGET_REGISTRY.logs.render(
        NEUTRAL_CTX,
        WIDGET_REGISTRY.logs.defaultSize,
      ),
    [],
  );
  const healthNode = useMemo(
    () =>
      WIDGET_REGISTRY.health.render(
        NEUTRAL_CTX,
        WIDGET_REGISTRY.health.defaultSize,
      ),
    [],
  );

  // kind -> 已 memo 的节点;按 WidgetInstance[] 装配为 HomeCard[](uid 作 key)。
  const nodeByKind = useMemo<Record<WidgetKind, ReactNode>>(
    () => ({
      system: systemNode,
      hero: heroNode,
      kpi: kpiNode,
      instances: instancesNode,
      models: modelsNode,
      queue: queueNode,
      byInstance: byInstanceNode,
      requestTypes: requestTypesNode,
      downloads: downloadsNode,
      launcher: launcherNode,
      schedules: schedulesNode,
      network: networkNode,
      version: versionNode,
      logs: logsNode,
      health: healthNode,
    }),
    [
      systemNode,
      heroNode,
      kpiNode,
      instancesNode,
      modelsNode,
      queueNode,
      byInstanceNode,
      requestTypesNode,
      downloadsNode,
      launcherNode,
      schedulesNode,
      networkNode,
      versionNode,
      logsNode,
      healthNode,
    ],
  );

  const cards = useMemo<HomeCard[]>(
    () => widgets.map((w) => ({ uid: w.uid, node: nodeByKind[w.kind] })),
    [widgets, nodeByKind],
  );

  return (
    <motion.div
      className="mx-auto w-full max-w-[1600px] px-2 py-1"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
    >
      <header className="flex items-end justify-between gap-4">
        <div>
          <div
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            概览
          </div>
          <h1 className="mt-1 text-2xl font-semibold">全部实例</h1>
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <button
              type="button"
              onClick={handleReset}
              className="ls-item rounded-[12px] px-3 py-1.5 text-xs"
              style={{
                color: "var(--ls-ink-soft)",
                border: "1px solid var(--ls-hairline)",
              }}
            >
              恢复默认
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="ls-item flex items-center gap-1.5 rounded-[12px] px-3 py-1.5 text-xs font-medium"
            style={{
              background: editing ? "var(--ls-life-soft)" : "var(--ls-surface)",
              color: editing ? "var(--ls-life)" : "var(--ls-ink-soft)",
              border: "1px solid var(--ls-hairline)",
            }}
          >
            <Icon
              icon={editing ? "ph:check-bold" : "ph:squares-four-thin"}
              width={14}
              height={14}
            />
            {editing ? "完成" : "编辑布局"}
          </button>
          <SegmentControl
            options={RANGES}
            value={range}
            onChange={onRangeChange}
          />
        </div>
      </header>

      <div className="mt-5">
        <HomeGrid
          key={seedKey}
          cards={cards}
          layouts={layouts}
          editing={editing}
          onLayoutsChange={handleLayoutsChange}
        />
      </div>
    </motion.div>
  );
}
