import React, { useState } from 'react';
import { X, Package } from 'lucide-react';
import {
  useComponentsVersionQuery,
  useCheckComponentUpdateQuery,
  useUpdateComponentMutation,
  useBackupsQuery,
  useRestoreBackupMutation,
} from '@/hooks/queries/useVersionQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VersionComparisonTab, BackupRestoreTab } from './version';

interface VersionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
}

export const VersionManagerModal: React.FC<VersionManagerModalProps> = ({
  isOpen,
  onClose,
  instanceId,
}) => {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [updateConfirmed, setUpdateConfirmed] = useState(false);
  const [updateMethod] = useState<'git' | 'release'>('git');
  const [showBackups, setShowBackups] = useState(false);

  const { data: components = [] } = useComponentsVersionQuery(instanceId, { enabled: isOpen });

  const { data: componentDetail, isLoading: isLoadingDetail } = useCheckComponentUpdateQuery(
    instanceId,
    selectedComponent || undefined,
    { enabled: !!selectedComponent }
  );

  const { data: backups = [] } = useBackupsQuery(instanceId, selectedComponent || undefined, {
    enabled: isOpen && showBackups,
  });

  const updateMutation = useUpdateComponentMutation();
  const restoreMutation = useRestoreBackupMutation();

  if (!isOpen) return null;

  const handleUpdate = async () => {
    if (!selectedComponent || !updateConfirmed) return;

    try {
      await updateMutation.mutateAsync({
        instanceId,
        component: selectedComponent,
        createBackup: true,
        updateMethod,
      });

      setUpdateConfirmed(false);
      setSelectedComponent(null);
    } catch (error) {
      console.error('更新失败:', error);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (!confirm('确定要恢复到此备份吗？当前代码将被替换。')) return;

    try {
      await restoreMutation.mutateAsync({ instanceId, backupId });
      setShowBackups(false);
    } catch (error) {
      console.error('恢复失败:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-sm">
      <div
        className="absolute inset-0 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-4xl max-h-[90vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-panel shadow-overlay overflow-hidden flex flex-col border border-white/20 dark:border-white/10 animate-in zoom-in-95 duration-300 ring-1 ring-black/5 pointer-events-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">版本管理</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  管理组件版本、更新和备份
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-control hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <Tabs value={showBackups ? 'backups' : 'versions'} onValueChange={(v) => setShowBackups(v === 'backups')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="versions">组件版本</TabsTrigger>
                <TabsTrigger value="backups">备份管理</TabsTrigger>
              </TabsList>

              <TabsContent value="versions">
                <VersionComparisonTab
                  components={components}
                  selectedComponent={selectedComponent}
                  onSelectComponent={setSelectedComponent}
                  componentDetail={componentDetail}
                  isLoadingDetail={isLoadingDetail}
                  updateConfirmed={updateConfirmed}
                  onUpdateConfirmedChange={setUpdateConfirmed}
                  onUpdate={handleUpdate}
                  isUpdating={updateMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="backups">
                <BackupRestoreTab
                  backups={backups}
                  onRestore={handleRestore}
                  isRestoring={restoreMutation.isPending}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};
