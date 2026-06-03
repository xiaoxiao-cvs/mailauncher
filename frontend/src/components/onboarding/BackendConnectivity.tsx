import { LoaderIcon, CheckIcon, XIcon } from "lucide-react";

import { Surface, Input, TactileButton, Label } from "@/components/ls";
import { useConnectivityCheck } from "@/hooks/useConnectivityCheck";

interface BackendConnectivityProps {
  stepColor: string;
  onStatusChange?: (isBackendConnected: boolean) => void;
  onRecheckRequest?: (checkFn: () => void) => void;
}

/**
 * 后端联通性检查组件
 * 仅检查后端服务连接状态，配置后端地址
 */
export function BackendConnectivity({
  onStatusChange,
  onRecheckRequest,
}: BackendConnectivityProps) {
  const {
    tempUrl,
    hasUnsavedChanges,
    handleUrlChange,
    handleBlur,
    handleSave,
    backendStatus,
  } = useConnectivityCheck({ onStatusChange, onRecheckRequest });

  // 状态文字色:成功=生命色,失败=危险色,检查/等待=次要墨色
  const statusColor =
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
    <div className="space-y-6">
      {/* 服务地址配置 */}
      <div className="space-y-4">
        <div>
          <Label className="mb-2 block">后端服务地址</Label>
          <div className="flex items-center gap-2">
            <Input
              type="url"
              value={tempUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              onBlur={handleBlur}
              placeholder="http://localhost:11111"
              className="h-12 flex-1 text-[15px]"
            />
            {hasUnsavedChanges && (
              <TactileButton
                variant="life"
                onClick={handleSave}
                className="h-12 w-12 shrink-0 justify-center px-0"
              >
                <CheckIcon className="h-5 w-5" />
              </TactileButton>
            )}
          </div>
          <p
            className="mt-2 text-[12px]"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            默认端口 11111 · 修改后点击保存按钮或失焦自动保存
          </p>
        </div>
      </div>

      {/* 连接状态 */}
      <Surface variant="card" className="flex items-center gap-4 p-5">
        {/* 状态指示器 */}
        <div className="relative">
          {backendStatus.status === "checking" ? (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "var(--ls-bg-2)" }}
            >
              <LoaderIcon
                className="h-5 w-5 animate-spin"
                style={{ color: "var(--ls-ink-soft)" }}
              />
            </div>
          ) : backendStatus.status === "success" ? (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "var(--ls-life-soft)" }}
            >
              <CheckIcon
                className="h-5 w-5"
                style={{ color: "var(--ls-life)" }}
              />
            </div>
          ) : backendStatus.status === "error" ? (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{
                background:
                  "color-mix(in srgb, var(--ls-danger) 16%, transparent)",
              }}
            >
              <XIcon
                className="h-5 w-5"
                style={{ color: "var(--ls-danger)" }}
              />
            </div>
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "var(--ls-bg-2)" }}
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ background: "var(--ls-ink-faint)" }}
              />
            </div>
          )}
        </div>

        {/* 状态信息 */}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium" style={{ color: statusColor }}>
            {backendStatus.status === "checking"
              ? "正在检查连接..."
              : backendStatus.status === "success"
                ? "后端服务运行正常"
                : backendStatus.status === "error"
                  ? "无法连接后端服务"
                  : "等待检查"}
          </p>
          {backendStatus.status === "success" && backendStatus.latency && (
            <p
              className="ls-num mt-0.5 text-[13px]"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              延迟 {backendStatus.latency}ms ·{" "}
              {backendStatus.latency < 100
                ? "响应极快"
                : backendStatus.latency < 300
                  ? "响应良好"
                  : backendStatus.latency < 500
                    ? "响应正常"
                    : "响应较慢"}
            </p>
          )}
          {backendStatus.error && (
            <p
              className="mt-0.5 text-[13px]"
              style={{ color: "var(--ls-danger)" }}
            >
              {backendStatus.error}
            </p>
          )}
        </div>

        {/* 延迟数值 */}
        {backendStatus.latency && backendStatus.status === "success" && (
          <div className="flex shrink-0 items-baseline gap-0.5">
            <span
              className="ls-num text-2xl font-semibold"
              style={{ color: latencyColor }}
            >
              {backendStatus.latency}
            </span>
            <span
              className="text-[13px]"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              ms
            </span>
          </div>
        )}
      </Surface>

      {/* 提示信息 */}
      <p
        className="text-center text-[13px]"
        style={{ color: "var(--ls-ink-soft)" }}
      >
        后端服务用于管理 Bot 实例、处理配置和执行部署任务
      </p>
    </div>
  );
}
