import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { LayoutGroup, motion } from "motion/react";
import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";

import { MirrorGraph, Ring, Sparkline } from "@/components/ls";
import { springMorph, springSettle, springSoft } from "@/design/motion";
import { useNetHistory } from "@/services/netHistoryStore";
import { useTimeSeries } from "@/services/metrics/timeSeriesStore";
import { HOST_SCOPE } from "@/services/metrics/types";
import { getTopProcesses } from "@/services/systemApi";
import { fmtBytes, fmtGB, fmtRate, num } from "@/utils/format";
import type { SystemInfo, SystemStats } from "@/services/systemApi";

/**
 * 系统卡 —— 暖色 bento 拟物磁贴(方案 D) + 容器形变钻取。
 *
 * 折叠态:非对称 bento 网格,CPU 占大格,内存竖跨,Swap/磁盘并列小格,网络横跨底栏。
 * 每块是微凸暖面瓦片(--ls-surface + 柔影 + 顶高光,零玻璃)。
 *
 * 钻取(关键):被点的那块瓦片**本体**(同一元素,不换层)用 `layout` 从它的格子**连续长大**到铺满整张卡
 * (绝对定位 + 高 z-index,**不透明**,故盖住其余),其余瓦片快速淡出。因为全程只有这一块在动布局、
 * 且它不透明地占据画面,所以"从哪来到哪去"清清楚楚、不会出现两层重叠的鬼影。再点它收回原格。
 *
 * 铁律:卡是固定高度的框,折叠/详情共用同一框、绝不改尺寸。
 */

/** 固定框高(px):bento 概览与 CPU 详情共用同一框;加高以容下 bento 五块不挤。 */
const FRAME_H = 440;
const TILE_RADIUS = 14;
const PLACEHOLDER = "—";
/** 进程行行距(px):据此按进程表可用高度推算可容纳行数,自适应铺满(行高约 16 + 行距)。 */
const ROW_PITCH = 22;
/** 进程表最少行数(容器极矮时的下限)。 */
const MIN_ROWS = 4;

type ResKey = "cpu" | "memory" | "swap" | "disk" | "network";

const META: Record<ResKey, { icon: string; label: string }> = {
  cpu: { icon: "ph:cpu-thin", label: "CPU" },
  memory: { icon: "ph:memory-thin", label: "内存" },
  swap: { icon: "ph:swap-thin", label: "交换区" },
  disk: { icon: "ph:hard-drives-thin", label: "磁盘" },
  network: { icon: "ph:wifi-high-thin", label: "网络" },
};

const TILES: { key: ResKey; area: string; pad: number }[] = [
  { key: "cpu", area: "cpu", pad: 12 },
  { key: "memory", area: "mem", pad: 12 },
  { key: "swap", area: "swap", pad: 12 },
  { key: "disk", area: "disk", pad: 12 },
  { key: "network", area: "net", pad: 11 },
];

/** 瓦片视觉(暖面 + 发丝边 + 柔影 + 顶高光);折叠/展开同一元素,故同视觉无缝。 */
const TILE_VISUAL: CSSProperties = {
  borderRadius: TILE_RADIUS,
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-hairline)",
  boxShadow: "var(--ls-shadow-soft), inset 0 1px 0 var(--ls-top-hi)",
  overflow: "hidden",
};

