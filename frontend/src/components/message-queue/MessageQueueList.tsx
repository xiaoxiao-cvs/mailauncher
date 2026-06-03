/**
 * 消息队列列表组件
 * 负责渲染消息列表、空状态、加载状态和退出动画管理
 */

import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { Badge, StatusDot } from "@/components/ls";
import { springSettle } from "@/design/motion";
import {
  type MessageQueueItem,
  type MessageStatus,
} from "@/hooks/queries/useMessageQueueQueries";
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
} from "lucide-react";

// ==================== 配置 ====================

/**
 * 状态到生息语义 token 的映射:
 * - planning/generating/sending = 活跃在途 = 生命色;
 * - failed = 危险色;sent/pending = 中性弱色。
 * 行容器统一为凹陷面(.ls-inset),状态靠 token 色图标 + 标签表达,不再用彩色玻璃背景块。
 */
const STATUS_CONFIG: Record<
  MessageStatus,
  {
    tone: string;
    icon: React.ComponentType<{
      size?: number | string;
      style?: React.CSSProperties;
    }>;
    label: string;
  }
> = {
  pending: {
    tone: "var(--ls-ink-faint)",
    icon: MessageSquare,
    label: "等待中",
  },
  planning: {
    tone: "var(--ls-life)",
    icon: Brain,
    label: "思考中",
  },
  generating: {
    tone: "var(--ls-life)",
    icon: Sparkles,
    label: "生成中",
  },
  sending: {
    tone: "var(--ls-life)",
    icon: Send,
    label: "发送中",
  },
  sent: {
    tone: "var(--ls-ink-faint)",
    icon: CheckCircle2,
    label: "已发送",
  },
  failed: {
    tone: "var(--ls-danger)",
    icon: AlertCircle,
    label: "失败",
  },
};

// ==================== 辅助函数 ====================

function formatDuration(startTime: number): string {
  const elapsed = Math.floor(Date.now() / 1000 - startTime);
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

function MessageItem({
  item,
  isExiting,
  showInstanceName,
  privacyMode,
}: MessageItemProps) {
  const config = STATUS_CONFIG[item.status];
  const Icon = config.icon;
  const isProcessing = ["planning", "generating", "sending"].includes(
    item.status,
  );

  const elapsedTime = useElapsedTime(item.start_time, isProcessing);

  return (
    <motion.div
      className="ls-inset relative p-3"
      initial={{ opacity: 0, x: -12 }}
      animate={isExiting ? { opacity: 0, x: 12 } : { opacity: 1, x: 0 }}
      transition={springSettle}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex shrink-0 items-center">
          {isProcessing ? (
            <StatusDot running />
          ) : (
            <Icon size={16} style={{ color: config.tone }} />
          )}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {showInstanceName && item.instanceName && (
              <Badge tone="neutral">{item.instanceName}</Badge>
            )}
            <span
              className="text-sm font-medium truncate"
              style={{ color: "var(--ls-ink)" }}
            >
              {item.group_name || item.stream_id}
            </span>
            {item.cycle_count > 1 && (
              <Badge tone="neutral" className="ls-num">
                第{item.cycle_count}次
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs" style={{ color: config.tone }}>
              {config.label}
            </span>
            <span
              className="ls-num text-xs"
              style={{ color: "var(--ls-ink-faint)" }}
            >
              {elapsedTime}
            </span>
            {item.action_type && (
              <span
                className="text-xs truncate"
                style={{ color: "var(--ls-ink-soft)" }}
              >
                →{" "}
                {item.action_type.toLowerCase().includes("no_reply")
                  ? "不回复"
                  : item.action_type}
              </span>
            )}
          </div>

          {item.status === "failed" && (
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle size={12} style={{ color: "var(--ls-danger)" }} />
              <span className="text-xs" style={{ color: "var(--ls-danger)" }}>
                {item.retry_reason || "回复生成失败"}
              </span>
            </div>
          )}

          {item.status !== "failed" && item.retry_count > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <RefreshCw size={12} style={{ color: "var(--ls-warn)" }} />
              <span
                className="ls-num text-xs"
                style={{ color: "var(--ls-warn)" }}
              >
                重试 x{item.retry_count}
                {item.retry_reason && ` (${item.retry_reason})`}
              </span>
            </div>
          )}

          {item.status === "sent" && (
            <p
              className="text-xs mt-1 truncate"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              {privacyMode
                ? "已回复"
                : item.message_preview
                  ? `"${item.message_preview}"`
                  : "已回复"}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ==================== 退出动画管理 Hook ====================

export type EnrichedMessage = MessageQueueItem & {
  instanceName: string;
  instanceConnected: boolean;
};

function useExitAnimations(allMessages: EnrichedMessage[]) {
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const processedSentIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (allMessages.length === 0) return;

    const now = Date.now() / 1000;

    allMessages.forEach((msg) => {
      if ((msg.status === "sent" || msg.status === "failed") && msg.sent_time) {
        if (!processedSentIdsRef.current.has(msg.id)) {
          processedSentIdsRef.current.add(msg.id);

          const delayMs = msg.status === "failed" ? 5000 : 2000;
          const delaySeconds = delayMs / 1000;
          const elapsedSinceComplete = now - msg.sent_time;

          if (elapsedSinceComplete > delaySeconds + 1) {
            setRemovedIds((prev) => new Set([...prev, msg.id]));
            return;
          }

          const remainingDelay = Math.max(
            0,
            delayMs - elapsedSinceComplete * 1000,
          );

          setTimeout(() => {
            setExitingIds((prev) => new Set([...prev, msg.id]));

            setTimeout(() => {
              setExitingIds((prev) => {
                const next = new Set(prev);
                next.delete(msg.id);
                return next;
              });
              setRemovedIds((prev) => new Set([...prev, msg.id]));
            }, 500);
          }, remainingDelay);
        }
      }
    });
  }, [allMessages]);

  useEffect(() => {
    const currentIds = new Set(allMessages.map((m) => m.id));

    setRemovedIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (currentIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });

    processedSentIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        processedSentIdsRef.current.delete(id);
      }
    });
  }, [allMessages]);

  const visibleMessages = allMessages.filter((msg) => !removedIds.has(msg.id));

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
        <div
          className="mb-4 p-3 rounded-card"
          style={{
            background: "color-mix(in srgb, var(--ls-danger) 16%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--ls-danger) 32%, transparent)",
          }}
        >
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--ls-danger)" }}
          >
            <AlertCircle size={16} />
            <span>获取队列失败</span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2
            size={24}
            className="animate-spin"
            style={{ color: "var(--ls-ink-faint)" }}
          />
        </div>
      )}

      {!isLoading && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto overflow-x-hidden scrollbar-thin">
          {!hasAnyConnected ? (
            <div
              className="text-center py-6"
              style={{ color: "var(--ls-ink-faint)" }}
            >
              <WifiOff size={24} className="mx-auto mb-2" />
              <p className="text-sm">实例未启动</p>
            </div>
          ) : visibleMessages.length === 0 ? (
            <div
              className="text-center py-6"
              style={{ color: "var(--ls-ink-faint)" }}
            >
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
