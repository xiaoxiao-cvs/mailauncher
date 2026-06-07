import { ExpandableBentoCard, useAutoRows } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { Ring } from "@/components/ls";
import { num } from "@/utils/format";
import { fmtCompact, fmtCost, fmtSeconds } from "@/pages/home/cards/format";
import { Cell, MiniBar, SectionHead } from "@/pages/home/cards/CardKit";
import type { ModelStats, StatsSummary } from "@/hooks/queries/useStatsQueries";
import { Icon } from "@iconify/react";

/**
 * KPI 概览卡 —— 花费 / 回复 / Token / 平均响应 四维度 2x2 bento,容器形变钻取由基座承载。
 *
 * 折叠态对齐 ls Stat:大数值 + 副文案(标签由基座头给出);详情态用 SectionHead/Cell/MiniBar/Ring。
 * 花费与响应详情按 models 排序成表,长列表用 useAutoRows 自适应行数铺满展开高度。
 */

const PLACEHOLDER = "—";
/** 模型表行距(px):据此按展开后可用高度推算可容纳行数。 */
const ROW_PITCH = 24;
/** 模型表最少行数(容器极矮时下限)。 */
const MIN_ROWS = 3;

/** 2x2:左上花费 右上回复 左下 Token 右下响应。 */
const KPI_AREAS = `
  "cost reply"
  "token resp"
`;

interface KpiCardProps {
  summary: StatsSummary | undefined;
  models: ModelStats[];
}

export function KpiCard({ summary, models }: KpiCardProps) {
  const tiles: BentoTile[] = [
    {
      key: "cost",
      icon: "ph:currency-cny-thin",
      label: "花费",
      area: "cost",
      collapsed: <CostCollapsed summary={summary} />,
      detail: <CostDetail summary={summary} models={models} />,
    },
    {
      key: "reply",
      icon: "ph:arrow-bend-up-left-thin",
      label: "回复",
      area: "reply",
      collapsed: <ReplyCollapsed summary={summary} />,
      detail: <ReplyDetail summary={summary} />,
    },
    {
      key: "token",
      icon: "ph:coins-thin",
      label: "Token",
      area: "token",
      collapsed: <TokenCollapsed summary={summary} />,
      detail: <TokenDetail summary={summary} />,
    },
    {
      key: "resp",
      icon: "ph:timer-thin",
      label: "平均响应",
      area: "resp",
      collapsed: <RespCollapsed summary={summary} />,
      detail: <RespDetail summary={summary} models={models} />,
    },
  ];

  return (
    <ExpandableBentoCard
      cardId="kpi"
      tiles={tiles}
      areas={KPI_AREAS}
      columns="1fr 1fr"
      rows="1fr 1fr"
    />
  );
}

/** 回复率(%):无消息时为 0,避免除零。 */
function replyRate(summary: StatsSummary): number {
  const msgs = num(summary.total_messages);
  return msgs > 0 ? (num(summary.total_replies) / msgs) * 100 : 0;
}

/** 折叠态英雄读数:大数值 + 副文案,垂直居中铺满瓦片(对齐 ls Stat 密度)。 */
function StatBody({
  big,
  sub,
}: {
  big: React.ReactNode;
  sub: React.ReactNode;
}) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 5,
      }}
    >
      <div
        className="ls-num"
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "var(--ls-ink)",
          lineHeight: 1.05,
        }}
      >
        {big}
      </div>
      <div
        style={{ fontSize: 11, color: "var(--ls-ink-faint)", lineHeight: 1.3 }}
      >
        {sub}
      </div>
    </div>
  );
}

function CostCollapsed({ summary }: { summary: StatsSummary | undefined }) {
  return (
    <StatBody
      big={summary ? fmtCost(summary.total_cost) : PLACEHOLDER}
      sub={
        summary ? (
          <span className="ls-num">
            {fmtCost(summary.cost_per_hour)} / 小时
          </span>
        ) : (
          PLACEHOLDER
        )
      }
    />
  );
}

function ReplyCollapsed({ summary }: { summary: StatsSummary | undefined }) {
  return (
    <StatBody
      big={summary ? fmtCompact(summary.total_replies) : PLACEHOLDER}
      sub={
        summary ? (
          <>
            回复率{" "}
            <span className="ls-num">{replyRate(summary).toFixed(0)}%</span>
          </>
        ) : (
          PLACEHOLDER
        )
      }
    />
  );
}

