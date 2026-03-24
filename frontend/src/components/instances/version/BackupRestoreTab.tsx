import {
  RotateCcw,
  Calendar,
  HardDrive,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { VersionBackup, getComponentDisplayName, formatFileSize } from '@/services/versionApi';

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
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <HardDrive className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">暂无备份</p>
        <p className="text-sm">更新组件时会自动创建备份</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {backups.map((backup) => (
        <div
          key={backup.id}
          className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-panel border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-semibold text-gray-900 dark:text-white mb-1">
                {getComponentDisplayName(backup.component)} - {backup.version || backup.commit_hash?.slice(0, 7)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {backup.description}
              </div>
            </div>
            <button
              onClick={() => onRestore(backup.id)}
              disabled={isRestoring}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-control text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              恢复
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDistanceToNow(new Date(backup.created_at), {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              {formatFileSize(backup.backup_size)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
