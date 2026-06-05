import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";

import { Card, MirrorGraph, Sparkline } from "@/components/ls";
import { springSettle } from "@/design/motion";
import { useNetHistory } from "@/services/netHistoryStore";
import { useTimeSeries } from "@/services/metrics/timeSeriesStore";
import { HOST_SCOPE } from "@/services/metrics/types";
import { getTopProcesses } from "@/services/systemApi";
import { fmtBytes, fmtGB, fmtRate, num } from "@/utils/format";
import type { SystemInfo, SystemStats } from "@/services/systemApi";

/**
 * 系统卡 —— 固定尺寸框内的资源钻取。
 *
 * 概览态:CPU/内存/Swap/磁盘/网络 五条资源,每条 = 标签 + 实时进度条(网络是波形)。
 * 点某条 → 框内**交叉淡入**切到该资源详情;唯独那条指示条用 `layoutId` 在两态间**连续位移**
 * (同一元素从行内滑到顶,**高度恒定不变**、不切断、实时数据照常),其余一切走 opacity。
 *
 * 铁律:卡片是**固定高度**的框,概览与详情共用同一框、绝不改尺寸——杜绝撑大、卡顿、瞎飘。
 * 全卡同时只有 1 个元素做布局位移(选中条),所以丝滑。
 */

/** 固定框高(px):需同时容下概览五行与最高的 CPU 详情(走势 + 进程表)。 */
const FRAME_H = 320;
/** 指示条高度(概览/详情恒定一致)。 */
const BAR_H = 8;
const PLACEHOLDER = "—";

type ResKey = "cpu" | "memory" | "swap" | "disk" | "network";

interface RowData {
  key: ResKey;
  label: string;
  /** 进度条百分比 0-100;网络行走波形,为 undefined */
  pct?: number;
  /** 右侧读数 */
  value: string;
  /** 网络行用波形而非进度条 */
  wave?: boolean;
}

function pctOf(used: number, total: number): number {
  return total > 0 ? Math.min(100, (used / total) * 100) : 0;
}

export function SystemCard({
  info,
  stats,
}: {
  info: SystemInfo | undefined;
  stats: SystemStats | undefined;
}) {
  const [expanded, setExpanded] = useState<ResKey | null>(null);
  const netHist = useNetHistory();

  const diskUsed = stats ? stats.disk_total - stats.disk_available : 0;
  const rows: RowData[] = [
    {
      key: "cpu",
      label: "CPU",
      pct: stats ? Math.min(100, num(stats.cpu_usage)) : 0,
      value: stats
        ? `${Math.round(num(stats.cpu_usage))}% · ${stats.cpu_core_count} 线程`
        : PLACEHOLDER,
    },
    {
      key: "memory",
      label: "内存",
      pct: stats ? pctOf(stats.memory_used, stats.memory_total) : 0,
      value: stats
        ? `${fmtGB(stats.memory_used)} / ${fmtGB(stats.memory_total)}`
        : PLACEHOLDER,
    },
    {
      key: "swap",
      label: "交换区",
      pct: stats ? pctOf(stats.swap_used, stats.swap_total) : 0,
      value: stats
        ? stats.swap_total > 0
          ? `${fmtGB(stats.swap_used)} / ${fmtGB(stats.swap_total)}`
          : "未启用"
        : PLACEHOLDER,
    },
    {
      key: "disk",
      label: "磁盘",
      pct: stats ? pctOf(diskUsed, stats.disk_total) : 0,
      value: stats
        ? `${fmtBytes(diskUsed)} / ${fmtBytes(stats.disk_total)}`
        : PLACEHOLDER,
    },
    {
      key: "network",
      label: "网络",
      wave: true,
      value: stats
        ? `↑ ${fmtRate(stats.net_tx_rate)}   ↓ ${fmtRate(stats.net_rx_rate)}`
        : PLACEHOLDER,
    },
  ];

  const active = expanded ? rows.find((r) => r.key === expanded) : undefined;

  return (
    <Card className="col-span-12 flex flex-col lg:col-span-4">
      <LayoutGroup>
        <div className="relative" style={{ height: FRAME_H }}>
          <AnimatePresence initial={false}>
            {expanded === null ? (
              <motion.div
                key="overview"
                className="absolute inset-0 flex flex-col justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                {rows.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setExpanded(r.key)}
                    className="block w-full text-left"
                  >
                    <RowHead label={r.label} value={r.value} active={false} />
                    <div className="mt-1.5">
                      <Indicator def={r} netHist={netHist} />
                    </div>
                  </button>
                ))}
              </motion.div>
            ) : (
              active && (
                <motion.div
                  key="detail"
                  className="absolute inset-0 flex flex-col"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(null)}
                    className="block w-full text-left"
                  >
                    <RowHead label={active.label} value={active.value} active />
                    <div className="mt-1.5">
                      <Indicator def={active} netHist={netHist} />
                    </div>
                  </button>
                  <div className="mt-4 min-h-0 flex-1">
                    <ResourceDetail
                      kind={active.key}
                      info={info}
                      stats={stats}
                      netHist={netHist}
                    />
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </Card>
  );
}

