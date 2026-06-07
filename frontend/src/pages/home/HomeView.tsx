import { useCallback, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Icon } from "@iconify/react";
import type { ResponsiveLayouts } from "react-grid-layout";

import { SegmentControl } from "@/components/ls";
import { springSoft } from "@/design/motion";
import type { SystemInfo, SystemStats } from "@/services/systemApi";
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
import { HomeGrid, type HomeCard } from "@/pages/home/grid/HomeGrid";
import {
  loadLayouts,
  saveLayouts,
  clearLayouts,
  DEFAULT_LAYOUTS,
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
  /** 静态系统信息(OS / CPU 型号 / 内核 / 主机 / 架构等);首屏完成前为 undefined。 */
  systemInfo: SystemInfo | undefined;
  /** 实时系统资源快照(CPU / 内存 / 磁盘 / 网络 / 运行时长);首屏完成前为 undefined。 */
  systemStats: SystemStats | undefined;
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
  systemInfo,
  systemStats,
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

  // 布局编辑态与持久化:编辑模式拖/缩卡片,变更落 localStorage;"恢复默认"回蓝图。
  const [editing, setEditing] = useState(false);
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() =>
    loadLayouts(),
  );
  const handleLayoutsChange = useCallback((next: ResponsiveLayouts) => {
    setLayouts(next);
    saveLayouts(next);
  }, []);
  const handleReset = useCallback(() => {
    clearLayouts();
    setLayouts(DEFAULT_LAYOUTS);
  }, []);

  const cards: HomeCard[] = [
    {
      id: "system",
      node: <SystemCard info={systemInfo} stats={systemStats} />,
    },
    {
      id: "hero",
      node: <MessageHeroCard summary={summary} history={messageHistory} />,
    },
    { id: "kpi", node: <KpiCard summary={summary} models={sortedModels} /> },
    {
      id: "instances",
      node: (
        <InstancesCard
          instances={instances}
          runningInstances={runningInstances}
          totalInstances={totalInstances}
        />
      ),
    },
    { id: "models", node: <ModelDistributionCard models={sortedModels} /> },
    { id: "queue", node: <MessageActivityCard queues={queues} /> },
    { id: "byInstance", node: <ByInstanceCard byInstance={byInstance} /> },
    {
      id: "requestTypes",
      node: <RequestTypesCard byInstance={byInstance} />,
    },
    // later 卡:卡内自取数(无需经 props 注入)。
    { id: "downloads", node: <DownloadsCard /> },
    { id: "launcher", node: <LauncherUpdateCard /> },
    { id: "schedules", node: <SchedulesCard /> },
    { id: "network", node: <NetworkSourceCard /> },
  ];

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
          cards={cards}
          layouts={layouts}
          editing={editing}
          onLayoutsChange={handleLayoutsChange}
        />
      </div>
    </motion.div>
  );
}
