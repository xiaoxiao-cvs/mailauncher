import { FolderOpenIcon, LoaderIcon } from "lucide-react";
import {
  useDeploymentPathQuery,
  useSavePathMutation,
} from "@/hooks/queries/useEnvironmentQueries";
import { open } from "@tauri-apps/plugin-dialog";
import { useState, useEffect } from "react";

import { Surface, Input, TactileButton } from "@/components/ls";

interface DeploymentPathConfigProps {
  // 由引导步骤注入的强调色；生息风格下层级靠 token 表达，强调色不参与上色，保留以兼容调用方契约。
  stepColor: string;
}

/**
 * 部署路径配置组件
 * 职责：配置 Bot 实例的部署目录
 */
export function DeploymentPathConfig(_props: DeploymentPathConfigProps) {
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
    <div className="space-y-4">
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
              选择文件夹
            </TactileButton>
          </div>

          {pathError && (
            <p className="text-xs" style={{ color: "var(--ls-danger)" }}>
              {pathError}
            </p>
          )}

          <Surface variant="inset" className="p-2.5">
            <p className="text-xs" style={{ color: "var(--ls-ink-soft)" }}>
              提示：可以直接输入路径，或点击按钮选择文件夹。默认路径为后端同目录下的
              deployments 文件夹。
            </p>
          </Surface>

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
