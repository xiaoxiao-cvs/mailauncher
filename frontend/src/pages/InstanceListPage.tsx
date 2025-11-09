/**
 * 实例列表页面
 * 显示所有实例的卡片网格
 */

import React, { useEffect, useState } from 'react';
import { useInstanceStore } from '@/stores/instanceStore';
import { InstanceCard } from '@/components/instances/InstanceCard';
import { Plus, RefreshCw, AlertCircle, Server } from 'lucide-react';

export const InstanceListPage: React.FC = () => {
  const {
    instances,
    loading,
    error,
    fetchInstances,
    startInstance,
    stopInstance,
    restartInstance,
    deleteInstance,
    clearError,
  } = useInstanceStore();
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // 加载实例列表
  useEffect(() => {
    fetchInstances();
    
    // 设置自动刷新（每10秒）
    const interval = setInterval(() => {
      fetchInstances();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [fetchInstances]);
  
  // 处理启动实例
  const handleStart = async (id: string) => {
    setActionLoading(id);
    try {
      await startInstance(id);
    } catch (error) {
      console.error('启动实例失败:', error);
    } finally {
      setActionLoading(null);
    }
  };
  
  // 处理停止实例
  const handleStop = async (id: string) => {
    setActionLoading(id);
    try {
      await stopInstance(id);
    } catch (error) {
      console.error('停止实例失败:', error);
    } finally {
      setActionLoading(null);
    }
  };
  
  // 处理重启实例
  const handleRestart = async (id: string) => {
    setActionLoading(id);
    try {
      await restartInstance(id);
    } catch (error) {
      console.error('重启实例失败:', error);
    } finally {
      setActionLoading(null);
    }
  };
  
  // 处理删除实例
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个实例吗？此操作不可恢复。')) {
      return;
    }
    
    setActionLoading(id);
    try {
      await deleteInstance(id);
    } catch (error) {
      console.error('删除实例失败:', error);
    } finally {
      setActionLoading(null);
    }
  };
  
  // 手动刷新
  const handleRefresh = () => {
    fetchInstances();
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              实例管理
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              总实例数 {instances.length} | 运行中 <span className="text-green-600 dark:text-green-400">{instances.filter(i => i.status === 'running').length}</span> | 已停止 {instances.filter(i => i.status === 'stopped').length} | 错误 <span className="text-red-600 dark:text-red-400">{instances.filter(i => i.status === 'error').length}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 
                       text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 
                       dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700
                       disabled:opacity-50 transition-colors duration-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white 
                       rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Plus className="w-4 h-4" />
              创建实例
            </button>
          </div>
        </div>
      </div>
      
      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 
                      dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 dark:text-red-200 font-medium">
              操作失败
            </p>
            <p className="text-red-600 dark:text-red-300 text-sm mt-1">
              {error}
            </p>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 dark:text-red-400 hover:text-red-800 
                     dark:hover:text-red-200 text-sm font-medium"
          >
            关闭
          </button>
        </div>
      )}
      
      {/* 实例卡片网格 */}
      {loading && instances.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">加载中...</p>
          </div>
        </div>
      ) : instances.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <Server className="w-16 h-16 mx-auto mb-4" />
            <p className="text-xl font-medium">暂无实例</p>
            <p className="text-sm mt-2">点击"创建实例"按钮开始使用</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {instances.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onStart={handleStart}
              onStop={handleStop}
              onRestart={handleRestart}
              onDelete={handleDelete}
              loading={actionLoading === instance.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};
