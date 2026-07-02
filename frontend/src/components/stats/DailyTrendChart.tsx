import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { Surface, Sparkline } from "@/components/ls";
import { instanceApi } from "@/services/instanceApi";
import type { TimeRange } from "@/hooks/queries/useStatsQueries";

/** 单日 LLM 请求/花费/token 聚合(对应 Rust DailyStatsPoint)。 */
export interface DailyStatsPoint {
  date: string;
  requests: number;
  cost: number;
  tokens: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toFixed(0);
}

function formatCurrency(num: number): string {
  if (num >= 100) return "¥" + num.toFixed(0);
  if (num >= 10) return "¥" + num.toFixed(1);
  return "¥" + num.toFixed(2);
}

/** "2026-06-03" -> "06-03",列表行紧凑展示不需要年份。 */
function shortDate(date: string): string {
  const parts = date.split("-");
  return parts.length === 3 ? `${parts[1]}-${parts[2]}` : date;
}

interface DailyTrendChartProps {
  timeRange: TimeRange;
}

/**
 * 日粒度趋势卡(P2-29)——顶部 Sparkline 走势 + 底部逐日明细列表(倒序,最新在前)。
 * 请求数/花费/token 量纲不同,不强行叠画同一折线,Sparkline 仅取请求数作主趋势,
 * 花费与 token 在明细行内以数字呈现。
 */
export function DailyTrendChart({ timeRange }: DailyTrendChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["stats", "daily", timeRange],
    queryFn: () => instanceApi.getDailyStats(timeRange),
    staleTime: 30000,
  });

  const points = data ?? [];
  const hasTrend = points.length > 1;
  const reversed = [...points].reverse();

  return (
    <Surface variant="panel" className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="h-4 w-4" style={{ color: "var(--ls-life)" }} />
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--ls-ink)" }}
        >
          每日趋势
        </h3>
      </div>

      {isLoading ? (
        <div
          className="flex h-40 items-center justify-center text-sm"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          加载中...
        </div>
      ) : points.length === 0 ? (
        <div
          className="flex h-40 flex-col items-center justify-center gap-2 text-sm"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          <CalendarDays
            className="h-8 w-8"
            style={{ color: "var(--ls-ink-faint)" }}
          />
          暂无日粒度数据
        </div>
      ) : (
        <>
          {hasTrend && (
            <Sparkline
              values={points.map((p) => p.requests)}
              className="h-24 w-full"
            />
          )}

          <div className="mt-4 max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {reversed.map((p) => (
              <div
                key={p.date}
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                style={{ background: "var(--ls-bg-2)" }}
              >
                <span
                  className="ls-num text-xs font-medium"
                  style={{ color: "var(--ls-ink)" }}
                >
                  {shortDate(p.date)}
                </span>
                <div
                  className="ls-num flex items-center gap-3 text-xs"
                  style={{ color: "var(--ls-ink-soft)" }}
                >
                  <span>{formatNumber(p.requests)} 次</span>
                  <span>{formatCurrency(p.cost)}</span>
                  <span>{formatNumber(p.tokens)} tok</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Surface>
  );
}
