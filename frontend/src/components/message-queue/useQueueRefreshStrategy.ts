/**
 * 消息队列动态刷新策略 Hook
 * 根据队列活跃状态自动调整轮询频率：
 * - 有活跃消息时：快速刷新 (0.8s)
 * - 15秒无活跃消息：普通刷新 (2s)
 * - 30秒无活跃消息：慢速刷新 (3s)
 */

import { useEffect, useState, useRef, useCallback } from 'react';

const REFRESH_INTERVALS = {
  FAST: 800,
  NORMAL: 2000,
  SLOW: 3000,
} as const;

type RefreshIntervalType = typeof REFRESH_INTERVALS[keyof typeof REFRESH_INTERVALS];

const IDLE_THRESHOLDS = {
  TO_NORMAL: 15000,
  TO_SLOW: 30000,
} as const;

export { REFRESH_INTERVALS };

interface QueueRefreshStrategy {
  refetchInterval: RefreshIntervalType;
  notifyActive: () => void;
}

export function useQueueRefreshStrategy(): QueueRefreshStrategy {
  const [refetchInterval, setRefetchInterval] = useState<RefreshIntervalType>(REFRESH_INTERVALS.FAST);
  const lastActiveTimeRef = useRef<number>(Date.now());
  const intervalCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const notifyActive = useCallback(() => {
    lastActiveTimeRef.current = Date.now();
    setRefetchInterval(prev =>
      prev !== REFRESH_INTERVALS.FAST ? REFRESH_INTERVALS.FAST : prev
    );
  }, []);

  useEffect(() => {
    if (intervalCheckRef.current) {
      clearInterval(intervalCheckRef.current);
    }

    intervalCheckRef.current = setInterval(() => {
      const idleTime = Date.now() - lastActiveTimeRef.current;

      if (idleTime >= IDLE_THRESHOLDS.TO_SLOW) {
        setRefetchInterval(prev =>
          prev !== REFRESH_INTERVALS.SLOW ? REFRESH_INTERVALS.SLOW : prev
        );
      } else if (idleTime >= IDLE_THRESHOLDS.TO_NORMAL) {
        setRefetchInterval(prev =>
          prev !== REFRESH_INTERVALS.NORMAL ? REFRESH_INTERVALS.NORMAL : prev
        );
      }
    }, 1000);

    return () => {
      if (intervalCheckRef.current) {
        clearInterval(intervalCheckRef.current);
      }
    };
  }, []);

  return { refetchInterval, notifyActive };
}
