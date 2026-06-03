import {
  CheckCircle2Icon,
  XCircleIcon,
  LoaderIcon,
  AlertCircleIcon,
  FolderOpenIcon,
} from "lucide-react";
import {
  useGitEnvironmentQuery,
  useSavePathMutation,
  useDeploymentPathQuery,
} from "@/hooks/queries/useEnvironmentQueries";
import { open } from "@tauri-apps/plugin-dialog";
import { useState, useEffect } from "react";

import { Surface, Input, TactileButton, StatusDot } from "@/components/ls";

interface EnvironmentConfigProps {
  // 由引导步骤注入的强调色；生息风格下层级靠 token 表达，强调色不参与上色，保留以兼容调用方契约。
  stepColor: string;
  onGitStatusChange?: (isAvailable: boolean) => void;
}

/**
 * 环境配置组件（首页）
 * 职责：检查 Git 环境并配置部署路径
 */
export function EnvironmentConfig({
  onGitStatusChange,
}: EnvironmentConfigProps) {
  // Git 环境检查
  const {
    data: gitInfo,
    isLoading: isCheckingGit,
    error: gitErrorObj,
    refetch: checkGitEnvironment,
  } = useGitEnvironmentQuery();
  const gitError = gitErrorObj ? String(gitErrorObj) : null;

  // 部署路径管理
  const { data: deploymentPath = "" } = useDeploymentPathQuery();
  const savePathMutation = useSavePathMutation();

  // 本地状态
  const [localPath, setLocalPath] = useState(deploymentPath);
  const [pathError, setPathError] = useState<string | null>(null);
  const [pathSuccess, setPathSuccess] = useState<string | null>(null);

  // 同步路径
  useEffect(() => {
    setLocalPath(deploymentPath);
  }, [deploymentPath]);

  // 通知父组件 Git 状态变化
  useEffect(() => {
    if (gitInfo && onGitStatusChange) {
      onGitStatusChange(gitInfo.is_available);
    }
  }, [gitInfo, onGitStatusChange]);

  // 选择文件夹
  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择部署路径",
      });
      if (selected && typeof selected === "string") {
        handlePathChange(selected);
      }
    } catch (error) {
      console.error("选择文件夹失败:", error);
    }
  };

  // 处理路径变化
  const handlePathChange = (newPath: string) => {
    setLocalPath(newPath);
    setPathError(null);
    setPathSuccess(null);

    if (newPath) {
      savePathMutation.mutate(newPath, {
        onSuccess: () => {
          setPathSuccess("路径保存成功");
          setPathError(null);
        },
        onError: (error) => {
          setPathError(String(error));
          setPathSuccess(null);
        },
      });
    }
  };

  return (
    <div className="h-full space-y-4 overflow-hidden">
      {/* Git 环境检查 */}
      <Surface variant="card" className="p-3.5">
        <div className="mb-2.5 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-[var(--ls-r-control)]"
              style={{
                background: "var(--ls-bg-2)",
                color: "var(--ls-ink-soft)",
              }}
            >
              {isCheckingGit ? (
                <LoaderIcon className="h-[18px] w-[18px] animate-spin" />
              ) : gitInfo?.is_available ? (
                <CheckCircle2Icon
                  className="h-[18px] w-[18px]"
                  style={{ color: "var(--ls-life)" }}
                />
              ) : (
                <XCircleIcon
                  className="h-[18px] w-[18px]"
                  style={{ color: "var(--ls-danger)" }}
                />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold">Git 环境</h3>
              <p className="text-xs" style={{ color: "var(--ls-ink-soft)" }}>
                克隆和更新 Bot 实例所需
              </p>
            </div>
          </div>
          <TactileButton
            variant="solid"
            onClick={() => checkGitEnvironment()}
            disabled={isCheckingGit}
            className="h-8 disabled:opacity-60"
          >
            {isCheckingGit ? "检查中..." : "重新检查"}
          </TactileButton>
        </div>

        {gitError ? (
          <Surface variant="inset" className="flex items-start gap-2 p-2.5">
            <AlertCircleIcon
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: "var(--ls-danger)" }}
            />
            <p className="text-xs" style={{ color: "var(--ls-danger)" }}>
              {gitError}
            </p>
          </Surface>
        ) : gitInfo ? (
          <div className="space-y-1.5">
            <Surface
              variant="inset"
              className="flex items-center justify-between px-2.5 py-1.5"
            >
              <span className="text-xs" style={{ color: "var(--ls-ink-soft)" }}>
                状态
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <StatusDot running={gitInfo.is_available} />
                <span
                  style={{
                    color: gitInfo.is_available
                      ? "var(--ls-life)"
                      : "var(--ls-danger)",
                  }}
                >
                  {gitInfo.is_available ? "已安装" : "未安装"}
                </span>
              </span>
            </Surface>

            {gitInfo.is_available && (
              <Surface
                variant="inset"
                className="flex items-center justify-between px-2.5 py-1.5"
              >
                <span
                  className="text-xs"
                  style={{ color: "var(--ls-ink-soft)" }}
                >
                  版本
                </span>
                <span className="ls-num font-mono text-xs font-medium">
                  {gitInfo.version}
                </span>
              </Surface>
            )}
          </div>
        ) : null}

        {gitInfo && !gitInfo.is_available && (
          <Surface variant="inset" className="mt-2.5 p-2.5">
            <p className="text-xs" style={{ color: "var(--ls-warn)" }}>
              未检测到 Git。请先安装 Git：
              <a
                href="https://git-scm.com/downloads"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 underline"
                style={{ color: "var(--ls-warn)" }}
              >
                下载 Git
              </a>
            </p>
          </Surface>
        )}
      </Surface>

      {/* 部署路径配置 */}
      <Surface variant="card" className="p-3.5">
        <div className="mb-2.5 flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-[var(--ls-r-control)]"
            style={{
              background: "var(--ls-bg-2)",
              color: "var(--ls-ink-soft)",
            }}
          >
            <FolderOpenIcon className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">部署路径</h3>
            <p className="text-xs" style={{ color: "var(--ls-ink-soft)" }}>
              Bot 实例将安装到此目录
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={localPath}
                onChange={(e) => handlePathChange(e.target.value)}
                placeholder="/path/to/deployments"
                disabled={savePathMutation.isPending}
                className="disabled:cursor-not-allowed disabled:opacity-60"
              />
              {savePathMutation.isPending && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <LoaderIcon
                    className="h-4 w-4 animate-spin"
                    style={{ color: "var(--ls-ink-soft)" }}
                  />
                </div>
              )}
            </div>
            <TactileButton
              variant="solid"
              onClick={handleSelectFolder}
              disabled={savePathMutation.isPending}
              className="shrink-0 disabled:opacity-60"
            >
              <FolderOpenIcon className="h-3.5 w-3.5" />
              选择
            </TactileButton>
          </div>

          {pathError && (
            <p className="text-xs" style={{ color: "var(--ls-danger)" }}>
              {pathError}
            </p>
          )}

          {pathSuccess && (
            <p className="text-xs" style={{ color: "var(--ls-life)" }}>
              {pathSuccess}
            </p>
          )}
        </div>
      </Surface>
    </div>
  );
}
