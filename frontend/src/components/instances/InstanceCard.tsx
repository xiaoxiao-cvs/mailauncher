/**
 * 实例卡片组件
 * 显示实例的基本信息和操作按钮
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Instance } from '@/services/instanceApi';
import { Play, Square, RotateCw, Trash2, Server } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface InstanceCardProps {
  instance: Instance;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

// 状态颜色映射
const statusColors = {
  running: 'bg-green-500',
  stopped: 'bg-gray-500',
  starting: 'bg-yellow-500',
  stopping: 'bg-orange-500',
  error: 'bg-red-500',
};

// 状态文本映射
const statusTexts = {
  running: '运行中',
  stopped: '未运行',
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
  loading = false,
}) => {
  const navigate = useNavigate();
  
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
        relative bg-white dark:bg-gray-800 rounded-lg shadow-md 
        hover:shadow-lg transition-all duration-200 cursor-pointer
        border border-gray-200 dark:border-gray-700
        ${loading || isTransitioning ? 'opacity-60' : ''}
      `}
    >
      {/* 状态指示条 */}
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-lg ${statusColors[instance.status]}`} />
      
      <div className="p-6">
        {/* 头部：名称和状态 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {instance.name}
            </h3>
            {instance.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {instance.description}
              </p>
            )}
          </div>
          
          {/* 状态徽章 */}
          <div className="flex items-center gap-2 ml-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              isRunning ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
              isStopped ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${statusColors[instance.status]}`} />
              {statusTexts[instance.status]}
            </span>
          </div>
        </div>
        
        {/* 信息区域 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Server className="w-4 h-4 mr-2" />
            <span>{componentCount} 个组件</span>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">版本：</span>
            {instance.bot_version || 'N/A'}
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 col-span-2">
            <span className="font-medium">最后启动：</span>
            {formatLastRun(instance.last_run)}
          </div>
          
          {instance.run_time > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400 col-span-2">
              <span className="font-medium">累计运行：</span>
              {formatRunTime(instance.run_time)}
            </div>
          )}
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* 启动/停止按钮 - 固定显示，使用 loading 表示过渡状态 */}
          {isStopped || instance.status === 'error' ? (
            <button
              onClick={(e) => handleButtonClick(e, () => onStart(instance.id))}
              disabled={loading || isTransitioning}
              className="flex items-center justify-center gap-2 min-w-[100px] px-4 py-2 bg-green-600 text-white rounded-lg 
                       hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200 text-sm font-medium"
            >
              {loading || isTransitioning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>启动中</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>启动</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={(e) => handleButtonClick(e, () => onStop(instance.id))}
              disabled={loading || isTransitioning}
              className="flex items-center justify-center gap-2 min-w-[100px] px-4 py-2 bg-red-600 text-white rounded-lg 
                       hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200 text-sm font-medium"
            >
              {loading || isTransitioning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>停止中</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" />
                  <span>停止</span>
                </>
              )}
            </button>
          )}
          
          {/* 重启按钮 - 仅在运行时显示 */}
          {isRunning && (
            <button
              onClick={(e) => handleButtonClick(e, () => onRestart(instance.id))}
              disabled={loading || isTransitioning}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200 text-sm font-medium"
            >
              <RotateCw className={`w-4 h-4 ${loading || isTransitioning ? 'animate-spin' : ''}`} />
              重启
            </button>
          )}
          
          <div className="flex-1" />
          
          <button
            onClick={(e) => handleButtonClick(e, () => onDelete(instance.id))}
            disabled={loading || isRunning || isTransitioning}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg 
                     hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-200 text-sm font-medium"
            title={isRunning ? '请先停止实例再删除' : '删除实例'}
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
        </div>
      </div>
      
      {/* 加载遮罩 */}
      {(loading || isTransitioning) && (
        <div className="absolute inset-0 bg-black bg-opacity-5 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
    </div>
  );
};
