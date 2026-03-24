/**
 * 消息队列历史趋势迷你折线图
 * 追踪已处理消息数量的变化趋势
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Sparkline, SPARKLINE_COLORS } from '@/components/ui/sparkline';

const HISTORY_MAX_POINTS = 15;

interface QueueSparklineProps {
  totalProcessed: number;
  hasAnyConnected: boolean;
}

export function QueueSparkline({ totalProcessed, hasAnyConnected }: QueueSparklineProps) {
  const [processedHistory, setProcessedHistory] = useState<number[]>([]);
  const lastProcessedRef = useRef<number>(0);

  const updateHistory = useCallback((newValue: number) => {
    setProcessedHistory(prev => {
      if (prev.length > 0 && prev[prev.length - 1] === newValue) {
        return prev;
      }
      const newHistory = [...prev, newValue];
      if (newHistory.length > HISTORY_MAX_POINTS) {
        return newHistory.slice(-HISTORY_MAX_POINTS);
      }
      return newHistory;
    });
  }, []);

  useEffect(() => {
    if (totalProcessed !== lastProcessedRef.current) {
      lastProcessedRef.current = totalProcessed;
      updateHistory(totalProcessed);
    }
  }, [totalProcessed, updateHistory]);

  useEffect(() => {
    if (hasAnyConnected && processedHistory.length === 0) {
      updateHistory(totalProcessed);
    }
  }, [hasAnyConnected, totalProcessed, processedHistory.length, updateHistory]);

  if (!hasAnyConnected || processedHistory.length < 2) {
    return null;
  }

  return (
    <Sparkline
      data={processedHistory}
      color={SPARKLINE_COLORS.cyan}
      width={60}
      height={24}
      strokeWidth={1.5}
    />
  );
}
