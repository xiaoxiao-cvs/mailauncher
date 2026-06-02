/**
 * 更新确认对话框
 * 显示更新信息并确认是否下载安装
 */
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">发现新版本</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="text-muted-foreground">版本号:</div>
                <div className="font-semibold text-foreground text-lg">
                  {versionInfo.version}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-muted-foreground">发布日期:</div>
                <div className="text-foreground">{versionInfo.date}</div>
              </div>

              {versionInfo.notes && (
                <div className="space-y-2">
                  <div className="text-muted-foreground">更新说明:</div>
                  <div className="p-4 rounded-lg bg-muted/50 text-foreground max-h-60 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-sans">
                      {versionInfo.notes}
                    </pre>
                  </div>
                </div>
              )}

              {isUpdating && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    正在下载更新... {progress.toFixed(0)}%
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  [失败] {error}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUpdating}>稍后提醒</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isUpdating}
            className="bg-primary hover:bg-primary/90"
          >
            {isUpdating ? "更新中..." : "立即更新"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