/** 占用率 → 生命色 / 暖琥珀(>=85% 提示),克制点缀。 */
function tone(pct: number): { tone: string; soft: string } {
  return pct >= 85
    ? { tone: "var(--ls-warn)", soft: "var(--ls-warn-soft)" }
    : { tone: "var(--ls-life)", soft: "var(--ls-life-soft)" };
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
  const cpuHist = useTimeSeries(HOST_SCOPE, "cpu");

  return (
    <motion.div
      className="col-span-12 lg:col-span-4"
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      transition={springSoft}
    >
      <LayoutGroup>
        <div
          className="relative"
          style={{ height: FRAME_H, ...TILE_VISUAL, borderRadius: 16 }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: 12,
              display: "grid",
              gap: 10,
              gridTemplateColumns: "1fr 1fr 0.92fr",
              gridTemplateRows: "1.32fr 1fr 0.92fr",
              gridTemplateAreas: `
                "cpu cpu mem"
                "swap disk mem"
                "net net net"
              `,
            }}
          >
            {TILES.map((t) => {
              const isExp = expanded === t.key;
              const dim = expanded !== null && !isExp;
              return (
                <motion.button
                  key={t.key}
                  type="button"
                  layout
                  transition={{
                    layout: springMorph,
                    opacity: { duration: 0.12 },
                  }}
                  onClick={() => setExpanded(isExp ? null : t.key)}
                  whileHover={isExp ? undefined : { y: -2 }}
                  animate={{ opacity: dim ? 0 : 1 }}
                  style={{
                    ...TILE_VISUAL,
                    ...(isExp
                      ? {
                          position: "absolute",
                          inset: 0,
                          zIndex: 10,
                          padding: 14,
                        }
                      : {
                          gridArea: t.area,
                          position: "relative",
                          padding: t.pad,
                        }),
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                    textAlign: "left",
                    cursor: "pointer",
                    pointerEvents: dim ? "none" : "auto",
                  }}
                >
                  {isExp ? (
                    <DetailBody
                      resKey={t.key}
                      info={info}
                      stats={stats}
                      netHist={netHist}
                    />
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: 0.06 }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        minHeight: 0,
                      }}
                    >
                      <TileBody
                        resKey={t.key}
                        info={info}
                        stats={stats}
                        cpuHist={cpuHist}
                        netHist={netHist}
                      />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </LayoutGroup>
    </motion.div>
  );
}

/** 折叠态瓦片内容(按资源分派)。 */
function TileBody({
  resKey,
  info,
  stats,
  cpuHist,
  netHist,
}: {
  resKey: ResKey;
  info: SystemInfo | undefined;
  stats: SystemStats | undefined;
  cpuHist: number[];
  netHist: { up: number[]; down: number[] };
}) {
  switch (resKey) {
    case "cpu":
      return <CpuTile info={info} stats={stats} cpuHist={cpuHist} />;
    case "memory":
      return <MemTile info={info} stats={stats} />;
    case "swap":
      return <SwapTile stats={stats} />;
    case "disk":
      return <DiskTile stats={stats} />;
    case "network":
      return <NetTile stats={stats} netHist={netHist} />;
  }
}

function CpuTile({
  info,
  stats,
  cpuHist,
}: {
  info: SystemInfo | undefined;
  stats: SystemStats | undefined;
  cpuHist: number[];
}) {
  const cpu = stats ? num(stats.cpu_usage) : 0;
  return (
    <>
      <TileHead
        morphKey="cpu"
        icon={META.cpu.icon}
        label="CPU"
        trailing={
          <span
            className="ls-num"
            style={{ fontSize: 10.5, color: "var(--ls-ink-faint)" }}
          >
            {stats && num(stats.cpu_freq_mhz) > 0
              ? `${(num(stats.cpu_freq_mhz) / 1000).toFixed(1)} GHz`
              : info
                ? `${(num(info.cpu_frequency) / 1000).toFixed(1)} GHz`
                : ""}
          </span>
        }
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 8,
          flex: 1,
          minHeight: 0,
        }}
      >
        <Ring
          value={Math.round(cpu)}
          size={72}
          stroke={7}
          centerLabel={<RingNum value={cpu} big={18} />}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: "var(--ls-ink)",
              lineHeight: 1.25,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {info ? info.cpu_brand : PLACEHOLDER}
          </div>
          <div
            className="ls-num"
            style={{
              marginTop: 4,
              fontSize: 10.5,
              color: "var(--ls-ink-soft)",
            }}
          >
            {info
              ? `${num(info.cpu_physical_cores)}核 ${num(info.cpu_logical_cores)}线程`
              : PLACEHOLDER}
          </div>
        </div>
      </div>
      <div style={{ height: 30, marginTop: 6 }}>
        <Sparkline values={cpuHist} className="h-full w-full" />
      </div>
    </>
  );
}

function MemTile({
  info,
  stats,
}: {
  info: SystemInfo | undefined;
  stats: SystemStats | undefined;
}) {
  const used = stats ? num(stats.memory_used) : 0;
  const total = stats ? num(stats.memory_total) : 0;
  const pct = total > 0 ? (used / total) * 100 : 0;
  return (
    <>
      <TileHead morphKey="memory" icon={META.memory.icon} label="内存" />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <Ring
          value={Math.round(pct)}
          size={64}
          stroke={7}
          centerLabel={<RingNum value={pct} big={17} />}
        />
        <div style={{ textAlign: "center", lineHeight: 1.35 }}>
          <div className="ls-num" style={{ fontSize: 14, fontWeight: 600 }}>
            {stats ? fmtGB(used) : PLACEHOLDER}
          </div>
          <div
            className="ls-num"
            style={{ fontSize: 10.5, color: "var(--ls-ink-faint)" }}
          >
            共 {stats ? fmtGB(total) : PLACEHOLDER}
            {info && info.memory_type && info.memory_type !== "未知"
              ? ` · ${info.memory_type}`
              : ""}
          </div>
        </div>
      </div>
    </>
  );
}

