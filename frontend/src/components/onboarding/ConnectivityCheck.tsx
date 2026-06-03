import {
  LoaderIcon,
  AlertCircleIcon,
  ServerIcon,
  CheckIcon,
} from "lucide-react";

import { Surface, Input, TactileButton, StatusDot } from "@/components/ls";
import { useConnectivityCheck } from "@/hooks/useConnectivityCheck";

interface ConnectivityCheckProps {
  stepColor: string;
  onStatusChange?: (isBackendConnected: boolean) => void;
  onRecheckRequest?: (checkFn: () => void) => void;
}

/**
 * 联通性检查组件
 * 检查后端连接、GitHub 和 Gitee 的延迟
 */
export function ConnectivityCheck({
  onStatusChange,
  onRecheckRequest,
}: ConnectivityCheckProps) {
  // 使用原有的 hook 管理连接检查
  const {
    tempUrl,
    hasUnsavedChanges,
    handleUrlChange,
    handleBlur,
    handleSave,
    backendStatus,
  } = useConnectivityCheck({ onStatusChange, onRecheckRequest });

  // 状态文字色:成功=生命色,失败=危险色,检查/等待=次要墨色
  const statusTextColor =
    backendStatus.status === "success"
      ? "var(--ls-life)"
      : backendStatus.status === "error"
        ? "var(--ls-danger)"
        : "var(--ls-ink-soft)";

  // 延迟数值色:<500ms 生命色,<1000ms 警示色,否则危险色
  const latencyColor =
    backendStatus.latency != null && backendStatus.latency < 500
      ? "var(--ls-life)"
      : backendStatus.latency != null && backendStatus.latency < 1000
        ? "var(--ls-warn)"
        : "var(--ls-danger)";

  return (
    <div className="space-y-2">
      {/* 后端服务配置和状态 - 合并为一个卡片 */}
      <Surface variant="card" className="relative p-3">
        <div className="mb-2.5 flex items-start gap-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--ls-r-control)]"
            style={{
              background: "var(--ls-bg-2)",
              color: "var(--ls-ink-soft)",
            }}
          >
            <ServerIcon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="mb-1.5 text-sm font-semibold leading-tight">
              后端服务地址
            </h3>
            <div className="flex items-center gap-2">
              <Input
                type="url"
                value={tempUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                onBlur={handleBlur}
                placeholder="http://localhost:11111"
                className="h-9 flex-1"
              />
              {hasUnsavedChanges && (
                <TactileButton
                  variant="life"
                  onClick={handleSave}
                  className="h-9 w-9 shrink-0 justify-center px-0"
                >
                  <CheckIcon className="h-4 w-4" />
                </TactileButton>
              )}
            </div>
            <p
              className="mt-1.5 text-xs leading-tight"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              默认端口: 11111 | 修改后点击保存按钮或失焦自动保存
            </p>
          </div>
        </div>

        {/* 后端服务连接状态 */}
        <div className="flex items-center justify-between pl-11">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              {backendStatus.status === "checking" ? (
                <LoaderIcon
                  className="h-3 w-3 animate-spin"
                  style={{ color: "var(--ls-ink-soft)" }}
                />
              ) : (
                <StatusDot running={backendStatus.status === "success"} />
              )}
              <span
                className="text-xs font-medium"
                style={{ color: statusTextColor }}
              >
                {backendStatus.status === "checking"
                  ? "检查中..."
                  : backendStatus.status === "success"
                    ? "服务运行正常"
                    : backendStatus.status === "error"
                      ? "服务连接失败"
                      : "等待检查"}
              </span>
            </div>
            {backendStatus.status === "success" && backendStatus.latency && (
              <span
                className="pl-5 text-xs"
                style={{ color: "var(--ls-ink-soft)" }}
              >
                {backendStatus.latency < 100
                  ? "响应极快"
                  : backendStatus.latency < 300
                    ? "响应良好"
                    : backendStatus.latency < 500
                      ? "响应正常"
                      : "响应较慢"}
              </span>
            )}
          </div>

          {backendStatus.latency && (
            <div className="flex flex-col items-end">
              <span
                className="ls-num text-lg font-bold leading-tight"
                style={{ color: latencyColor }}
              >
                {backendStatus.latency}
                <span
                  className="ml-0.5 text-xs"
                  style={{ color: "var(--ls-ink-soft)" }}
                >
                  ms
                </span>
              </span>
            </div>
          )}
        </div>

        {/* 错误信息 */}
        {backendStatus.error && (
          <Surface
            variant="inset"
            className="mt-2.5 ml-11 flex items-center gap-1.5 p-2 text-xs"
            style={{ color: "var(--ls-danger)" }}
          >
            <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{backendStatus.error}</span>
          </Surface>
        )}
      </Surface>

      {/* GitHub/Gitee 检查已移除，仅保留后端连接检查 */}
    </div>
  );
}