function TokenCollapsed({ summary }: { summary: StatsSummary | undefined }) {
  return (
    <StatBody
      big={summary ? fmtCompact(summary.total_tokens) : PLACEHOLDER}
      sub={
        summary ? (
          <span
            className="ls-num"
            style={{ display: "inline-flex", gap: 8, alignItems: "center" }}
          >
            <span>
              <Icon
                icon="ph:arrow-up-thin"
                width={11}
                height={11}
                style={{ verticalAlign: "-1px" }}
              />
              {fmtCompact(summary.input_tokens)}
            </span>
            <span>
              <Icon
                icon="ph:arrow-down-thin"
                width={11}
                height={11}
                style={{ verticalAlign: "-1px" }}
              />
              {fmtCompact(summary.output_tokens)}
            </span>
          </span>
        ) : (
          PLACEHOLDER
        )
      }
    />
  );
}

function RespCollapsed({ summary }: { summary: StatsSummary | undefined }) {
  return (
    <StatBody
      big={summary ? fmtSeconds(summary.avg_response_time) : PLACEHOLDER}
      sub={
        summary ? (
          <>
            总请求{" "}
            <span className="ls-num">{fmtCompact(summary.total_requests)}</span>
          </>
        ) : (
          PLACEHOLDER
        )
      }
    />
  );
}

