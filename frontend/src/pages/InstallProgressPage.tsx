/**
 * 安装进度页面
 * 显示实时安装日志和进度
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { motion } from "motion/react";
import { Meter, Surface, TactileButton } from "@/components/ls";
import {
  useWebSocket,
  WSLogMessage,
  WSProgressMessage,
  WSCompleteMessage,
  WSErrorMessage,
} from "@/hooks/useWebSocket";
import { springSoft } from "@/design/motion";
import logger from "@/utils/logger";

const pageLogger = logger.withTag("InstallProgress");

interface LogEntry {
  id: string;
  timestamp: string;
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

export default function InstallProgressPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get("taskId");

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState({
    current: 0,
    total: 100,
    percentage: 0,
    message: "等待连接...",
  });
  const [status, setStatus] = useState<
    "connecting" | "installing" | "completed" | "failed"
  >("connecting");
  const [isConnected, setIsConnected] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新日志
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // WebSocket 连接
  const { error: wsError } = useWebSocket(taskId, {
    onConnect: () => {
      pageLogger.info("WebSocket 已连接");
      setIsConnected(true);
      addLog("info", "已连接到服务器，等待开始安装...");
    },

    onLog: (message: WSLogMessage) => {
      addLog(message.level, message.message);
    },

    onProgress: (message: WSProgressMessage) => {
      setProgress({
        current: message.current,
        total: message.total,
        percentage: message.percentage,
        message: message.message,
      });
      setStatus("installing");
    },

    onComplete: (message: WSCompleteMessage) => {
      addLog("success", message.message);
      setStatus("completed");
      setProgress((prev) => ({
        ...prev,
        percentage: 100,
        message: "安装完成",
      }));
    },

    onError: (message: WSErrorMessage) => {
      addLog("error", message.message);
      setStatus("failed");
    },

    onDisconnect: () => {
      pageLogger.warn("WebSocket 已断开");
      setIsConnected(false);
      if (status === "installing") {
        addLog("warning", "与服务器的连接已断开");
      }
    },
  });

  const addLog = (level: LogEntry["level"], message: string) => {
    const log: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      level,
      message,
    };
    setLogs((prev) => [...prev, log]);
  };

  // 检查是否有 taskId
  useEffect(() => {
    if (!taskId) {
      pageLogger.error("缺少 taskId 参数");
      navigate("/downloads", { replace: true });
    }
  }, [taskId, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case "connecting":
        return (
          <Icon
            icon="ph:circle-dashed"
            className="w-6 h-6 animate-spin"
            style={{ color: "var(--ls-ink-soft)" }}
          />
        );
      case "installing":
        return (
          <Icon
            icon="ph:spinner"
            className="w-6 h-6 animate-spin"
            style={{ color: "var(--ls-life)" }}
          />
        );
      case "completed":
        return (
          <Icon
            icon="ph:check-circle"
            className="w-6 h-6"
            style={{ color: "var(--ls-life)" }}
          />
        );
      case "failed":
        return (
          <Icon
            icon="ph:x-circle"
            className="w-6 h-6"
            style={{ color: "var(--ls-danger)" }}
          />
        );
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "connecting":
        return "正在连接...";
      case "installing":
        return "安装中";
      case "completed":
        return "安装完成";
      case "failed":
        return "安装失败";
    }
  };

  const getLogIcon = (level: LogEntry["level"]) => {
    const color = LOG_LEVEL_COLOR[level];
    switch (level) {
      case "info":
        return (
          <Icon icon="ph:info" className="w-4 h-4 shrink-0" style={{ color }} />
        );
      case "success":
        return (
          <Icon
            icon="ph:check-circle"
            className="w-4 h-4 shrink-0"
            style={{ color }}
          />
        );
      case "warning":
        return (
          <Icon
            icon="ph:warning"
            className="w-4 h-4 shrink-0"
            style={{ color }}
          />
        );
      case "error":
        return (
          <Icon
            icon="ph:x-circle"
            className="w-4 h-4 shrink-0"
            style={{ color }}
          />
        );
    }
  };

  const statusWord =
    status === "completed" ? "已完成" : status === "failed" ? "失败" : "进行中";

  return (
    <motion.div
      className="flex flex-col h-screen"
      style={{ background: "var(--ls-bg)" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
    >
      {/* 顶部状态栏 */}
      <div
        className="shrink-0 border-b"
        style={{
          borderColor: "var(--ls-hairline)",
          background: "var(--ls-surface)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon()}
              <div>
                <h1
                  className="text-xl font-semibold"
                  style={{ color: "var(--ls-ink)" }}
                >
                  {getStatusText()}
                </h1>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: "var(--ls-ink-soft)" }}
                >
                  {isConnected ? "已连接" : "连接中..."}
                  {wsError && ` - ${wsError}`}
                </p>
              </div>
            </div>

            {(status === "completed" || status === "failed") && (
              <TactileButton
                variant="solid"
                onClick={() => navigate("/downloads")}
              >
                <Icon icon="ph:arrow-left" className="w-4 h-4" />
                返回
              </TactileButton>
            )}
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-5xl mx-auto h-full px-6 py-6 flex flex-col gap-6">
          {/* 进度 */}
          <Surface variant="panel" className="shrink-0 p-6">
            <Meter
              label={progress.message}
              used={progress.percentage}
              total={100}
              valueText={`${Math.round(progress.percentage)}%`}
            />
            <div
              className="ls-num mt-3 flex items-center justify-between text-xs"
              style={{ color: "var(--ls-ink-faint)" }}
            >
              <span>
                步骤 {progress.current} / {progress.total}
              </span>
              <span>{statusWord}</span>
            </div>
          </Surface>

          {/* 日志窗口 */}
          <Surface
            variant="panel"
            className="flex-1 overflow-hidden flex flex-col p-0"
          >
            <div
              className="shrink-0 px-4 py-3 border-b"
              style={{ borderColor: "var(--ls-hairline)" }}
            >
              <div className="flex items-center justify-between">
                <h2
                  className="text-sm font-semibold flex items-center gap-2"
                  style={{ color: "var(--ls-ink-soft)" }}
                >
                  <Icon icon="ph:terminal-window" className="w-4 h-4" />
                  安装日志
                </h2>
                <span
                  className="ls-num text-xs"
                  style={{ color: "var(--ls-ink-faint)" }}
                >
                  {logs.length} 条消息
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-1 font-mono text-sm">
              {logs.length === 0 ? (
                <div
                  className="flex items-center justify-center h-full"
                  style={{ color: "var(--ls-ink-faint)" }}
                >
                  <div className="text-center">
                    <Icon
                      icon="ph:hourglass"
                      className="w-12 h-12 mx-auto mb-2 opacity-50"
                    />
                    <p>等待日志...</p>
                  </div>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="ls-item flex items-start gap-2 px-2 py-1"
                  >
                    <span
                      className="ls-num text-xs shrink-0 w-20"
                      style={{ color: "var(--ls-ink-faint)" }}
                    >
                      {log.timestamp}
                    </span>
                    {getLogIcon(log.level)}
                    <span
                      className="flex-1"
                      style={{ color: LOG_LEVEL_COLOR[log.level] }}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </Surface>
        </div>
      </div>
    </motion.div>
  );
}
