import { FolderOpen } from "lucide-react";

import { Surface, Input, TactileButton } from "@/components/ls";

interface DeploymentPathPanelProps {
  deployPath: string;
  onDeployPathChange: (value: string) => void;
}

export function DeploymentPathPanel({
  deployPath,
  onDeployPathChange,
}: DeploymentPathPanelProps) {
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
            <FolderOpen size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{"部署路径"}</h3>
            <p className="mt-1 text-xs" style={{ color: "var(--ls-ink-soft)" }}>
              Bot {"实例将安装到此目录"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={deployPath}
            onChange={(e) => onDeployPathChange(e.target.value)}
            placeholder="/path/to/deployments"
            className="flex-1"
          />
          <TactileButton variant="solid" className="shrink-0">
            <FolderOpen size={16} />
            {"选择文件夹"}
          </TactileButton>
        </div>

        <Surface variant="inset" className="p-3">
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            {
              "提示：可以直接输入路径，或点击按钮选择文件夹。默认路径为后端同目录下的 deployments 文件夹。"
            }
          </p>
        </Surface>
      </div>
    </Surface>
  );
}