/** 行头:标签(左)+ 读数(右)+ 展开/收起小箭头。 */
function RowHead({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className="text-[13px] font-medium"
        style={{ color: active ? "var(--ls-ink)" : "var(--ls-ink-soft)" }}
      >
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="ls-num text-[11px]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          {value}
        </span>
        <Icon
          icon="ph:caret-down-thin"
          width={13}
          height={13}
          style={{
            color: "var(--ls-ink-faint)",
            transform: active ? "rotate(180deg)" : "none",
          }}
        />
      </span>
    </div>
  );
}

/** 选中条的连续位移元素:进度条或波形,带 layoutId 在概览/详情两态间 morph;高度恒定。 */
function Indicator({
  def,
  netHist,
}: {
  def: RowData;
  netHist: { up: number[]; down: number[] };
}) {
  if (def.wave) {
    return (
      <motion.div
        layoutId={`ind-${def.key}`}
        transition={springSettle}
        className="w-full"
      >
        <MirrorGraph
          top={netHist.up}
          bottom={netHist.down}
          topColor="var(--ls-ink-soft)"
          bottomColor="var(--ls-life)"
          className="h-8 w-full"
        />
      </motion.div>
    );
  }
  const w = Math.max(0, Math.min(100, def.pct ?? 0));
  return (
    <motion.div
      layoutId={`ind-${def.key}`}
      transition={springSettle}
      className="relative w-full overflow-hidden rounded-full"
      style={{ background: "var(--ls-bg-2)", height: BAR_H }}
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: "var(--ls-life)" }}
        initial={false}
        animate={{ width: `${w}%` }}
        transition={springSettle}
      />
    </motion.div>
  );
}

function ResourceDetail({
  kind,
  info,
  stats,
  netHist,
}: {
  kind: ResKey;
  info: SystemInfo | undefined;
  stats: SystemStats | undefined;
  netHist: { up: number[]; down: number[] };
}) {
  switch (kind) {
    case "cpu":
      return <CpuDetail stats={stats} />;
    case "memory":
      return <MemoryDetail info={info} stats={stats} />;
    case "swap":
      return <SwapDetail stats={stats} />;
    case "disk":
      return <DiskDetail stats={stats} />;
    case "network":
      return <NetworkDetail stats={stats} netHist={netHist} />;
  }
}

/** CPU 详情:占用走势 + 负载 + 进程占用表(本资源的重点)。 */
function CpuDetail({ stats }: { stats: SystemStats | undefined }) {
  const series = useTimeSeries(HOST_SCOPE, "cpu");
  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <SectionHead title="占用走势" hint="近 72 秒" />
        <Sparkline values={series} className="mt-1.5 h-12 w-full" />
        <div
          className="ls-num mt-1 text-[10px]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          {stats
            ? `负载 ${num(stats.load_avg_1).toFixed(2)} / ${num(stats.load_avg_5).toFixed(2)} / ${num(stats.load_avg_15).toFixed(2)}`
            : PLACEHOLDER}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <ProcessList />
      </div>
    </div>
  );
}

