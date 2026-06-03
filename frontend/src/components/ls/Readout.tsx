import * as React from "react";

import { cn } from "@/lib/utils";
import { Surface } from "./Surface";

/**
 * 读数 —— 凹陷面里的"标签 + 等宽数值"小卡(运行时长 / 消息数 / 内存等)。
 * 数值用 .ls-num 等宽数字,避免跳动时抖动。
 */
export interface ReadoutProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  label: string;
  value: string;
}

export const Readout = React.forwardRef<HTMLDivElement, ReadoutProps>(
  ({ label, value, className, ...props }, ref) => (
    <Surface
      ref={ref}
      variant="inset"
      className={cn("px-3 py-2.5", className)}
      {...props}
    >
      <div className="text-[11px]" style={{ color: "var(--ls-ink-soft)" }}>
        {label}
      </div>
      <div className="ls-num mt-1 text-lg font-semibold leading-none">
        {value}
      </div>
    </Surface>
  ),
);
Readout.displayName = "Readout";
