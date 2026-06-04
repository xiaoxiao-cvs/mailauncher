import { motion } from "motion/react";
import { ArrowDown, ArrowUp } from "lucide-react";

import type { MonitorTabProps } from "../types";
import { Card, MirrorGraph, Readout } from "@/components/ls";
import { useNetHistory } from "@/services/netHistoryStore";
import { fmtBytes, fmtRate } from "@/utils/format";

/**
 * 网络 tab(value=network)。
 *
 * 上半:全宽连体镜像波形——上沿走上行(柔墨)、下沿走下行(生命色),方向与首页系统卡一致。
 * 下半:上行 / 下行两组各三项读数(当前速率 / 会话累计 / 峰值速率)。
 *
 * 速率与累计读数取自 stats 实时快照,峰值取自 netHistory(全局持久化的网络速率时序)的极值,
 * 两者来源不同步:波形随每帧滚动,而 stats 约 1.5s 推送一次,这是正常的不同采样节律。
 * stats 首屏就绪前为 undefined,逐项以 PLACEHOLDER 占位,不伪造数值。
 */

const PLACEHOLDER = "—";

// 容器交错入场:父层编排,Card 自带 child 变体(淡入上移)。
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

/** 速率序列峰值:空序列(首屏 / 无流量基线未填)返回 0,避免 Math.max() 展开空数组得 -Infinity。 */
function peak(series: number[]): number {
  return series.length > 0 ? Math.max(...series) : 0;
}

/**
 * 单方向读数组:方向标题(文字 + 箭头图标)+ 当前 / 累计 / 峰值三宫格。
 * accent 仅作用于标题箭头与文字,呼应波形中该方向的描边色(上行柔墨 / 下行生命色)。
 */
function DirectionGroup({
  title,
  Arrow,
  accent,
  current,
  total,
  peakValue,
}: {
  title: string;
  Arrow: typeof ArrowUp;
  accent: string;
  current: string;
  total: string;
  peakValue: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Arrow size={14} style={{ color: accent }} />
        <span className="text-xs font-medium" style={{ color: accent }}>
          {title}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Readout label="当前" value={current} />
        <Readout label="累计" value={total} />
        <Readout label="峰值" value={peakValue} />
      </div>
    </div>
  );
}

export function NetworkTab({ stats }: MonitorTabProps) {
  // 网络历史来自全局持久化 store(跨页面常驻累积、预填基线),不在本 tab 内逐帧累积。
  const { down, up } = useNetHistory();

  return (
    <motion.div
      className="flex flex-col gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <Card>
        <div
          className="text-[11px] font-medium"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          网络吞吐
        </div>
        <p className="mt-1 text-xs" style={{ color: "var(--ls-ink-faint)" }}>
          上沿为上行、下沿为下行,共享标尺,幅度可直接对比。
        </p>
        {/* 上行朝上(柔墨)/ 下行朝下(生命色),沿用首页方向约定 */}
        <MirrorGraph
          top={up}
          bottom={down}
          topColor="var(--ls-ink-soft)"
          bottomColor="var(--ls-life)"
          className="mt-3 h-24 w-full"
        />
      </Card>

      <Card>
        <motion.div
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <DirectionGroup
            title="上行"
            Arrow={ArrowUp}
            accent="var(--ls-ink-soft)"
            current={stats ? fmtRate(stats.net_tx_rate) : PLACEHOLDER}
            total={stats ? fmtBytes(stats.net_tx_total) : PLACEHOLDER}
            peakValue={up.length > 0 ? fmtRate(peak(up)) : PLACEHOLDER}
          />
          <DirectionGroup
            title="下行"
            Arrow={ArrowDown}
            accent="var(--ls-life)"
            current={stats ? fmtRate(stats.net_rx_rate) : PLACEHOLDER}
            total={stats ? fmtBytes(stats.net_rx_total) : PLACEHOLDER}
            peakValue={down.length > 0 ? fmtRate(peak(down)) : PLACEHOLDER}
          />
        </motion.div>
      </Card>
    </motion.div>
  );
}
