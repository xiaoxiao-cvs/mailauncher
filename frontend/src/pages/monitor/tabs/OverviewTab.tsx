import { motion } from "motion/react";
import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";

import { Card, Meter, MirrorGraph, Readout, Ring } from "@/components/ls";
import { useNetHistory } from "@/services/netHistoryStore";
import { num, fmtBytes, fmtGB, fmtRate } from "@/utils/format";
import type { MonitorTabProps, SystemInfo } from "../types";

/**
 * 系统总览 tab(value=overview)。
 *
 * 首页系统卡的完整版:顶部三项关键指标(CPU 占用环 / 内存条 / 磁盘条),
 * 中段负载读数 + 网络上下行镜像波形,底部静态系统配置规格。
 * info/stats 在首屏就绪前为 undefined,逐处经 PLACEHOLDER 兜底,绝不伪造读数;
 * 容器用 staggerChildren 编排,各 Card 自带 child 变体逐张淡入上移(与首页一致)。
 */

const PLACEHOLDER = "—";

/** 容器交错入场:子 Card 用自身 child 变体(淡入上移),此处仅排程节奏。 */
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

/**
 * 内存规格整行:"93.1 GB · DDR5 6400 MT/s",类型/频率缺项逐级降级。
 * 与首页 fmtMemFull 同语义,就近重建(format.ts 未抽出此拼读,不复用首页私有副本)。
 */
function fmtMemSpec(info: SystemInfo): string {
  const size = fmtGB(info.memory_total);
  const hasType = info.memory_type !== "" && info.memory_type !== "未知";
  const hasSpeed = info.memory_speed > 0;
  if (hasType && hasSpeed)
    return `${size} · ${info.memory_type} ${info.memory_speed} MT/s`;
  if (hasType) return `${size} · ${info.memory_type}`;
  if (hasSpeed) return `${size} · ${info.memory_speed} MT/s`;
  return size;
}

