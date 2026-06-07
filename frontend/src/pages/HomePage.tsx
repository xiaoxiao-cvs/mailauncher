/**
 * 主页容器 —— 调真实 hooks,把数据注入纯展示层 HomeView(数据看板)。
 * 统计概览 / 实例 / 消息队列走 React Query;系统资源走 useSystemMonitor(静态 info + 实时 stats)。
 * 视觉与布局在 @/pages/home/HomeView。首页只读概览,不做实例管理(启停/创建在实例页)。
 */

import { useState } from "react";

import { useInstancesQuery } from "@/hooks/queries/useInstanceQueries";
import {
  useStatsOverviewQuery,
  useAggregatedStatsQuery,
} from "@/hooks/queries/useStatsQueries";
import { useAllMessageQueuesQuery } from "@/hooks/queries/useMessageQueueQueries";
import { useSystemMonitor } from "@/hooks/useSystemMonitor";
import { HomeView, type HomeRange } from "@/pages/home/HomeView";

export function HomePage() {
  // 统计时间窗:由 HomeView 顶部分段控件驱动,默认近 24 小时。
  const [range, setRange] = useState<HomeRange>("24h");

  const { data: overview } = useStatsOverviewQuery(range, {
    refetchInterval: 30000,
  });
  // 按实例聚合(by_instance + 各实例 request_type_stats):喂"按实例对比""请求类型分布"两卡。
  // 单查询喂两卡,不放大 overview 已有的 per-instance N+1。
  const { data: aggregated } = useAggregatedStatsQuery(range, undefined, {
    refetchInterval: 30000,
  });
  const { data: instanceList } = useInstancesQuery({ refetchInterval: 5000 });
  const { data: queues } = useAllMessageQueuesQuery();
  const { info: systemInfo, stats: systemStats } = useSystemMonitor();

  const instances = instanceList?.instances ?? [];
  const runningFromList = instances.filter(
    (i) => i.status === "running" || i.status === "partial",
  ).length;

  return (
    <HomeView
      overview={{
        // 概览未就绪时用实例列表兜底计数(均为真实来源,非凭空补零)。
        totalInstances: overview?.total_instances ?? instances.length,
        runningInstances: overview?.running_instances ?? runningFromList,
        summary: overview?.summary,
        topModels: overview?.top_models ?? [],
      }}
      instances={instances}
      byInstance={aggregated?.by_instance ?? []}
      queues={queues ?? []}
      systemInfo={systemInfo}
      systemStats={systemStats}
      range={range}
      onRangeChange={setRange}
    />
  );
}
