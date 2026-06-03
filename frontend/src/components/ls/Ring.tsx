import * as React from "react";
import { motion } from "motion/react";

import { springSettle } from "@/design/motion";

/**
 * 环形占用 —— 生命色描边的进度环,中心叠等宽百分数。
 * 默认尺寸 60 / 描边 6(半径 24),与看板系统面板的 CPU 环一致。
 * value 为 0-100 的百分比,入场用 springSettle 从空环画到目标弧长。
 */
export interface RingProps {
  /** 占用百分比(0-100) */
  value: number;
  /** 外框边长(像素),描边宽据此居中布线 */
  size?: number;
  /** 描边宽度(像素) */
  stroke?: number;
  /** 中心标签;省略时显示 `${value}%`(如负载环传入负载数值) */
  centerLabel?: React.ReactNode;
}

export const Ring = React.forwardRef<HTMLDivElement, RingProps>(
  ({ value, size = 60, stroke = 6, centerLabel }, ref) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const center = size / 2;
    return (
      <div
        ref={ref}
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke="var(--ls-hairline)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke="var(--ls-life)"
            strokeWidth={stroke}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - value / 100) }}
            transition={{ ...springSettle, delay: 0.2 }}
          />
        </svg>
        <div className="ls-num absolute inset-0 flex items-center justify-center text-sm font-semibold">
          {centerLabel ?? `${value}%`}
        </div>
      </div>
    );
  },
);
Ring.displayName = "Ring";
