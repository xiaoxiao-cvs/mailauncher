import { RotateCcw, Calendar, HardDrive, Save, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Surface, TactileButton } from "@/components/ls";
import {
  VersionBackup,
  getComponentDisplayName,
  formatFileSize,
} from "@/services/versionApi";

interface BackupRestoreTabProps {
  backups: VersionBackup[];
  onRestore: (backupId: string) => void;
  isRestoring: boolean;
  /**
   * 手动立即备份的目标组件（P2-26）。三者（连同 onManualBackup）须同时提供才会渲染
   * "立即备份"入口——调用方（当前是 VersionManagerModal）未选中具体组件时不知道该
   * 备份哪个组件，此时静默不渲染，不强行要求调用方处理"未选组件"的中间态。
   */
  component?: string;
  onManualBackup?: (component: string) => void;
  isBackingUp?: boolean;
}

export function BackupRestoreTab({
  backups,
  onRestore,
  isRestoring,
  component,
  onManualBackup,
  isBackingUp,
}: BackupRestoreTabProps) {
  const manualBackupButton =
    component && onManualBackup ? (
      <TactileButton
        variant="solid"
        onClick={() => onManualBackup(component)}
        disabled={isBackingUp}
        className="shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isBackingUp ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
        立即备份
      </TactileButton>
    ) : null;

  if (backups.length === 0) {
    return (
      <div
        className="text-center py-12"
        style={{ color: "var(--ls-ink-soft)" }}
      >
        <HardDrive
          className="w-16 h-16 mx-auto mb-4"
          style={{ color: "var(--ls-ink-faint)" }}
        />
        <p
          className="text-lg font-medium mb-2"
          style={{ color: "var(--ls-ink)" }}
        >
          暂无备份
        </p>
        <p className="text-sm mb-4">更新组件时会自动创建备份</p>
        {manualBackupButton}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {manualBackupButton && (
        <div className="flex justify-end">{manualBackupButton}</div>
      )}
      {backups.map((backup) => (
        <Surface key={backup.id} variant="inset" className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div
                className="ls-num font-semibold mb-1"
                style={{ color: "var(--ls-ink)" }}
              >
                {getComponentDisplayName(backup.component)} -{" "}
                {backup.version || backup.commit_hash?.slice(0, 7)}
              </div>
              <div className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
                {backup.description}
              </div>
            </div>
            <TactileButton
              variant="solid"
              onClick={() => onRestore(backup.id)}
              disabled={isRestoring}
              className="shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              恢复
            </TactileButton>
          </div>
          <div
            className="flex items-center gap-4 text-xs"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            <span className="ls-num flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDistanceToNow(new Date(backup.created_at), {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
            <span className="ls-num flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              {formatFileSize(backup.backup_size)}
            </span>
          </div>
        </Surface>
      ))}
    </div>
  );
}