export function OverviewTab({ info, stats }: MonitorTabProps) {
  // 网络历史来自全局持久化 store(跨页面常驻累积、预填基线),不在本 tab 内逐帧累积。
  const netHist = useNetHistory();
  const peakDown = netHist.down.length ? Math.max(...netHist.down) : 0;
  const peakUp = netHist.up.length ? Math.max(...netHist.up) : 0;

  // 磁盘无 disk_used 字段:已用 = 总量 - 可用。
  const diskUsed = stats ? stats.disk_total - stats.disk_available : 0;

  return (
    <motion.div
      className="grid grid-cols-12 gap-3"
      initial="hidden"
      animate="show"
      variants={containerVariants}
    >
      {/* 关键指标:CPU 占用环 + 内存 / 磁盘占用条 */}
      <Card className="col-span-12 flex flex-col gap-5 lg:col-span-7 lg:flex-row lg:items-center">
        <div className="flex flex-shrink-0 flex-col items-center">
          <Ring
            value={stats ? Math.round(num(stats.cpu_usage)) : 0}
            size={88}
            stroke={8}
          />
          <div
            className="mt-2 text-[11px] font-medium"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            CPU 占用
          </div>
          <div
            className="ls-num mt-0.5 text-[11px]"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            {stats ? `${stats.cpu_core_count} 线程` : PLACEHOLDER}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <Meter
            label="内存"
            used={stats ? stats.memory_used : 0}
            total={stats ? stats.memory_total : 0}
            valueText={
              stats
                ? `${fmtBytes(stats.memory_used)} / ${fmtBytes(stats.memory_total)}`
                : PLACEHOLDER
            }
          />
          <Meter
            label="磁盘"
            used={diskUsed}
            total={stats ? stats.disk_total : 0}
            valueText={
              stats
                ? `${fmtBytes(diskUsed)} / ${fmtBytes(stats.disk_total)}`
                : PLACEHOLDER
            }
          />
        </div>
      </Card>

      {/* 系统负载:1 / 5 / 15 分钟平均 */}
      <Card className="col-span-12 flex flex-col lg:col-span-5">
        <div
          className="text-[11px] font-medium"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          系统负载
        </div>
        <div className="mt-3 grid flex-1 grid-cols-3 gap-2">
          <Readout
            label="1 分钟"
            value={stats ? num(stats.load_avg_1).toFixed(2) : PLACEHOLDER}
          />
          <Readout
            label="5 分钟"
            value={stats ? num(stats.load_avg_5).toFixed(2) : PLACEHOLDER}
          />
          <Readout
            label="15 分钟"
            value={stats ? num(stats.load_avg_15).toFixed(2) : PLACEHOLDER}
          />
        </div>
      </Card>

      {/* 网络:上下行镜像波形 + 每方向当前 / 峰值 */}
      <Card className="col-span-12">
        <div className="flex items-baseline justify-between">
          <div
            className="text-[11px] font-medium"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            网络吞吐
          </div>
          <div
            className="ls-num text-[11px]"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            本会话累计 ↑{stats ? fmtBytes(stats.net_tx_total) : PLACEHOLDER} ↓
            {stats ? fmtBytes(stats.net_rx_total) : PLACEHOLDER}
          </div>
        </div>

        {/* 上行朝上(柔墨)/ 下行朝下(生命色),与 ↑/↓ 箭头朝向一致;中轴一个分流图标 */}
        <div className="relative mt-3">
          <MirrorGraph
            top={netHist.up}
            bottom={netHist.down}
            topColor="var(--ls-ink-soft)"
            bottomColor="var(--ls-life)"
            className="h-16 w-full"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{
                background: "var(--ls-surface-hi)",
                boxShadow: "var(--ls-shadow-soft)",
              }}
            >
              <ArrowDownUp size={13} style={{ color: "var(--ls-ink-soft)" }} />
            </div>
          </div>
        </div>

        <div
          className="mt-3 grid grid-cols-[auto_1fr_1fr] items-center gap-x-3 gap-y-2 border-t pt-3"
          style={{ borderColor: "var(--ls-hairline)" }}
        >
          <ArrowUp size={13} style={{ color: "var(--ls-ink-soft)" }} />
          <NetCell
            label="上行"
            value={stats ? fmtRate(stats.net_tx_rate) : PLACEHOLDER}
          />
          <NetCell
            label="上行峰值"
            value={stats ? fmtRate(peakUp) : PLACEHOLDER}
          />

          <ArrowDown size={13} style={{ color: "var(--ls-life)" }} />
          <NetCell
            label="下行"
            value={stats ? fmtRate(stats.net_rx_rate) : PLACEHOLDER}
          />
          <NetCell
            label="下行峰值"
            value={stats ? fmtRate(peakDown) : PLACEHOLDER}
          />
        </div>
      </Card>

      {/* 静态系统配置规格 */}
      <Card className="col-span-12">
        <div
          className="text-[11px] font-medium"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          系统配置
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SpecRow label="处理器" value={info ? info.cpu_brand : PLACEHOLDER} />
          <SpecRow label="内存" value={info ? fmtMemSpec(info) : PLACEHOLDER} />
          <SpecRow
            label="显卡"
            value={
              info
                ? info.gpus.length > 0
                  ? info.gpus.join(" · ")
                  : "集成 / 无独显"
                : PLACEHOLDER
            }
          />
          <SpecRow
            label="存储"
            value={stats ? fmtBytes(stats.disk_total) : PLACEHOLDER}
          />
          <SpecRow
            label="系统"
            value={info ? info.os_long_version : PLACEHOLDER}
          />
        </div>
      </Card>
    </motion.div>
  );
}

/** 网络明细单元:小标签在上、tabular 数值在下,用于网络卡底部两列。 */
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

/** 系统规格行:左标签 + 右等宽值,长值(CPU 品牌串)换行不截断。 */
function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ls-inset flex items-baseline justify-between gap-2 px-3 py-2">
      <span
        className="shrink-0 text-xs"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        {label}
      </span>
      <span
        className="ls-num min-w-0 text-right text-xs"
        style={{ color: "var(--ls-ink-soft)" }}
      >
        {value}
      </span>
    </div>
  );
}
