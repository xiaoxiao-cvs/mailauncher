import { useState, useEffect } from "react";
import {
  CheckCircle2Icon,
  XCircleIcon,
  LoaderIcon,
  FolderOpenIcon,
  AlertCircleIcon,
} from "lucide-react";

import { Surface, Input, TactileButton, StatusDot } from "@/components/ls";
import { tauriInvoke } from "@/services/tauriInvoke";
import { environmentLogger } from "@/utils/logger";

interface GitInfo {
  is_available: boolean;
  path: string;
  version: string;
}

interface EnvironmentCheckProps {
  // 由引导步骤注入的强调色；生息风格下层级靠 token 表达，强调色不参与上色，保留以兼容调用方契约。
  stepColor: string;
}

/**
 * 环境检查与配置组件
 * 负责检查 Git 环境和配置部署路径
 */
export function EnvironmentCheck(_props: EnvironmentCheckProps) {
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null);
  const [deploymentPath, setDeploymentPath] = useState<string>("");
  const [isCheckingGit, setIsCheckingGit] = useState(false);
  const [gitError, setGitError] = useState<string>("");
  const [pathError, setPathError] = useState<string>("");
  const [pathSuccess, setPathSuccess] = useState<string>("");
  const [isSavingPath, setIsSavingPath] = useState(false);

  const checkGitEnvironment = async () => {
    setIsCheckingGit(true);
    setGitError("");
    environmentLogger.info("开始检查 Git 环境");

    try {
      const result = await tauriInvoke<GitInfo>("check_git_environment");
      setGitInfo(result);
      environmentLogger.success("Git 环境检查完成", result);
    } catch (error) {
      setGitError("检查 Git 环境失败");
      environmentLogger.error("检查 Git 环境失败", error);
    } finally {
      setIsCheckingGit(false);
    }
  };

  const loadDeploymentPath = async () => {
    environmentLogger.info("加载部署路径配置");
    try {
      const path = await tauriInvoke<string | null>("get_path", {
        name: "instances_dir",
      });
      if (path) {
        setDeploymentPath(path);
        environmentLogger.success("部署路径加载成功", { path });
      }
    } catch (error) {
      environmentLogger.error("加载部署路径失败", error);
    }
  };

  useEffect(() => {
    checkGitEnvironment();
    loadDeploymentPath();
  }, []);

  // 打开文件夹选择器
  const handleSelectFolder = async () => {
    environmentLogger.info("打开文件夹选择器");
    try {
      // 动态导入 Tauri API
      const { open } = await import("@tauri-apps/plugin-dialog");
      environmentLogger.debug("Tauri dialog 插件加载成功");

      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择 Bot 实例部署目录",
      });

      environmentLogger.info("用户选择的路径", { path: selected });

      if (selected) {
        const selectedPath = selected as string;
        setDeploymentPath(selectedPath);
        setPathError("");
        // 保存到后端
        await saveDeploymentPath(selectedPath);
      }
    } catch (error) {
      // 如果不在 Tauri 环境中，回退到提示用户手动输入
      environmentLogger.error("文件选择器错误", error);
      alert("文件夹选择器仅在桌面应用中可用。\n请直接在输入框中粘贴路径。");
    }
  };

  const saveDeploymentPath = async (path: string) => {
    setIsSavingPath(true);
    setPathError("");
    setPathSuccess("");
    environmentLogger.info("保存部署路径", { path });

    try {
      await tauriInvoke("set_path", {
        name: "instances_dir",
        path: path,
        pathType: "directory",
        isVerified: false,
        description: "Bot 实例部署目录",
      });
      setPathSuccess("[成功] 路径已保存");
      environmentLogger.success("部署路径保存成功");
      setTimeout(() => setPathSuccess(""), 3000);
    } catch (error) {
      environmentLogger.error("保存路径异常", error);
      setPathError("保存路径失败");
    } finally {
      setIsSavingPath(false);
    }
  };

  // 验证并保存路径
  const handlePathChange = (value: string) => {
    setDeploymentPath(value);
    setPathError("");
    setPathSuccess("");

    // 简单的路径验证
    if (value && !value.startsWith("/") && !value.match(/^[A-Z]:\\/i)) {
      setPathError("请输入有效的绝对路径");
    } else if (value) {
      // 路径有效，保存到后端
      saveDeploymentPath(value);
    }
  };

  return (
    <div className="space-y-4">
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
            onClick={checkGitEnvironment}
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
              <>
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
                <Surface
                  variant="inset"
                  className="flex items-center justify-between px-2.5 py-1.5"
                >
                  <span
                    className="text-xs"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    路径
                  </span>
                  <span className="max-w-xs truncate font-mono text-xs">
                    {gitInfo.path}
                  </span>
                </Surface>
              </>
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
                value={deploymentPath}
                onChange={(e) => handlePathChange(e.target.value)}
                placeholder="/path/to/deployments"
                disabled={isSavingPath}
                className="disabled:cursor-not-allowed disabled:opacity-60"
              />
              {isSavingPath && (
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
              disabled={isSavingPath}
              className="shrink-0 disabled:opacity-60"
            >
              <FolderOpenIcon className="h-3.5 w-3.5" />
              选择文件夹
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

          <Surface variant="inset" className="p-2.5">
            <p className="text-xs" style={{ color: "var(--ls-ink-soft)" }}>
              提示：可以直接输入路径，或点击按钮选择文件夹。默认路径为后端同目录下的
              deployments 文件夹。
            </p>
          </Surface>
        </div>
      </Surface>
    </div>
  );
}
