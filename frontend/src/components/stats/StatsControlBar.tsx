import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeRange } from "@/hooks/queries/useStatsQueries";
import type { Instance } from "@/services/instanceApi";
import {
  Select,
  SegmentControl,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  StatusDot,
} from "@/components/ls";

// 时间窗分段:沿用 HomeView 范式直接以紧凑 range token(24h/7d…)作标签,tabular 等宽。
const TIME_RANGE_OPTIONS = ["1h", "6h", "12h", "24h", "7d", "30d"] as const;

const REFRESH_INTERVALS: { value: number; label: string }[] = [
  { value: 15000, label: "15 秒" },
  { value: 30000, label: "30 秒" },
  { value: 60000, label: "60 秒" },
];

const ALL_INSTANCES_VALUE = "__all__";

interface StatsControlBarProps {
  timeRange: TimeRange;
  onTimeRangeChange: (value: TimeRange) => void;
  refreshInterval: number;
  onRefreshIntervalChange: (value: number) => void;
  selectedInstance: string | null;
  onSelectedInstanceChange: (value: string | null) => void;
  instances: Instance[] | undefined;
  isLoading: boolean;
  lastUpdatedText: string;
  totalInstances?: number;
  runningInstances?: number;
}

export function StatsControlBar({
  timeRange,
  onTimeRangeChange,
  refreshInterval,
  onRefreshIntervalChange,
  selectedInstance,
  onSelectedInstanceChange,
  instances,
  isLoading,
  lastUpdatedText,
  totalInstances,
  runningInstances,
}: StatsControlBarProps) {
  const selectedName =
    instances?.find((i) => i.id === selectedInstance)?.name ?? "实例";

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ls-ink)" }}>
            统计概览
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ls-ink-soft)" }}>
            {selectedInstance
              ? `${selectedName} 的运行统计`
              : "全部实例汇总统计"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SelectRoot
            value={selectedInstance ?? ALL_INSTANCES_VALUE}
            onValueChange={(v) =>
              onSelectedInstanceChange(v === ALL_INSTANCES_VALUE ? null : v)
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_INSTANCES_VALUE}>全部实例</SelectItem>
              {instances?.map((instance) => (
                <SelectItem key={instance.id} value={instance.id}>
                  <span className="inline-flex items-center gap-2">
                    <StatusDot running={instance.status === "running"} />
                    {instance.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </SelectRoot>

          <Select
            className="w-28"
            value={String(refreshInterval)}
            onValueChange={(v) => onRefreshIntervalChange(Number(v))}
            options={REFRESH_INTERVALS.map((interval) => ({
              value: String(interval.value),
              label: interval.label,
            }))}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <SegmentControl
          options={TIME_RANGE_OPTIONS}
          value={timeRange}
          onChange={onTimeRangeChange}
        />

        <div
          className="flex items-center gap-3 text-sm"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", isLoading && "animate-spin")}
            style={{ color: "var(--ls-ink-faint)" }}
          />
          <span className="ls-num">最后更新 {lastUpdatedText}</span>
          {!selectedInstance && totalInstances !== undefined && (
            <span className="ls-num inline-flex items-center gap-2">
              <span style={{ color: "var(--ls-ink-faint)" }}>·</span>
              <span>{totalInstances} 个实例</span>
              {runningInstances !== undefined && (
                <>
                  <span style={{ color: "var(--ls-ink-faint)" }}>·</span>
                  <StatusDot running={runningInstances > 0} />
                  <span style={{ color: "var(--ls-ink)" }}>
                    {runningInstances} 运行中
                  </span>
                </>
              )}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
