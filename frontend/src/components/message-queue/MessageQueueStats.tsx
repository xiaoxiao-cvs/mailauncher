/**
 * 消息队列统计信息栏
 * 包含标题、刷新频率指示器、已处理计数和隐私模式切换
 */

import { cn } from '@/lib/utils';
import { Timer, Eye, EyeOff } from 'lucide-react';
import { REFRESH_INTERVALS } from './useQueueRefreshStrategy';

interface MessageQueueStatsProps {
  refetchInterval: number;
  totalProcessed: number;
  hasAnyConnected: boolean;
  privacyMode: boolean;
  onTogglePrivacy: () => void;
}

export function MessageQueueStats({
  refetchInterval,
  totalProcessed,
  hasAnyConnected,
  privacyMode,
  onTogglePrivacy,
}: MessageQueueStatsProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          消息队列
        </h3>
        <div className={cn(
          "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-control",
          refetchInterval === REFRESH_INTERVALS.FAST
            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            : refetchInterval === REFRESH_INTERVALS.NORMAL
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
        )}>
          <Timer className={cn(
            "w-3 h-3",
            refetchInterval === REFRESH_INTERVALS.FAST && "animate-pulse"
          )} />
          <span>{refetchInterval / 1000}s</span>
        </div>
        {hasAnyConnected && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            已处理: {totalProcessed}
          </span>
        )}
      </div>

      <button
        onClick={onTogglePrivacy}
        className={cn(
          "p-1.5 rounded-control transition-colors",
          privacyMode
            ? "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500"
        )}
        title={privacyMode ? "显示回复内容" : "隐藏回复内容"}
      >
        {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
