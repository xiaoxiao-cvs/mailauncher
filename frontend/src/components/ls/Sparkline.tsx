import * as React from "react";
import { motion } from "motion/react";

/**
 * 迷你折线图 —— 生命色描边折线 + 渐隐填充,随容器宽度拉伸(preserveAspectRatio=none)。
 * 入场:填充淡入、折线按 pathLength 从左到右画出。
 * 渐变 id 用 useId 唯一化,避免同页多条 Sparkline 的 <defs> id 冲突。
 */
export interface SparklineProps {
  /** 折线采样值序列(至少两个点) */
  values: number[];
  className?: string;
}

const W = 320;
const H = 64;

export function Sparkline({
  values,
  className = "h-16 w-full",
}: SparklineProps) {
  const gradientId = React.useId();
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = W / (values.length - 1);
  const pts = values.map(
    (v, i) =>
      `${(i * step).toFixed(1)},${(H - ((v - min) / range) * (H - 6) - 3).toFixed(1)}`,
  );
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ls-life)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--ls-life)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill={`url(#${gradientId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="var(--ls-life)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}
Sparkline.displayName = "Sparkline";
