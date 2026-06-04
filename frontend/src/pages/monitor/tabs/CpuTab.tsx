import { motion } from "motion/react";

import { Card, Readout, Ring, Sparkline } from "@/components/ls";
import { springSettle } from "@/design/motion";
import {
  useLatestSample,
  useTimeSeries,
} from "@/services/metrics/timeSeriesStore";
import { HOST_SCOPE } from "@/services/metrics/types";
import type { MonitorTabProps } from "../types";
import { fmtPct, num } from "@/utils/format";

/**
 * CPU 详情 tab(value=cpu)。
 *
 * 三段式:左侧大号占用环(实时 cpu_usage)+ 右侧 72s 走势 Sparkline(取自全局时序 store 的
 * 'cpu' 序列);中段逐核栅格(useLatestSample().cores,后端启用 per-core 采集后才有,缺省显式提示
 * 不伪造);底部负载读数 + 静态 CPU 规格(品牌/主频/物理核/逻辑核/架构,来自 info)。
 *
 * 未就绪态:info/stats 首屏前为 undefined,数值一律走 PLACEHOLDER / num() 兜底,绝不臆造读数。
 * 时序与逐核数据由 MetricsSource 常驻订阅累积,与本 tab 透传的 stats 同源但路径独立,故直接订阅。
 */

const PLACEHOLDER = "—";

export function CpuTab({ info, stats }: MonitorTabProps) {
  // 时序与逐核来自全局持久化采集(跨页面常驻),与透传 stats 同源、路径独立,直接订阅即可。
  const cpuSeries = useTimeSeries(HOST_SCOPE, "cpu");
  const cores = useLatestSample(HOST_SCOPE)?.cores;

  const cpuPct = stats ? Math.round(num(stats.cpu_usage)) : 0;

  return (
    <motion.div
      className="grid grid-cols-12 gap-3"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
      }}
    >
      {/* 实时占用 + 走势:左环右折线 */}
      <Card className="col-span-12 flex flex-col gap-4 lg:col-span-7">
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-center">
            <Ring
              value={cpuPct}
              size={108}
              stroke={9}
              centerLabel={
                <span className="ls-num text-2xl font-semibold">
                  {stats ? fmtPct(stats.cpu_usage) : PLACEHOLDER}
                </span>
              }
            />
            <div
              className="mt-2 text-[11px]"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              CPU 占用
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div
              className="flex items-baseline justify-between text-[11px] font-medium"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              <span>占用走势</span>
              <span style={{ color: "var(--ls-ink-faint)" }}>近 72 秒</span>
            </div>
            {/* cpuSeries 由 store 预填 48 个基线点,恒满足 Sparkline 的 >=2 点要求 */}
            <Sparkline values={cpuSeries} className="mt-2 h-20 w-full" />
          </div>
        </div>
      </Card>

      {/* 系统负载:1 / 5 / 15 分钟运行队列 EWMA */}
      <Card className="col-span-12 lg:col-span-5">
        <div
          className="text-[11px] font-medium"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          系统负载
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
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

      {/* 逐核栅格:per-core 采集启用后逐格一竖条;否则显式提示,不伪造 */}
      <Card className="col-span-12">
        <div
          className="text-[11px] font-medium"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          逐核占用
        </div>
        {cores && cores.length > 0 ? (
          <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {cores.map((c, i) => (
              <CoreBar key={i} index={i} value={num(c)} />
            ))}
          </div>
        ) : (
          <div
            className="mt-3 text-xs"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            逐核数据采集中或当前环境不可用
          </div>
        )}
      </Card>

      {/* 静态规格:品牌 / 主频 / 物理核 / 逻辑核 / 架构 */}
      <Card className="col-span-12">
        <div
          className="text-[11px] font-medium"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          处理器规格
        </div>
        <div className="mt-1.5 text-sm font-medium">
          {info ? info.cpu_brand : PLACEHOLDER}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Readout
            label="主频"
            value={
              info && num(info.cpu_frequency) > 0
                ? `${(num(info.cpu_frequency) / 1000).toFixed(2)} GHz`
                : PLACEHOLDER
            }
          />
          <Readout
            label="物理核心"
            value={info ? String(num(info.cpu_physical_cores)) : PLACEHOLDER}
          />
          <Readout
            label="逻辑核心"
            value={info ? String(num(info.cpu_logical_cores)) : PLACEHOLDER}
          />
          <Readout
            label="架构"
            value={info && info.arch ? info.arch : PLACEHOLDER}
          />
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * 单核占用竖条 —— 生命色填充的迷你纵向 Meter,底部核序号(C0..)。
 * 高度按百分比从底部生长(钳 0-100),凹陷轨 + ls-num 序号,与 Meter/Ring 同视觉语言。
 */
function CoreBar({ index, value }: { index: number; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="relative flex h-20 w-full items-end overflow-hidden rounded-[10px]"
        style={{ background: "var(--ls-bg-2)" }}
      >
        <motion.div
          className="w-full rounded-[10px]"
          style={{ background: "var(--ls-life)" }}
          initial={{ height: 0 }}
          animate={{ height: `${pct}%` }}
          transition={{ ...springSettle, delay: 0.2 }}
        />
        <span
          className="ls-num absolute inset-x-0 top-1 text-center text-[10px] font-medium"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          {Math.round(pct)}
        </span>
      </div>
      <span
        className="ls-num text-[10px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        C{index}
      </span>
    </div>
  );
}
