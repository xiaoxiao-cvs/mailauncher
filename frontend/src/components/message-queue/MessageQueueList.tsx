/**
 * 消息队列列表组件
 * 负责渲染消息列表、空状态、加载状态和退出动画管理
 */

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  type MessageQueueItem,
  type MessageStatus,
} from '@/hooks/queries/useMessageQueueQueries';
import {
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  WifiOff,
  Brain,
  Send,
  Sparkles,
} from 'lucide-react';

// ==================== 配置 ====================

const STATUS_CONFIG: Record<MessageStatus, {
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = {
  pending: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: MessageSquare,
    label: '等待中',
  },
  planning: {
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    icon: Brain,
    label: '思考中',
  },
  generating: {
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    icon: Sparkles,
    label: '生成中',
  },
  sending: {
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    icon: Send,
    label: '发送中',
  },
  sent: {
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    icon: CheckCircle2,
    label: '已发送',
  },
  failed: {
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    icon: AlertCircle,
    label: '失败',
  },
};

// ==================== 辅助函数 ====================

function formatDuration(startTime: number): string {
  const elapsed = Math.floor((Date.now() / 1000) - startTime);
  if (elapsed < 60) return `${elapsed}s`;
  return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
}

// ==================== 实时读秒 Hook ====================

function useElapsedTime(startTime: number, isActive: boolean): string {
  const [elapsed, setElapsed] = useState(() => formatDuration(startTime));

  useEffect(() => {
    if (!isActive) {
      setElapsed(formatDuration(startTime));
      return;
    }

    setElapsed(formatDuration(startTime));

    const timer = setInterval(() => {
      setElapsed(formatDuration(startTime));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, isActive]);

  return elapsed;
}

// ==================== 消息项组件 ====================

interface MessageItemProps {
  item: MessageQueueItem & { instanceName?: string };
  isExiting: boolean;
  showInstanceName?: boolean;
  privacyMode?: boolean;
}

function MessageItem({ item, isExiting, showInstanceName, privacyMode }: MessageItemProps) {
  const config = STATUS_CONFIG[item.status];
  const Icon = config.icon;
  const isProcessing = ['planning', 'generating', 'sending'].includes(item.status);

  const elapsedTime = useElapsedTime(item.start_time, isProcessing);

  return (
    <div
      className={cn(
        "relative p-3 rounded-card border transition-all duration-300",
        config.bgColor,
        "border-gray-200/50 dark:border-gray-700/50",
        isExiting && "animate-slide-out-right opacity-0",
        !isExiting && "animate-slide-in-left"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-1.5 rounded-control", config.bgColor)}>
          <Icon className={cn(
            "w-4 h-4",
            config.color,
            isProcessing && "animate-pulse"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {showInstanceName && item.instanceName && (
              <span className="text-xs px-1.5 py-0.5 rounded-control bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {item.instanceName}
              </span>
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {item.group_name || item.stream_id}
            </span>
            {item.cycle_count > 1 && (
              <span className="text-xs px-1.5 py-0.5 rounded-control bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                第{item.cycle_count}次
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className={cn("text-xs", config.color)}>
              {config.label}
            </span>
            <span className="text-xs text-gray-400">
              {elapsedTime}
            </span>
            {item.action_type && (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                → {item.action_type.toLowerCase().includes('no_reply') ? '不回复' : item.action_type}
              </span>
            )}
          </div>

          {item.status === 'failed' && (
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <span className="text-xs text-red-600 dark:text-red-400">
                {item.retry_reason || '回复生成失败'}
              </span>
            </div>
          )}

          {item.status !== 'failed' && item.retry_count > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <RefreshCw className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400">
                重试 x{item.retry_count}
                {item.retry_reason && ` (${item.retry_reason})`}
              </span>
            </div>
          )}

          {item.status === 'sent' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              {privacyMode ? '已回复' : (item.message_preview ? `"${item.message_preview}"` : '已回复')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== 退出动画管理 Hook ====================

export type EnrichedMessage = MessageQueueItem & { instanceName: string; instanceConnected: boolean };

function useExitAnimations(allMessages: EnrichedMessage[]) {
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const processedSentIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (allMessages.length === 0) return;

    const now = Date.now() / 1000;

    allMessages.forEach((msg) => {
      if ((msg.status === 'sent' || msg.status === 'failed') && msg.sent_time) {
        if (!processedSentIdsRef.current.has(msg.id)) {
          processedSentIdsRef.current.add(msg.id);

          const delayMs = msg.status === 'failed' ? 5000 : 2000;
          const delaySeconds = delayMs / 1000;
          const elapsedSinceComplete = now - msg.sent_time;

          if (elapsedSinceComplete > delaySeconds + 1) {
            setRemovedIds(prev => new Set([...prev, msg.id]));
            return;
          }

          const remainingDelay = Math.max(0, delayMs - elapsedSinceComplete * 1000);

          setTimeout(() => {
            setExitingIds(prev => new Set([...prev, msg.id]));

            setTimeout(() => {
              setExitingIds(prev => {
                const next = new Set(prev);
                next.delete(msg.id);
                return next;
              });
              setRemovedIds(prev => new Set([...prev, msg.id]));
            }, 500);
          }, remainingDelay);
        }
      }
    });
  }, [allMessages]);

  useEffect(() => {
    const currentIds = new Set(allMessages.map(m => m.id));

    setRemovedIds(prev => {
      const next = new Set<string>();
      prev.forEach(id => {
        if (currentIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });

    processedSentIdsRef.current.forEach(id => {
      if (!currentIds.has(id)) {
        processedSentIdsRef.current.delete(id);
      }
    });
  }, [allMessages]);

  const visibleMessages = allMessages.filter(msg => !removedIds.has(msg.id));

  return { visibleMessages, exitingIds };
}

// ==================== 主列表组件 ====================

interface MessageQueueListProps {
  allMessages: EnrichedMessage[];
  isLoading: boolean;
  error: Error | null;
  hasAnyConnected: boolean;
  showInstanceName: boolean;
  privacyMode: boolean;
}

export function MessageQueueList({
  allMessages,
  isLoading,
  error,
  hasAnyConnected,
  showInstanceName,
  privacyMode,
}: MessageQueueListProps) {
  const { visibleMessages, exitingIds } = useExitAnimations(allMessages);

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>获取队列失败</span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}

      {!isLoading && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto overflow-x-hidden scrollbar-thin">
          {!hasAnyConnected ? (
            <div className="text-center py-6 text-gray-400">
              <WifiOff className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">实例未启动</p>
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <p className="text-sm">暂无消息</p>
            </div>
          ) : (
            visibleMessages.map((item) => (
              <MessageItem
                key={item.id}
                item={item}
                isExiting={exitingIds.has(item.id)}
                showInstanceName={showInstanceName}
                privacyMode={privacyMode}
              />
            ))
          )}
        </div>
      )}
    </>
  );
}
