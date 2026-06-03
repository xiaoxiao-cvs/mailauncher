import { LoaderIcon, FolderOpenIcon, CheckCircle2Icon } from "lucide-react";
import {
  useSavePathMutation,
  useDeploymentPathQuery,
} from "@/hooks/queries/useEnvironmentQueries";
import { open } from "@tauri-apps/plugin-dialog";
import { useState, useEffect } from "react";

import { Surface, Input, TactileButton } from "@/components/ls";

interface InstallPathConfigProps {
  // 由引导步骤注入的强调色；生息风格下层级靠 token 表达，强调色不参与上色，保留以兼容调用方契约。
  stepColor: string;
}

/**
 * 安装路径配置组件
 * 职责：配置 Bot 实例的部署/安装路径
 */
export function InstallPathConfig(_props: InstallPathConfigProps) {
  // 部署路径管理
  const { data: deploymentPath = "", isLoading: isLoadingPath } =
    useDeploymentPathQuery();
  const savePathMutation = useSavePathMutation();

  // 本地状态
  const [localPath, setLocalPath] = useState(deploymentPath);
  const [pathError, setPathError] = useState<string | null>(null);
  const [pathSuccess, setPathSuccess] = useState<string | null>(null);

  // 同步路径
  useEffect(() => {
    setLocalPath(deploymentPath);
  }, [deploymentPath]);

  // 选择文件夹
  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择安装路径",
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
    <div className="space-y-4 sm:space-y-6">
      {/* 安装路径配置 */}
      <Surface variant="panel" className="p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3 sm:mb-5 sm:items-center sm:gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ls-r-card)] sm:h-12 sm:w-12"
            style={{
              background: "var(--ls-bg-2)",
              color: "var(--ls-ink-soft)",
            }}
          >
            <FolderOpenIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold sm:text-lg">安装路径</h3>
            <p className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
              Bot 实例将被安装到此目录
            </p>
          </div>
        </div>

        {isLoadingPath ? (
          <div className="py-6 text-center sm:py-8">
            <LoaderIcon
              className="mx-auto h-5 w-5 animate-spin sm:h-6 sm:w-6"
              style={{ color: "var(--ls-ink-soft)" }}
            />
            <p className="mt-2 text-sm" style={{ color: "var(--ls-ink-soft)" }}>
              加载中...
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {/* 路径输入和选择 */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Input
                  type="text"
                  value={localPath}
                  onChange={(e) => handlePathChange(e.target.value)}
                  placeholder="选择或输入安装路径"
                  disabled={savePathMutation.isPending}
                  className="font-mono disabled:cursor-not-allowed disabled:opacity-60"
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
                className="justify-center disabled:opacity-60 sm:px-6"
              >
                浏览...
              </TactileButton>
            </div>

            {/* 错误信息 */}
            {pathError && (
              <Surface variant="inset" className="p-2 sm:p-3">
                <p
                  className="break-words text-xs sm:text-sm"
                  style={{ color: "var(--ls-danger)" }}
                >
                  {pathError}
                </p>
              </Surface>
            )}

            {/* 成功信息 */}
            {pathSuccess && (
              <Surface variant="inset" className="p-2 sm:p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2Icon
                    className="h-4 w-4 shrink-0"
                    style={{ color: "var(--ls-life)" }}
                  />
                  <p
                    className="text-xs sm:text-sm"
                    style={{ color: "var(--ls-life)" }}
                  >
                    {pathSuccess}
                  </p>
                </div>
              </Surface>
            )}
          </div>
        )}
      </Surface>

      {/* 说明信息 */}
      <Surface variant="inset" className="p-2 sm:p-3">
        <p className="text-xs" style={{ color: "var(--ls-ink-soft)" }}>
          提示：所有 Bot
          实例将安装在此目录下的独立子文件夹中。建议选择一个有足够空间的位置。
        </p>
      </Surface>

      {/* 路径结构预览 */}
      {localPath && (
        <Surface variant="card" className="p-3 sm:p-4">
          <h4 className="mb-2 text-xs font-medium sm:mb-3 sm:text-sm">
            目录结构预览
          </h4>
          <Surface
            variant="inset"
            className="space-y-1 overflow-x-auto p-2 font-mono text-xs sm:p-3"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            <div className="flex items-center gap-2 whitespace-nowrap">
              <FolderOpenIcon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
              <span className="truncate">
                {localPath.split("/").pop() || localPath}
              </span>
            </div>
            <div
              className="ml-1 space-y-1 border-l border-dashed pl-4 sm:ml-1.5 sm:pl-5"
              style={{ borderColor: "var(--ls-hairline)" }}
            >
              <div
                className="flex items-center gap-2"
                style={{ color: "var(--ls-ink-faint)" }}
              >
                <FolderOpenIcon className="h-3 w-3 shrink-0" />
                <span>instance-1/</span>
              </div>
              <div
                className="flex items-center gap-2"
                style={{ color: "var(--ls-ink-faint)" }}
              >
                <FolderOpenIcon className="h-3 w-3 shrink-0" />
                <span>instance-2/</span>
              </div>
              <div
                className="flex items-center gap-2"
                style={{ color: "var(--ls-ink-faint)" }}
              >
                <span className="pl-4 sm:pl-5">...</span>
              </div>
            </div>
          </Surface>
        </Surface>
      )}
    </div>
  );
}
