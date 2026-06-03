import { GitBranch, FolderOpen } from "lucide-react";

import { Surface, Input, TactileButton } from "@/components/ls";

interface GitEnvironmentPanelProps {
  gitPath: string;
  onGitPathChange: (value: string) => void;
}

export function GitEnvironmentPanel({
  gitPath,
  onGitPathChange,
}: GitEnvironmentPanelProps) {
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
            <h3 className="text-lg font-semibold">Git {"环境"}</h3>
            <p className="mt-1 text-xs" style={{ color: "var(--ls-ink-soft)" }}>
              {"克隆和更新 Bot 实例所需"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={gitPath}
            onChange={(e) => onGitPathChange(e.target.value)}
            placeholder="/usr/bin/git"
            className="flex-1"
          />
          <TactileButton variant="solid" className="shrink-0">
            <FolderOpen size={16} />
            {"浏览"}
          </TactileButton>
        </div>

        <Surface variant="inset" className="p-3">
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            {
              "提示：输入 Git 可执行文件的完整路径。如果 Git 已添加到系统 PATH，通常为 /usr/bin/git (macOS/Linux) 或 C:\\Program Files\\Git\\bin\\git.exe (Windows)"
            }
          </p>
        </Surface>
      </div>
    </Surface>
  );
}
