import * as React from "react";

import { Card } from "./Card";

/**
 * 指标卡 —— 卡片内"标签 + 大号等宽数值 + 可选副文案"的紧凑读数。
 * 数值用 .ls-num 等宽数字,避免轮询刷新时抖动。
 */
export interface StatProps {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}

export const Stat = React.forwardRef<HTMLDivElement, StatProps>(
  ({ label, value, sub, className }, ref) => (
    <Card ref={ref} className={className}>
      <div
        className="text-[11px] font-medium"
        style={{ color: "var(--ls-ink-soft)" }}
      >
        {label}
      </div>
      <div className="ls-num mt-2 text-xl font-semibold leading-none">
        {value}
      </div>
      {sub && (
        <div
          className="ls-num mt-1.5 text-xs"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          {sub}
        </div>
      )}
    </Card>
  ),
);
Stat.displayName = "Stat";
