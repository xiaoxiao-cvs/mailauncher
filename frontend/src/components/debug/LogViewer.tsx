/**
 * 日志查看器组件
 * 用于开发环境调试和查看日志
 * 从后端 API 获取日志文件列表和内容
 */

import { DownloadIcon, TrashIcon, RefreshCwIcon } from "lucide-react";
import { Surface, TactileButton, Badge } from "@/components/ls";
import {
  useLogFilesQuery,
  useLogContentQuery,
  useExportLogsMutation,
  useClearLogsMutation,
} from "@/hooks/queries/useLogQueries";
import { useState, type CSSProperties } from "react";
import { useConfirm } from "@/hooks/useConfirm";

interface LogViewerProps {
  className?: string;
}

/**
 * 日志级别 -> 语义色 token。
 * tokens.css 仅有 --ls-life-soft 一枚 soft 语义底,warn/danger 的低浓度底沿用 Badge.tsx 的
 * color-mix 配方现算(16% 浓度),仍只组合 var(--ls-*),明暗双主题自适配,无写死色值。
 */
function levelStyle(level: string): CSSProperties {
  if (level === "error" || level === "fatal") {
    return {
      background: "color-mix(in srgb, var(--ls-danger) 16%, transparent)",
      color: "var(--ls-danger)",
    };
  }
  if (level === "warn") {
    return {
      background: "color-mix(in srgb, var(--ls-warn) 16%, transparent)",
      color: "var(--ls-warn)",
    };
  }
  if (level === "success" || level === "ready") {
    return { background: "var(--ls-life-soft)", color: "var(--ls-life)" };
  }
  return { background: "var(--ls-bg-2)", color: "var(--ls-ink-soft)" };
}

export function LogViewer({ className }: LogViewerProps) {
  const [selectedLog, setSelectedLog] = useState<string>("");
  const confirm = useConfirm();

  const {
    data: logs = [],
    isLoading: loading,
    refetch: loadLogs,
  } = useLogFilesQuery();
  const { data: logContent } = useLogContentQuery(selectedLog);
  const exportMutation = useExportLogsMutation();
  const clearMutation = useClearLogsMutation();

  const handleDownload = () => {
    if (selectedLog) {
      exportMutation.mutate();
    }
  };

  const handleClear = async () => {
    if (!selectedLog) return;
    const ok = await confirm({
      description: "确定要清空所有日志吗？",
      confirmText: "清空",
      destructive: true,
    });
    if (!ok) return;
    clearMutation.mutate(undefined, {
      onSuccess: () => {
        setSelectedLog("");
        void loadLogs();
      },
    });
  };

  const getParsedLogs = () => {
    if (!logContent) return [];
    try {
      return logContent
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return {
              timestamp: new Date().toISOString(),
              level: "info",
              message: line,
            };
          }
        });
    } catch {
      return [];
    }
  };

  const renderLogContent = () => {
    if (!logContent) {
      return (
        <div
          className="text-center py-8"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          请选择一个日志文件查看
        </div>
      );
    }

    const parsedLogs = getParsedLogs();

    if (parsedLogs.length === 0) {
      return (
        <div
          className="text-center py-8"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          日志文件为空或格式不正确
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {parsedLogs.map((entry: any, index: number) => (
          <Surface key={index} variant="card" className="p-2">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="ls-num text-xs"
                style={{ color: "var(--ls-ink-faint)" }}
              >
                {new Date(entry.timestamp).toLocaleString()}
              </span>
              <span
                className="rounded-full px-1.5 py-0.5 text-xs font-semibold"
                style={levelStyle(entry.level)}
              >
                {entry.level.toUpperCase()}
              </span>
              {entry.tag && <Badge tone="neutral">{entry.tag}</Badge>}
            </div>
            <div className="text-sm" style={{ color: "var(--ls-ink)" }}>
              {entry.message}
            </div>
            {entry.args && entry.args.length > 0 && (
              <div
                className="ls-num mt-1 text-xs"
                style={{ color: "var(--ls-ink-soft)" }}
              >
                {JSON.stringify(entry.args, null, 2)}
              </div>
            )}
            {entry.error && (
              <div
                className="mt-2 p-2"
                style={{
                  borderRadius: "var(--ls-r-control)",
                  background:
                    "color-mix(in srgb, var(--ls-danger) 16%, transparent)",
                }}
              >
                <div
                  className="font-semibold text-sm"
                  style={{ color: "var(--ls-danger)" }}
                >
                  {entry.error.name}: {entry.error.message}
                </div>
                {entry.error.stack && (
                  <pre
                    className="mt-1 text-xs whitespace-pre-wrap"
                    style={{ color: "var(--ls-danger)" }}
                  >
                    {entry.error.stack}
                  </pre>
                )}
              </div>
            )}
          </Surface>
        ))}
      </div>
    );
  };

  return (
    <Surface variant="panel" className={`p-4 ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--ls-ink)" }}
        >
          前端日志查看器
        </h2>
        <div className="flex gap-2">
          <TactileButton
            variant="ghost"
            onClick={() => loadLogs()}
            disabled={loading}
            className="text-sm px-2.5 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCwIcon className="w-4 h-4" />
            刷新
          </TactileButton>
          <TactileButton
            variant="ghost"
            onClick={handleDownload}
            disabled={loading}
            className="text-sm px-2.5 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DownloadIcon className="w-4 h-4" />
            导出
          </TactileButton>
          <TactileButton
            variant="ghost"
            onClick={handleClear}
            disabled={loading}
            className="text-sm px-2.5 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: "var(--ls-danger)" }}
          >
            <TrashIcon className="w-4 h-4" />
            清除
          </TactileButton>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* 左侧:日志文件列表 */}
        <div className="col-span-4 space-y-2">
          <h3
            className="text-sm font-medium"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            日志文件 (<span className="ls-num">{logs.length}</span>)
          </h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {logs.map((log) => {
              const isSelected = selectedLog === log.path;
              return (
                <button
                  key={log.path}
                  onClick={() => setSelectedLog(log.path)}
                  className="ls-item w-full text-left px-3 py-2 rounded text-sm"
                  style={
                    isSelected
                      ? {
                          background: "var(--ls-life-soft)",
                          color: "var(--ls-life)",
                        }
                      : { color: "var(--ls-ink-soft)" }
                  }
                >
                  <div className="font-mono text-xs truncate">{log.name}</div>
                  <div
                    className="text-xs flex items-center justify-between"
                    style={{ color: "var(--ls-ink-faint)" }}
                  >
                    <span className="ls-num">
                      {(log.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 右侧:日志详情 */}
        <div className="col-span-8">
          <h3
            className="text-sm font-medium mb-2"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            日志详情
          </h3>
          <Surface
            variant="inset"
            className="p-3 max-h-96 overflow-y-auto font-mono text-xs"
          >
            {loading ? (
              <div
                className="text-center py-8"
                style={{ color: "var(--ls-ink-faint)" }}
              >
                加载中...
              </div>
            ) : (
              renderLogContent()
            )}
          </Surface>
        </div>
      </div>
    </Surface>
  );
}
