/**
 * 消息队列统计信息栏
 * 包含标题、刷新频率指示器、已处理计数和隐私模式切换
 */

import { Timer, Eye, EyeOff } from "lucide-react";
import { Badge, TactileButton } from "@/components/ls";
import { REFRESH_INTERVALS } from "./useQueueRefreshStrategy";

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
  // 快速轮询(有在途消息)= 活跃 = 生命色;普通/慢速 = 中性。
  const isFast = refetchInterval === REFRESH_INTERVALS.FAST;

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--ls-ink)" }}
        >
          消息队列
        </h3>
        <Badge tone={isFast ? "life" : "neutral"} className="gap-1">
          <Timer size={12} />
          <span className="ls-num">{refetchInterval / 1000}s</span>
        </Badge>
        {hasAnyConnected && (
          <span
            className="ls-num text-xs"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            已处理: {totalProcessed}
          </span>
        )}
      </div>

      <TactileButton
        variant="ghost"
        onClick={onTogglePrivacy}
        className="p-2"
        style={privacyMode ? { background: "var(--ls-bg-2)" } : undefined}
        title={privacyMode ? "显示回复内容" : "隐藏回复内容"}
        aria-label={privacyMode ? "显示回复内容" : "隐藏回复内容"}
      >
        {privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
      </TactileButton>
    </div>
  );
}