/** 花费详情:各模型花费分摊,按 total_cost 降序;占比相对所有模型花费之和(非 summary 总额,口径自洽)。 */
function CostDetail({
  summary,
  models,
}: {
  summary: StatsSummary | undefined;
  models: ModelStats[];
}) {
  const { ref, rows } = useAutoRows(ROW_PITCH, MIN_ROWS);
  // 占比分母取模型花费之和而非 summary.total_cost:两者口径可能含非模型开销,自洽分摊避免溢出 100%。
  const sorted = [...models].sort((a, b) => b.total_cost - a.total_cost);
  const sumCost = sorted.reduce((acc, m) => acc + num(m.total_cost), 0);
  const shown = sorted.slice(0, rows);
  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Cell
          label="总花费"
          value={summary ? fmtCost(summary.total_cost) : PLACEHOLDER}
        />
        <Cell
          label="每小时"
          value={summary ? fmtCost(summary.cost_per_hour) : PLACEHOLDER}
        />
      </div>
      <SectionHead title="模型分摊" hint="按花费降序" />
      <div ref={ref} className="min-h-0 flex-1 space-y-1.5 overflow-hidden">
        {shown.length === 0 ? (
          <EmptyHint text="暂无模型花费数据" />
        ) : (
          shown.map((m) => {
            const pct = sumCost > 0 ? (num(m.total_cost) / sumCost) * 100 : 0;
            return (
              <div
                key={m.model_name}
                className="flex items-center gap-2.5 text-[11px]"
              >
                <span
                  className="flex-1 truncate"
                  style={{ color: "var(--ls-ink)" }}
                >
                  {m.display_name ?? m.model_name}
                </span>
                <div className="w-16 shrink-0">
                  <MiniBar pct={pct} color="var(--ls-life)" />
                </div>
                <span
                  className="ls-num w-12 shrink-0 text-right"
                  style={{ color: "var(--ls-ink-soft)" }}
                >
                  {fmtCost(m.total_cost)}
                </span>
                <span
                  className="ls-num w-9 shrink-0 text-right"
                  style={{ color: "var(--ls-ink-faint)" }}
                >
                  {pct.toFixed(0)}%
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** 回复详情:消息 / 回复 / 回复率三项 + 回复占比条。 */
function ReplyDetail({ summary }: { summary: StatsSummary | undefined }) {
  const rate = summary ? replyRate(summary) : 0;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <Cell
          label="消息"
          value={summary ? fmtCompact(summary.total_messages) : PLACEHOLDER}
        />
        <Cell
          label="回复"
          value={summary ? fmtCompact(summary.total_replies) : PLACEHOLDER}
        />
        <Cell
          label="回复率"
          value={summary ? `${rate.toFixed(0)}%` : PLACEHOLDER}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-2.5">
        <SectionHead title="回复占比" hint="回复 / 消息" />
        <div className="flex items-baseline gap-1">
          <span
            className="ls-num"
            style={{ fontSize: 26, fontWeight: 600, color: "var(--ls-ink)" }}
          >
            {summary ? rate.toFixed(0) : PLACEHOLDER}
          </span>
          {summary && (
            <span style={{ fontSize: 13, color: "var(--ls-ink-faint)" }}>
              %
            </span>
          )}
        </div>
        <MiniBar pct={rate} color="var(--ls-life)" />
      </div>
    </div>
  );
}

/** Token 详情:输入/输出占比环 + 双占比条 + 每小时 Token。 */
function TokenDetail({ summary }: { summary: StatsSummary | undefined }) {
  const input = summary ? num(summary.input_tokens) : 0;
  const output = summary ? num(summary.output_tokens) : 0;
  const total = input + output;
  const inPct = total > 0 ? (input / total) * 100 : 0;
  const outPct = total > 0 ? (output / total) * 100 : 0;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <Ring
          value={Math.round(inPct)}
          size={56}
          stroke={7}
          centerLabel={
            <span
              style={{ display: "grid", placeItems: "center", lineHeight: 1 }}
            >
              <span
                className="ls-num"
                style={{ fontSize: 15, fontWeight: 600 }}
              >
                {summary ? inPct.toFixed(0) : PLACEHOLDER}
              </span>
              <span style={{ fontSize: 8, color: "var(--ls-ink-faint)" }}>
                输入%
              </span>
            </span>
          }
        />
        <div className="flex-1 space-y-2">
          <TokenLeg
            label="输入"
            value={input}
            pct={inPct}
            color="var(--ls-ink-soft)"
          />
          <TokenLeg
            label="输出"
            value={output}
            pct={outPct}
            color="var(--ls-life)"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Cell
          label="总量"
          value={summary ? fmtCompact(summary.total_tokens) : PLACEHOLDER}
        />
        <Cell
          label="每小时"
          value={summary ? fmtCompact(summary.tokens_per_hour) : PLACEHOLDER}
        />
      </div>
    </div>
  );
}

/** Token 单向(输入/输出)条目:标签 + 计数 + 占比条。 */
function TokenLeg({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-[11px]">
        <span style={{ color: "var(--ls-ink-soft)" }}>{label}</span>
        <span className="ls-num" style={{ color: "var(--ls-ink)" }}>
          {fmtCompact(value)}
        </span>
      </div>
      <MiniBar pct={pct} color={color} />
    </div>
  );
}

/** 响应详情:各模型平均响应时长,按 avg_response_time 降序(最慢在上,便于定位瓶颈)。 */
function RespDetail({
  summary,
  models,
}: {
  summary: StatsSummary | undefined;
  models: ModelStats[];
}) {
  const { ref, rows } = useAutoRows(ROW_PITCH, MIN_ROWS);
  const sorted = [...models].sort(
    (a, b) => b.avg_response_time - a.avg_response_time,
  );
  const shown = sorted.slice(0, rows);
  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Cell
          label="平均响应"
          value={summary ? fmtSeconds(summary.avg_response_time) : PLACEHOLDER}
        />
        <Cell
          label="总请求"
          value={summary ? fmtCompact(summary.total_requests) : PLACEHOLDER}
        />
      </div>
      <SectionHead title="各模型响应" hint="按时长降序" />
      <div ref={ref} className="min-h-0 flex-1 space-y-1.5 overflow-hidden">
        {shown.length === 0 ? (
          <EmptyHint text="暂无模型响应数据" />
        ) : (
          shown.map((m) => (
            <div
              key={m.model_name}
              className="flex items-center gap-2.5 text-[11px]"
            >
              <span
                className="flex-1 truncate"
                style={{ color: "var(--ls-ink)" }}
              >
                {m.display_name ?? m.model_name}
              </span>
              <span
                className="ls-num shrink-0 text-right"
                style={{ color: "var(--ls-ink-soft)" }}
              >
                {fmtSeconds(m.avg_response_time)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="text-[11px]" style={{ color: "var(--ls-ink-faint)" }}>
      {text}
    </div>
  );
}
