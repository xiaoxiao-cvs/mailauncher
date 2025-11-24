/**
 * 版本管理 Modal
 * 显示详细的版本对比、更新确认、进度显示、备份回退
 */
import React, { useState } from 'react';
import {
  X,
  Package,
  CheckCircle,
  Loader2,
  Download,
  GitCommit,
  FileText,
  Shield,
  RotateCcw,
  Calendar,
  HardDrive,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  useComponentsVersionQuery,
  useCheckComponentUpdateQuery,
  useUpdateComponentMutation,
  useBackupsQuery,
  useRestoreBackupMutation,
} from '@/hooks/queries/useVersionQueries';
import { getComponentDisplayName, formatFileSize } from '@/services/versionApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  // 查询组件版本
  const { data: components = [] } = useComponentsVersionQuery(instanceId, { enabled: isOpen });
  
  // 查询选中组件的详细信息
  const { data: componentDetail, isLoading: isLoadingDetail } = useCheckComponentUpdateQuery(
    instanceId,
    selectedComponent || undefined,
    { enabled: !!selectedComponent }
  );

  // 查询备份列表
  const { data: backups = [] } = useBackupsQuery(instanceId, selectedComponent || undefined, {
    enabled: isOpen && showBackups,
  });

  // 更新 mutation
  const updateMutation = useUpdateComponentMutation();
  
  // 恢复 mutation
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

  const hasUpdateAvailable = components.some((c) => c.has_update);

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-sm">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal 容器 */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-4xl max-h-[90vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/20 dark:border-white/10 animate-in zoom-in-95 duration-300 ring-1 ring-black/5 pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
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
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs value={showBackups ? 'backups' : 'versions'} onValueChange={(v) => setShowBackups(v === 'backups')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="versions">组件版本</TabsTrigger>
              <TabsTrigger value="backups">备份管理</TabsTrigger>
            </TabsList>

            {/* 组件版本 Tab */}
            <TabsContent value="versions" className="space-y-4">
              {/* 组件列表 */}
              <div className="grid grid-cols-1 gap-3">
                {components.map((component) => (
                  <div
                    key={component.component}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedComponent === component.component
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedComponent(component.component)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {getComponentDisplayName(component.component)}
                        </span>
                        {component.has_update ? (
                          <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium">
                            有更新
                          </span>
                        ) : component.status === 'up_to_date' ? (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium">
                            最新
                          </span>
                        ) : null}
                      </div>
                      {component.installed && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {component.local_version || component.local_commit}
                        </span>
                      )}
                    </div>
                    
                    {component.has_update && component.commits_behind && (
                      <div className="text-sm text-orange-600 dark:text-orange-400">
                        落后 {component.commits_behind} 个提交
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 选中组件的详细信息 */}
              {selectedComponent && (
                <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl space-y-4">
                  {isLoadingDetail ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : componentDetail?.has_update ? (
                    <>
                      {/* 版本对比 */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <GitCommit className="w-4 h-4" />
                          版本对比
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">当前版本</div>
                            <div className="font-mono text-sm text-gray-900 dark:text-white">
                              {componentDetail.local_version || componentDetail.local_commit?.slice(0, 7)}
                            </div>
                          </div>
                          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">最新版本</div>
                            <div className="font-mono text-sm text-blue-600 dark:text-blue-400">
                              {componentDetail.github_info?.latest_version || 
                               componentDetail.github_info?.latest_commit?.slice(0, 7)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 提交列表 */}
                      {componentDetail.comparison && componentDetail.comparison.commits.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            更新内容 ({componentDetail.comparison.total_commits} 个提交)
                          </h4>
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {componentDetail.comparison.commits.map((commit, index) => (
                              <div
                                key={index}
                                className="p-3 bg-white dark:bg-gray-800 rounded-lg text-sm"
                              >
                                <div className="flex items-start gap-2">
                                  <code className="text-xs font-mono text-blue-600 dark:text-blue-400 flex-shrink-0">
                                    {commit.sha}
                                  </code>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-gray-900 dark:text-white truncate">
                                      {commit.message}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {commit.author} · {new Date(commit.date).toLocaleDateString('zh-CN')}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 安全提示 */}
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                              安全更新说明
                            </h5>
                            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                              <li>• 更新前会自动创建完整备份</li>
                              <li>• 数据库和配置文件不会被覆盖</li>
                              <li>• 仅更新代码文件和依赖</li>
                              <li>• 更新失败可从备份快速恢复</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 确认更新 */}
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={updateConfirmed}
                            onChange={(e) => setUpdateConfirmed(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            我已了解：仅更新代码，数据库和配置文件不会被覆盖
                          </span>
                        </label>

                        <button
                          onClick={handleUpdate}
                          disabled={!updateConfirmed || updateMutation.isPending}
                          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {updateMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              更新中...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              确认更新
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                      <p>已是最新版本</p>
                    </div>
                  )}
                </div>
              )}

              {!hasUpdateAvailable && !selectedComponent && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium mb-2">所有组件都是最新版本</p>
                  <p className="text-sm">无需更新</p>
                </div>
              )}
            </TabsContent>

            {/* 备份管理 Tab */}
            <TabsContent value="backups" className="space-y-4">
              {backups.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <HardDrive className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">暂无备份</p>
                  <p className="text-sm">更新组件时会自动创建备份</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {backups.map((backup) => (
                    <div
                      key={backup.id}
                      className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700"
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
                          onClick={() => handleRestore(backup.id)}
                          disabled={restoreMutation.isPending}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
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
              )}
            </TabsContent>
          </Tabs>
        </div>
        </div>
      </div>
    </div>
  );
};
