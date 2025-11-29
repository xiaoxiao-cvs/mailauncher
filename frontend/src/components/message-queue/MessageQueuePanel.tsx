/**
 * 消息队列面板组件
 * 展示 MaiBot 正在处理的消息队列，支持动画效果
 * 支持动态刷新频率：有队列时1秒，15秒无消息3秒，30秒无消息5秒
 */

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Sparkline, SPARKLINE_COLORS } from '@/components/ui/sparkline';
import {
  useInstanceMessageQueueQuery,
  useAllMessageQueuesQuery,
  type MessageQueueItem,
  type MessageStatus,
} from '@/hooks/queries/useMessageQueueQueries';

// ==================== 动态刷新配置 ====================

// 刷新间隔配置（毫秒）
const REFRESH_INTERVALS = {
  FAST: 1000,      // 有队列时 1秒
  NORMAL: 3000,    // 15秒无消息后 3秒
  SLOW: 5000,      // 30秒无消息后 5秒（默认）
} as const;

type RefreshIntervalType = typeof REFRESH_INTERVALS[keyof typeof REFRESH_INTERVALS];

// 降速阈值（毫秒）
const IDLE_THRESHOLDS = {
  TO_NORMAL: 15000,  // 15秒无消息降到 NORMAL
  TO_SLOW: 30000,    // 30秒无消息降到 SLOW
} as const;

// 历史数据配置
const HISTORY_CONFIG = {
  MAX_POINTS: 15,  // 最多保留 15 个历史数据点
} as const;

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
  Timer,
} from 'lucide-react';

// ==================== 配置 ====================

// 状态颜色配置
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

// ==================== 消息项组件 ====================

interface MessageItemProps {
  item: MessageQueueItem & { instanceName?: string };
  isExiting: boolean;
  showInstanceName?: boolean;
}

