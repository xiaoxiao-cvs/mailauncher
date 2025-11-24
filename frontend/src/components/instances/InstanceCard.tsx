/**
 * 实例卡片组件
 * 显示实例的基本信息和操作按钮
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Instance } from '@/services/instanceApi';
import { Play, Square, RotateCw, Trash2, Server, Pencil, Clock, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { InstanceRenameModal } from './InstanceRenameModal';

interface InstanceCardProps {
  instance: Instance;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  onUpdate?: (id: string) => void;
  loading?: boolean;
}

// 状态颜色映射 - 用于卡片背景
const statusColors = {
  running: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  stopped: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  starting: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  stopping: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  error: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
};

// 状态文本颜色 - 用于指示点
const statusTextColors = {
  running: 'bg-green-500',
  stopped: 'bg-gray-400',
  starting: 'bg-yellow-500',
  stopping: 'bg-orange-500',
  error: 'bg-red-500',
};

// 状态文本映射
const statusTexts = {
  running: '运行中',
  stopped: '已停止',
  starting: '启动中',
  stopping: '停止中',
  error: '错误',
};

export const InstanceCard: React.FC<InstanceCardProps> = ({
  instance,
  onStart,
  onStop,
  onRestart,
  onDelete,
  onRename,
  loading = false,
}) => {
  const navigate = useNavigate();
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  
  // 计算组件数量（假设有 main, napcat, napcat-ada）
  const componentCount = 3;
  
  // 格式化最后运行时间
  const formatLastRun = (lastRun?: string) => {
    if (!lastRun) return '从未运行';
    try {
      return formatDistanceToNow(new Date(lastRun), { 
        addSuffix: true,
        locale: zhCN 
      });
    } catch {
      return '未知';
    }
  };
  
  // 格式化运行时长
  const formatRunTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    if (minutes > 0) {
      return `${minutes}分钟`;
    }
    return `${seconds}秒`;
  };
  
  // 点击卡片进入详情页
  const handleCardClick = (e: React.MouseEvent) => {
    // 如果点击的是按钮，不触发卡片点击
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    navigate(`/instances/${instance.id}`);
  };
  
  // 阻止按钮事件冒泡
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };
  
  const isRunning = instance.status === 'running';
  const isStopped = instance.status === 'stopped';
  const isTransitioning = instance.status === 'starting' || instance.status === 'stopping';
  
  return (
    <div
      onClick={handleCardClick}
      className={`
        group relative overflow-hidden
        bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl
        rounded-[2rem] shadow-sm hover:shadow-2xl
        border border-white/50 dark:border-gray-700/50
        transition-all duration-500 ease-out
        hover:-translate-y-1 cursor-pointer
        ${loading || isTransitioning ? 'opacity-80' : ''}
      `}
    >
      {/* 装饰背景 - 仅在 hover 时显示更明显 */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="p-6 relative z-10">
        {/* 头部：名称和 Info 图标 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {instance.name}
          </h3>
          
          {/* Info 图标按钮 */}
          <button
            onClick={(e) => handleButtonClick(e, () => {
              // TODO: 展示详细信息弹窗
              console.log('查看实例详情:', instance.id);
            })}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                     hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 active:scale-95
                     transition-all duration-300"
            title="查看详情"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        
        {/* 资源使用文本 - 每10秒自动更新 */}
        <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          CPU {instance.cpu_usage !== undefined && instance.cpu_usage > 0 
            ? `${instance.cpu_usage.toFixed(1)}%` 
            : '0%'} / 内存 {instance.memory_usage !== undefined && instance.memory_usage > 0 
            ? `${instance.memory_usage.toFixed(0)}MB` 
            : '0MB'}
        </div>
        
        {/* 信息网格 */}
        {/* 极简徽章式状态显示 */}
        <div className="flex items-center gap-2 mb-4 text-xs flex-wrap">
          {/* 运行状态徽章 */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusColors[instance.status]} transition-all duration-300`}>
            <div className={`w-1.5 h-1.5 rounded-full ${statusTextColors[instance.status]} ${isRunning ? 'animate-pulse' : ''}`} />
            <span className="font-medium">{statusTexts[instance.status]}</span>
          </div>
          
          {/* 运行时间徽章 */}
          {isRunning && instance.run_time !== undefined && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <Clock className="w-3 h-3" />
              <span className="font-medium">{formatRunTime(instance.run_time)}</span>
            </div>
          )}
          
          {/* 最后运行徽章 */}
          {!isRunning && instance.last_run && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              <RotateCw className="w-3 h-3" />
              <span className="font-medium">{formatLastRun(instance.last_run)}</span>
            </div>
          )}
          
          {/* 组件数徽章 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
            <Server className="w-3 h-3" />
            <span className="font-medium">{componentCount}</span>
          </div>
          
          {/* 版本徽章 */}
          {instance.bot_version && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              <span className="font-medium text-[10px]">v{instance.bot_version}</span>
            </div>
          )}
        </div>
        
        {/* 操作按钮区域 */}
        <div className="flex items-center gap-3 pt-2">
          {/* 启动/停止按钮 - 缩短宽度 */}
          {isStopped || instance.status === 'error' ? (
            <button
              onClick={(e) => handleButtonClick(e, () => onStart(instance.id))}
              disabled={loading || isTransitioning}
              className="flex-none w-[calc(100%-6.75rem)] flex items-center justify-center gap-2 h-10 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full 
                       hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                       transition-all duration-300 shadow-lg shadow-gray-900/20 dark:shadow-white/10 text-sm font-semibold"
            >
              {loading || isTransitioning ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>启动</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={(e) => handleButtonClick(e, () => onStop(instance.id))}
              disabled={loading || isTransitioning}
              className="flex-none w-[calc(100%-9.25rem)] flex items-center justify-center gap-2 h-10 bg-white dark:bg-gray-800 text-red-500 border border-red-200 dark:border-red-900/30 rounded-full 
                       hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-300 text-sm font-semibold"
            >
              {loading || isTransitioning ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent" />
              ) : (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>停止</span>
                </>
              )}
            </button>
          )}
          
          {/* 重命名按钮 - 铅笔图标 */}
          <button
            onClick={(e) => handleButtonClick(e, () => setIsRenameModalOpen(true))}
            disabled={loading || isTransitioning}
            className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full 
                     hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 active:scale-95 disabled:opacity-50
                     transition-all duration-300"
            title="重命名"
          >
            <Pencil className="w-4 h-4" />
          </button>
          
          {/* 重启按钮 */}
          {isRunning && (
            <button
              onClick={(e) => handleButtonClick(e, () => onRestart(instance.id))}
              disabled={loading || isTransitioning}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full 
                       hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 active:scale-95 disabled:opacity-50
                       transition-all duration-300"
              title="重启"
            >
              <RotateCw className={`w-4 h-4 ${loading || isTransitioning ? 'animate-spin' : ''}`} />
            </button>
          )}
          
          {/* 删除按钮 */}
          <button
            onClick={(e) => handleButtonClick(e, () => onDelete(instance.id))}
            disabled={loading || isRunning || isTransitioning}
            className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full 
                     hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 active:scale-95 disabled:opacity-50
                     transition-all duration-300"
            title={isRunning ? '请先停止实例再删除' : '删除实例'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* 加载遮罩 */}
      {(loading || isTransitioning) && (
        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-20">
          {/* 这里的 spinner 已经在按钮里显示了,这里可以留空或者显示一个大的 */}
        </div>
      )}
      
      {/* 重命名模态框 */}
      <InstanceRenameModal
        isOpen={isRenameModalOpen}
        instanceName={instance.name}
        onClose={() => setIsRenameModalOpen(false)}
        onSave={(newName: string) => {
          if (onRename) {
            onRename(instance.id, newName);
          }
          setIsRenameModalOpen(false);
        }}
      />
    </div>
  );
};
