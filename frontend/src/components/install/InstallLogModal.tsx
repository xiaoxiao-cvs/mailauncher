import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  Notification,
  NotificationType,
  TaskStatus,
} from "@/types/notification";
import { useWebSocket } from "@/hooks";
import { useNotificationContext } from "@/contexts/NotificationContext";
import {
  ModalRoot,
  ModalPortal,
  ModalOverlay,
  ModalContent,
  Meter,
  Surface,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ls";

interface InstallLogModalProps {
  isOpen: boolean;
  notification: Notification | null;
  onClose: () => void;
}

interface LogEntry {
  time: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
}

/** 日志级别 -> 语义文字色(info 用次墨,其余走语义 token)。 */
const LOG_LEVEL_COLOR: Record<LogEntry["level"], string> = {
  info: "var(--ls-ink-soft)",
  success: "var(--ls-life)",
  warning: "var(--ls-warn)",
  error: "var(--ls-danger)",
};

/**
 * 通知详情全屏模态框
 * 支持所有类型的通知（TASK/MESSAGE/WARNING/ERROR）
 */
export default function InstallLogModal({
  isOpen,
  notification,
  onClose,
}: InstallLogModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const { updateTaskProgress, notifications } = useNotificationContext();

  // 从 context 中实时获取最新的通知数据（包含最新进度）
  const currentNotification = notification
    ? notifications.find((n) => n.id === notification.id) || notification
    : null;

  // 自动滚动到最新日志
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // 获取任务 ID（使用实时的 currentNotification）
  const taskId =
    currentNotification?.type === NotificationType.TASK
      ? currentNotification.task?.taskId || null
      : null;

  // WebSocket 连接（仅任务通知）
  useWebSocket(isOpen ? taskId : null, {
    onLog: (message) => {
      const logEntry: LogEntry = {
        time: new Date(message.timestamp).toLocaleTimeString(),
        level: message.level,
        message: message.message,
      };
      setLogs((prev) => [...prev, logEntry]);
    },
    onProgress: (message) => {
      const logEntry: LogEntry = {
        time: new Date(message.timestamp).toLocaleTimeString(),
        level: "info",
        message: `[${message.percentage.toFixed(0)}%] ${message.message}`,
      };
      setLogs((prev) => [...prev, logEntry]);

      // 更新通知的进度，实时更新进度条
      if (taskId) {
        const statusMap: Record<string, TaskStatus> = {
          pending: TaskStatus.PENDING,
          downloading: TaskStatus.DOWNLOADING,
          installing: TaskStatus.INSTALLING,
        };
        const status = statusMap[message.status] || TaskStatus.DOWNLOADING;
        updateTaskProgress(taskId, message.percentage, status, message.message);
      }
    },
    onStatus: (message) => {
      const logEntry: LogEntry = {
        time: new Date(message.timestamp).toLocaleTimeString(),
        level: "info",
        message: `状态变更: ${message.message}`,
      };
      setLogs((prev) => [...prev, logEntry]);

      // 更新通知的状态
      if (taskId && currentNotification?.task) {
        const statusMap: Record<string, TaskStatus> = {
          pending: TaskStatus.PENDING,
          downloading: TaskStatus.DOWNLOADING,
          installing: TaskStatus.INSTALLING,
        };
        const status =
          statusMap[message.status] || currentNotification.task.status;
        updateTaskProgress(
          taskId,
          currentNotification.task.progress,
          status,
          message.message,
        );
      }
    },
    onError: (message) => {
      const logEntry: LogEntry = {
        time: new Date(message.timestamp).toLocaleTimeString(),
        level: "error",
        message: message.message,
      };
      setLogs((prev) => [...prev, logEntry]);

      // 更新为失败状态
      if (taskId && currentNotification?.task) {
        updateTaskProgress(
          taskId,
          currentNotification.task.progress,
          TaskStatus.FAILED,
          message.message,
        );
      }
    },
    onComplete: (message) => {
      const logEntry: LogEntry = {
        time: new Date(message.timestamp).toLocaleTimeString(),
        level: "success",
        message: message.message,
      };
      setLogs((prev) => [...prev, logEntry]);

      // 更新为成功状态
      if (taskId) {
        updateTaskProgress(taskId, 100, TaskStatus.SUCCESS, message.message);
      }
    },
  });

  // 清空日志
  useEffect(() => {
    if (!isOpen) {
      setLogs([]);
    }
  }, [isOpen]);

  // 根据通知类型获取标题
  const getTitle = () => {
    if (!currentNotification) return "";
    switch (currentNotification.type) {
      case NotificationType.TASK:
        return currentNotification.task?.instanceName || "安装任务";
      default:
        return currentNotification.title;
    }
  };

  // 根据通知类型获取图标
  const getIcon = () => {
    switch (currentNotification?.type) {
      case NotificationType.TASK:
        return "ph:terminal-window";
      case NotificationType.MESSAGE:
        return "ph:info";
      case NotificationType.WARNING:
        return "ph:warning";
      case NotificationType.ERROR:
        return "ph:x-circle";
      default:
        return "ph:bell";
    }
  };

  // 根据通知类型获取图标语义色
  const getIconColor = () => {
    switch (currentNotification?.type) {
      case NotificationType.WARNING:
        return "var(--ls-warn)";
      case NotificationType.ERROR:
        return "var(--ls-danger)";
      default:
        return "var(--ls-life)";
    }
  };

  const isTaskNotification =
    currentNotification?.type === NotificationType.TASK;
  const taskStatus = currentNotification?.task?.status;
  // 状态圆盘 / 圆点语义色:成功与进行中=生命色,失败=危险色。
  const statusAccent =
    taskStatus === TaskStatus.FAILED ? "var(--ls-danger)" : "var(--ls-life)";
  const isInProgress =
    taskStatus === TaskStatus.DOWNLOADING ||
    taskStatus === TaskStatus.INSTALLING;

  return (
    <ModalRoot
      open={isOpen && !!currentNotification}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AnimatePresence>
        {isOpen && currentNotification && (
          <ModalPortal forceMount>
            <ModalOverlay />
            <ModalContent
              className={cn(
                "flex max-w-2xl flex-col overflow-hidden p-0",
                // 任务通知固定高度以避免切换 Tab 时跳动，其他通知自适应
                isTaskNotification
                  ? "h-[600px] max-h-[85vh]"
                  : "h-auto max-h-[85vh]",
              )}
            >
              {/* 头部 */}
              <div
                className="flex items-center justify-between border-b px-6 py-4"
                style={{ borderColor: "var(--ls-hairline)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="rounded-lg p-2"
                    style={{
                      background: "var(--ls-surface-hi)",
                      boxShadow: "var(--ls-shadow-soft)",
                      color: getIconColor(),
                    }}
                  >
                    <Icon icon={getIcon()} className="h-5 w-5" />
                  </div>
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: "var(--ls-ink)" }}
                  >
                    {getTitle()}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="ls-item rounded-full p-2 transition-colors"
                  style={{ color: "var(--ls-ink-soft)" }}
                  aria-label="关闭"
                >
                  <Icon icon="ph:x" className="h-5 w-5" />
                </button>
              </div>

              {/* 内容区域 */}
              <div className="flex flex-1 flex-col overflow-hidden">
                {isTaskNotification ? (
                  <Tabs
                    defaultValue="details"
                    className="flex h-full flex-1 flex-col"
                  >
                    <div className="px-6 pt-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details" className="text-center">
                          任务详情
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="text-center">
                          实时日志
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="relative flex-1 overflow-hidden">
                      <TabsContent
                        value="details"
                        className="m-0 h-full space-y-6 overflow-y-auto p-6"
                      >
                        {/* 状态卡片 */}
                        <Surface
                          variant="inset"
                          className="flex flex-col items-center space-y-4 p-6 text-center"
                        >
                          <div
                            className="flex h-16 w-16 items-center justify-center rounded-full"
                            style={{
                              background: statusAccent,
                              color: "#fff",
                              boxShadow: "var(--ls-shadow-soft)",
                            }}
                          >
                            <Icon
                              icon={
                                taskStatus === TaskStatus.SUCCESS
                                  ? "ph:check-bold"
                                  : taskStatus === TaskStatus.FAILED
                                    ? "ph:x-bold"
                                    : "ph:spinner-gap-bold"
                              }
                              className={cn(
                                "h-8 w-8",
                                isInProgress && "animate-spin",
                              )}
                            />
                          </div>
                          <div>
                            <h3
                              className="mb-1 text-xl font-bold"
                              style={{ color: "var(--ls-ink)" }}
                            >
                              {taskStatus === TaskStatus.SUCCESS
                                ? "安装完成"
                                : taskStatus === TaskStatus.FAILED
                                  ? "安装失败"
                                  : "正在处理..."}
                            </h3>
                            <p
                              className="text-sm"
                              style={{ color: "var(--ls-ink-soft)" }}
                            >
                              {currentNotification.message}
                            </p>
                          </div>

                          {/* 进度条 */}
                          {isInProgress && (
                            <div className="w-full max-w-xs">
                              <Meter
                                label="进度"
                                used={currentNotification.task?.progress || 0}
                                total={100}
                                valueText={`${(currentNotification.task?.progress ?? 0).toFixed(0)}%`}
                              />
                            </div>
                          )}
                        </Surface>

                        {/* 详细信息列表 */}
                        <div className="space-y-4">
                          <h4
                            className="text-sm font-medium uppercase tracking-wider"
                            style={{ color: "var(--ls-ink-soft)" }}
                          >
                            详细信息
                          </h4>
                          <div className="grid grid-cols-1 gap-3">
                            <InfoItem
                              label="任务 ID"
                              value={currentNotification.task?.taskId || "—"}
                            />
                            <InfoItem
                              label="实例名称"
                              value={
                                currentNotification.task?.instanceName || "—"
                              }
                            />
                            <InfoItem
                              label="开始时间"
                              value={new Date(
                                currentNotification.createdAt,
                              ).toLocaleString()}
                            />
                            <InfoItem
                              label="当前状态"
                              value={currentNotification.task?.status || "—"}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="logs"
                        className="m-0 flex h-full flex-col"
                      >
                        <Surface
                          variant="inset"
                          className="flex-1 space-y-1 overflow-y-auto p-4 font-mono text-xs"
                        >
                          {logs.length === 0 ? (
                            <div
                              className="flex h-full items-center justify-center"
                              style={{ color: "var(--ls-ink-faint)" }}
                            >
                              等待日志连接...
                            </div>
                          ) : (
                            logs.map((log, index) => (
                              <div
                                key={index}
                                className="ls-item flex gap-2 rounded px-1"
                              >
                                <span
                                  className="ls-num shrink-0 select-none"
                                  style={{ color: "var(--ls-ink-faint)" }}
                                >
                                  [{log.time}]
                                </span>
                                <span
                                  className="break-all"
                                  style={{ color: LOG_LEVEL_COLOR[log.level] }}
                                >
                                  {log.message}
                                </span>
                              </div>
                            ))
                          )}
                          <div ref={logsEndRef} />
                        </Surface>
                      </TabsContent>
                    </div>
                  </Tabs>
                ) : (
                  // 非任务通知的简单视图
                  <div className="flex flex-col items-center space-y-6 p-8 text-center">
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-full"
                      style={{
                        background: "var(--ls-surface-hi)",
                        boxShadow: "var(--ls-shadow-soft)",
                        color: getIconColor(),
                      }}
                    >
                      <Icon icon={getIcon()} className="h-10 w-10" />
                    </div>
                    <div className="max-w-md space-y-2">
                      <h3
                        className="text-2xl font-bold"
                        style={{ color: "var(--ls-ink)" }}
                      >
                        {currentNotification.title}
                      </h3>
                      <p
                        className="leading-relaxed"
                        style={{ color: "var(--ls-ink-soft)" }}
                      >
                        {currentNotification.message}
                      </p>
                    </div>
                    <div
                      className="pt-4 text-sm"
                      style={{ color: "var(--ls-ink-faint)" }}
                    >
                      {new Date(currentNotification.createdAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </ModalContent>
          </ModalPortal>
        )}
      </AnimatePresence>
    </ModalRoot>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <Surface variant="inset" className="flex items-center justify-between p-3">
      <span className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
        {label}
      </span>
      <span
        className="ls-num text-sm font-medium font-mono"
        style={{ color: "var(--ls-ink)" }}
      >
        {value}
      </span>
    </Surface>
  );
}
