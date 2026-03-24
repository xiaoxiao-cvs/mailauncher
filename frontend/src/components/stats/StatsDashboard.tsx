import { useState, useEffect, useRef } from 'react';
import {
  useStatsOverviewQuery,
  useInstanceStatsQuery,
  type TimeRange,
  type StatsSummary,
  type ModelStats,
} from '@/hooks/queries/useStatsQueries';
import { useInstancesQuery } from '@/hooks/queries/useInstanceQueries';
import { MessageQueuePanel } from '@/components/message-queue/MessageQueuePanel';
import { StatsControlBar } from './StatsControlBar';
import { StatsOverviewCards } from './StatsOverviewCards';
import { ModelDistributionChart } from './ModelDistributionChart';

const HISTORY_MAX_POINTS = 12;

export function StatsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'cost' | 'requests' | 'tokens'>('cost');

  const [statsHistory, setStatsHistory] = useState<{
    requests: number[];
    cost: number[];
    tokens: number[];
    responseTime: number[];
    onlineTime: number[];
    messages: number[];
    replies: number[];
  }>({
    requests: [],
    cost: [],
    tokens: [],
    responseTime: [],
    onlineTime: [],
    messages: [],
    replies: [],
  });

  const lastValuesRef = useRef<{
    requests: number;
    cost: number;
    tokens: number;
    responseTime: number;
    onlineTime: number;
    messages: number;
    replies: number;
  }>({
    requests: 0,
    cost: 0,
    tokens: 0,
    responseTime: 0,
    onlineTime: 0,
    messages: 0,
    replies: 0,
  });

  const { data: instancesData } = useInstancesQuery();
  const instances = instancesData?.instances;

  const {
    data: overviewData,
    isLoading: overviewLoading,
    dataUpdatedAt: lastUpdated,
  } = useStatsOverviewQuery(timeRange, {
    refetchInterval: refreshInterval
  });

  const {
    data: instanceData,
    isLoading: instanceLoading
  } = useInstanceStatsQuery(
    selectedInstance || undefined,
    timeRange,
    { refetchInterval: selectedInstance ? refreshInterval : false }
  );

  const currentData = selectedInstance ? instanceData : overviewData;
  const isLoading = selectedInstance ? instanceLoading : overviewLoading;
  const summary: StatsSummary | undefined = currentData?.summary;
  const modelStats: ModelStats[] = selectedInstance
    ? (instanceData?.model_stats || [])
    : (overviewData?.top_models || []);

  const lastUpdatedText = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  useEffect(() => {
    if (!summary) return;

    const newValues = {
      requests: summary.total_requests || 0,
      cost: summary.total_cost || 0,
      tokens: summary.total_tokens || 0,
      responseTime: summary.avg_response_time || 0,
      onlineTime: summary.online_time || 0,
      messages: summary.total_messages || 0,
      replies: summary.total_replies || 0,
    };

    const hasChanges = Object.keys(newValues).some(
      key => newValues[key as keyof typeof newValues] !== lastValuesRef.current[key as keyof typeof newValues]
    );

    if (hasChanges || statsHistory.requests.length === 0) {
      setStatsHistory(prev => {
        const addPoint = (arr: number[], val: number) => {
          const newArr = [...arr, val];
          return newArr.length > HISTORY_MAX_POINTS ? newArr.slice(-HISTORY_MAX_POINTS) : newArr;
        };

        return {
          requests: addPoint(prev.requests, newValues.requests),
          cost: addPoint(prev.cost, newValues.cost),
          tokens: addPoint(prev.tokens, newValues.tokens),
          responseTime: addPoint(prev.responseTime, newValues.responseTime),
          onlineTime: addPoint(prev.onlineTime, newValues.onlineTime),
          messages: addPoint(prev.messages, newValues.messages),
          replies: addPoint(prev.replies, newValues.replies),
        };
      });

      lastValuesRef.current = newValues;
    }
  }, [summary, statsHistory.requests.length, HISTORY_MAX_POINTS]);

  useEffect(() => {
    setStatsHistory({
      requests: [],
      cost: [],
      tokens: [],
      responseTime: [],
      onlineTime: [],
      messages: [],
      replies: [],
    });
    lastValuesRef.current = {
      requests: 0,
      cost: 0,
      tokens: 0,
      responseTime: 0,
      onlineTime: 0,
      messages: 0,
      replies: 0,
    };
  }, [selectedInstance, timeRange]);

  return (
    <div className="p-6 space-y-6">
      <StatsControlBar
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={setRefreshInterval}
        selectedInstance={selectedInstance}
        onSelectedInstanceChange={setSelectedInstance}
        instances={instances}
        isLoading={isLoading}
        lastUpdatedText={lastUpdatedText}
        totalInstances={overviewData?.total_instances}
        runningInstances={overviewData?.running_instances}
      />

      <StatsOverviewCards summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModelDistributionChart
          modelStats={modelStats}
          chartType={chartType}
          onChartTypeChange={setChartType}
          summary={summary}
          timeRange={timeRange}
        />

        <MessageQueuePanel instanceId={selectedInstance} />
      </div>
    </div>
  );
}
