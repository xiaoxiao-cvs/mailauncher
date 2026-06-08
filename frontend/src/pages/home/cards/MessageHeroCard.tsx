import { ExpandableBentoCard } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { Badge, Sparkline } from "@/components/ls";
import { Cell, SectionHead } from "@/pages/home/cards/CardKit";
import { fmtCompact, fmtGrouped, fmtSeconds } from "@/pages/home/cards/format";
import { num } from "@/utils/format";
import type { StatsSummary } from "@/hooks/queries/useStatsQueries";
import type { WidgetSize } from "@/pages/home/widgets/types";

/**
 * 消息处理总量(英雄区)—— 单瓦片 bento 卡:折叠态突出 total_messages 大计数,
 * 钻取后原位铺开成多维单值摘要(回复率 / Token 进出 / 请求 / 响应)。
 *
 * 单瓦片(tiles.length===1):头部由基座 morph,collapsed/detail 只给"头部以下"主体。
 * 上层传入 history(消息量,>1 点)时补一条 Sparkline + 峰值/均值;若同时传入 replyHistory
 * (回复量,get_hourly_message_stats.reply_count),则在同图叠加第二条对比线(共用 y 标度)。
 * 无数据时各处用占位 "—",绝不以 0 伪装真实读数。
 */

const PLACEHOLDER = "—";

/** 折叠态总量大数字号按尺寸分档:S 紧凑、M 标准、L 醒目。 */
const BIG_FONT: Record<WidgetSize, string> = {
  s: "2rem",
  m: "2.5rem",
  l: "3.25rem",
};

export interface MessageHeroCardProps {
  summary: StatsSummary | undefined;
  /** 可选的每小时消息量历史序列;长度 >1 才渲染趋势(峰值=max,均值=平均)。 */
  history?: number[];
  /** 可选的每小时回复量历史序列(与 history 同源等长);存在则在趋势图叠加第二条对比线。 */
  replyHistory?: number[];
  /** 尺寸槽:S 折叠态大数更小,M 维持,L 醒目。展开钻取与尺寸无关。 */
  size?: WidgetSize;
}

/** 回复率 %:无消息时回退 0(分母为 0 是"真无数据",非业务异常)。 */
function replyRate(summary: StatsSummary | undefined): number {
  if (!summary) return 0;
  const msgs = num(summary.total_messages);
  if (msgs <= 0) return 0;
  return Math.round((num(summary.total_replies) / msgs) * 100);
}

/** 历史序列的峰值/均值(供折叠副信息与详情趋势头复用)。 */
function historyStats(history: number[]): { peak: number; avg: number } {
  const peak = Math.max(...history);
  const avg = history.reduce((s, v) => s + v, 0) / history.length;
  return { peak, avg };
}

export function MessageHeroCard({
  summary,
  history,
  replyHistory,
  size = "m",
}: MessageHeroCardProps) {
  const hasTrend = !!history && history.length > 1;
  // 回复副线仅在主趋势成立且回复序列同样有 >1 点时叠加(同源等长场景)。
  const reply =
    hasTrend && replyHistory && replyHistory.length > 1
      ? replyHistory
      : undefined;

  const tiles: BentoTile[] = [
    {
      key: "messages",
      icon: "ph:chat-circle-dots-thin",
      label: "消息处理总量",
      // 英雄区的"回复数"徽标:生命色药丸,沿用 HomeView 既有范式。
      trailing: (
        <Badge tone="life">回复 {fmtCompact(summary?.total_replies)}</Badge>
      ),
      collapsed: (
        <HeroCollapsed
          summary={summary}
          history={hasTrend ? history : undefined}
          replyHistory={reply}
          size={size}
        />
      ),
      detail: (
        <HeroDetail
          summary={summary}
          history={hasTrend ? history : undefined}
          replyHistory={reply}
        />
      ),
    },
  ];

  return <ExpandableBentoCard cardId="hero" tiles={tiles} />;
}

