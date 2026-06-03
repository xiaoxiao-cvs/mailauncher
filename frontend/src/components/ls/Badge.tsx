import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 徽标 Badge —— 纯 CSS 药丸,无 Radix、无动效(静态信息不做装饰动画)。
 * 参照 HomeView「回复」徽标范式(life-soft 底 + life 字)。
 *
 * tone 语义到 token 的映射:
 * - life   → 底 --ls-life-soft / 字 --ls-life(运行/正向/活跃)
 * - warn   → 字 --ls-warn(警示)
 * - danger → 字 --ls-danger(危险/失败)
 * - neutral→ 底 --ls-bg-2 / 字 --ls-ink-soft(默认,中性信息)
 *
 * warn / danger 的低浓度底说明:tokens.css 仅定义了 --ls-life-soft 一枚 soft 语义底,
 * 并无 --ls-warn-soft / --ls-danger-soft。为不编造不存在的 token,这两档的药丸底由
 * color-mix 从既有语义色现算(16% 浓度,对齐 --ls-life-soft 的配方),仍只组合 var(--ls-*),
 * 明暗双主题随 --ls-warn / --ls-danger 自动适配,无写死色值。
 */
export type BadgeTone = "life" | "warn" | "danger" | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneStyle: Record<BadgeTone, React.CSSProperties> = {
  life: { background: "var(--ls-life-soft)", color: "var(--ls-life)" },
  warn: {
    background: "color-mix(in srgb, var(--ls-warn) 16%, transparent)",
    color: "var(--ls-warn)",
  },
  danger: {
    background: "color-mix(in srgb, var(--ls-danger) 16%, transparent)",
    color: "var(--ls-danger)",
  },
  neutral: { background: "var(--ls-bg-2)", color: "var(--ls-ink-soft)" },
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ tone = "neutral", className, style, ...props }, ref) => (
    <span
      ref={ref}
      {...props}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        className,
      )}
      style={{ ...toneStyle[tone], ...style }}
    />
  ),
);
Badge.displayName = "Badge";
