import { RotateCcw, Calendar, HardDrive } from "lucide-react";
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
}

export function BackupRestoreTab({
  backups,
  onRestore,
  isRestoring,
}: BackupRestoreTabProps) {
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
        <p className="text-sm">更新组件时会自动创建备份</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