/** 折叠态:大号总消息计数 + 一行副信息(有历史则趋势线+峰均,否则 Token 速率+回复率)。 */
function HeroCollapsed({
  summary,
  history,
  replyHistory,
  size,
}: {
  summary: StatsSummary | undefined;
  history: number[] | undefined;
  replyHistory: number[] | undefined;
  size: WidgetSize;
}) {
  const trend = history ? historyStats(history) : null;
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <div
        className="ls-num"
        style={{
          fontSize: BIG_FONT[size],
          fontWeight: 600,
          lineHeight: 1,
          color: "var(--ls-ink)",
        }}
      >
        {summary ? fmtGrouped(summary.total_messages) : PLACEHOLDER}
      </div>
      {history && trend ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, height: 22 }}>
            <Sparkline
              values={history}
              secondary={replyHistory}
              className="h-full w-full"
            />
          </div>
          <span
            className="ls-num"
            style={{
              flexShrink: 0,
              fontSize: 10.5,
              color: "var(--ls-ink-faint)",
            }}
          >
            峰值 {fmtCompact(trend.peak)}/时 · 均值 {fmtCompact(trend.avg)}/时
          </span>
        </div>
      ) : (
        <div
          className="ls-num"
          style={{ fontSize: 11, color: "var(--ls-ink-soft)" }}
        >
          每小时 {summary ? fmtCompact(summary.tokens_per_hour) : PLACEHOLDER}{" "}
          Token · 回复率 {summary ? `${replyRate(summary)}%` : PLACEHOLDER}
        </div>
      )}
    </div>
  );
}

/** 详情态:可选趋势头 + 多维单值 Cell 网格(后端暂无小时序列,故以单值为主)。 */
function HeroDetail({
  summary,
  history,
  replyHistory,
}: {
  summary: StatsSummary | undefined;
  history: number[] | undefined;
  replyHistory: number[] | undefined;
}) {
  const trend = history ? historyStats(history) : null;
  return (
    <div className="flex h-full flex-col gap-3">
      {history && trend ? (
        <div>
          <SectionHead
            title="消息走势"
            hint={`峰值 ${fmtCompact(trend.peak)}/时 · 均值 ${fmtCompact(trend.avg)}/时`}
          />
          <Sparkline
            values={history}
            secondary={replyHistory}
            className="mt-1.5 h-16 w-full"
          />
          {replyHistory ? (
            <div className="mt-1.5 flex items-center gap-4 text-[10px]">
              <LegendDot color="var(--ls-life)" label="消息" />
              <LegendDot color="var(--ls-ink-soft)" label="回复" dashed />
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-cols-3 content-start gap-2">
        <Cell
          label="总消息"
          value={summary ? fmtGrouped(summary.total_messages) : PLACEHOLDER}
        />
        <Cell
          label="回复"
          value={summary ? fmtGrouped(summary.total_replies) : PLACEHOLDER}
        />
        <Cell
          label="回复率"
          value={summary ? `${replyRate(summary)}%` : PLACEHOLDER}
        />
        <Cell
          label="输入 Token"
          value={summary ? fmtCompact(summary.input_tokens) : PLACEHOLDER}
        />
        <Cell
          label="输出 Token"
          value={summary ? fmtCompact(summary.output_tokens) : PLACEHOLDER}
        />
        <Cell
          label="总 Token"
          value={summary ? fmtCompact(summary.total_tokens) : PLACEHOLDER}
        />
        <Cell
          label="总请求"
          value={summary ? fmtGrouped(summary.total_requests) : PLACEHOLDER}
        />
        <Cell
          label="平均响应"
          value={summary ? fmtSeconds(summary.avg_response_time) : PLACEHOLDER}
        />
        <Cell
          label="每小时 Token"
          value={summary ? fmtCompact(summary.tokens_per_hour) : PLACEHOLDER}
        />
      </div>
    </div>
  );
}

/** 趋势图图例项:色段(可虚线)+ 标签,用于区分消息主线与回复副线。 */
function LegendDot({
  color,
  label,
  dashed = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span
      className="flex items-center gap-1.5"
      style={{ color: "var(--ls-ink-faint)" }}
    >
      <span
        style={{
          width: 14,
          height: 0,
          borderTop: `2px ${dashed ? "dashed" : "solid"} ${color}`,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
