import * as React from "react";
import { motion } from "motion/react";

import { springSettle } from "@/design/motion";

/**
 * 占用条 —— "标签 + 右侧读数 + 生命色进度条"。
 * 进度由 used/total 计算并钳制到 0-100;右侧读数文案(单位换算)由调用方提供,
 * 组件本身不绑定字节/GB 等具体单位,保持复用性(内存、磁盘、任意比率均可用)。
 */
export interface MeterProps {
  label: string;
  /** 已用量(与 total 同单位,仅用于算百分比) */
  used: number;
  /** 总量(与 used 同单位) */
  total: number;
  /** 右上角读数文案(已格式化,如 "6.2 GB / 16.0 GB") */
  valueText: string;
}

export const Meter = React.forwardRef<HTMLDivElement, MeterProps>(
  ({ label, used, total, valueText }, ref) => {
    const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
    return (
      <div ref={ref}>
        <div className="flex items-baseline justify-between">
          <div
            className="text-[11px] font-medium"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            {label}
          </div>
          <span
            className="ls-num text-xs"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            {valueText}
          </span>
        </div>
        <div
          className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
          style={{ background: "var(--ls-bg-2)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--ls-life)" }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ ...springSettle, delay: 0.25 }}
          />
        </div>
      </div>
    );
  },
);
Meter.displayName = "Meter";
