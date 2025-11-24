/**
 * 实例列表页面
 * 显示所有实例的卡片网格
 */

import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
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
  const previousIndexMap = useRef<Map<string, number>>(new Map());
  const runningStartOrderRef = useRef<Map<string, number>>(new Map());
  const nextStartOrderRef = useRef<number>(1);
  const previousOrderHash = useRef<string>('');
  const isInitialRender = useRef<boolean>(true);
  
  // 对实例进行排序：运行中的在前，按状态和时间排序
  const instances = React.useMemo(() => {
    const list = instanceData?.instances || [];
    
    // 首次加载时，为已运行的实例初始化启动顺序（按运行时间降序）
    const runningInstances = list.filter(inst => 
      inst.status === 'running' || inst.status === 'starting'
    );
    
    if (runningInstances.length > 0 && runningStartOrderRef.current.size === 0) {
      // 按运行时间降序排序，运行时间长的获得更小的序号（排在前面）
      const sortedByRunTime = [...runningInstances].sort((a, b) => 
        (b.run_time || 0) - (a.run_time || 0)
      );
      
      sortedByRunTime.forEach((instance) => {
        runningStartOrderRef.current.set(instance.id, nextStartOrderRef.current);
        nextStartOrderRef.current += 1;
      });
    }
    
    return [...list].sort((a, b) => {
      // 运行中的实例优先
      const aRunning = a.status === 'running' || a.status === 'starting';
      const bRunning = b.status === 'running' || b.status === 'starting';
      
      if (aRunning && !bRunning) return -1;
      if (!aRunning && bRunning) return 1;
      
      // 相同状态下，按启动顺序排序（运行中）或名称排序（已停止）
      if (aRunning && bRunning) {
        // 按启动顺序排序：先启动的在前面
        const aOrder = runningStartOrderRef.current.get(a.id) || 0;
        const bOrder = runningStartOrderRef.current.get(b.id) || 0;
        
        if (aOrder !== 0 && bOrder !== 0) {
          return aOrder - bOrder;
        }
        // 如果某个没有启动顺序（刚启动），按运行时间排序
        return (b.run_time || 0) - (a.run_time || 0);
      }
      
      // 已停止的按名称排序（字母顺序）
      return a.name.localeCompare(b.name, 'zh-CN');
    });
  }, [instanceData?.instances]);
  
  // 标记新实例已经动画过，并更新启动顺序
  useEffect(() => {
    instances.forEach(instance => {
      if (!hasAnimatedRef.current.has(instance.id)) {
        hasAnimatedRef.current.add(instance.id);
      }
      
      // 为刚启动的实例分配启动顺序
      const isRunning = instance.status === 'running' || instance.status === 'starting';
      if (isRunning && !runningStartOrderRef.current.has(instance.id)) {
        runningStartOrderRef.current.set(instance.id, nextStartOrderRef.current);
        nextStartOrderRef.current += 1;
      }
      
      // 清理已停止实例的启动顺序
      if (!isRunning && runningStartOrderRef.current.has(instance.id)) {
        runningStartOrderRef.current.delete(instance.id);
      }
    });
  }, [instances]);
  
  // FLIP 动画的正确实现
  // 关键：必须在 DOM 更新前记录旧位置，在 DOM 更新后记录新位置
  useLayoutEffect(() => {
    if (instances.length === 0) return;
    
    // 检查顺序是否真的改变了
    const currentOrderHash = instances.map(inst => inst.id).join(',');
    const orderChanged = previousOrderHash.current !== currentOrderHash;
    
    // 首次渲染或顺序没变：只记录位置，不执行动画
    if (isInitialRender.current || !orderChanged) {
      if (isInitialRender.current) {
        console.log('[FLIP] 首次渲染，记录初始位置');
        isInitialRender.current = false;
      }
      
      instances.forEach((instance, index) => {
        const element = cardRefs.current.get(instance.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          previousPositions.current.set(instance.id, rect);
          previousIndexMap.current.set(instance.id, index);
        }
      });
      previousOrderHash.current = currentOrderHash;
      return;
    }
    
    console.log(`[FLIP] 顺序改变: ${previousOrderHash.current} → ${currentOrderHash}`);
    
    // Step 1 (Last): 记录所有元素的新位置
    const newPositions = new Map<string, DOMRect>();
    const newIndexMap = new Map<string, number>();
    
    instances.forEach((instance, index) => {
      const element = cardRefs.current.get(instance.id);
      if (element) {
        const rect = element.getBoundingClientRect();
        newPositions.set(instance.id, rect);
        newIndexMap.set(instance.id, index);
      }
    });
    
    // Step 2 (Invert & Play): 执行 FLIP 动画
    instances.forEach((instance, currentIndex) => {
      const element = cardRefs.current.get(instance.id);
      const oldPos = previousPositions.current.get(instance.id);
      const newPos = newPositions.get(instance.id);
      const oldIndex = previousIndexMap.current.get(instance.id);
      
      if (!element || !oldPos || !newPos || oldIndex === undefined) return;
      
      // 计算位置差
      const deltaX = oldPos.left - newPos.left;
      const deltaY = oldPos.top - newPos.top;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // 跳过条件
      const indexChanged = oldIndex !== currentIndex;
      const isAlreadyFirst = oldIndex === 0 && currentIndex === 0;
      
      console.log(`[FLIP] ${instance.name}: index ${oldIndex}→${currentIndex}, ΔX=${deltaX.toFixed(0)}, ΔY=${deltaY.toFixed(0)}`);
      
      // 严格判断：必须在同一行内（垂直位置相近）
      const isOnSameRow = Math.abs(deltaY) < 30;
      // 且有明显的水平位置交换
      const hasHorizontalMovement = Math.abs(deltaX) > 100;
      
      if (distance > 5 && indexChanged && !isAlreadyFirst && isOnSameRow && hasHorizontalMovement) {
        console.log(`  ✓ 执行动画 (同行交换)`);
        
        // Invert: 瞬间移到旧位置（只应用水平偏移，忽略垂直偏移）
        element.style.transform = `translateX(${deltaX}px)`;
        element.style.transition = 'none';
        
        // 强制重绘
        void element.offsetHeight;
        
        // Play: 动画到新位置
        requestAnimationFrame(() => {
          element.style.transform = '';
          element.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
      } else {
        console.log(`  ✗ 跳过: sameRow=${isOnSameRow}, hasHorizontal=${hasHorizontalMovement}`);
      }
    });
    
    // Step 3: 更新记录供下次使用
    previousPositions.current = newPositions;
    previousIndexMap.current = newIndexMap;
    previousOrderHash.current = currentOrderHash;
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
