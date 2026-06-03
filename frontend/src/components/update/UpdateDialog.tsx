/**
 * 更新确认对话框
 * 显示更新信息并确认是否下载安装
 */
import { useState } from "react";
import { Modal, Meter, Surface, TactileButton } from "@/components/ls";
import type { VersionInfo } from "@/types/update";

interface UpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionInfo: VersionInfo | null;
  onConfirm: (onProgress: (progress: number) => void) => Promise<void>;
}

export function UpdateDialog({
  open,
  onOpenChange,
  versionInfo,
  onConfirm,
}: UpdateDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsUpdating(true);
    setError(null);
    setProgress(0);

    try {
      await onConfirm((p) => setProgress(p));
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
      setIsUpdating(false);
    }
  };

  if (!versionInfo) return null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-2xl"
      title="发现新版本"
      footer={
        <>
          <TactileButton
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            稍后提醒
          </TactileButton>
          <TactileButton
            variant="life"
            onClick={handleConfirm}
            disabled={isUpdating}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? "更新中..." : "立即更新"}
          </TactileButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
            版本号:
          </div>
          <div
            className="ls-num font-semibold text-lg"
            style={{ color: "var(--ls-ink)" }}
          >
            {versionInfo.version}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
            发布日期:
          </div>
          <div className="ls-num text-sm" style={{ color: "var(--ls-ink)" }}>
            {versionInfo.date}
          </div>
        </div>

        {versionInfo.notes && (
          <div className="space-y-2">
            <div className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
              更新说明:
            </div>
            <Surface variant="inset" className="p-4 max-h-60 overflow-y-auto">
              <pre
                className="whitespace-pre-wrap text-sm font-sans"
                style={{ color: "var(--ls-ink)" }}
              >
                {versionInfo.notes}
              </pre>
            </Surface>
          </div>
        )}

        {isUpdating && (
          <Meter
            label="正在下载更新"
            used={progress}
            total={100}
            valueText={`${progress.toFixed(0)}%`}
          />
        )}

        {error && (
          <div
            className="p-3 text-sm"
            style={{
              borderRadius: "var(--ls-r-card)",
              // 无 --ls-danger-soft token,沿用 Badge.tsx 的 color-mix 配方现算 16% 浓度软底
              background:
                "color-mix(in srgb, var(--ls-danger) 16%, transparent)",
              color: "var(--ls-danger)",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
