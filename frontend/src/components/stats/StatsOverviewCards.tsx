import { motion } from "motion/react";
import { Stat } from "@/components/ls";
import type { StatsSummary } from "@/hooks/queries/useStatsQueries";

function formatNumber(num: number, decimals: number = 0): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toFixed(decimals);
}

function formatCurrency(num: number): string {
  if (num >= 100) {
    return "¥" + num.toFixed(0);
  }
  if (num >= 10) {
    return "¥" + num.toFixed(1);
  }
  return "¥" + num.toFixed(2);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分钟`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
}

/** 看板卡群交错入场:子 <Stat>(内部即 <Card>)复用 cardChild 变体,父级编排 stagger。 */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

interface StatsOverviewCardsProps {
  summary: StatsSummary | undefined;
}

export function StatsOverviewCards({ summary }: StatsOverviewCardsProps) {
  return (
    <>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <Stat
          label="总请求数"
          value={summary ? formatNumber(summary.total_requests) : "—"}
        />
        <Stat
          label="总花费"
          value={summary ? formatCurrency(summary.total_cost) : "—"}
        />
        <Stat
          label="Token 消耗"
          value={summary ? formatNumber(summary.total_tokens) : "—"}
        />
        <Stat
          label="平均响应"
          value={summary ? `${summary.avg_response_time.toFixed(2)}s` : "—"}
        />
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <Stat
          label="在线时长"
          value={summary ? formatDuration(summary.online_time) : "—"}
        />
        <Stat
          label="消息处理"
          value={summary ? formatNumber(summary.total_messages) : "—"}
        />
        <Stat
          label="回复数量"
          value={summary ? formatNumber(summary.total_replies) : "—"}
        />
      </motion.div>
    </>
  );
}
