import { useEffect, useRef, useCallback } from 'react';

export interface SmartPollingOptions {
  intervalMs?: number
  leading?: boolean
  visibleOnly?: boolean
}

export function useSmartPolling(fn: () => void, deps: any[] = [], options: SmartPollingOptions = {}) {
  const intervalMs = options.intervalMs ?? 10000;
  const leading = options.leading ?? true;
  const visibleOnly = options.visibleOnly ?? true;
  
  const timerRef = useRef<number | null>(null);
  const fnRef = useRef(fn);
  
  // 保持 fn 引用最新
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    if (leading) {
      fnRef.current();
    }
    timerRef.current = window.setInterval(() => {
      if (visibleOnly && document.hidden) return;
      fnRef.current();
    }, intervalMs);
  }, [intervalMs, leading, visibleOnly, stop]);

  const onVisibility = useCallback(() => {
    if (!visibleOnly) return;
    if (!document.hidden && timerRef.current === null) {
      start();
    }
  }, [visibleOnly, start]);

  useEffect(() => {
    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, start, stop, onVisibility]);

  return stop;
}
