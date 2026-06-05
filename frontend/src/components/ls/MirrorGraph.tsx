import * as React from "react";
import { motion } from "motion/react";

/**
 * 连体波带图 —— 上沿(top 序列)绕中轴朝上、下沿(bottom 序列)绕中轴朝下,
 * 两沿之间填成一整条连续波带(无中缝):静止时收成贴中轴的一根线,有量则鼓成带。
 * 上下共享同一标尺(合并峰值),幅度可直接横向对比;典型用途是网络上/下行。
 * 曲线用 Catmull-Rom 转贝塞尔平滑;随容器拉伸(preserveAspectRatio=none),
 * 描边用 non-scaling-stroke 保持粗细恒定;渐变 id 用 useId 唯一化避免冲突。
 * 中轴常驻一条 hairline 基准线,分隔上下两沿。
 */
export interface MirrorGraphProps {
  /** 上沿序列(绕中轴朝上),如网络上行速率 */
  top: number[];
  /** 下沿序列(绕中轴朝下),如网络下行速率 */
  bottom: number[];
  /** 上沿描边色,默认生命色 */
  topColor?: string;
  /** 下沿描边色,默认柔和墨色 */
  bottomColor?: string;
  className?: string;
}

const VW = 320;
const VH = 88;
const PAD = 3;
const MID = VH / 2;
const HALF = MID - PAD;

type Pt = { x: number; y: number };

/** 序列 → 绕中轴 dir(-1 朝上 / +1 朝下)偏移的点序列。 */
function toPoints(values: number[], max: number, dir: -1 | 1): Pt[] {
  const step = VW / (values.length - 1);
  return values.map((v, i) => ({
    x: i * step,
    y: MID + dir * (Math.min(v, max) / max) * HALF,
  }));
}

/** Catmull-Rom 平滑曲线段(不含起始 M;clamp 把控制点钳在本侧,防越轴致两沿反转)。 */
function smoothSegs(pts: Pt[], clamp: (y: number) => number): string {
  let s = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = clamp(p1.y + (p2.y - p0.y) / 6);
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = clamp(p2.y - (p3.y - p1.y) / 6);
    s += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return s;
}

const moveTo = (p: Pt) => `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
const lineTo = (p: Pt) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`;

export function MirrorGraph({
  top,
  bottom,
  topColor = "var(--ls-life)",
  bottomColor = "var(--ls-ink-soft)",
  className = "h-20 w-full",
}: MirrorGraphProps) {
  const fillId = React.useId();
  const ready = top.length >= 2 && bottom.length >= 2;
  const max = Math.max(1, ...top, ...bottom);

  const topPts = ready ? toPoints(top, max, -1) : [];
  const botPts = ready ? toPoints(bottom, max, 1) : [];
  const clampUp = (y: number) => Math.min(MID, y);
  const clampDown = (y: number) => Math.max(MID, y);

  const topLine = ready ? moveTo(topPts[0]) + smoothSegs(topPts, clampUp) : "";
  const botLine = ready
    ? moveTo(botPts[0]) + smoothSegs(botPts, clampDown)
    : "";
  // 连体填充:上沿正向 → 连到下沿右端 → 下沿逆向回到左端 → 闭合(左右沿为直边)
  const ribbon = ready
    ? `${topLine} ${lineTo(botPts[botPts.length - 1])}${smoothSegs(
        [...botPts].reverse(),
        clampDown,
      )} Z`
    : "";

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="none"
      className={className}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={topColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={bottomColor} stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <line
        x1={0}
        y1={MID}
        x2={VW}
        y2={MID}
        stroke="var(--ls-hairline)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {ready && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <path d={ribbon} fill={`url(#${fillId})`} />
          <path
            d={topLine}
            fill="none"
            stroke={topColor}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={botLine}
            fill="none"
            stroke={bottomColor}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </motion.g>
      )}
    </svg>
  );
}
MirrorGraph.displayName = "MirrorGraph";
