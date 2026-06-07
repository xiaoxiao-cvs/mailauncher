import { useMemo } from "react";
import { motion } from "motion/react";

import { Card, SegmentControl, Sparkline, Stat } from "@/components/ls";
import { springSettle, springSoft } from "@/design/motion";
import type { SystemInfo, SystemStats } from "@/services/systemApi";
import { SystemCard } from "@/pages/home/system/SystemCard";
import type { StatsSummary, ModelStats } from "@/hooks/queries/useStatsQueries";
import type {
  MessageQueueResponse,
  MessageStatus,
} from "@/services/messageQueueApi";

/**
 * 首页纯展示层 —— Living Surfaces 数据看板。
 * 全宽 12 栅格:左上系统面板、右上消息英雄 + KPI、下方模型分布 + 消息队列 + 小指标。
 * 视觉与结构沿用定稿小样 DashboardPreview;不含任何数据请求,数据与回调由容器 HomePage 注入,
 * 以便无 Tauri 也能 Preview。系统数据来自 useSystemMonitor(info 静态 + stats 实时)。
 */

const RANGES = ["24h", "7d", "30d"] as const;
export type HomeRange = (typeof RANGES)[number];

/** 模型分布配色:按花费降序循环取用,与小样一致的暖色 + 生命色调板。 */
const MODEL_TONES = [
  "var(--ls-life)",
  "#cf9442",
  "#c5563e",
  "#7f9b6a",
  "#b07d56",
] as const;

/**
 * 数值兜底:真实统计接口的部分聚合字段在"无数据"时为 null/缺失(后端聚合空集所致),
 * 显示层一律按 0 处理——这是真·无数据态的合理呈现,非掩盖业务异常。同时挡住 NaN/Infinity。
 */
