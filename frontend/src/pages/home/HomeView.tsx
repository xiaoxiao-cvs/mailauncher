import { memo, useCallback, useMemo, useState } from "react";
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
import { HomePeek } from "@/pages/home/grid/HomePeek";
import {
  loadLayouts,
  loadWidgets,
  saveLayouts,
  clearLayouts,
  addWidget,
  removeWidget,
  setWidgetSize,
} from "@/pages/home/grid/layouts";
import { WIDGET_REGISTRY } from "@/pages/home/widgets/registry";
import type { WidgetRenderContext } from "@/pages/home/widgets/registry";
import { WidgetGallery } from "@/pages/home/widgets/WidgetGallery";
import type {
  MetricKey,
  WidgetKind,
  WidgetSize,
} from "@/pages/home/widgets/types";

/**
 * 首页纯展示层 —— Living Surfaces 数据看板,签名 bento 卡矩阵。
 *
 * 按 WidgetInstance[] 渲染:每个组件实例的 uid 既是 React key 也是 RGL layout 键;渲染经 memo 化的
 * WidgetHost 走 WIDGET_REGISTRY[kind].render(复用既有 15 张卡 + stat 通用小卡)。重渲隔离:数据卡 /
 * stat 拿单次 memo 的 dataCtx(仅查询刷新时换 identity,每 5~30s 一次,非每秒),自取数卡(system /
 * downloads 等)拿不变的 NEUTRAL_CTX,故 WidgetHost.memo 在挂载后绝不因数据刷新重渲,不带动整页 / 整网格。
 *
 * "编辑布局"开启后:整卡可拖并持久化、每卡浮出 S/M/L + 删除工具条、顶部"添加组件"开画廊;增删 /
 * 改尺寸 / "恢复默认"均写 localStorage 后用 seedKey 换 key 重挂网格(以新种子重置 RGL,不回灌 prop)。
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

/**
 * 读 dataCtx 的 kind(数据卡 + stat)。其余为自取数卡(system/downloads/launcher/schedules/
 * network/version/logs/health),拿不变的 NEUTRAL_CTX,故 WidgetHost.memo 在挂载后不因数据刷新重渲。
 */
const DATA_KINDS = new Set<WidgetKind>([
  "stat",
  "hero",
  "kpi",
  "instances",
  "models",
  "queue",
  "byInstance",
  "requestTypes",
]);

/**
 * 单组件渲染宿主 —— memo 隔离每个组件实例的重渲。
 *
 * 走注册表 render(复用既有卡 / stat 小卡)。自取数卡拿稳定的 NEUTRAL_CTX,props 全程不变,memo
 * 挡住父层(HomeView 每 5~30s 因查询刷新重渲)的级联;数据卡 / stat 拿 dataCtx,仅在底层数据切片
 * 变化(ctx 换 identity)时重渲。size 变更经 seedKey 重挂网格落地,故 size 改变天然触发新宿主挂载。
 */
const WidgetHost = memo(function WidgetHost({
  kind,
  size,
  metric,
  ctx,
}: {
  kind: WidgetKind;
  size: WidgetSize;
  metric: MetricKey | undefined;
  ctx: WidgetRenderContext;
}) {
  return <>{WIDGET_REGISTRY[kind].render(ctx, size, metric)}</>;
});

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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [seedKey, setSeedKey] = useState(0);
  // peek 一页化:默认精简(首屏一屏高),箭头/滚轮展开看全部。编辑态禁用 peek(见 HomePeek.disabled)。
  const [peekExpanded, setPeekExpanded] = useState(false);
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

  // 富卡数据上下文:单次 memo,仅在底层数据切片变化时换 identity(每 5~30s 查询刷新一次,非每秒)。
  // 数据卡(hero/kpi/instances/models/queue/byInstance/requestTypes)与 stat 读它;自取数卡(见
  // DATA_KINDS 之外)拿不变的 NEUTRAL_CTX,配合 WidgetHost 的 memo 在挂载后绝不因数据刷新重渲。
  const dataCtx = useMemo<WidgetRenderContext>(
    () => ({
      ...NEUTRAL_CTX,
      summary,
      sortedModels,
      runningInstances,
      totalInstances,
      instances,
      byInstance,
      queues,
      messageHistory,
    }),
    [
      summary,
      sortedModels,
      runningInstances,
      totalInstances,
      instances,
      byInstance,
      queues,
      messageHistory,
    ],
  );

  // 编辑态增删 / 改尺寸:写 localStorage 后换 seedKey 重挂网格(以新种子重置 RGL),而非回灌 prop
  // (回灌会在拖拽阈值窗口打断拖动,见上方注释)。这三类是显式用户动作、非拖拽手势中,故重挂安全。
  const handleAdd = useCallback((kind: WidgetKind, metric?: MetricKey) => {
    addWidget(kind, metric);
    setSeedKey((k) => k + 1);
  }, []);
  const handleRemove = useCallback((uid: string) => {
    removeWidget(uid);
    setSeedKey((k) => k + 1);
  }, []);
  const handleSize = useCallback((uid: string, size: WidgetSize) => {
    setWidgetSize(uid, size);
    setSeedKey((k) => k + 1);
  }, []);

  const cards = useMemo<HomeCard[]>(
    () =>
      widgets.map((w) => {
        const def = WIDGET_REGISTRY[w.kind];
        return {
          uid: w.uid,
          size: w.size,
          sizes: def.sizes,
          node: (
            <WidgetHost
              kind={w.kind}
              size={w.size}
              metric={w.metric}
              ctx={DATA_KINDS.has(w.kind) ? dataCtx : NEUTRAL_CTX}
            />
          ),
        };
      }),
    [widgets, dataCtx],
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
            <>
              <button
                type="button"
                onClick={() => setGalleryOpen(true)}
                className="ls-item flex items-center gap-1.5 rounded-[12px] px-3 py-1.5 text-xs"
                style={{
                  color: "var(--ls-ink-soft)",
                  border: "1px solid var(--ls-hairline)",
                }}
              >
                <Icon icon="ph:plus-thin" width={14} height={14} />
                添加组件
              </button>
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
            </>
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
        <HomePeek
          expanded={peekExpanded}
          onExpandedChange={setPeekExpanded}
          disabled={editing}
        >
          <HomeGrid
            key={seedKey}
            cards={cards}
            layouts={layouts}
            editing={editing}
            onLayoutsChange={handleLayoutsChange}
            onSize={handleSize}
            onRemove={handleRemove}
          />
        </HomePeek>
      </div>

      <WidgetGallery
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onAdd={handleAdd}
      />
    </motion.div>
  );
}
