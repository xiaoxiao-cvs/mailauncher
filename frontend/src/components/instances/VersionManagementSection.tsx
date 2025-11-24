import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useComponentsVersionQuery, useUpdateComponentMutation } from '@/hooks/queries/useVersionQueries';
import { ComponentVersionInfo } from '@/services/versionApi';
import { GitCommit, ArrowRight, Loader2, Clock, User, GitBranch, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

interface VersionManagementSectionProps {
  instanceId: string;
}

const COMPONENT_MAP = {
  'MaiBot': 'MaiBot',
  'ADA': 'MaiBot-Napcat-Adapter'
} as const;

type DisplayComponentType = keyof typeof COMPONENT_MAP;

export const VersionManagementSection: React.FC<VersionManagementSectionProps> = ({ instanceId }) => {
  const [activeTab, setActiveTab] = useState<DisplayComponentType>('MaiBot');
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  
  const { data: components = [], isLoading, refetch } = useComponentsVersionQuery(instanceId, {
    manualFetch: true, // 手动触发获取，不自动加载
  });

  const updateMutation = useUpdateComponentMutation();

  const getComponentData = (name: DisplayComponentType) => {
    const realName = COMPONENT_MAP[name];
    return components.find(c => c.component === realName);
  };

  const handleUpdate = async (componentName: string) => {
    try {
      await updateMutation.mutateAsync({
        instanceId,
        component: componentName,
        createBackup: true,
        updateMethod: 'git',
      });
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const renderTabTrigger = (name: DisplayComponentType) => {
    const data = getComponentData(name);
    const hasUpdate = data?.has_update;
    const isChecking = data?.status === 'checking';
    
    return (
      <TabsTrigger 
        value={name}
        className="relative px-4 py-1.5 text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 transition-all duration-200 rounded-md"
      >
        <div className="flex items-center gap-1.5">
          <span>{name}</span>
          {isChecking ? (
            <Loader2 className="w-1.5 h-1.5 animate-spin text-blue-500" />
          ) : (
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
              hasUpdate ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
          )}
        </div>
      </TabsTrigger>
    );
  };

  const renderContent = (name: DisplayComponentType) => {
    const data = getComponentData(name);
    
    if (!data) return <div className="p-4 text-center text-gray-500 text-sm">加载中...</div>;

    const githubInfo = data.github_info;
    const isUpToDate = !data.has_update;

    return (
      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Compact Card - Latest Commit Info */}
        <div 
          onClick={() => setIsVisualizerOpen(true)}
          className="group relative overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 cursor-pointer hover:shadow-md transition-all duration-200"
        >
          <div className="absolute top-2 right-2 opacity-40 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>

          <div className="flex items-start gap-2 pr-6">
            <div className={`p-1.5 rounded-lg ${isUpToDate ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'} dark:bg-opacity-20 shrink-0`}>
              <GitCommit className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                  {githubInfo?.latest_commit_short || data.latest_commit?.substring(0, 7) || 'Unknown'}
                </span>
                <span className="text-[10px] text-gray-400 truncate">
                  {githubInfo?.commit_date && formatDistanceToNow(new Date(githubInfo.commit_date), { addSuffix: true, locale: zhCN })}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1 mb-1">
                {githubInfo?.commit_message || '无法获取提交信息'}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <User className="w-2.5 h-2.5" />
                <span className="truncate">{githubInfo?.author || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Actions */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-gray-500">
            <div className={`w-1.5 h-1.5 rounded-full ${isUpToDate ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="truncate">{isUpToDate ? '最新' : `落后 ${data.commits_behind || '?'} 个版本`}</span>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                refetch();
              }}
              disabled={isLoading}
              className="h-7 px-2 text-xs"
            >
              检查
            </Button>
            {!isUpToDate && (
              <Button 
                size="sm"
                className="h-7 px-2 text-xs bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                onClick={() => handleUpdate(COMPONENT_MAP[name])}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <GitBranch className="w-3 h-3 mr-1" />
                )}
                更新
              </Button>
            )}
          </div>
        </div>

        <GitVisualizerModal 
          isOpen={isVisualizerOpen} 
          onClose={() => setIsVisualizerOpen(false)}
          data={data}
          name={name}
        />
      </div>
    );
  };

  return (
    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl p-4 border border-white/40 dark:border-gray-700/40 shadow-sm">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DisplayComponentType)} className="w-full">
        <TabsList className="w-full bg-gray-100/50 dark:bg-gray-800/50 p-0.5 rounded-lg mb-3">
          {renderTabTrigger('MaiBot')}
          {renderTabTrigger('ADA')}
        </TabsList>
        <TabsContent value="MaiBot" className="mt-0">
          {renderContent('MaiBot')}
        </TabsContent>
        <TabsContent value="ADA" className="mt-0">
          {renderContent('ADA')}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const GitVisualizerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  data: ComponentVersionInfo;
  name: string;
}> = ({ isOpen, onClose, data, name }) => {
  if (!isOpen) return null;

  const isUpToDate = !data.has_update;
  const currentCommit = data.local_commit?.substring(0, 7) || 'Unknown';
  const latestCommit = data.latest_commit?.substring(0, 7) || 'Unknown';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-white/20 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-500" />
            版本可视化 - {name}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="relative flex flex-col gap-8 pl-8 border-l-2 border-dashed border-gray-200 dark:border-gray-700 ml-4">
            {/* Latest Node */}
            <div className="relative">
              <div className="absolute -left-[41px] top-0 w-5 h-5 rounded-full bg-green-500 ring-4 ring-white dark:ring-gray-900 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-900/30">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-green-600 dark:text-green-400 px-2 py-1 bg-green-100 dark:bg-green-900/40 rounded-md">
                    LATEST
                  </span>
                  <span className="font-mono text-xs text-gray-500">{latestCommit}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {data.github_info?.commit_message || 'Fetching commit info...'}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <User className="w-3 h-3" />
                  {data.github_info?.author || 'Unknown'}
                  <span className="mx-1">•</span>
                  <Clock className="w-3 h-3" />
                  {data.github_info?.commit_date && formatDistanceToNow(new Date(data.github_info.commit_date), { addSuffix: true, locale: zhCN })}
                </div>
              </div>
            </div>

            {/* Gap if not up to date */}
            {!isUpToDate && (
              <div className="py-2 flex items-center gap-2 text-gray-400 text-sm">
                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                  相差 {data.commits_behind} 个提交
                </span>
              </div>
            )}

            {/* Current Node */}
            {!isUpToDate && (
              <div className="relative">
                <div className="absolute -left-[41px] top-0 w-5 h-5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-gray-900 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded-md">
                      CURRENT
                    </span>
                    <span className="font-mono text-xs text-gray-500">{currentCommit}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    当前运行版本
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};