import { GitBranch, RefreshCw } from "lucide-react";

import { Surface, TactileButton, Badge } from "@/components/ls";
import { useGitEnvironmentQuery } from "@/hooks/queries/useEnvironmentQueries";

/**
 * Git 环境面板
 * Git 由系统 PATH 自动探测(克隆/更新实例所需),只读展示检测结果,不接受手填路径。
 */
export function GitEnvironmentPanel() {
  const {
    data: gitInfo,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGitEnvironmentQuery();

  const isAvailable = gitInfo?.is_available ?? false;

  return (
    <Surface variant="panel" className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[var(--ls-r-control)]"
            style={{
              background: "var(--ls-bg-2)",
              color: "var(--ls-ink-soft)",
            }}
          >
            <GitBranch size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Git 环境</h3>
            <p className="mt-1 text-xs" style={{ color: "var(--ls-ink-soft)" }}>
              克隆和更新 Bot 实例所需
            </p>
          </div>
        </div>
        <TactileButton
          variant="ghost"
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          重新检测
        </TactileButton>
      </div>

      <Surface
        variant="inset"
        className="flex items-center justify-between gap-3 p-3"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {isLoading
              ? "正在检测..."
              : error
                ? "检测失败"
                : isAvailable
                  ? "已安装"
                  : "未检测到"}
          </p>
          {isAvailable && gitInfo?.path && (
            <p
              className="mt-0.5 truncate font-mono text-xs"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              {gitInfo.path}
            </p>
          )}
        </div>
        {isAvailable ? (
          <Badge tone="neutral" className="ls-num shrink-0 font-mono">
            {gitInfo?.version}
          </Badge>
        ) : (
          !isLoading && (
            <a
              href="https://git-scm.com/downloads"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm hover:underline"
              style={{ color: "var(--ls-life)" }}
            >
              下载
            </a>
          )
        )}
      </Surface>
    </Surface>
  );
}
