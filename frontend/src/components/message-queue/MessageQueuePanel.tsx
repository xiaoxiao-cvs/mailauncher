/**
 * 消息队列面板组件
 * 展示 MaiBot 正在处理的消息队列，支持动画效果
 */

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  useInstanceMessageQueueQuery,
  type MessageQueueItem,
  type MessageStatus,
} from '@/hooks/queries/useMessageQueueQueries';
import {
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Brain,
  Send,
  Sparkles,
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
  item: MessageQueueItem;
  isExiting: boolean;
}

function MessageItem({ item, isExiting }: MessageItemProps) {
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
  instanceId: string | null;
  className?: string;
}

export function MessageQueuePanel({ instanceId, className }: MessageQueuePanelProps) {
  const { data, isLoading, error } = useInstanceMessageQueueQuery(instanceId, {
    refetchInterval: 3000,
  });
  
  // 追踪需要退出动画的消息
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const prevMessagesRef = useRef<MessageQueueItem[]>([]);
  
  // 检测已发送的消息，添加退出动画
  useEffect(() => {
    if (!data?.messages) return;
    
    const currentMessages = data.messages;
    const prevMessages = prevMessagesRef.current;
    
    // 找出已发送的消息
    currentMessages.forEach((msg) => {
      if (msg.status === 'sent' && msg.sent_time) {
        const prevMsg = prevMessages.find(m => m.id === msg.id);
        if (!prevMsg || prevMsg.status !== 'sent') {
          // 新变成 sent 状态，2秒后添加到退出列表
          setTimeout(() => {
            setExitingIds(prev => new Set([...prev, msg.id]));
          }, 2000);
        }
      }
    });
    
    prevMessagesRef.current = currentMessages;
  }, [data?.messages]);
  
  // 清理已退出的消息ID
  useEffect(() => {
    if (exitingIds.size > 0) {
      const timer = setTimeout(() => {
        setExitingIds(new Set());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [exitingIds]);
  
  // 过滤掉正在退出的消息
  const visibleMessages = data?.messages.filter(
    msg => !exitingIds.has(msg.id)
  ) || [];
  
  // 空状态
  if (!instanceId) {
    return (
      <div className={cn(
        "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6",
        "border border-gray-200/50 dark:border-gray-700/50",
        "flex items-center justify-center",
        className
      )}>
        <div className="text-center text-gray-400 dark:text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">选择实例查看消息队列</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6",
      "border border-gray-200/50 dark:border-gray-700/50",
      className
    )}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            消息队列
          </h3>
          {data?.connected ? (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Wifi className="w-3 h-3" />
              <span>已连接</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <WifiOff className="w-3 h-3" />
              <span>未连接</span>
            </div>
          )}
        </div>
        {data && (
          <span className="text-xs text-gray-500">
            已处理: {data.total_processed}
          </span>
        )}
      </div>
      
      {/* 错误状态 */}
      {(error || data?.error) && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{data?.error || '获取队列失败'}</span>
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
          {visibleMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无消息处理</p>
            </div>
          ) : (
            visibleMessages.map((item) => (
              <MessageItem
                key={item.id}
                item={item}
                isExiting={exitingIds.has(item.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