/** 进程占用表:top-N 系统进程,按 CPU 降序,打开期间轮询采样。列序对齐表头 CPU · 内存。 */
function ProcessList() {
  const { data } = useQuery({
    queryKey: ["top-processes"],
    queryFn: () => getTopProcesses(6),
    refetchInterval: 1500,
    staleTime: 1000,
  });
  const procs = data ?? [];
  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-baseline justify-between text-[10px] font-medium"
        style={{ color: "var(--ls-ink-soft)" }}
      >
        <span>进程占用</span>
        <span style={{ color: "var(--ls-ink-faint)" }}>CPU · 内存</span>
      </div>
      {procs.length === 0 ? (
        <div
          className="mt-2 text-[11px]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          正在采样进程占用…
        </div>
      ) : (
        <div className="mt-2 space-y-1">
          {procs.map((p) => (
            <div key={p.pid} className="flex items-center gap-2 text-[11px]">
              <span
                className="flex-1 truncate"
                style={{ color: "var(--ls-ink)" }}
              >
                {p.name}
              </span>
              <span className="ls-num w-11 text-right font-medium">
                {p.cpu.toFixed(1)}%
              </span>
              <span
                className="ls-num w-16 text-right"
                style={{ color: "var(--ls-ink-faint)" }}
              >
                {fmtBytes(p.memory)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MemoryDetail({
  info,
  stats,
}: {
  info: SystemInfo | undefined;
  stats: SystemStats | undefined;
}) {
  const series = useTimeSeries(HOST_SCOPE, "mem");
  return (
    <div className="flex flex-col gap-3">
      <div>
        <SectionHead title="占用走势" hint="近 72 秒" />
        <Sparkline values={series} className="mt-1.5 h-14 w-full" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Cell
          label="已用"
          value={stats ? fmtGB(stats.memory_used) : PLACEHOLDER}
        />
        <Cell
          label="总量"
          value={stats ? fmtGB(stats.memory_total) : PLACEHOLDER}
        />
        <Cell
          label="类型"
          value={
            info && info.memory_type && info.memory_type !== "未知"
              ? info.memory_type
              : PLACEHOLDER
          }
        />
      </div>
    </div>
  );
}

function SwapDetail({ stats }: { stats: SystemStats | undefined }) {
  const series = useTimeSeries(HOST_SCOPE, "swap");
  if (stats && stats.swap_total === 0) {
    return (
      <div className="text-[11px]" style={{ color: "var(--ls-ink-faint)" }}>
        当前系统未启用交换区(Swap)
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div>
        <SectionHead title="占用走势" hint="近 72 秒" />
        <Sparkline values={series} className="mt-1.5 h-14 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Cell
          label="已用"
          value={stats ? fmtGB(stats.swap_used) : PLACEHOLDER}
        />
        <Cell
          label="总量"
          value={stats ? fmtGB(stats.swap_total) : PLACEHOLDER}
        />
      </div>
    </div>
  );
}

function DiskDetail({ stats }: { stats: SystemStats | undefined }) {
  const series = useTimeSeries(HOST_SCOPE, "disk");
  const used = stats ? stats.disk_total - stats.disk_available : 0;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <SectionHead title="占用走势" hint="近 72 秒" />
        <Sparkline values={series} className="mt-1.5 h-14 w-full" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Cell label="已用" value={stats ? fmtBytes(used) : PLACEHOLDER} />
        <Cell
          label="可用"
          value={stats ? fmtBytes(stats.disk_available) : PLACEHOLDER}
        />
        <Cell
          label="总量"
          value={stats ? fmtBytes(stats.disk_total) : PLACEHOLDER}
        />
      </div>
      <div className="text-[10px]" style={{ color: "var(--ls-ink-faint)" }}>
        分盘明细与磁盘 IO 速率规划中
      </div>
    </div>
  );
}

function NetworkDetail({
  stats,
  netHist,
}: {
  stats: SystemStats | undefined;
  netHist: { up: number[]; down: number[] };
}) {
  const peakUp = netHist.up.length ? Math.max(...netHist.up) : 0;
  const peakDown = netHist.down.length ? Math.max(...netHist.down) : 0;
  return (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr] items-center gap-x-2 gap-y-2">
      <span className="text-[11px]" style={{ color: "var(--ls-ink-soft)" }}>
        上行
      </span>
      <Cell
        label="当前"
        value={stats ? fmtRate(stats.net_tx_rate) : PLACEHOLDER}
      />
      <Cell
        label="累计"
        value={stats ? fmtBytes(stats.net_tx_total) : PLACEHOLDER}
      />
      <Cell label="峰值" value={stats ? fmtRate(peakUp) : PLACEHOLDER} />

      <span className="text-[11px]" style={{ color: "var(--ls-life)" }}>
        下行
      </span>
      <Cell
        label="当前"
        value={stats ? fmtRate(stats.net_rx_rate) : PLACEHOLDER}
      />
      <Cell
        label="累计"
        value={stats ? fmtBytes(stats.net_rx_total) : PLACEHOLDER}
      />
      <Cell label="峰值" value={stats ? fmtRate(peakDown) : PLACEHOLDER} />
    </div>
  );
}

/** 紧凑读数:小标签 + 单行等宽数值(不换行),比 LS Readout 更小,适配固定框。 */
function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg px-2.5 py-1.5"
      style={{ background: "var(--ls-bg-2)" }}
    >
      <div className="text-[10px]" style={{ color: "var(--ls-ink-faint)" }}>
        {label}
      </div>
      <div className="ls-num mt-0.5 truncate text-xs font-medium">{value}</div>
    </div>
  );
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span
        className="text-[10px] font-medium"
        style={{ color: "var(--ls-ink-soft)" }}
      >
        {title}
      </span>
      {hint && (
        <span className="text-[10px]" style={{ color: "var(--ls-ink-faint)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}
