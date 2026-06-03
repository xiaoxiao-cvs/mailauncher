import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  /** 未读通知数量 */
  unreadCount: number;
  /** 是否收起状态 */
  isCollapsed: boolean;
  /** 点击事件 */
  onClick: () => void;
}

/**
 * 通知铃铛组件
 * 职责：
 * - 显示铃铛图标
 * - 显示未读数量徽章
 * - 支持侧边栏收起/展开状态
 */
export function NotificationBell({
  unreadCount,
  isCollapsed,
  onClick,
}: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "ls-item w-full flex items-center transition-colors",
        "overflow-hidden",
        "py-2.5 relative",
        "pl-[18px]",
        !isCollapsed && "pr-4",
        isCollapsed && "pr-[18px] justify-center",
      )}
      style={{
        color: "var(--ls-ink-soft)",
        borderRadius: "var(--ls-r-control)",
      }}
      aria-label="通知中心"
    >
      {/* 图标容器 */}
      <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 relative">
        <Icon icon="ph:bell-thin" className="text-xl" />

        {/* 未读徽章 - 危险色圆点(>9 显示数字) */}
        {unreadCount > 0 && (
          <span
            className={cn(
              "ls-num absolute -top-1 -right-1",
              "rounded-full",
              "flex items-center justify-center",
              "text-[10px] font-bold leading-none",
              unreadCount > 9 ? "w-4 h-4" : "w-3 h-3",
            )}
            style={{
              background: "var(--ls-danger)",
              color: "#fff",
              boxShadow: "var(--ls-shadow-soft)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>

      {/* 文字标签 */}
      <span
        className={cn(
          "text-sm font-medium whitespace-nowrap transition-all duration-200",
          isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100 ml-3",
        )}
      >
        通知
      </span>
    </button>
  );
}
