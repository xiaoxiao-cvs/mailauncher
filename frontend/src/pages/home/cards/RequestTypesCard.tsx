import { useMemo } from "react";

import { ExpandableBentoCard, useAutoRows } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { SectionHead } from "@/pages/home/cards/CardKit";
import { fmtCompact, fmtCost } from "@/pages/home/cards/format";
import { num } from "@/utils/format";
import type { InstanceStats } from "@/hooks/queries/useStatsQueries";
import type { WidgetSize } from "@/pages/home/widgets/types";

/**
 * 请求类型分布卡 —— 单瓦片 bento:折叠态给堆叠占比条 + 前几名摘要,
 * 展开后原位钻取为完整类型表(按请求数排序)。容器形变、头部 morph 由基座承载。
 *
 * 关键:后端 overview 不聚合 request_type,各实例只在 by_instance[].request_type_stats
 * 里各自分桶,所以全局视图必须在前端按 request_type 求和。聚合用 useMemo 缓存,
 * 依赖 byInstance,避免每帧重算。
 */

/** 按名次循环的配色板(首位用生命色,其余暖系点缀,克制不刺眼)。 */
const PALETTE = ["var(--ls-life)", "#cf9442", "#c5563e", "#7f9b6a", "#b07d56"];

/** 折叠态前几名上限:堆叠条之下的名次列表,避免小卡溢出。 */
const COLLAPSED_TOP = 4;

/** 详情表行距(px):据此按可用高度推算可容纳行数,自适应铺满(行高约 18 + 行距)。 */
const ROW_PITCH = 30;
/** 详情表最少行数(容器极矮时的下限)。 */
const MIN_ROWS = 4;

/** 聚合后的单类型读数:同 RequestTypeStats 三项口径,但已跨实例求和。 */
interface AggregatedType {
  request_type: string;
  request_count: number;
  total_tokens: number;
  total_cost: number;
}

export interface RequestTypesCardProps {
  byInstance: InstanceStats[];
  /** P1 占位入参(尺寸槽);P1 不改密度、默认行为不变,改密度在 P2。 */
  size?: WidgetSize;
}

/**
 * 跨实例聚合 request_type:用 Map 按 request_type 归并各实例的 request_type_stats,
 * num() 兜底每项累加,再转数组按 request_count 降序。返回数组已稳定排序,直接喂折叠/详情。
 */
function aggregateTypes(byInstance: InstanceStats[]): AggregatedType[] {
  const acc = new Map<string, AggregatedType>();
  for (const inst of byInstance) {
    for (const t of inst.request_type_stats) {
      const prev = acc.get(t.request_type);
      if (prev) {
        prev.request_count += num(t.request_count);
        prev.total_tokens += num(t.total_tokens);
        prev.total_cost += num(t.total_cost);
      } else {
        acc.set(t.request_type, {
          request_type: t.request_type,
          request_count: num(t.request_count),
          total_tokens: num(t.total_tokens),
          total_cost: num(t.total_cost),
        });
      }
    }
  }
  return [...acc.values()].sort((a, b) => b.request_count - a.request_count);
}

export function RequestTypesCard({
  byInstance,
  size: _size,
}: RequestTypesCardProps) {
  const types = useMemo(() => aggregateTypes(byInstance), [byInstance]);

  const tiles: BentoTile[] = [
    {
      key: "requestTypes",
      icon: "ph:share-network-thin",
      label: "请求类型",
      trailing: (
        <span
          className="ls-num"
          style={{ fontSize: 10.5, color: "var(--ls-ink-faint)" }}
        >
          {types.length} 类
        </span>
      ),
      collapsed: <TypesCollapsed types={types} />,
      detail: <TypesDetail types={types} />,
    },
  ];

  // 尺寸由所在网格单元决定(填满 RGL 项);折叠/详情共用同一外框的铁律在基座内。
  return <ExpandableBentoCard cardId="requestTypes" tiles={tiles} />;
}

function TypesCollapsed({ types }: { types: AggregatedType[] }) {
  if (types.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        暂无请求类型数据
      </div>
    );
  }

  const totalCount = types.reduce((sum, t) => sum + num(t.request_count), 0);
  const top = types.slice(0, COLLAPSED_TOP);

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
      {/* 堆叠占比条:各类型 count/总 count 的宽度,圆角小段拼接,色循环用配色板。 */}
      <div
        style={{
          display: "flex",
          height: 8,
          width: "100%",
          gap: 2,
          overflow: "hidden",
        }}
      >
        {types.map((t, i) => {
          const share = totalCount > 0 ? num(t.request_count) / totalCount : 0;
          if (share <= 0) return null;
          return (
            <div
              key={t.request_type}
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
        {top.map((t, i) => {
          const share = totalCount > 0 ? num(t.request_count) / totalCount : 0;
          return (
            <div
              key={t.request_type}
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
              {/* request_type 是后端自由字符串(chat/embedding/tool 等),原样展示不映射 */}
              <span
                className="flex-1 truncate"
                style={{ color: "var(--ls-ink)" }}
              >
                {t.request_type}
              </span>
              <span
                className="ls-num"
                style={{ color: "var(--ls-ink-soft)", flexShrink: 0 }}
              >
                {fmtCompact(t.request_count)}
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

function TypesDetail({ types }: { types: AggregatedType[] }) {
  // 详情表行多,按可用高度自适应行数:量出容器高 / 行距,正好铺满不留空也不溢出。
  const { ref: listRef, rows } = useAutoRows(ROW_PITCH, MIN_ROWS);

  if (types.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        暂无请求类型数据
      </div>
    );
  }

  const totalCount = types.reduce((sum, t) => sum + num(t.request_count), 0);
  const shown = types.slice(0, rows);

  return (
    <div className="flex h-full flex-col gap-2.5">
      <SectionHead
        title="类型明细"
        hint={`${types.length} 类 · ${fmtCompact(totalCount)} 请求`}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          className="flex items-baseline gap-2 text-[10px]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          <span className="flex-1">类型</span>
          <span className="w-14 text-right">请求</span>
          <span className="w-16 text-right">Token</span>
          <span className="w-14 text-right">花费</span>
        </div>
        <div ref={listRef} className="mt-1.5 min-h-0 flex-1 overflow-hidden">
          {shown.map((t, i) => (
            <div
              key={t.request_type}
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
                  {t.request_type}
                </span>
              </span>
              <span
                className="ls-num w-14 text-right font-medium"
                style={{ color: "var(--ls-ink)" }}
              >
                {fmtCompact(t.request_count)}
              </span>
              <span
                className="ls-num w-16 text-right"
                style={{ color: "var(--ls-ink-soft)" }}
              >
                {fmtCompact(t.total_tokens)}
              </span>
              <span
                className="ls-num w-14 text-right"
                style={{ color: "var(--ls-ink-faint)" }}
              >
                {fmtCost(t.total_cost)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
