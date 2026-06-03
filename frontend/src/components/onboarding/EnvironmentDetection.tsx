import { CheckIcon, XIcon, LoaderIcon, RefreshCwIcon } from "lucide-react";

import { Surface, TactileButton, Badge } from "@/components/ls";
import {
  useGitEnvironmentQuery,
  usePythonVersionsQuery,
} from "@/hooks/queries/useEnvironmentQueries";

interface EnvironmentDetectionProps {
  stepColor: string;
  onEnvironmentReady?: (isReady: boolean) => void;
}

/**
 * 环境检测组件
 * 职责：检测 Git 和 Python 是否已安装
 */
export function EnvironmentDetection({
  onEnvironmentReady,
}: EnvironmentDetectionProps) {
  // Git 环境检查
  const {
    data: gitInfo,
    isLoading: isCheckingGit,
    error: gitErrorObj,
    refetch: checkGitEnvironment,
  } = useGitEnvironmentQuery();
  const gitError = gitErrorObj ? String(gitErrorObj) : null;

  // Python 环境检查
  const {
    data: pythonVersions = [],
    isLoading: isCheckingPython,
    error: pythonErrorObj,
    refetch: checkPythonEnvironment,
  } = usePythonVersionsQuery();
  const pythonError = pythonErrorObj ? String(pythonErrorObj) : null;

  const isGitAvailable = gitInfo?.is_available ?? false;
  const isPythonAvailable = pythonVersions.length > 0;
  const isAllReady = isGitAvailable && isPythonAvailable;
  const isChecking = isCheckingGit || isCheckingPython;

  // 通知父组件环境状态
  if (onEnvironmentReady && !isChecking) {
    onEnvironmentReady(isAllReady);
  }

  // 重新检查所有环境
  const handleRecheckAll = () => {
    checkGitEnvironment();
    checkPythonEnvironment();
  };

  // 状态图标:加载=旋转 loader,失败/未就绪=危险叉,就绪=生命色对勾
  const StatusIcon = ({
    isLoading,
    isSuccess,
    hasError,
  }: {
    isLoading: boolean;
    isSuccess: boolean;
    hasError: boolean;
  }) => {
    if (isLoading) {
      return (
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{ background: "var(--ls-bg-2)" }}
        >
          <LoaderIcon
            className="h-3.5 w-3.5 animate-spin"
            style={{ color: "var(--ls-ink-soft)" }}
          />
        </div>
      );
    }
    if (hasError || !isSuccess) {
      return (
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{
            background: "color-mix(in srgb, var(--ls-danger) 16%, transparent)",
          }}
        >
          <XIcon
            className="h-3.5 w-3.5"
            style={{ color: "var(--ls-danger)" }}
          />
        </div>
      );
    }
    return (
      <div
        className="flex h-6 w-6 items-center justify-center rounded-full"
        style={{ background: "var(--ls-life-soft)" }}
      >
        <CheckIcon
          className="h-3.5 w-3.5"
          style={{ color: "var(--ls-life)" }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 检测项列表 */}
      <div className="space-y-3">
        {/* Git 环境检测 */}
        <Surface variant="card" className="group flex items-center gap-4 p-5">
          <StatusIcon
            isLoading={isCheckingGit}
            isSuccess={isGitAvailable}
            hasError={!!gitError}
          />

          <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
            <div className="flex flex-col">
              <h3 className="text-[15px] font-medium">Git</h3>
              <p
                className="mt-0.5 text-[13px]"
                style={{ color: "var(--ls-ink-soft)" }}
              >
                {isCheckingGit
                  ? "正在检测..."
                  : gitError
                    ? "检测失败"
                    : isGitAvailable
                      ? "已安装"
                      : "未检测到"}
              </p>
            </div>
            {isGitAvailable && !isCheckingGit && (
              <Badge tone="neutral" className="ls-num font-mono">
                {gitInfo?.version}
              </Badge>
            )}
          </div>

          {!isGitAvailable && !isCheckingGit && (
            <a
              href="https://git-scm.com/downloads"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-[13px] hover:underline"
              style={{ color: "var(--ls-life)" }}
            >
              下载
            </a>
          )}
        </Surface>

        {/* Python 环境检测 */}
        <Surface variant="card" className="group flex items-center gap-4 p-5">
          <StatusIcon
            isLoading={isCheckingPython}
            isSuccess={isPythonAvailable}
            hasError={!!pythonError}
          />

          <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
            <div className="flex flex-col">
              <h3 className="text-[15px] font-medium">Python</h3>
              <p
                className="mt-0.5 text-[13px]"
                style={{ color: "var(--ls-ink-soft)" }}
              >
                {isCheckingPython
                  ? "正在检测..."
                  : pythonError
                    ? "检测失败"
                    : isPythonAvailable
                      ? "已安装"
                      : "未检测到"}
              </p>
            </div>
            {isPythonAvailable && !isCheckingPython && (
              <Badge tone="neutral" className="ls-num">
                {pythonVersions.length} 个版本
              </Badge>
            )}
          </div>

          {!isPythonAvailable && !isCheckingPython && (
            <a
              href="https://www.python.org/downloads/"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-[13px] hover:underline"
              style={{ color: "var(--ls-life)" }}
            >
              下载
            </a>
          )}
        </Surface>
      </div>

      {/* 重新检测按钮 */}
      <div className="flex justify-center">
        <TactileButton
          variant="ghost"
          onClick={handleRecheckAll}
          disabled={isChecking}
          className="rounded-full disabled:opacity-60"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          <RefreshCwIcon
            className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`}
          />
          重新检测
        </TactileButton>
      </div>

      {/* 状态总结 */}
      {!isChecking && (
        <Surface
          variant="inset"
          className="flex items-center justify-center gap-2 px-4 py-3"
        >
          {isAllReady ? (
            <CheckIcon
              className="h-4 w-4"
              style={{ color: "var(--ls-life)" }}
            />
          ) : (
            <div
              className="h-4 w-4 rounded-full border-2"
              style={{ borderColor: "var(--ls-warn)" }}
            />
          )}
          <p
            className="text-[13px] font-medium"
            style={{ color: isAllReady ? "var(--ls-life)" : "var(--ls-warn)" }}
          >
            {isAllReady
              ? "环境检测通过，所有必要组件已安装"
              : "部分环境组件未安装，建议安装后再继续"}
          </p>
        </Surface>
      )}
    </div>
  );
}
