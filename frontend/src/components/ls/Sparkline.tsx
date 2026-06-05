import * as React from "react";
import { motion } from "motion/react";

/**
 * 迷你折线图 —— 生命色平滑曲线 + 渐隐填充,随容器拉伸(preserveAspectRatio=none),描边用 non-scaling-stroke 保持粗细恒定(纵向拉高也不变粗)。
 * 曲线用 Catmull-Rom 转三次贝塞尔平滑(与 MirrorGraph 同一套手感),而非直线段折线。
 * 入场:填充淡入、曲线按 pathLength 从左到右画出。
 * 渐变 id 用 useId 唯一化,避免同页多条 Sparkline 的 <defs> id 冲突。
 */
export interface SparklineProps {
  /** 折线采样值序列(至少两个点) */
  values: number[];
  className?: string;
}

const W = 320;
const H = 64;

type Pt = { x: number; y: number };

/** Catmull-Rom 转三次贝塞尔的平滑曲线(含起始 M);端点控制点回退自身,首尾不外飘。 */
function smoothPath(points: Pt[]): string {
  if (points.length < 2) return "";
  let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export function Sparkline({
  values,
  className = "h-16 w-full",
}: SparklineProps) {
  const gradientId = React.useId();
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = W / (values.length - 1);
  const pts: Pt[] = values.map((v, i) => ({
    x: i * step,
    y: H - ((v - min) / range) * (H - 6) - 3,
  }));
  const line = smoothPath(pts);
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
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}
Sparkline.displayName = "Sparkline";
