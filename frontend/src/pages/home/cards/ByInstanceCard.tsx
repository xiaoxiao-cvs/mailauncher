import { useState } from "react";

import { ExpandableBentoCard, useAutoRows } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { SectionHead, MiniBar } from "@/pages/home/cards/CardKit";
import { fmtCompact, fmtCost, fmtSeconds } from "@/pages/home/cards/format";
import { num } from "@/utils/format";
import type { InstanceStats } from "@/hooks/queries/useStatsQueries";
import type { WidgetSize } from "@/pages/home/widgets/types";

/**
 * 按实例对比卡 —— 单瓦片 bento:折叠态给各实例消息量的横向迷你条对比(一眼看谁最忙),
 * 展开后原位钻取为"实例 x 指标"矩阵,可切排序。容器形变、头部 morph 全在 ExpandableBentoCard 基座,
 * 本文件只负责实例统计语义(归一化口径、排序维度、矩阵列布局)。
 *
 * 入参 byInstance 为查询结果,所有排序/截断均走防御性副本,绝不原地改入参。
 */

/** 折叠态对比条上限:S 紧凑,M 维持,L 略多;超出靠 trailing 计数体现总量,避免小卡溢出。 */
const COLLAPSED_MAX: Record<WidgetSize, number> = { s: 3, m: 5, l: 7 };
/** 详情矩阵行距 px:据此按展开后可用高度推算可容纳行数(行高约 18 + 行距)。 */
const ROW_PITCH = 26;
/** 详情矩阵最少行数(容器极矮时的下限)。 */
const MIN_ROWS = 3;

type SortKey = "messages" | "cost" | "tokens";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "messages", label: "按消息" },
  { key: "cost", label: "按花费" },
  { key: "tokens", label: "按 Token" },
];

/** 防御性副本排序:不改入参数组,按指定维度对 summary 字段降序。 */
function sortInstances(list: InstanceStats[], by: SortKey): InstanceStats[] {
  const pick =
    by === "cost"
      ? (s: InstanceStats) => num(s.summary.total_cost)
      : by === "tokens"
        ? (s: InstanceStats) => num(s.summary.total_tokens)
        : (s: InstanceStats) => num(s.summary.total_messages);
  return [...list].sort((a, b) => pick(b) - pick(a));
}

export interface ByInstanceCardProps {
  byInstance: InstanceStats[];
  /** 尺寸槽:S 折叠态对比条更少,M 维持,L 略多。展开钻取与尺寸无关。 */
  size?: WidgetSize;
}

export function ByInstanceCard({
  byInstance,
  size = "m",
}: ByInstanceCardProps) {
  const tiles: BentoTile[] = [
    {
      key: "byInstance",
      icon: "ph:chart-bar-thin",
      label: "按实例对比",
      trailing: (
        <span
          className="ls-num"
          style={{ fontSize: 10.5, color: "var(--ls-ink-faint)" }}
        >
          {byInstance.length} 个实例
        </span>
      ),
      collapsed: <ByInstanceCollapsed byInstance={byInstance} size={size} />,
      detail: <ByInstanceDetail byInstance={byInstance} />,
    },
  ];

  // 尺寸由所在网格单元决定(填满 RGL 项);不传 frameClassName,折叠/详情共用同一外框由基座保证。
  return <ExpandableBentoCard cardId="byInstance" tiles={tiles} />;
}

function ByInstanceCollapsed({
  byInstance,
  size,
}: {
  byInstance: InstanceStats[];
  size: WidgetSize;
}) {
  if (byInstance.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        暂无实例统计
      </div>
    );
  }

  const ranked = sortInstances(byInstance, "messages");
  // 归一化分母取所有实例消息量的最大值:条宽体现相对忙碌程度,最忙者占满。
  const maxMsgs = ranked.reduce(
    (acc, s) => Math.max(acc, num(s.summary.total_messages)),
    0,
  );
  const shown = ranked.slice(0, COLLAPSED_MAX[size]);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 7,
        marginTop: 8,
        overflow: "hidden",
      }}
    >
      {shown.map((s) => {
        const msgs = num(s.summary.total_messages);
        const pct = maxMsgs > 0 ? (msgs / maxMsgs) * 100 : 0;
        return (
          <div
            key={s.instance_id}
            className="flex items-center gap-2.5 text-[11px]"
          >
            <span
              className="flex-1 truncate"
              style={{ color: "var(--ls-ink)" }}
            >
              {s.instance_name}
            </span>
            <div className="w-20 shrink-0">
              <MiniBar pct={pct} color="var(--ls-life)" />
            </div>
            <span
              className="ls-num w-12 shrink-0 text-right"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              {fmtCompact(msgs)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ByInstanceDetail({ byInstance }: { byInstance: InstanceStats[] }) {
  const [sort, setSort] = useState<SortKey>("messages");
  // 矩阵行多,按可用高度自适应行数:量出容器高 / 行距,正好铺满不留空也不溢出。
  const { ref: listRef, rows } = useAutoRows(ROW_PITCH, MIN_ROWS);

  if (byInstance.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        暂无实例统计
      </div>
    );
  }

  const ranked = sortInstances(byInstance, sort);
  const overflow = ranked.length > rows;
  const shown = overflow ? ranked : ranked.slice(0, rows);

  return (
    <div className="flex h-full flex-col gap-2.5">
      <SectionHead title="实例明细" hint={`共 ${byInstance.length}`} />

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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="flex items-baseline gap-2 text-[10px]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          <span className="flex-1">实例</span>
          <span className="w-12 text-right">消息</span>
          <span className="w-12 text-right">回复</span>
          <span className="w-14 text-right">花费</span>
          <span className="w-14 text-right">Token</span>
          <span className="w-14 text-right">响应</span>
        </div>
        <div
          ref={listRef}
          className={`mt-1.5 min-h-0 flex-1 ${overflow ? "overflow-y-auto" : "overflow-hidden"}`}
        >
          {shown.map((s) => (
            <div
              key={s.instance_id}
              className="flex items-center gap-2 py-1 text-[11px]"
            >
              <span
                className="min-w-0 flex-1 truncate"
                style={{ color: "var(--ls-ink)" }}
              >
                {s.instance_name}
              </span>
              <span
                className={`ls-num w-12 text-right ${sort === "messages" ? "font-medium" : ""}`}
                style={{
                  color:
                    sort === "messages"
                      ? "var(--ls-ink)"
                      : "var(--ls-ink-soft)",
                }}
              >
                {fmtCompact(s.summary.total_messages)}
              </span>
              <span
                className="ls-num w-12 text-right"
                style={{ color: "var(--ls-ink-soft)" }}
              >
                {fmtCompact(s.summary.total_replies)}
              </span>
              <span
                className={`ls-num w-14 text-right ${sort === "cost" ? "font-medium" : ""}`}
                style={{
                  color:
                    sort === "cost" ? "var(--ls-ink)" : "var(--ls-ink-soft)",
                }}
              >
                {fmtCost(s.summary.total_cost)}
              </span>
              <span
                className={`ls-num w-14 text-right ${sort === "tokens" ? "font-medium" : ""}`}
                style={{
                  color:
                    sort === "tokens" ? "var(--ls-ink)" : "var(--ls-ink-soft)",
                }}
              >
                {fmtCompact(s.summary.total_tokens)}
              </span>
              <span
                className="ls-num w-14 text-right"
                style={{ color: "var(--ls-ink-faint)" }}
              >
                {fmtSeconds(s.summary.avg_response_time)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
