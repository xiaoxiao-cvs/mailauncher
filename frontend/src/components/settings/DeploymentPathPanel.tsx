import { useEffect, useState } from "react";
import { FolderOpen, Check } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";

import { Surface, Input, TactileButton } from "@/components/ls";
import {
  useDeploymentPathQuery,
  useSavePathMutation,
} from "@/hooks/queries/useEnvironmentQueries";

/**
 * 部署路径面板
 * 读写实例部署目录(instances_dir):选目录或手填,变更即经 set_path 持久化。
 */
export function DeploymentPathPanel() {
  const { data: deployPath = "", isLoading } = useDeploymentPathQuery();
  const savePath = useSavePathMutation();

  const [localPath, setLocalPath] = useState(deployPath);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalPath(deployPath);
  }, [deployPath]);

  const persist = (next: string) => {
    setLocalPath(next);
    setError(null);
    setSaved(false);
    if (!next) return;
    savePath.mutate(next, {
      onSuccess: () => setSaved(true),
      onError: (e) => setError(String(e)),
    });
  };

  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "选择部署目录",
    });
    if (selected && typeof selected === "string") {
      persist(selected);
    }
  };

  return (
    <Surface variant="panel" className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[var(--ls-r-control)]"
          style={{ background: "var(--ls-bg-2)", color: "var(--ls-ink-soft)" }}
        >
          <FolderOpen size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold">部署路径</h3>
          <p className="mt-1 text-xs" style={{ color: "var(--ls-ink-soft)" }}>
            Bot 实例将安装到此目录下的独立子文件夹
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={localPath}
            onChange={(e) => persist(e.target.value)}
            placeholder="选择或输入部署目录"
            disabled={isLoading || savePath.isPending}
            className="flex-1 font-mono disabled:opacity-60"
          />
          <TactileButton
            variant="solid"
            onClick={handleBrowse}
            disabled={savePath.isPending}
            className="shrink-0 disabled:opacity-60"
          >
            <FolderOpen size={16} />
            浏览
          </TactileButton>
        </div>

        {error && (
          <Surface variant="inset" className="p-3">
            <p
              className="break-words text-xs"
              style={{ color: "var(--ls-danger)" }}
            >
              {error}
            </p>
          </Surface>
        )}
        {saved && !error && (
          <div
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--ls-life)" }}
          >
            <Check size={14} />
            已保存
          </div>
        )}
      </div>
    </Surface>
  );
}
