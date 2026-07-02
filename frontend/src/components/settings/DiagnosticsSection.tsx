import { FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { Surface, TactileButton } from "@/components/ls";
import { tauriInvoke } from "@/services/tauriInvoke";

/**
 * 诊断区:提供打开后端日志目录的入口。
 *
 * 后端日志(tauri-plugin-log 写入 app_log_dir)此前没有任何可见入口,
 * 用户排查问题时无从定位。这里给出一个直达按钮。
 */
export function DiagnosticsSection() {
  const openLogDir = async () => {
    try {
      await tauriInvoke("open_log_directory");
    } catch (e) {
      toast.error(
        `打开日志目录失败: ${e instanceof Error ? e.message : String(e)}`,
      );
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
          <h3 className="text-lg font-semibold">诊断</h3>
          <p className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
            排查问题时,可打开后端日志目录查看运行日志
          </p>
        </div>
      </div>
      <TactileButton
        variant="ghost"
        onClick={openLogDir}
        className="inline-flex items-center gap-2"
      >
        <FolderOpen size={16} />
        打开日志目录
      </TactileButton>
    </Surface>
  );
}
