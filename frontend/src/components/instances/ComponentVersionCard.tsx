/**
 * 组件版本卡片
 * 显示实例各组件的版本信息和更新状态
 */
import React from 'react';
import { Package, CheckCircle, AlertCircle, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { useComponentsVersionQuery, useCheckAllUpdates } from '@/hooks/queries/useVersionQueries';
import { getComponentDisplayName } from '@/services/versionApi';

interface ComponentVersionCardProps {
  instanceId: string;
  onOpenVersionManager: () => void;
}

export const ComponentVersionCard: React.FC<ComponentVersionCardProps> = ({
  instanceId,
  onOpenVersionManager,
}) => {
  const { data: components = [], isLoading } = useComponentsVersionQuery(instanceId);
  
  const checkAllMutation = useCheckAllUpdates(instanceId);
  
  // 获取状态图标和颜色
  const getStatusIcon = (status: string, hasUpdate?: boolean) => {
    if (status === 'checking') {
      return <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />;
    }
    if (status === 'update_available' || hasUpdate) {
      return <AlertCircle className="w-3.5 h-3.5 text-orange-500" />;
    }
    if (status === 'up_to_date') {
      return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
    }
    if (status === 'not_installed') {
      return <AlertCircle className="w-3.5 h-3.5 text-gray-400" />;
    }
    if (status === 'check_failed') {
      return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    }
    return null;
  };
  
  // 获取状态文本
  const getStatusText = (component: any) => {
    if (!component.installed) return '未安装';
    if (component.status === 'checking') return '检查中...';
    if (component.status === 'check_failed') return '检查失败';
    if (component.has_update) {
      return component.commits_behind 
        ? `落后 ${component.commits_behind} 个提交`
        : '有新版本';
    }
    return '最新';
  };

  const handleCheckAll = async () => {
    try {
      await checkAllMutation.mutateAsync();
    } catch (error) {
      console.error('检查更新失败:', error);
    }
  };

  return (
    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl p-6 border border-white/40 dark:border-gray-700/40 shadow-sm animate-slide-up opacity-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-green-500" />
          组件版本
        </h3>
        <button
          onClick={handleCheckAll}
          disabled={isLoading || checkAllMutation.isPending}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="检查所有更新"
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${checkAllMutation.isPending ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {components.map((component) => (
            <div
              key={component.component}
              className="p-3 bg-white/50 dark:bg-gray-700/30 rounded-2xl border border-white/20 dark:border-gray-600/20"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {getComponentDisplayName(component.component)}
                  </span>
                  {getStatusIcon(component.status, component.has_update)}
                </div>
                <span className={`text-xs font-medium ${
                  component.has_update 
                    ? 'text-orange-600 dark:text-orange-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {getStatusText(component)}
                </span>
              </div>
              {component.installed && component.local_version && (
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {component.local_version}
                  {component.local_commit && (
                    <span className="ml-2 text-[10px]">
                      #{component.local_commit}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {components.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              暂无组件信息
            </div>
          )}

          {/* 底部操作按钮 */}
          <div className="pt-2 flex gap-2">
            <button
              onClick={onOpenVersionManager}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-medium text-sm transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/20"
            >
              <Package className="w-4 h-4" />
              版本管理
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