function SwapTile({ stats }: { stats: SystemStats | undefined }) {
  const used = stats ? num(stats.swap_used) : 0;
  const total = stats ? num(stats.swap_total) : 0;
  const pct = total > 0 ? (used / total) * 100 : 0;
  return (
    <>
      <TileHead morphKey="swap" icon={META.swap.icon} label="交换区" />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 7,
        }}
      >
        <div
          className="ls-num"
          style={{ fontSize: 15, fontWeight: 600, color: "var(--ls-ink)" }}
        >
          {pct < 0.05 ? (
            <span style={{ color: "var(--ls-ink-soft)" }}>空闲</span>
          ) : (
            fmtGB(used)
          )}
        </div>
        <MiniBar pct={pct} color="var(--ls-life)" />
        <div style={{ fontSize: 10, color: "var(--ls-ink-faint)" }}>
          共 {stats ? fmtGB(total) : PLACEHOLDER}
        </div>
      </div>
    </>
  );
}

function DiskTile({ stats }: { stats: SystemStats | undefined }) {
  const total = stats ? num(stats.disk_total) : 0;
  const avail = stats ? num(stats.disk_available) : 0;
  const used = Math.max(0, total - avail);
  const pct = total > 0 ? (used / total) * 100 : 0;
  const t = tone(pct);
  return (
    <>
      <TileHead morphKey="disk" icon={META.disk.icon} label="磁盘" />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 7,
        }}
      >
        <div
          className="ls-num"
          style={{ fontSize: 15, fontWeight: 600, color: "var(--ls-ink)" }}
        >
          {Math.round(pct)}
          <span style={{ fontSize: 11, color: "var(--ls-ink-faint)" }}> %</span>
          {stats ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--ls-ink-soft)",
              }}
            >
              {" · "}
              {fmtBytes(used)}
            </span>
          ) : null}
        </div>
        <MiniBar pct={pct} color={t.tone} />
        <div
          className="ls-num"
          style={{ fontSize: 10, color: "var(--ls-ink-faint)" }}
        >
          {stats ? `${fmtBytes(avail)} 可用` : PLACEHOLDER}
        </div>
      </div>
    </>
  );
}

function NetTile({
  stats,
  netHist,
}: {
  stats: SystemStats | undefined;
  netHist: { up: number[]; down: number[] };
}) {
  const rx = stats ? num(stats.net_rx_rate) : 0;
  const tx = stats ? num(stats.net_tx_rate) : 0;
  return (
    <>
      <TileHead
        morphKey="network"
        icon={META.network.icon}
        label="网络"
        trailing={
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 10.5,
            }}
          >
            <NetLeg dir="down" rate={rx} />
            <NetLeg dir="up" rate={tx} />
          </span>
        }
      />
      <div style={{ flex: 1, minHeight: 0, marginTop: 4 }}>
        <MirrorGraph
          top={netHist.up}
          bottom={netHist.down}
          topColor="var(--ls-ink-soft)"
          bottomColor="var(--ls-life)"
          className="h-full w-full"
        />
      </div>
    </>
  );
}

/** 展开态:头部(图标 + 标签 + 收起提示)+ 资源详情;整块可点收回(详情只读,无嵌套按钮)。 */
function DetailBody({
  resKey,
  info,
  stats,
  netHist,
}: {
  resKey: ResKey;
  info: SystemInfo | undefined;
  stats: SystemStats | undefined;
  netHist: { up: number[]; down: number[] };
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, delay: 0.06 }}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <HeadIdentity
          morphKey={resKey}
          icon={META[resKey].icon}
          label={META[resKey].label}
        />
        <Icon
          icon="ph:caret-up-thin"
          width={14}
          height={14}
          className="ml-auto"
          style={{ color: "var(--ls-ink-faint)" }}
        />
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
        <ResourceDetail
          kind={resKey}
          info={info}
          stats={stats}
          netHist={netHist}
        />
      </div>
    </motion.div>
  );
}

