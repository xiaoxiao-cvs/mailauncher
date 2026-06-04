import { motion } from "motion/react";

import type { MonitorTabProps } from "../types";
import { Card, Meter, Readout, Sparkline } from "@/components/ls";
import { useTimeSeries } from "@/services/metrics/timeSeriesStore";
import { HOST_SCOPE } from "@/services/metrics/types";
import { num, fmtBytes } from "@/utils/format";

/**
 * 硬盘 tab(value=disk)。
 *
 * 聚合呈现整机所有磁盘的容量占用:占用条 + 近 72s 占用率走势 + 已用/可用/总量三联读数。
 * 后端(sysinfo 0.33)仅暴露聚合容量,无 disk_used 字段 -> 已用 = disk_total - disk_available;
 * 同样无逐盘明细与磁盘 IO 速率 API,故本期不做分盘与 IO,底部以小字标注规划中,绝不伪造读数。
 *
 * 数据来源:MonitorPage 顶层一次 useSystemMonitor() 透传的 stats(首屏就绪前为 undefined,
 * 走 PLACEHOLDER 占位);占用率历史取自全局时序单例(常驻采集,与 stats 同源但独立累积,
 * 即使本 tab 首次挂载也已是 48 点平直基线,无需额外 guard 点数)。
 */
const PLACEHOLDER = "—";

// Card 的入场子变体由父级 staggerChildren 编排触发,故本 tab 自带 variants 容器
// (MonitorPage 仅提供 TabsContent 外壳,不含 stagger 父级)。
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export function DiskTab({ stats }: MonitorTabProps) {
  // 占用率走势:0-100 百分比序列,全局单例预填 48 个 0,始终满足 Sparkline 的最少两点约定。
  const diskHistory = useTimeSeries(HOST_SCOPE, "disk");

  const total = num(stats?.disk_total);
  const available = num(stats?.disk_available);
  // 物理上 available <= total;钳负仅防御后端聚合瞬时不一致,非掩盖业务异常。
  const used = Math.max(0, total - available);

  const meterValueText = stats
    ? fmtBytes(used) + " / " + fmtBytes(total)
    : PLACEHOLDER;

  return (
    <motion.div
      className="flex flex-col gap-3"
      initial="hidden"
      animate="show"
      variants={container}
    >
      <Card>
        <div
          className="text-[11px] font-medium uppercase tracking-[0.12em]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          磁盘容量
        </div>

        <div className="mt-3">
          <Meter
            label="占用"
            used={used}
            total={total}
            valueText={meterValueText}
          />
        </div>

        <div className="mt-4">
          <div
            className="mb-1.5 text-[11px] font-medium"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            占用率走势
          </div>
          <Sparkline values={diskHistory} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Readout label="已用" value={stats ? fmtBytes(used) : PLACEHOLDER} />
          <Readout
            label="可用"
            value={stats ? fmtBytes(available) : PLACEHOLDER}
          />
          <Readout label="总量" value={stats ? fmtBytes(total) : PLACEHOLDER} />
        </div>

        <p
          className="mt-4 text-[11px]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          分盘明细与磁盘 IO 速率规划中
        </p>
      </Card>
    </motion.div>
  );
}
