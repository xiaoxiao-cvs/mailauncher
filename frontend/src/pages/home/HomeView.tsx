import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";

import {
  Card,
  Meter,
  MirrorGraph,
  Ring,
  SegmentControl,
  Sparkline,
  Stat,
} from "@/components/ls";
import { springSettle, springSoft } from "@/design/motion";
import type { SystemInfo, SystemStats } from "@/services/systemApi";
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

const GiB = 1024 ** 3;

/**
 * 数值兜底:真实统计接口的部分聚合字段在"无数据"时为 null/缺失(后端聚合空集所致),
 * 显示层一律按 0 处理——这是真·无数据态的合理呈现,非掩盖业务异常。同时挡住 NaN/Infinity。
 */
function num(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** 字节 -> GB(一位小数)。系统内存/磁盘读数用。 */
function fmtGB(bytes: number | null | undefined): string {
  return (num(bytes) / GiB).toFixed(1) + " GB";
}

/** 字节每秒 -> 自适应 B/s | KB/s | MB/s。网络速率读数用。 */
function fmtRate(raw: number | null | undefined): string {
  const bps = num(raw);
  if (bps >= 1024 * 1024) return (bps / 1024 / 1024).toFixed(1) + " MB/s";
  if (bps >= 1024) return (bps / 1024).toFixed(0) + " KB/s";
  return Math.round(bps) + " B/s";
}

/** 字节 -> 自适应 B|KB|MB|GB|TB（累计总量读数用，无 /s）。 */
function fmtBytes(raw: number | null | undefined): string {
  const b = num(raw);
  if (b >= 1024 ** 4) return (b / 1024 ** 4).toFixed(2) + " TB";
  if (b >= 1024 ** 3) return (b / 1024 ** 3).toFixed(2) + " GB";
  if (b >= 1024 ** 2) return (b / 1024 ** 2).toFixed(1) + " MB";
  if (b >= 1024) return (b / 1024).toFixed(0) + " KB";
  return Math.round(b) + " B";
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
  return "$" + (n >= 100 ? n.toFixed(0) : n.toFixed(2));
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

/** 内存硬件信息拼读："DDR5 · 6000 MT/s"，缺项降级，全缺为占位符。 */
function fmtMemHw(info: SystemInfo | undefined): string {
  if (!info) return PLACEHOLDER;
  const hasType = info.memory_type !== "" && info.memory_type !== "未知";
  const hasSpeed = info.memory_speed > 0;
  if (hasType && hasSpeed)
    return `${info.memory_type} · ${info.memory_speed} MT/s`;
  if (hasSpeed) return `${info.memory_speed} MT/s`;
  if (hasType) return info.memory_type;
  return PLACEHOLDER;
}

const SYS_TABS = ["系统", "网络"] as const;
type SysTab = (typeof SYS_TABS)[number];

/** 网络速率滚动缓冲容量:每约 1.5s 一帧,48 帧约 72s 走势。 */
const NET_HIST_CAP = 48;

function SystemPanel({
  info,
  stats,
}: {
  info: SystemInfo | undefined;
  stats: SystemStats | undefined;
}) {
  const [tab, setTab] = useState<SysTab>("系统");
  const [netHist, setNetHist] = useState<{ down: number[]; up: number[] }>({
    down: [],
    up: [],
  });

  // 每来一帧实时快照(事件推送为新对象引用),把收发速率压入滚动缓冲供波形/峰值用。
  useEffect(() => {
    if (!stats) return;
    setNetHist((prev) => ({
      down: [...prev.down, stats.net_rx_rate].slice(-NET_HIST_CAP),
      up: [...prev.up, stats.net_tx_rate].slice(-NET_HIST_CAP),
    }));
  }, [stats]);

  const cpuPct = stats ? Math.round(stats.cpu_usage) : 0;
  // 负载环:1 分钟负载相对逻辑核数的占比(负载=核数即满圈,32 线程下负载 16 约半环)
  const loadPct = stats
    ? Math.min(
        100,
        Math.round(
          (num(stats.load_avg_1) / Math.max(1, stats.cpu_core_count)) * 100,
        ),
      )
    : 0;
  const peakDown = netHist.down.length ? Math.max(...netHist.down) : 0;
  const peakUp = netHist.up.length ? Math.max(...netHist.up) : 0;

  return (
    <Card className="col-span-12 flex flex-col lg:col-span-4">
      {/* 系统/网络 Tab 栏:选中段高面滑块跟随,左对齐 */}
      <div className="flex">
        <SegmentControl options={SYS_TABS} value={tab} onChange={setTab} />
      </div>

      {/* Tab 内容区:固定最小高 + 垂直居中,切换不跳动 */}
      <div className="mt-4 flex min-h-[156px] flex-col justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {tab === "系统" ? (
            <motion.div
              key="sys"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-5"
            >
              <div className="flex flex-col items-center">
                <Ring value={loadPct} />
                <div
                  className="mt-1.5 text-[11px]"
                  style={{ color: "var(--ls-ink-soft)" }}
                >
                  系统负载
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <div>
                  <Meter
                    label="CPU"
                    used={stats ? stats.cpu_usage : 0}
                    total={100}
                    valueText={
                      stats
                        ? `${cpuPct}% of ${stats.cpu_core_count} CPU(s)`
                        : PLACEHOLDER
                    }
                  />
                  <div
                    className="ls-num mt-1.5 text-right text-[11px]"
                    style={{ color: "var(--ls-ink-faint)" }}
                  >
                    {stats
                      ? `负载 ${num(stats.load_avg_1).toFixed(2)} / ${num(stats.load_avg_5).toFixed(2)} / ${num(stats.load_avg_15).toFixed(2)}`
                      : PLACEHOLDER}
                  </div>
                </div>
                <div>
                  <Meter
                    label="内存"
                    used={stats ? stats.memory_used : 0}
                    total={stats ? stats.memory_total : 0}
                    valueText={
                      stats
                        ? `${fmtGB(stats.memory_used)} / ${fmtGB(stats.memory_total)}`
                        : PLACEHOLDER
                    }
                  />
                  <div
                    className="ls-num mt-1.5 text-right text-[11px]"
                    style={{ color: "var(--ls-ink-faint)" }}
                  >
                    {fmtMemHw(info)}
                  </div>
                </div>
                <Meter
                  label="交换区"
                  used={stats ? stats.swap_used : 0}
                  total={stats ? stats.swap_total : 0}
                  valueText={
                    stats
                      ? `${fmtGB(stats.swap_used)} / ${fmtGB(stats.swap_total)}`
                      : PLACEHOLDER
                  }
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="net"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* 上下镜像波形:下行朝上(生命色)/ 上行朝下(柔墨),中轴一个分流图标 */}
              <div className="relative">
                <MirrorGraph top={netHist.down} bottom={netHist.up} />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{
                      background: "var(--ls-surface-hi)",
                      boxShadow: "var(--ls-shadow-soft)",
                    }}
                  >
                    <ArrowDownUp
                      size={13}
                      style={{ color: "var(--ls-ink-soft)" }}
                    />
                  </div>
                </div>
              </div>

              {/* 分割线下:每方向 当前 / 累计 / 峰值 */}
              <div
                className="mt-3 grid grid-cols-[auto_1fr_1fr_1fr] items-center gap-x-3 gap-y-2.5 border-t pt-3"
                style={{ borderColor: "var(--ls-hairline)" }}
              >
                <ArrowDown size={13} style={{ color: "var(--ls-life)" }} />
                <NetCell
                  label="当前"
                  value={stats ? fmtRate(stats.net_rx_rate) : PLACEHOLDER}
                />
                <NetCell
                  label="累计"
                  value={stats ? fmtBytes(stats.net_rx_total) : PLACEHOLDER}
                />
                <NetCell
                  label="峰值"
                  value={stats ? fmtRate(peakDown) : PLACEHOLDER}
                />

                <ArrowUp size={13} style={{ color: "var(--ls-ink-soft)" }} />
                <NetCell
                  label="当前"
                  value={stats ? fmtRate(stats.net_tx_rate) : PLACEHOLDER}
                />
                <NetCell
                  label="累计"
                  value={stats ? fmtBytes(stats.net_tx_total) : PLACEHOLDER}
                />
                <NetCell
                  label="峰值"
                  value={stats ? fmtRate(peakUp) : PLACEHOLDER}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 发丝线分隔:下方为静态真系统信息 */}
      <div
        className="mt-5 border-t pt-3"
        style={{ borderColor: "var(--ls-hairline)" }}
      >
        <div
          className="text-[11px] font-medium"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          处理器
        </div>
        <div className="mt-1 truncate text-sm font-semibold">
          {info ? info.cpu_brand : PLACEHOLDER}
        </div>
        <div
          className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-2.5 text-xs"
          style={{ borderColor: "var(--ls-hairline)" }}
        >
          <SystemFact label="架构" value={info ? info.arch : PLACEHOLDER} />
          <SystemFact
            label="频率"
            value={info ? `${info.cpu_frequency} MHz` : PLACEHOLDER}
          />
          <SystemFact
            label="内核"
            value={info ? info.kernel_version : PLACEHOLDER}
          />
          <SystemFact label="主机" value={info ? info.hostname : PLACEHOLDER} />
        </div>
      </div>

      {/* 元信息归底:OS 串下沉于此,与运行时长聚成"这台机器是什么" */}
      <div
        className="mt-auto pt-3 text-xs"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        <div className="truncate">
          {info
            ? `${info.os_long_version} · 启动器 v${info.launcher_version}`
            : PLACEHOLDER}
        </div>
        <div className="ls-num mt-0.5">
          {stats
            ? `运行 ${fmtUptime(stats.uptime_secs)} · 状态正常`
            : PLACEHOLDER}
        </div>
      </div>
    </Card>
  );
}

function SystemFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span style={{ color: "var(--ls-ink-faint)" }}>{label}</span>
      <span
        className="ls-num min-w-0 truncate text-right"
        style={{ color: "var(--ls-ink-soft)" }}
      >
        {value}
      </span>
    </div>
  );
}

/** 网络明细单元:小标签在上、tabular 数值在下,用于网络卡底部三列。 */
function NetCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px]" style={{ color: "var(--ls-ink-faint)" }}>
        {label}
      </span>
      <span className="ls-num text-xs" style={{ color: "var(--ls-ink-soft)" }}>
        {value}
      </span>
    </div>
  );
}

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
        <SystemPanel info={systemInfo} stats={systemStats} />

        <div className="col-span-12 flex flex-col gap-3 lg:col-span-8">
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