function num(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** 秒 -> "Xh Ym"。系统运行时长 footer 用。 */
function fmtUptime(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.floor(num(seconds)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

/** 紧凑数字:1284 -> 1.3k,2_340_115 -> 2.3M。大额统计读数用,英雄计数保留原值。 */
function fmtCompact(value: number | null | undefined): string {
  const n = num(value);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(Math.round(n));
}

/** 英雄计数千分位:12840 -> "12,840"。 */
function fmtGrouped(value: number | null | undefined): string {
  return Math.round(num(value)).toLocaleString("en-US");
}

function fmtCost(usd: number | null | undefined): string {
  const n = num(usd);
  return "¥" + (n >= 100 ? n.toFixed(0) : n.toFixed(2));
}

function fmtSeconds(s: number | null | undefined): string {
  return num(s).toFixed(2) + "s";
}

const QUEUE_STATUS_LABEL: Record<MessageStatus, string> = {
  pending: "待处理",
  planning: "规划中",
  generating: "生成中",
  sending: "发送中",
  sent: "已发送",
  failed: "失败",
};

/** generating/sending 视为活跃(生命色),planning/pending 用暖色,失败用危险色。 */
const QUEUE_STATUS_TONE: Record<MessageStatus, string> = {
  pending: "var(--ls-ink-faint)",
  planning: "var(--ls-warn)",
  generating: "var(--ls-life)",
  sending: "var(--ls-life)",
  sent: "var(--ls-ink-faint)",
  failed: "var(--ls-danger)",
};

/** "在途":尚未 sent / failed 的队列条目。 */
function isInFlight(status: MessageStatus): boolean {
  return status !== "sent" && status !== "failed";
}

export interface HomeOverview {
  totalInstances: number;
  runningInstances: number;
  summary: StatsSummary | undefined;
  topModels: ModelStats[];
}

export interface HomeViewProps {
  /** 实例数 / 在线数 / 统计概览 / 头部模型,均来自 get_stats_overview。 */
  overview: HomeOverview;
  /** 全实例消息队列快照,用于队列卡与在途/已处理计数。 */
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
   * 此时英雄区只展示总量 + KPI,不渲染走势图(不编造序列数据);Preview 可传 mock 序列演示完整视觉。
   */
  messageHistory?: number[];
}

const PLACEHOLDER = "—";

function MessageHero({
  summary,
  history,
}: {
  summary: StatsSummary | undefined;
  history: number[] | undefined;
}) {
  const peak = history && history.length > 0 ? Math.max(...history) : 0;
  const avg =
    history && history.length > 0
      ? history.reduce((s, v) => s + v, 0) / history.length
      : 0;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div
          className="text-[11px] font-medium"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          消息处理总量
        </div>
        <span
          className="ls-num inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ background: "var(--ls-life-soft)", color: "var(--ls-life)" }}
        >
          回复 {summary ? fmtCompact(summary.total_replies) : PLACEHOLDER}
        </span>
      </div>
      <div className="ls-num mt-2 text-[2.5rem] font-semibold leading-none">
        {summary ? fmtGrouped(summary.total_messages) : PLACEHOLDER}
      </div>
      {history && history.length > 1 ? (
        <div className="mt-3">
          <Sparkline values={history} />
          <div
            className="ls-num mt-2 flex gap-4 text-xs"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            <span>峰值 {fmtCompact(peak)} / 时</span>
            <span>均值 {fmtCompact(avg)} / 时</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-xs" style={{ color: "var(--ls-ink-soft)" }}>
          {summary
            ? `每小时 ${fmtCompact(summary.tokens_per_hour)} Token · 回复率 ${
                summary.total_messages > 0
                  ? Math.round(
                      (summary.total_replies / summary.total_messages) * 100,
                    )
                  : 0
              }%`
            : PLACEHOLDER}
        </div>
      )}
    </Card>
  );
}

function KpiGrid({ summary }: { summary: StatsSummary | undefined }) {
  const replyRate =
    summary && summary.total_messages > 0
      ? Math.round((summary.total_replies / summary.total_messages) * 100)
      : 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat
        label="总花费"
        value={summary ? fmtCost(summary.total_cost) : PLACEHOLDER}
        sub={summary ? `${fmtCost(summary.cost_per_hour)} / 小时` : undefined}
      />
      <Stat
        label="回复"
        value={summary ? fmtCompact(summary.total_replies) : PLACEHOLDER}
        sub={summary ? `回复率 ${replyRate}%` : undefined}
      />
      <Stat
        label="Token"
        value={summary ? fmtCompact(summary.total_tokens) : PLACEHOLDER}
        sub={
          summary
            ? `↑${fmtCompact(summary.input_tokens)} ↓${fmtCompact(summary.output_tokens)}`
            : undefined
        }
      />
      <Stat
        label="平均响应"
        value={summary ? fmtSeconds(summary.avg_response_time) : PLACEHOLDER}
        sub={
          summary ? `总请求 ${fmtCompact(summary.total_requests)}` : undefined
        }
      />
    </div>
  );
}

interface ModelRow {
  name: string;
  cost: number;
  tone: string;
}

function ModelDistribution({ models }: { models: ModelStats[] }) {
  const rows: ModelRow[] = models.map((m, i) => ({
    name: m.display_name ?? m.model_name,
    cost: m.total_cost,
    tone: MODEL_TONES[i % MODEL_TONES.length],
  }));
  const total = rows.reduce((s, m) => s + m.cost, 0);

  return (
    <Card className="col-span-12 lg:col-span-5">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold">模型分布</div>
        <div className="text-xs" style={{ color: "var(--ls-ink-faint)" }}>
          按花费
        </div>
      </div>
      {rows.length === 0 ? (
        <div
          className="mt-6 text-center text-xs"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          暂无模型调用记录
        </div>
      ) : (
        <>
          <div className="mt-3 flex h-3 gap-1 overflow-hidden">
            {rows.map((m) => (
              <motion.div
                key={m.name}
                initial={{ width: 0 }}
                animate={{
                  width: total > 0 ? `${(m.cost / total) * 100}%` : "0%",
                }}
                transition={{ ...springSettle, delay: 0.2 }}
                style={{ background: m.tone, borderRadius: 4 }}
              />
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {rows.map((m) => (
              <div key={m.name} className="flex items-center gap-2.5 text-sm">
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: m.tone }}
                />
                <span className="flex-1 truncate">{m.name}</span>
                <span className="ls-num w-16 text-right font-semibold">
                  {fmtCost(m.cost)}
                </span>
                <span
                  className="ls-num w-10 text-right"
                  style={{ color: "var(--ls-ink-faint)" }}
                >
                  {total > 0 ? Math.round((m.cost / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

interface QueueRow {
  key: string;
  group: string;
  status: MessageStatus;
}

function MessageQueuePanel({ queues }: { queues: MessageQueueResponse[] }) {
  const inFlight: QueueRow[] = [];
  let processed = 0;
  for (const q of queues) {
    processed += q.total_processed;
    for (const m of q.messages) {
      if (isInFlight(m.status)) {
        inFlight.push({
          key: m.id,
          group: m.group_name ?? q.instance_name,
          status: m.status,
        });
      }
    }
  }

  return (
    <Card className="col-span-12 lg:col-span-4">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold">消息队列</div>
        <div
          className="ls-num text-xs"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          在途 {inFlight.length} · 已处理 {fmtCompact(processed)}
        </div>
      </div>
      {inFlight.length === 0 ? (
        <div
          className="mt-6 text-center text-xs"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          当前没有在途消息
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {inFlight.slice(0, 6).map((q) => (
            <div
              key={q.key}
              className="ls-inset flex items-center gap-2.5 px-3 py-2 text-sm"
            >
              <span
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ background: QUEUE_STATUS_TONE[q.status] }}
              />
              <span className="flex-1 truncate font-medium">{q.group}</span>
              <span className="text-xs" style={{ color: "var(--ls-ink-soft)" }}>
                {QUEUE_STATUS_LABEL[q.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function SmallMetrics({
  summary,
  runningInstances,
  totalInstances,
}: {
  summary: StatsSummary | undefined;
  runningInstances: number;
  totalInstances: number;
}) {
  return (
    <div className="col-span-12 grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-1">
      <Stat
        label="在线时长"
        value={summary ? fmtUptime(summary.online_time) : PLACEHOLDER}
      />
      <Stat
        label="运行实例"
        value={`${runningInstances} / ${totalInstances}`}
        sub={runningInstances > 0 ? "运行中" : "暂无运行"}
      />
    </div>
  );
}

export function HomeView({
  overview,
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

  return (
    <motion.div
      className="px-2 py-1"
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
        <SegmentControl
          options={RANGES}
          value={range}
          onChange={onRangeChange}
        />
      </header>

      <motion.div
        className="mt-5 grid grid-cols-12 gap-3"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
        }}
      >
        <SystemCard info={systemInfo} stats={systemStats} />

        <div className="col-span-12 flex flex-col gap-3 lg:col-span-8 2xl:col-span-9">
          <MessageHero summary={summary} history={messageHistory} />
          <KpiGrid summary={summary} />
        </div>

        <ModelDistribution models={sortedModels} />
        <MessageQueuePanel queues={queues} />
        <SmallMetrics
          summary={summary}
          runningInstances={runningInstances}
          totalInstances={totalInstances}
        />
      </motion.div>
    </motion.div>
  );
}
