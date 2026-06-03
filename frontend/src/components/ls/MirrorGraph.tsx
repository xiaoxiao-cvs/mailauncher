import * as React from "react";
import { motion } from "motion/react";

/**
 * 镜像波形图 —— 以中轴线为界,上半区序列朝上填充、下半区序列朝下填充。
 * 上下共享同一标尺(两序列的合并峰值),故幅度可直接横向对比;典型用途是网络上/下行。
 * 随容器拉伸(preserveAspectRatio=none),描边用 non-scaling-stroke 保持粗细恒定。
 * 渐变 id 用 useId 唯一化,避免同页多图的 <defs> 冲突。
 */
export interface MirrorGraphProps {
  /** 上半区采样序列(朝上填充),如网络下行速率 */
  top: number[];
  /** 下半区采样序列(朝下填充),如网络上行速率 */
  bottom: number[];
  /** 上半区描边/填充主色,默认生命色 */
  topColor?: string;
  /** 下半区描边/填充主色,默认柔和墨色 */
  bottomColor?: string;
  className?: string;
}

const VW = 320;
const VH = 88;
const PAD = 3;
const MID = VH / 2;
const HALF = MID - PAD;

/** 把序列映射成中轴向 dir(-1 朝上 / +1 朝下)展开的描边路径与闭合面积路径。 */
function buildPath(values: number[], max: number, dir: -1 | 1) {
  if (values.length < 2) return null;
  const step = VW / (values.length - 1);
  const pts = values.map((v, i) => {
    const y = MID + dir * (Math.min(v, max) / max) * HALF;
    return `${(i * step).toFixed(1)},${y.toFixed(1)}`;
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p}`).join(" ");
  return { line, area: `${line} L${VW},${MID} L0,${MID} Z` };
}

export function MirrorGraph({
  top,
  bottom,
  topColor = "var(--ls-life)",
  bottomColor = "var(--ls-ink-soft)",
  className = "h-20 w-full",
}: MirrorGraphProps) {
  const topId = React.useId();
  const botId = React.useId();
  const max = Math.max(1, ...top, ...bottom);
  const t = buildPath(top, max, -1);
  const b = buildPath(bottom, max, 1);

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="none"
      className={className}
    >
      <defs>
        <linearGradient id={topId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={topColor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={topColor} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={botId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={bottomColor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={bottomColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1="0"
        y1={MID}
        x2={VW}
        y2={MID}
        stroke="var(--ls-hairline)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {t && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <path d={t.area} fill={`url(#${topId})`} />
          <path
            d={t.line}
            fill="none"
            stroke={topColor}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </motion.g>
      )}
      {b && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <path d={b.area} fill={`url(#${botId})`} />
          <path
            d={b.line}
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
