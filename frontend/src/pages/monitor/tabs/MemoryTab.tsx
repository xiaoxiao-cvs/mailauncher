import { motion } from "motion/react";

import type { MonitorTabProps } from "../types";
import { Card, Meter, Readout, Sparkline } from "@/components/ls";
import { useTimeSeries } from "@/services/metrics/timeSeriesStore";
import { HOST_SCOPE } from "@/services/metrics/types";
import { fmtBytes, fmtGB } from "@/utils/format";

/**
 * 内存 tab(value=memory)。
 *
 * 物理内存与交换区(Swap)的占用详情 + 占用率走势 + 静态规格。
 * - 物理内存:Meter(已用/总量)+ 'mem' 占用率历史 Sparkline,数据来自实时 stats 与全局时序 store;
 * - Swap:swap_total 为 0(未配置交换)时显式提示"未启用 swap",不画占用条与走势,不伪造曲线;
 * - 静态规格:内存类型 / 频率(MT/s)/ 总量,来自一次性的 info,首屏就绪前以占位符降级。
 *
 * 时序 hook 须无条件调用(React 规则),故 mem/swap 两条序列恒读取,
 * 仅 Swap 已配置时才渲染其走势。info/stats 首屏为 undefined,逐处 guard。
 */

const PLACEHOLDER = "—";

/** Meter 右上读数:"已用 / 总量",stats 未就绪时降级为占位符。 */
function bytesPair(
  used: number | undefined,
  total: number | undefined,
): string {
  if (used === undefined || total === undefined) return PLACEHOLDER;
  return `${fmtBytes(used)} / ${fmtBytes(total)}`;
}

export function MemoryTab({ info, stats }: MonitorTabProps) {
  // 占用率历史(0-100 百分比,48 点平直基线起步);两条恒读取,渲染时按需取用。
  const memHistory = useTimeSeries(HOST_SCOPE, "mem");
  const swapHistory = useTimeSeries(HOST_SCOPE, "swap");

  // swap_total 为 0 即该机未配置交换区;stats 未就绪时不下此结论(保持占用条占位态)。
  const swapEnabled = stats !== undefined && stats.swap_total > 0;
  const swapUnconfigured = stats !== undefined && stats.swap_total === 0;

  // 静态规格:频率 0 表示未知;类型为空或 "未知" 视作缺失,统一降级为占位符。
  const memSpeed =
    info && info.memory_speed > 0 ? `${info.memory_speed} MT/s` : PLACEHOLDER;
  const memType =
    info && info.memory_type !== "" && info.memory_type !== "未知"
      ? info.memory_type
      : PLACEHOLDER;
  const memSize = info ? fmtGB(info.memory_total) : PLACEHOLDER;

  return (
    <motion.div
      className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06 } },
      }}
      initial="hidden"
      animate="show"
    >
      {/* 物理内存:占用条 + 占用率走势 */}
      <Card className="flex flex-col gap-4">
        <div
          className="text-[11px] font-medium uppercase tracking-[0.18em]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          物理内存
        </div>
        <Meter
          label="已用 / 总量"
          used={stats ? stats.memory_used : 0}
          total={stats ? stats.memory_total : 0}
          valueText={bytesPair(stats?.memory_used, stats?.memory_total)}
        />
        <div>
          <div
            className="mb-1.5 text-[11px]"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            占用率走势
          </div>
          <Sparkline values={memHistory} />
        </div>
      </Card>

      {/* 交换区(Swap):已配置则占用条 + 走势;未配置则显式提示,不画 */}
      <Card className="flex flex-col gap-4">
        <div
          className="text-[11px] font-medium uppercase tracking-[0.18em]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          交换区 (Swap)
        </div>
        {swapUnconfigured ? (
          <div
            className="flex flex-1 items-center justify-center py-6 text-sm"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            未启用 swap
          </div>
        ) : (
          <>
            <Meter
              label="已用 / 总量"
              used={stats ? stats.swap_used : 0}
              total={stats ? stats.swap_total : 0}
              valueText={bytesPair(stats?.swap_used, stats?.swap_total)}
            />
            {swapEnabled && (
              <div>
                <div
                  className="mb-1.5 text-[11px]"
                  style={{ color: "var(--ls-ink-soft)" }}
                >
                  占用率走势
                </div>
                <Sparkline values={swapHistory} />
              </div>
            )}
          </>
        )}
      </Card>

      {/* 静态规格:类型 / 频率 / 总量 */}
      <Card className="lg:col-span-2">
        <div
          className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          内存规格
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Readout label="内存类型" value={memType} />
          <Readout label="频率" value={memSpeed} />
          <Readout label="总量" value={memSize} />
        </div>
      </Card>
    </motion.div>
  );
}
