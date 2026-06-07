import { useCallback, useMemo, useState } from "react";
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
import { HomeGrid, type HomeCard } from "@/pages/home/grid/HomeGrid";
import {
  loadLayouts,
  saveLayouts,
  clearLayouts,
} from "@/pages/home/grid/layouts";

/**
 * 首页纯展示层 —— Living Surfaces 数据看板,签名 bento 卡矩阵。
 *
 * 每张卡都是可展开 bento 卡(点瓦片容器形变铺满整卡钻取详情),由 react-grid-layout 排布于
 * 自适应网格;"编辑布局"开启后可拖拽/缩放并持久化,"恢复默认"回蓝图(见 grid/layouts.ts)。
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
  // HomeGrid,以新种子重置 RGL,而非回灌 prop。
  const [editing, setEditing] = useState(false);
  const [seedKey, setSeedKey] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在 seedKey 变化时重读种子(loadLayouts 读 localStorage)
  const layouts = useMemo<ResponsiveLayouts>(() => loadLayouts(), [seedKey]);
  const handleLayoutsChange = useCallback((next: ResponsiveLayouts) => {
    saveLayouts(next);
  }, []);
  const handleReset = useCallback(() => {
    clearLayouts();
    setSeedKey((k) => k + 1);
  }, []);

  // 各卡节点单独 memo:仅当自身数据变化才重建、引用稳定。系统卡已自取数(每秒刷新关在卡内),
  // 故此处不再因系统资源每秒变动而整页重渲;其余卡按各自数据(5s/30s)隔离重渲。
  // 自取数卡(downloads 等)无 props,memo([]) 仅建一次,内部各自 useQuery 独立更新。
  const systemNode = useMemo(() => <SystemCard />, []);
  const heroNode = useMemo(
    () => <MessageHeroCard summary={summary} history={messageHistory} />,
    [summary, messageHistory],
  );
  const kpiNode = useMemo(
    () => <KpiCard summary={summary} models={sortedModels} />,
    [summary, sortedModels],
  );
  const instancesNode = useMemo(
    () => (
      <InstancesCard
        instances={instances}
        runningInstances={runningInstances}
        totalInstances={totalInstances}
      />
    ),
    [instances, runningInstances, totalInstances],
  );
  const modelsNode = useMemo(
    () => <ModelDistributionCard models={sortedModels} />,
    [sortedModels],
  );
  const queueNode = useMemo(
    () => <MessageActivityCard queues={queues} />,
    [queues],
  );
  const byInstanceNode = useMemo(
    () => <ByInstanceCard byInstance={byInstance} />,
    [byInstance],
  );
  const requestTypesNode = useMemo(
    () => <RequestTypesCard byInstance={byInstance} />,
    [byInstance],
  );
  const downloadsNode = useMemo(() => <DownloadsCard />, []);
  const launcherNode = useMemo(() => <LauncherUpdateCard />, []);
  const schedulesNode = useMemo(() => <SchedulesCard />, []);
  const networkNode = useMemo(() => <NetworkSourceCard />, []);
  const versionNode = useMemo(() => <VersionCard />, []);
  const logsNode = useMemo(() => <LogsCard />, []);
  const healthNode = useMemo(() => <HealthCard />, []);

  const cards = useMemo<HomeCard[]>(
    () => [
      { id: "system", node: systemNode },
      { id: "hero", node: heroNode },
      { id: "kpi", node: kpiNode },
      { id: "instances", node: instancesNode },
      { id: "models", node: modelsNode },
      { id: "queue", node: queueNode },
      { id: "byInstance", node: byInstanceNode },
      { id: "requestTypes", node: requestTypesNode },
      { id: "downloads", node: downloadsNode },
      { id: "launcher", node: launcherNode },
      { id: "schedules", node: schedulesNode },
      { id: "network", node: networkNode },
      { id: "version", node: versionNode },
      { id: "logs", node: logsNode },
      { id: "health", node: healthNode },
    ],
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
