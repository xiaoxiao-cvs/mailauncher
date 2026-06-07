import { useState } from "react";

import { ExpandableBentoCard, useAutoRows } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { SectionHead } from "@/pages/home/cards/CardKit";
import { fmtCost, fmtCompact, fmtSeconds } from "@/pages/home/cards/format";
import { num } from "@/utils/format";
import type { ModelStats } from "@/hooks/queries/useStatsQueries";

/**
 * 模型分布卡 —— 各模型的调用花费占比(折叠)与完整调用明细(展开,可切排序)。
 * 单瓦片:折叠态给只读摘要(堆叠占比条 + 前几名),展开后原位钻取为完整可排序表。
 * 容器形变、头部 morph、关闭与可达性全在 ExpandableBentoCard 基座。
 */

/** 按花费降序循环的配色板(首位用生命色,其余暖系点缀,克制不刺眼)。 */
const PALETTE = ["var(--ls-life)", "#cf9442", "#c5563e", "#7f9b6a", "#b07d56"];

/** 折叠态前几名上限:堆叠条之下的名次列表,避免小卡溢出。 */
const COLLAPSED_TOP = 4;

/** 详情表行距(px):据此按可用高度推算可容纳行数,自适应铺满(行高约 18 + 行距)。 */
const ROW_PITCH = 30;
/** 详情表最少行数(容器极矮时的下限)。 */
const MIN_ROWS = 4;

type SortKey = "cost" | "requests" | "tokens";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "cost", label: "按花费" },
  { key: "requests", label: "按请求数" },
  { key: "tokens", label: "按 Token" },
];

/** 取展示名:优先后端给的 display_name,空则回退原始 model_name。 */
function modelLabel(m: ModelStats): string {
  return m.display_name ?? m.model_name;
}

/** 防御性副本排序:不改入参数组,按指定维度降序。 */
function sortModels(models: ModelStats[], by: SortKey): ModelStats[] {
  const pick =
    by === "requests"
      ? (m: ModelStats) => num(m.request_count)
      : by === "tokens"
        ? (m: ModelStats) => num(m.total_tokens)
        : (m: ModelStats) => num(m.total_cost);
  return [...models].sort((a, b) => pick(b) - pick(a));
}

export function ModelDistributionCard({ models }: { models: ModelStats[] }) {
  const tiles: BentoTile[] = [
    {
      key: "models",
      icon: "ph:chart-pie-slice-thin",
      label: "模型分布",
      trailing: (
        <span style={{ fontSize: 10.5, color: "var(--ls-ink-faint)" }}>
          按花费
        </span>
      ),
      collapsed: <ModelsCollapsed models={models} />,
      detail: <ModelsDetail models={models} />,
    },
  ];

  // 尺寸由所在网格单元决定(填满 RGL 项);折叠/详情共用同一外框的铁律在基座内。
  return <ExpandableBentoCard cardId="models" tiles={tiles} />;
}

