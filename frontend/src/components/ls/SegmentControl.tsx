import * as React from "react";
import { motion } from "motion/react";

import { springSettle } from "@/design/motion";

/**
 * 分段控件 —— 凹陷轨道里的互斥选项,选中项用 layout 动画的高面滑块跟随。
 * 泛型 T 约束为传入 options 的字面量联合,onChange 回传选中值,类型安全。
 * layoutId 用 useId 唯一化,避免同页多个分段控件的滑块互相抢占动画。
 */
export interface SegmentControlProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentControlProps<T>) {
  const layoutId = React.useId();
  return (
    <div
      className="ls-inset flex p-0.5 text-sm"
      style={{ borderRadius: "var(--ls-r-control)" }}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className="ls-num relative px-3 py-1.5 font-medium"
          style={{
            color: value === opt ? "var(--ls-ink)" : "var(--ls-ink-soft)",
          }}
        >
          {value === opt && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0"
              style={{
                background: "var(--ls-surface-hi)",
                borderRadius: 9,
                boxShadow: "var(--ls-shadow-soft)",
              }}
              transition={springSettle}
            />
          )}
          <span className="relative">{opt}</span>
        </button>
      ))}
    </div>
  );
}
SegmentControl.displayName = "SegmentControl";
