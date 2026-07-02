import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { Surface, Badge } from "@/components/ls";
import { instanceApi } from "@/services/instanceApi";

/** 一条最近 LLM 调用活动(对应 Rust RecentActivityItem)。 */
export interface RecentActivityItem {
  timestamp: string;
  instance_id: string;
  instance_name: string;
  model: string | null;
  request_type: string;
  tokens: number;
  cost: number;
  time_cost: number;
}

/** "2026-06-03 12:34:56" -> "12:34:56";无法匹配则原样返回。 */
function shortTs(ts: string): string {
  const m = ts.match(/(\d{2}:\d{2}:\d{2})/);
  return m ? m[1] : ts;
}

function formatCurrency(num: number): string {
  if (num >= 10) return "¥" + num.toFixed(1);
  return "¥" + num.toFixed(4);
}

const REQUEST_TYPE_LABEL: Record<string, string> = {
  chat: "对话",
  tool: "工具调用",
  embedding: "向量化",
  reply: "回复",
};

/**
 * 最近活动流卡(P2-29)——跨实例最新 LLM 调用记录,按时间倒序,
 * 后端已完成合并排序与截断,前端只负责渲染。
 */
export function RecentActivityFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats", "recent-activity"],
    queryFn: () => instanceApi.getRecentActivity(20),
    staleTime: 15000,
    refetchInterval: 30000,
  });

  const items = data ?? [];

  return (
    <Surface variant="panel" className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4" style={{ color: "var(--ls-life)" }} />
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--ls-ink)" }}
        >
          最近活动
        </h3>
      </div>

      {isLoading ? (
        <div
          className="flex h-40 items-center justify-center text-sm"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          加载中...
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex h-40 flex-col items-center justify-center gap-2 text-sm"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          <Activity
            className="h-8 w-8"
            style={{ color: "var(--ls-ink-faint)" }}
          />
          暂无最近活动
        </div>
      ) : (
        <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {items.map((item, i) => (
            <div
              key={`${item.instance_id}-${item.timestamp}-${i}`}
              className="rounded-lg px-2.5 py-1.5"
              style={{ background: "var(--ls-bg-2)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="ls-num shrink-0 text-[10px]"
                  style={{ color: "var(--ls-ink-faint)" }}
                >
                  {shortTs(item.timestamp)}
                </span>
                <Badge
                  tone="neutral"
                  className="shrink-0 !px-1.5 !text-[9.5px]"
                >
                  {REQUEST_TYPE_LABEL[item.request_type] ?? item.request_type}
                </Badge>
                <span
                  className="truncate text-[11px] font-semibold"
                  style={{
                    color: "var(--ls-ink)",
                    flex: "0 1 auto",
                    minWidth: 0,
                  }}
                >
                  {item.instance_name}
                </span>
                {item.model ? (
                  <span
                    className="truncate text-[10px]"
                    style={{
                      color: "var(--ls-ink-faint)",
                      flex: "1 1 auto",
                      minWidth: 0,
                    }}
                    title={item.model}
                  >
                    {item.model}
                  </span>
                ) : null}
              </div>
              <div
                className="ls-num mt-1 flex items-center gap-3 text-[10.5px]"
                style={{ color: "var(--ls-ink-soft)" }}
              >
                <span>{item.tokens} tok</span>
                <span>{formatCurrency(item.cost)}</span>
                <span>{item.time_cost.toFixed(2)}s</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
}
