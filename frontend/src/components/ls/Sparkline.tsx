import * as React from "react";
import { motion } from "motion/react";

/**
 * 迷你折线图 —— 生命色平滑曲线 + 渐隐填充,随容器拉伸(preserveAspectRatio=none),描边用 non-scaling-stroke 保持粗细恒定(纵向拉高也不变粗)。
 * 曲线用 Catmull-Rom 转三次贝塞尔平滑(与 MirrorGraph 同一套手感),而非直线段折线。
 * 入场:整图渐显(填充与曲线一同淡入)。曲线不用 pathLength 描边动画——它与 non-scaling-stroke 叠加会在窗口横向缩放时让端点漂移;改纯透明度淡入,缩放时只随容器拉伸、不重绘。
 * 渐变 id 用 useId 唯一化,避免同页多条 Sparkline 的 <defs> id 冲突。
 */
export interface SparklineProps {
  /** 折线采样值序列(至少两个点) */
  values: number[];
  /**
   * 可选第二条对比序列(如消息量主线 + 回复量副线)。与 values 共用同一 y 标度(取两序列并集的
   * min/max),使两线在同一坐标系内可比;只画描边线、不画填充区。长度与 values 不一致时各自按
   * 自身索引取点(通常二者同源等长)。
   */
  secondary?: number[];
  /** 第二条线的描边色(默认柔墨色,与主线生命色区分);仅 secondary 提供时生效。 */
  secondaryColor?: string;
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
  secondary,
  secondaryColor = "var(--ls-ink-soft)",
  className = "h-16 w-full",
}: SparklineProps) {
  const gradientId = React.useId();
  // 两序列共用 y 标度:范围取并集,使主/副线在同一坐标系内可比(回复量恒 <= 消息量,副线落于主线下方)。
  const all =
    secondary && secondary.length > 0 ? [...values, ...secondary] : values;
  const max = Math.max(...all);
  const min = Math.min(...all);
  const range = max - min || 1;
  const toPts = (vals: number[]): Pt[] => {
    const step = W / (vals.length - 1);
    return vals.map((v, i) => ({
      x: i * step,
      y: H - ((v - min) / range) * (H - 6) - 3,
    }));
  };
  const pts = toPts(values);
  const line = smoothPath(pts);
  const area = `${line} L${W},${H} L0,${H} Z`;
  const secLine =
    secondary && secondary.length > 1 ? smoothPath(toPts(secondary)) : "";
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
      {secLine ? (
        <motion.path
          d={secLine}
          fill="none"
          stroke={secondaryColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      ) : null}
      <motion.path
        d={line}
        fill="none"
        stroke="var(--ls-life)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
    </svg>
  );
}
Sparkline.displayName = "Sparkline";