/** 头部身份(图标托盘 + 标签):折叠瓦片头与详情头共用同一 layoutId,morph 时从瓦片原位滑到详情头部,不闪。 */
function HeadIdentity({
  morphKey,
  icon,
  label,
}: {
  morphKey: string;
  icon: string;
  label: string;
}) {
  return (
    <>
      <motion.span
        layoutId={`head-icon-${morphKey}`}
        transition={springMorph}
        style={{
          display: "grid",
          placeItems: "center",
          width: 20,
          height: 20,
          borderRadius: 7,
          background: "var(--ls-life-soft)",
          color: "var(--ls-life)",
          flexShrink: 0,
        }}
      >
        <Icon icon={icon} width={13} height={13} />
      </motion.span>
      <motion.span
        layoutId={`head-label-${morphKey}`}
        transition={springMorph}
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.2,
          color: "var(--ls-ink-soft)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </motion.span>
    </>
  );
}

/** 瓦片头:头部身份(可 morph)+ 可选右侧读数。 */
function TileHead({
  morphKey,
  icon,
  label,
  trailing,
}: {
  morphKey: string;
  icon: string;
  label: string;
  trailing?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
      <HeadIdentity morphKey={morphKey} icon={icon} label={label} />
      {trailing != null && (
        <span style={{ marginLeft: "auto", flexShrink: 0 }}>{trailing}</span>
      )}
    </div>
  );
}

/** 环心数字:大号整数 + 小号 %。 */
function RingNum({ value, big }: { value: number; big: number }) {
  return (
    <span style={{ display: "grid", placeItems: "center", lineHeight: 1 }}>
      <span className="ls-num" style={{ fontSize: big, fontWeight: 600 }}>
        {Math.round(value)}
      </span>
      <span style={{ fontSize: 9, color: "var(--ls-ink-faint)" }}>%</span>
    </span>
  );
}

/** 细瓦片内的内嵌占用条(替代 Meter,贴合 bento 紧凑高度)。 */
function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div
      style={{
        height: 6,
        width: "100%",
        borderRadius: 999,
        background: "var(--ls-bg-2)",
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={false}
        animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        transition={springSettle}
        style={{ height: "100%", borderRadius: 999, background: color }}
      />
    </div>
  );
}

/** 网络单向速率:方向箭头 + 等宽速率(下行生命色 / 上行柔墨)。 */
function NetLeg({ dir, rate }: { dir: "up" | "down"; rate: number }) {
  const color = dir === "down" ? "var(--ls-life)" : "var(--ls-ink-soft)";
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <Icon
        icon={dir === "down" ? "ph:arrow-down-thin" : "ph:arrow-up-thin"}
        width={12}
        height={12}
        style={{ color }}
      />
      <span className="ls-num" style={{ color: "var(--ls-ink-soft)" }}>
        {fmtRate(rate)}
      </span>
    </span>
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
        <ProcessList by="cpu" />
      </div>
    </div>
  );
}