function ModelsCollapsed({ models }: { models: ModelStats[] }) {
  if (models.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        暂无模型调用记录
      </div>
    );
  }

  const ranked = sortModels(models, "cost");
  const totalCost = ranked.reduce((sum, m) => sum + num(m.total_cost), 0);
  const top = ranked.slice(0, COLLAPSED_TOP);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 9,
        marginTop: 8,
      }}
    >
      {/* 堆叠占比条:各模型 cost/总 cost 的宽度,圆角小段拼接,色循环用配色板。 */}
      <div
        style={{
          display: "flex",
          height: 8,
          width: "100%",
          gap: 2,
          overflow: "hidden",
        }}
      >
        {ranked.map((m, i) => {
          const share = totalCost > 0 ? num(m.total_cost) / totalCost : 0;
          if (share <= 0) return null;
          return (
            <div
              key={m.model_name}
              style={{
                width: `${share * 100}%`,
                background: PALETTE[i % PALETTE.length],
                borderRadius: 999,
                minWidth: 2,
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 5,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {top.map((m, i) => {
          const share = totalCost > 0 ? num(m.total_cost) / totalCost : 0;
          return (
            <div
              key={m.model_name}
              className="flex items-center gap-2"
              style={{ fontSize: 11 }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: PALETTE[i % PALETTE.length],
                  flexShrink: 0,
                }}
              />
              <span
                className="flex-1 truncate"
                style={{ color: "var(--ls-ink)" }}
              >
                {modelLabel(m)}
              </span>
              <span
                className="ls-num"
                style={{ color: "var(--ls-ink-soft)", flexShrink: 0 }}
              >
                {fmtCost(m.total_cost)}
              </span>
              <span
                className="ls-num text-right"
                style={{
                  width: 38,
                  color: "var(--ls-ink-faint)",
                  flexShrink: 0,
                }}
              >
                {(share * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModelsDetail({ models }: { models: ModelStats[] }) {
  const [sort, setSort] = useState<SortKey>("cost");
  // 详情表行多,按可用高度自适应行数:量出容器高 / 行距,正好铺满不留空也不溢出。
  const { ref: listRef, rows } = useAutoRows(ROW_PITCH, MIN_ROWS);

  if (models.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        暂无模型调用记录
      </div>
    );
  }

  const ranked = sortModels(models, sort);
  const shown = ranked.slice(0, rows);

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <SectionHead title="模型明细" hint={`${models.length} 个模型`} />
      </div>

      {/* 排序切换:详情体可承载交互控件(基座不把详情包进收起按钮)。 */}
      <div className="flex gap-1">
        {SORT_OPTIONS.map((opt) => {
          const active = sort === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSort(opt.key)}
              className="ls-item rounded-md px-2 py-1 text-[10px] font-medium"
              style={{
                background: active ? "var(--ls-life-soft)" : "var(--ls-bg-2)",
                color: active ? "var(--ls-life)" : "var(--ls-ink-soft)",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          className="flex items-baseline gap-2 text-[10px]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          <span className="flex-1">模型</span>
          <span className="w-12 text-right">请求</span>
          <span className="w-16 text-right">Token</span>
          <span className="w-14 text-right">花费</span>
          <span className="w-14 text-right">响应</span>
        </div>
        <div ref={listRef} className="mt-1.5 min-h-0 flex-1 overflow-hidden">
          {shown.map((m, i) => (
            <div
              key={m.model_name}
              className="flex items-center gap-2 py-1 text-[11px]"
            >
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: PALETTE[i % PALETTE.length],
                    flexShrink: 0,
                  }}
                />
                <span className="truncate" style={{ color: "var(--ls-ink)" }}>
                  {modelLabel(m)}
                </span>
              </span>
              <span
                className={`ls-num w-12 text-right ${sort === "requests" ? "font-medium" : ""}`}
                style={{
                  color:
                    sort === "requests"
                      ? "var(--ls-ink)"
                      : "var(--ls-ink-soft)",
                }}
              >
                {fmtCompact(m.request_count)}
              </span>
              <span
                className={`ls-num flex w-16 flex-col items-end leading-tight ${sort === "tokens" ? "font-medium" : ""}`}
                style={{
                  color:
                    sort === "tokens" ? "var(--ls-ink)" : "var(--ls-ink-soft)",
                }}
              >
                <span>{fmtCompact(m.total_tokens)}</span>
                <span
                  className="ls-num"
                  style={{ fontSize: 9, color: "var(--ls-ink-faint)" }}
                >
                  ↑{fmtCompact(m.input_tokens)} ↓{fmtCompact(m.output_tokens)}
                </span>
              </span>
              <span
                className={`ls-num w-14 text-right ${sort === "cost" ? "font-medium" : ""}`}
                style={{
                  color:
                    sort === "cost" ? "var(--ls-ink)" : "var(--ls-ink-soft)",
                }}
              >
                {fmtCost(m.total_cost)}
              </span>
              <span
                className="ls-num w-14 text-right"
                style={{ color: "var(--ls-ink-faint)" }}
              >
                {fmtSeconds(m.avg_response_time)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
