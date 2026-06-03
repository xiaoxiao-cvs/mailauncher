import { Icon } from "@iconify/react";
import { motion } from "motion/react";
import {
  Notification,
  NotificationType,
  TaskStatus,
} from "@/types/notification";
import { cn } from "@/lib/utils";
import { springSettle } from "@/design/motion";

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
  onClick: (notification: Notification) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 单个通知项组件
 */
export function NotificationItem({
  notification,
  onRemove,
  onClick,
  className,
  style,
}: NotificationItemProps) {
  const { type, title, message, task } = notification;

  // 任务进度条填充色:成功=生命色、失败=危险色、进行中=生命色;轨道为凹陷次级底。
  const taskFill =
    task?.status === TaskStatus.FAILED ? "var(--ls-danger)" : "var(--ls-life)";

  // 获取图标(颜色全走语义 token,Iconify 契约保留)
  const getIcon = () => {
    if (type === NotificationType.TASK && task) {
      switch (task.status) {
        case TaskStatus.SUCCESS:
          return (
            <Icon
              icon="ph:check-circle-fill"
              className="w-4 h-4"
              style={{ color: "var(--ls-life)" }}
            />
          );
        case TaskStatus.FAILED:
          return (
            <Icon
              icon="ph:x-circle-fill"
              className="w-4 h-4"
              style={{ color: "var(--ls-danger)" }}
            />
          );
        case TaskStatus.DOWNLOADING:
        case TaskStatus.INSTALLING:
          return (
            <Icon
              icon="ph:arrow-circle-down-fill"
              className="w-4 h-4"
              style={{ color: "var(--ls-life)" }}
            />
          );
        default:
          return (
            <Icon
              icon="ph:clock-fill"
              className="w-4 h-4"
              style={{ color: "var(--ls-ink-faint)" }}
            />
          );
      }
    }

    switch (type) {
      case NotificationType.MESSAGE:
        return (
          <Icon
            icon="ph:info-fill"
            className="w-4 h-4"
            style={{ color: "var(--ls-ink-soft)" }}
          />
        );
      case NotificationType.WARNING:
        return (
          <Icon
            icon="ph:warning-fill"
            className="w-4 h-4"
            style={{ color: "var(--ls-warn)" }}
          />
        );
      case NotificationType.ERROR:
        return (
          <Icon
            icon="ph:x-circle-fill"
            className="w-4 h-4"
            style={{ color: "var(--ls-danger)" }}
          />
        );
      default:
        return (
          <Icon
            icon="ph:bell-fill"
            className="w-4 h-4"
            style={{ color: "var(--ls-ink-faint)" }}
          />
        );
    }
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden",
        "ls-card",
        "p-2.5 cursor-pointer",
        className,
      )}
      style={style}
      onClick={() => onClick(notification)}
    >
      {/* 头部：图标 + 标题 + 关闭按钮 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{
              background: "var(--ls-surface-hi)",
              boxShadow: "var(--ls-shadow-soft)",
            }}
          >
            {getIcon()}
          </div>
          <span
            className="text-[12px] font-semibold truncate max-w-[200px]"
            style={{ color: "var(--ls-ink)" }}
          >
            {title}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(notification.id);
          }}
          className="ls-item p-0.5 rounded-full transition-colors"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          <Icon icon="ph:x" className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 内容区域 */}
      <div className="pl-7">
        <p
          className="text-[12px] leading-snug line-clamp-2"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          {message}
        </p>

        {/* 任务进度条 */}
        {type === NotificationType.TASK && task && (
          <div className="space-y-1 mt-2">
            <div
              className="flex items-center justify-between text-[10px]"
              style={{ color: "var(--ls-ink-faint)" }}
            >
              <span>{getStatusText(task.status)}</span>
              <span className="ls-num">{task.progress}%</span>
            </div>
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: "var(--ls-bg-2)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: taskFill }}
                initial={{ width: 0 }}
                animate={{ width: `${task.progress}%` }}
                transition={springSettle}
              />
            </div>
          </div>
        )}
      </div>

      {/* 删除按钮 - 悬停显示 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(notification.id);
        }}
        className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: "var(--ls-bg-2)", color: "var(--ls-ink-soft)" }}
        aria-label="删除通知"
      >
        <Icon icon="ph:x" className="w-3 h-3" />
      </button>
    </div>
  );
}

// 获取状态文本
function getStatusText(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.PENDING:
      return "等待中";
    case TaskStatus.DOWNLOADING:
      return "下载中";
    case TaskStatus.INSTALLING:
      return "安装中";
    case TaskStatus.SUCCESS:
      return "安装成功";
    case TaskStatus.FAILED:
      return "安装失败";
    default:
      return "";
  }
}
