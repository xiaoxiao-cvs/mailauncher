import {
  Clock,
  RefreshCw,
  ChevronDown,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeRange } from '@/hooks/queries/useStatsQueries';
import type { Instance } from '@/services/instanceApi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1 小时' },
  { value: '6h', label: '6 小时' },
  { value: '12h', label: '12 小时' },
  { value: '24h', label: '24 小时' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
];

const REFRESH_INTERVALS = [
  { value: 15000, label: '15 秒' },
  { value: 30000, label: '30 秒' },
  { value: 60000, label: '60 秒' },
];

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
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            统计概览
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedInstance
              ? `${instances?.find(i => i.id === selectedInstance)?.name || '实例'} 的运行统计`
              : '全部实例汇总统计'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Server className="w-4 h-4" />
                {selectedInstance
                  ? instances?.find(i => i.id === selectedInstance)?.name || '实例'
                  : '全部实例'}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>选择数据源</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSelectedInstanceChange(null)}>
                <Server className="w-4 h-4 mr-2" />
                全部实例
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {instances?.map((instance) => (
                <DropdownMenuItem
                  key={instance.id}
                  onClick={() => onSelectedInstanceChange(instance.id)}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full mr-2",
                    instance.status === 'running' ? "bg-success" : "bg-muted-foreground"
                  )} />
                  {instance.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Clock className="w-4 h-4" />
                {TIME_RANGE_OPTIONS.find(o => o.value === timeRange)?.label}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {TIME_RANGE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onTimeRangeChange(option.value)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <RefreshCw className={cn(
                  "w-4 h-4 transition-transform",
                  isLoading && "animate-spin"
                )} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>自动刷新间隔</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {REFRESH_INTERVALS.map((interval) => (
                <DropdownMenuItem
                  key={interval.value}
                  onClick={() => onRefreshIntervalChange(interval.value)}
                >
                  <span className={cn(
                    refreshInterval === interval.value && "font-semibold"
                  )}>
                    {interval.label}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>最后更新: {lastUpdatedText}</span>
        {!selectedInstance && totalInstances !== undefined && (
          <>
            <span>•</span>
            <span>{totalInstances} 个实例</span>
            <span>•</span>
            <span className="text-success">{runningInstances} 个运行中</span>
          </>
        )}
      </div>
    </>
  );
}