/** 进程占用表:top-N 系统进程,按 by(cpu/memory)降序,打开期间轮询采样;排序列加粗、另一列淡化。 */
function ProcessList({ by }: { by: "cpu" | "memory" }) {
  // 按进程表可用高度自适应行数:量出容器高 / 行距,矮则少、高则多,正好铺满不留空也不溢出
  const listRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(8);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () =>
      setRows(Math.max(MIN_ROWS, Math.floor(el.clientHeight / ROW_PITCH)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { data } = useQuery({
    queryKey: ["top-processes", by, rows],
    queryFn: () => getTopProcesses(rows, by),
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
        <span style={{ color: "var(--ls-ink-faint)" }}>
          {by === "memory" ? "内存 · CPU" : "CPU · 内存"}
        </span>
      </div>
      <div
        ref={listRef}
        className="mt-2 min-h-0 flex-1 space-y-1 overflow-hidden"
      >
        {procs.length === 0 ? (
          <div className="text-[11px]" style={{ color: "var(--ls-ink-faint)" }}>
            正在采样进程占用…
          </div>
        ) : (
          procs.map((p) => {
            const cpu = (
              <span
                className={`ls-num w-12 text-right ${by === "cpu" ? "font-medium" : ""}`}
                style={{
                  color: by === "cpu" ? "var(--ls-ink)" : "var(--ls-ink-faint)",
                }}
              >
                {p.cpu.toFixed(1)}%
              </span>
            );
            const mem = (
              <span
                className={`ls-num w-16 text-right ${by === "memory" ? "font-medium" : ""}`}
                style={{
                  color:
                    by === "memory" ? "var(--ls-ink)" : "var(--ls-ink-faint)",
                }}
              >
                {fmtBytes(p.memory)}
              </span>
            );
            return (
              <div key={p.pid} className="flex items-center gap-2 text-[11px]">
                <span
                  className="flex-1 truncate"
                  style={{ color: "var(--ls-ink)" }}
                >
                  {p.name}
                </span>
                {by === "memory" ? (
                  <>
                    {mem}
                    {cpu}
                  </>
                ) : (
                  <>
                    {cpu}
                    {mem}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
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
    <div className="flex h-full flex-col gap-3">
      <div>
        <SectionHead title="占用走势" hint="近 72 秒" />
        <Sparkline values={series} className="mt-1.5 h-12 w-full" />
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
      <div className="min-h-0 flex-1">
        <ProcessList by="memory" />
      </div>
    </div>
  );
}

function SwapDetail({ stats }: { stats: SystemStats | undefined }) {
  const series = useTimeSeries(HOST_SCOPE, "swap");
  if (stats && stats.swap_total === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        当前系统未启用交换区(Swap)
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col">
        <SectionHead title="占用走势" hint="近 72 秒" />
        <div className="mt-1.5 min-h-0 flex-1">
          <Sparkline values={series} className="h-full w-full" />
        </div>
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
  const read = useTimeSeries(HOST_SCOPE, "diskRead");
  const write = useTimeSeries(HOST_SCOPE, "diskWrite");
  const peakRead = read.length ? Math.max(...read) : 0;
  const peakWrite = write.length ? Math.max(...write) : 0;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="h-24">
        <MirrorGraph
          top={read}
          bottom={write}
          topColor="var(--ls-life)"
          bottomColor="var(--ls-ink-soft)"
          className="h-full w-full"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <SectionHead title="分区" hint="容量占用" />
        <div className="mt-1.5 space-y-1.5">
          {(stats?.disk_partitions ?? []).map((p) => {
            const used = p.total - p.available;
            const pct = p.total > 0 ? (used / p.total) * 100 : 0;
            return (
              <div
                key={p.mount}
                className="flex items-center gap-2.5 text-[11px]"
              >
                <span
                  className="ls-num w-8 font-medium"
                  style={{ color: "var(--ls-ink)" }}
                >
                  {p.mount}
                </span>
                <div className="flex-1">
                  <MiniBar pct={pct} color={tone(pct).tone} />
                </div>
                <span
                  className="ls-num shrink-0"
                  style={{ color: "var(--ls-ink-soft)" }}
                >
                  {fmtBytes(used)} / {fmtBytes(p.total)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr_1fr_1fr] items-center gap-x-2 gap-y-2">
        <span className="text-[11px]" style={{ color: "var(--ls-life)" }}>
          读取
        </span>
        <Cell
          label="当前"
          value={stats ? fmtRate(stats.disk_read_rate) : PLACEHOLDER}
        />
        <Cell
          label="累计"
          value={stats ? fmtBytes(stats.disk_read_total) : PLACEHOLDER}
        />
        <Cell label="峰值" value={stats ? fmtRate(peakRead) : PLACEHOLDER} />

        <span className="text-[11px]" style={{ color: "var(--ls-ink-soft)" }}>
          写入
        </span>
        <Cell
          label="当前"
          value={stats ? fmtRate(stats.disk_write_rate) : PLACEHOLDER}
        />
        <Cell
          label="累计"
          value={stats ? fmtBytes(stats.disk_write_total) : PLACEHOLDER}
        />
        <Cell label="峰值" value={stats ? fmtRate(peakWrite) : PLACEHOLDER} />
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
    <div className="flex h-full flex-col gap-3">
      <div className="h-24">
        <MirrorGraph
          top={netHist.up}
          bottom={netHist.down}
          topColor="var(--ls-ink-soft)"
          bottomColor="var(--ls-life)"
          className="h-full w-full"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <SectionHead title="网卡" hint="实时吞吐" />
        <div className="mt-1.5 space-y-1">
          {(stats?.net_interfaces ?? []).map((nic) => (
            <div key={nic.name} className="flex items-center gap-2 text-[11px]">
              <span
                className="flex-1 truncate"
                style={{ color: "var(--ls-ink)" }}
              >
                {nic.name}
              </span>
              <span
                className="ls-num flex w-20 items-center justify-end gap-1"
                style={{ color: "var(--ls-life)" }}
              >
                <Icon icon="ph:arrow-down-thin" width={11} height={11} />
                {fmtRate(nic.rx_rate)}
              </span>
              <span
                className="ls-num flex w-20 items-center justify-end gap-1"
                style={{ color: "var(--ls-ink-soft)" }}
              >
                <Icon icon="ph:arrow-up-thin" width={11} height={11} />
                {fmtRate(nic.tx_rate)}
              </span>
            </div>
          ))}
        </div>
      </div>
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
    </div>
  );
}

/** 紧凑读数:小标签 + 单行等宽数值(不换行),适配固定框。 */
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
