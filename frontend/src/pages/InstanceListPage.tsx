/**
 * 实例列表页面
 * 显示所有实例的卡片网格
 */

import React, { useEffect, useState, useRef } from 'react';
import { InstanceCard } from '@/components/instances/InstanceCard';
import { Plus, RefreshCw, AlertCircle, Server } from 'lucide-react';
import {
  useInstancesQuery,
  useStartInstanceMutation,
  useStopInstanceMutation,
  useRestartInstanceMutation,
  useDeleteInstanceMutation,
  useUpdateInstanceMutation,
} from '@/hooks/queries/useInstanceQueries';

export const InstanceListPage: React.FC = () => {
  // 使用 React Query hooks 获取数据
  const { data: instanceData, isLoading, error, refetch } = useInstancesQuery({
    refetchInterval: 10000, // 每10秒自动刷新
  });
  
  // 实例操作 mutations
  const startMutation = useStartInstanceMutation();
  const stopMutation = useStopInstanceMutation();
  const restartMutation = useRestartInstanceMutation();
  const deleteMutation = useDeleteInstanceMutation();
  const updateMutation = useUpdateInstanceMutation();
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const previousPositions = useRef<Map<string, DOMRect>>(new Map());
  const hasAnimatedRef = useRef<Set<string>>(new Set());
  
  // 对实例进行排序：运行中的在前，按状态和时间排序
  const instances = React.useMemo(() => {
    const list = instanceData?.instances || [];
    return [...list].sort((a, b) => {
      // 运行中的实例优先
      const aRunning = a.status === 'running' || a.status === 'starting';
      const bRunning = b.status === 'running' || b.status === 'starting';
      
      if (aRunning && !bRunning) return -1;
      if (!aRunning && bRunning) return 1;
      
      // 相同状态下，按运行时间排序（运行中）或更新时间（已停止）
      if (aRunning && bRunning) {
        return (b.run_time || 0) - (a.run_time || 0);
      }
      
      // 已停止的按更新时间排序
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [instanceData?.instances]);
  
  // 标记新实例已经动画过
  useEffect(() => {
    instances.forEach(instance => {
      if (!hasAnimatedRef.current.has(instance.id)) {
        hasAnimatedRef.current.add(instance.id);
      }
    });
  }, [instances]);
  
  // FLIP 动画: 记录位置变化并应用动画
  useEffect(() => {
    if (instances.length === 0) return;
    
    // First: 记录当前位置
    const currentPositions = new Map<string, DOMRect>();
    instances.forEach(instance => {
      const element = cardRefs.current.get(instance.id);
      if (element) {
        currentPositions.set(instance.id, element.getBoundingClientRect());
      }
    });
    
    // Last: 比较位置变化
    instances.forEach(instance => {
      const element = cardRefs.current.get(instance.id);
      const oldPos = previousPositions.current.get(instance.id);
      const newPos = currentPositions.get(instance.id);
      
      if (element && oldPos && newPos) {
        const deltaX = oldPos.left - newPos.left;
        const deltaY = oldPos.top - newPos.top;
        
        // 只有移动距离超过5px时才触发动画，避免微小抖动
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > 5) {
          element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
          element.style.transition = 'none';
          
          // Play: 触发动画回到新位置
          requestAnimationFrame(() => {
            element.style.transform = '';
            element.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          });
        }
      }
    });
    
    // 更新位置记录
    previousPositions.current = currentPositions;
  }, [instances]);
  
  // 处理启动实例
  const handleStart = async (id: string) => {
    setActionLoading(id);
    try {
      await startMutation.mutateAsync(id);
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
      await stopMutation.mutateAsync(id);
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
      await restartMutation.mutateAsync(id);
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
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error('删除实例失败:', error);
    } finally {
      setActionLoading(null);
    }
  };
  
  // 处理重命名实例
  const handleRename = async (id: string, newName: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { name: newName } });
    } catch (error) {
      console.error('重命名实例失败:', error);
    }
  };
  
  // 手动刷新
  const handleRefresh = () => {
    refetch();
  };
  
  return (
    <div className="container mx-auto px-6 py-10 max-w-7xl">
      {/* 页面头部 */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-3">
            实例管理
          </h1>
          <div className="flex items-center gap-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
              总计 {instances.length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#34C759]" />
              运行中 {instances.filter(i => i.status === 'running').length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#8E8E93]" />
              已停止 {instances.filter(i => i.status === 'stopped').length}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 
                     text-gray-600 dark:text-gray-300 rounded-full border border-gray-200 
                     dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700
                     hover:shadow-md active:scale-95 disabled:opacity-50 
                     transition-all duration-300 font-medium text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新状态
          </button>
          
          <button
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900
                     rounded-full hover:shadow-lg hover:shadow-gray-900/20 dark:hover:shadow-white/20
                     hover:-translate-y-0.5 active:translate-y-0 active:scale-95
                     transition-all duration-300 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            创建新实例
          </button>
        </div>
      </div>
      
      {/* 错误提示 */}
      {error && (
        <div className="mb-8 p-4 bg-[#FF3B30]/10 border border-[#FF3B30]/20 
                      rounded-2xl flex items-center gap-4 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full bg-[#FF3B30]/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-[#FF3B30]" />
          </div>
          <div className="flex-1">
            <p className="text-[#FF3B30] font-semibold">加载失败</p>
            <p className="text-[#FF3B30]/80 text-sm mt-0.5">{error.message}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-white/50 hover:bg-white text-[#FF3B30] rounded-full 
                     text-sm font-medium transition-colors duration-200"
          >
            重试
          </button>
        </div>
      )}
      
      {/* 实例卡片网格 */}
      {isLoading && instances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-6" />
          <p className="text-gray-500 font-medium">正在加载实例数据...</p>
        </div>
      ) : instances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
            <Server className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">暂无实例</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
            您还没有创建任何实例。点击右上角的"创建新实例"按钮开始您的第一个部署。
          </p>
          <button className="px-8 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            立即创建
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 instance-grid-container">
          {instances.map((instance, index) => {
            const isNew = !hasAnimatedRef.current.has(instance.id);
            
            return (
              <div 
                key={instance.id}
                ref={(el) => {
                  if (el) {
                    cardRefs.current.set(instance.id, el);
                  } else {
                    cardRefs.current.delete(instance.id);
                  }
                }}
                className={`instance-card-item ${isNew ? 'instance-card-enter' : ''}`}
                style={isNew ? { animationDelay: `${index * 0.15}s` } : {}}
              >
                <InstanceCard
                  instance={instance}
                  onStart={handleStart}
                  onStop={handleStop}
                  onRestart={handleRestart}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  loading={actionLoading === instance.id}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