function MessageItem({ item, isExiting, showInstanceName }: MessageItemProps) {
  const config = STATUS_CONFIG[item.status];
  const Icon = config.icon;
  const isProcessing = ['planning', 'generating', 'sending'].includes(item.status);
  
  return (
    <div
      className={cn(
        "relative p-3 rounded-lg border transition-all duration-300",
        config.bgColor,
        "border-gray-200/50 dark:border-gray-700/50",
        isExiting && "animate-slide-out-right opacity-0",
        !isExiting && "animate-slide-in-left"
      )}
    >
      <div className="flex items-start gap-3">
        {/* 状态图标 */}
        <div className={cn("p-1.5 rounded-lg", config.bgColor)}>
          <Icon className={cn(
            "w-4 h-4",
            config.color,
            isProcessing && "animate-pulse"
          )} />
        </div>
        
        {/* 消息内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {showInstanceName && item.instanceName && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {item.instanceName}
              </span>
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {item.group_name || item.stream_id}
            </span>
            {item.cycle_count > 1 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                第{item.cycle_count}次
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("text-xs", config.color)}>
              {config.label}
            </span>
            <span className="text-xs text-gray-400">
              {formatDuration(item.start_time)}
            </span>
            {item.action_type && (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                → {item.action_type}
              </span>
            )}
          </div>
          
          {/* 重试信息 */}
          {item.retry_count > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <RefreshCw className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400">
                重试 x{item.retry_count}
                {item.retry_reason && ` (${item.retry_reason})`}
              </span>
            </div>
          )}
          
          {/* 消息预览 */}
          {item.message_preview && item.status === 'sent' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              "{item.message_preview}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== 主面板组件 ====================

interface MessageQueuePanelProps {
  instanceId?: string | null;  // 可选，不传则显示所有实例
  className?: string;
}

export function MessageQueuePanel({ instanceId, className }: MessageQueuePanelProps) {
  // ==================== 动态刷新频率状态 ====================
  const [refetchInterval, setRefetchInterval] = useState<RefreshIntervalType>(REFRESH_INTERVALS.SLOW);
  const lastActiveTimeRef = useRef<number>(Date.now());
  const intervalCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // 根据是否指定实例选择不同的查询
  const singleInstanceQuery = useInstanceMessageQueueQuery(instanceId || null, {
    refetchInterval,
    enabled: !!instanceId,
  });
  
  const allQueuesQuery = useAllMessageQueuesQuery({
    refetchInterval,
    enabled: !instanceId,
  });
  
  const isLoading = instanceId ? singleInstanceQuery.isLoading : allQueuesQuery.isLoading;
  const error = instanceId ? singleInstanceQuery.error : allQueuesQuery.error;
  
  // 合并所有实例的消息数据
  const allInstancesData = useMemo(() => {
    if (instanceId && singleInstanceQuery.data) {
      return [singleInstanceQuery.data];
    }
    if (!instanceId && allQueuesQuery.data) {
      return Object.values(allQueuesQuery.data);
    }
    return [];
  }, [instanceId, singleInstanceQuery.data, allQueuesQuery.data]);
  
  // 合并所有消息并添加实例信息
  const allMessages = useMemo(() => {
    const messages: Array<MessageQueueItem & { instanceName: string; instanceConnected: boolean }> = [];
    allInstancesData.forEach(instance => {
      if (instance.messages) {
        instance.messages.forEach(msg => {
          messages.push({
            ...msg,
            instanceName: instance.instance_name,
            instanceConnected: instance.connected,
          });
        });
      }
    });
    // 按开始时间排序，最新的在前
    return messages.sort((a, b) => b.start_time - a.start_time);
  }, [allInstancesData]);
  
  // 计算统计信息
  const stats = useMemo(() => {
    const connectedCount = allInstancesData.filter(i => i.connected).length;
    const totalProcessed = allInstancesData.reduce((sum, i) => sum + (i.total_processed || 0), 0);
    const hasAnyConnected = connectedCount > 0;
    const totalInstances = allInstancesData.length;
    return { connectedCount, totalProcessed, hasAnyConnected, totalInstances };
  }, [allInstancesData]);
  
  // ==================== 历史数据追踪 ====================
  // 用于迷你折线图展示处理消息数量的趋势
  const [processedHistory, setProcessedHistory] = useState<number[]>([]);
  const lastProcessedRef = useRef<number>(0);
  
  // 更新历史数据
  const updateHistory = useCallback((newValue: number) => {
    setProcessedHistory(prev => {
      // 如果值没有变化且不是第一次，不添加新点
      if (prev.length > 0 && prev[prev.length - 1] === newValue) {
        return prev;
      }
      const newHistory = [...prev, newValue];
      // 保留最近的 MAX_POINTS 个数据点
      if (newHistory.length > HISTORY_CONFIG.MAX_POINTS) {
        return newHistory.slice(-HISTORY_CONFIG.MAX_POINTS);
      }
      return newHistory;
    });
  }, []);
  
  // 当 totalProcessed 变化时更新历史数据
  useEffect(() => {
    if (stats.totalProcessed !== lastProcessedRef.current) {
      lastProcessedRef.current = stats.totalProcessed;
      updateHistory(stats.totalProcessed);
    }
  }, [stats.totalProcessed, updateHistory]);
  
  // 初始化时添加第一个数据点
  useEffect(() => {
    if (stats.hasAnyConnected && processedHistory.length === 0) {
      updateHistory(stats.totalProcessed);
    }
  }, [stats.hasAnyConnected, stats.totalProcessed, processedHistory.length, updateHistory]);
  
  // 追踪需要退出动画的消息ID（正在播放退出动画）
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  // 追踪已完全移除的消息ID（动画播放完毕，不再显示）
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  // 追踪已经触发过退出流程的消息ID（防止重复触发）
  const processedSentIdsRef = useRef<Set<string>>(new Set());
  
  // 检测已发送的消息，添加退出动画
  useEffect(() => {
    if (allMessages.length === 0) return;
    
    // 找出新变成 sent 状态的消息
    allMessages.forEach((msg) => {
      if (msg.status === 'sent' && msg.sent_time) {
        // 只处理还没处理过的消息
        if (!processedSentIdsRef.current.has(msg.id)) {
          processedSentIdsRef.current.add(msg.id);
          
          // 2秒后开始退出动画
          setTimeout(() => {
            setExitingIds(prev => new Set([...prev, msg.id]));
            
            // 退出动画播放 500ms 后，真正移除消息
            setTimeout(() => {
              setExitingIds(prev => {
                const next = new Set(prev);
                next.delete(msg.id);
                return next;
              });
              setRemovedIds(prev => new Set([...prev, msg.id]));
            }, 500);
          }, 2000);
        }
      }
    });
  }, [allMessages]);
  
  // 定期清理已移除的消息ID（当消息在后端也被清理后）
  useEffect(() => {
    const currentIds = new Set(allMessages.map(m => m.id));
    
    // 清理不再存在的消息ID
    setRemovedIds(prev => {
      const next = new Set<string>();
      prev.forEach(id => {
        // 如果后端还有这个消息，保留它在移除列表中
        if (currentIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
    
    // 同时清理 processedSentIds
    processedSentIdsRef.current.forEach(id => {
      if (!currentIds.has(id)) {
        processedSentIdsRef.current.delete(id);
      }
    });
  }, [allMessages]);
  
  // ==================== 动态刷新频率逻辑 ====================
  // 根据队列状态动态调整刷新频率：
  // - 有活跃消息（非 sent/failed）时：1秒刷新
  // - 15秒无活跃消息：3秒刷新  
  // - 30秒无活跃消息：5秒刷新（默认）
  useEffect(() => {
    if (allMessages.length === 0) return;
    
    // 检查是否有活跃消息（非 sent/failed 状态）
    const hasActiveMessages = allMessages.some(
      msg => !['sent', 'failed'].includes(msg.status)
    );
    
    if (hasActiveMessages) {
      // 有活跃消息，使用快速刷新
      lastActiveTimeRef.current = Date.now();
      if (refetchInterval !== REFRESH_INTERVALS.FAST) {
        setRefetchInterval(REFRESH_INTERVALS.FAST);
      }
    }
  }, [allMessages, refetchInterval]);
  
  // 定时检查空闲时间，动态降低刷新频率
  useEffect(() => {
    // 清理旧的定时器
    if (intervalCheckRef.current) {
      clearInterval(intervalCheckRef.current);
    }
    
    intervalCheckRef.current = setInterval(() => {
      const idleTime = Date.now() - lastActiveTimeRef.current;
      
      if (idleTime >= IDLE_THRESHOLDS.TO_SLOW) {
        // 30秒无活跃消息，降到慢速
        if (refetchInterval !== REFRESH_INTERVALS.SLOW) {
          setRefetchInterval(REFRESH_INTERVALS.SLOW);
        }
      } else if (idleTime >= IDLE_THRESHOLDS.TO_NORMAL) {
        // 15秒无活跃消息，降到正常速度
        if (refetchInterval !== REFRESH_INTERVALS.NORMAL) {
          setRefetchInterval(REFRESH_INTERVALS.NORMAL);
        }
      }
    }, 1000); // 每秒检查一次
    
    return () => {
      if (intervalCheckRef.current) {
        clearInterval(intervalCheckRef.current);
      }
    };
  }, [refetchInterval]);
  
  // 过滤掉已完全移除的消息（退出动画播放完毕的）
  const visibleMessages = allMessages.filter(
    msg => !removedIds.has(msg.id)
  );
  
  return (
    <div className={cn(
      "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6",
      "border border-gray-200/50 dark:border-gray-700/50",
      className
    )}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            消息队列
          </h3>
          {/* 刷新频率指示器 */}
          <div className={cn(
            "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
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
          {/* 已处理统计 - 左移到这里 */}
          {stats.hasAnyConnected && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              已处理: {stats.totalProcessed}
            </span>
          )}
        </div>
        {/* 迷你折线图 - 显示处理消息趋势 */}
        <div className="flex items-center">
          {stats.hasAnyConnected && processedHistory.length >= 2 && (
            <Sparkline
              data={processedHistory}
              color={SPARKLINE_COLORS.cyan}
              width={80}
              height={24}
              strokeWidth={2}
              animate={true}
              animationDuration={800}
              showGradient={true}
            />
          )}
        </div>
      </div>
      
      {/* 错误状态 */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>获取队列失败</span>
          </div>
        </div>
      )}
      
      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}
      
      {/* 消息列表 */}
      {!isLoading && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
          {!stats.hasAnyConnected ? (
            // 没有任何实例连接
            <div className="text-center py-6 text-gray-400">
              <WifiOff className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">实例未启动</p>
            </div>
          ) : visibleMessages.length === 0 ? (
            // 有连接但没有消息
            <div className="text-center py-6 text-gray-400">
              <p className="text-sm">暂无消息</p>
            </div>
          ) : (
            visibleMessages.map((item) => (
              <MessageItem
                key={item.id}
                item={item}
                isExiting={exitingIds.has(item.id)}
                showInstanceName={!instanceId}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
