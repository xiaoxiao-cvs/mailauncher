/**
 * 实例详情页面
 * 显示实例的详细信息和终端
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInstanceStore } from '@/stores/instanceStore';
import { ComponentType, instanceApi } from '@/services/instanceApi';
import { TerminalComponent } from '@/components/terminal/TerminalComponent';
import { useSmartPolling } from '@/hooks/useSmartPolling';
import { ConfigModal } from '@/components/ConfigModal';
import {
  ArrowLeft,
  Play,
  Square,
  RotateCw,
  Activity,
  Clock,
  Server,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const InstanceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const {
    instances,
    selectedInstance,
    loading,
    fetchInstance,
    startInstance,
    stopInstance,
    restartInstance,
    startComponent,
    stopComponent,
    fetchComponentStatus,
    componentStatuses,
  } = useInstanceStore();
  
  const [selectedComponent, setSelectedComponent] = useState<ComponentType>('main');
  const [actionLoading, setActionLoading] = useState<'start' | 'stop' | 'restart' | null>(null);
  const [selectedStartTarget, setSelectedStartTarget] = useState<ComponentType | 'all'>('all');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  const instance = selectedInstance || instances.find((i) => i.id === id);
  
  // 加载实例数据并设置轮询
  useEffect(() => {
    if (id) {
      fetchInstance(id);
    }
  }, [id, fetchInstance]);
  
  // 实例数据轮询
  useSmartPolling(() => {
    if (id) fetchInstance(id);
  }, [id], { intervalMs: 10000, leading: false });
  
  // 加载组件列表
  const [components, setComponents] = useState<ComponentType[]>([]);
  useEffect(() => {
    if (!id || !instance) return;
    
    instanceApi.getInstanceComponents(id).then((comps) => {
      setComponents(comps);
      // 初始加载状态
      comps.forEach((component) => {
        fetchComponentStatus(id, component).catch(console.error);
      });
    }).catch(console.error);
  }, [id, instance]);
  
  // 组件状态轮询
  useSmartPolling(() => {
    if (id && components.length > 0) {
      components.forEach((component) => {
        fetchComponentStatus(id, component).catch(console.error);
      });
    }
  }, [id, components], { intervalMs: 10000, leading: false });
  
  // 自动更新 selectedStartTarget - 当当前选中的组件启动后，切换到下一个未启动的组件
  useEffect(() => {
    if (!instance) return;
    
    const components: ComponentType[] = ['main', 'napcat', 'napcat-ada'];
    const anyRunning = components.some(comp => getComponentStatus(comp)?.running);
    
    // 只在当前选中的组件已经在运行时才自动切换
    if (selectedStartTarget !== 'all' && 
        getComponentStatus(selectedStartTarget as ComponentType)?.running) {
      // 查找第一个未运行的组件
      const nextComponent = components.find(comp => !getComponentStatus(comp)?.running);
      
      if (nextComponent) {
        setSelectedStartTarget(nextComponent);
      } else {
        // 所有组件都在运行
        setSelectedStartTarget('all');
      }
    }
    
    // 如果没有任何组件运行，确保显示 'all'
    if (!anyRunning && selectedStartTarget !== 'all') {
      setSelectedStartTarget('all');
    }
  }, [componentStatuses, instance]);
  
  if (!instance) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">加载中...</p>
            </>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-4">实例不存在</p>
              <button
                onClick={() => navigate('/instances')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                返回列表
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
  
  // 获取组件状态
  const getComponentStatus = (component: ComponentType) => {
    return componentStatuses[instance.id]?.[component];
  };
  
  // 处理实例启动
  const handleStartInstance = async (component?: ComponentType) => {
    setActionLoading('start');
    try {
      await fetchInstance(instance.id);
      if (component) {
        // 启动单个组件
        await startComponent(instance.id, component);
        // 启动单个组件后不改变选择状态，保持启动按钮可见
      } else {
        // 启动所有组件
        await startInstance(instance.id);
        // 启动所有组件后重置选择
        setSelectedStartTarget('all');
      }
    } catch (error) {
      console.error('启动失败:', error);
    } finally {
      setActionLoading(null);
    }
  };
  
  // 处理实例停止
  const handleStopInstance = async (component?: ComponentType) => {
    setActionLoading('stop');
    try {
      await fetchInstance(instance.id);
      if (component) {
        await stopComponent(instance.id, component);
      } else {
        await stopInstance(instance.id);
      }
    } catch (error) {
      console.error('停止失败:', error);
    } finally {
      setActionLoading(null);
    }
  };
  
  // 处理实例重启
  const handleRestartInstance = async (component?: ComponentType) => {
    setActionLoading('restart');
    try {
      await fetchInstance(instance.id);
      if (component) {
        // 重启单个组件：先停止再启动
        await stopComponent(instance.id, component);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await startComponent(instance.id, component);
      } else {
        await restartInstance(instance.id);
      }
    } catch (error) {
      console.error('重启失败:', error);
    } finally {
      setActionLoading(null);
    }
  };
  
  // 格式化时间
  const formatTime = (dateString?: string) => {
    if (!dateString) return '从未运行';
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: zhCN,
      });
    } catch {
      return '未知';
    }
  };
  
  // 格式化运行时长
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0秒';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);
    
    return parts.join(' ');
  };
  
  const isRunning = instance.status === 'running';
  const isStopped = instance.status === 'stopped';
  
  // 检查是否有任何组件在运行
  const hasAnyComponentRunning = ['main', 'napcat', 'napcat-ada'].some(
    (comp) => componentStatuses[instance.id]?.[comp as ComponentType]?.running
  );
  
  // 检查是否所有组件都在运行
  const allComponentsRunning = ['main', 'napcat', 'napcat-ada'].every(
    (comp) => componentStatuses[instance.id]?.[comp as ComponentType]?.running
  );
  
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/instances')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {instance.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {instance.description || '无描述'}
              </p>
            </div>
            
            {/* 状态徽章 */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                isRunning
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : isStopped
                  ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}
            >
              {instance.status === 'running'
                ? '运行中'
                : instance.status === 'stopped'
                ? '已停止'
                : instance.status === 'starting'
                ? '启动中'
                : instance.status === 'stopping'
                ? '停止中'
                : '错误'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 启动按钮 - 只要有未启动的组件就显示 */}
            {!allComponentsRunning && (
              <div className="inline-flex divide-x divide-white/30 rounded-lg shadow-sm overflow-hidden">
              <Button
                onClick={async () => {
                  if (selectedStartTarget === 'all') {
                    await handleStartInstance();
                  } else {
                    await handleStartInstance(selectedStartTarget as ComponentType);
                  }
                }}
                disabled={actionLoading === 'start'}
                className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10
                         bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700
                         text-white font-medium gap-2"
              >
                {actionLoading === 'start' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {selectedStartTarget === 'all' 
                  ? '启动所有' 
                  : selectedStartTarget === 'main'
                  ? '启动 Maibot'
                  : selectedStartTarget === 'napcat'
                  ? '启动 NapCat'
                  : '启动 Ada'
                }
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10
                             bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    aria-label="选择组件"
                  >
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuRadioGroup
                    value={selectedStartTarget}
                    onValueChange={(value) => {
                      setSelectedStartTarget(value as ComponentType | 'all');
                    }}
                  >
                    {/* 只显示未运行的组件 */}
                    {!hasAnyComponentRunning && (
                      <DropdownMenuRadioItem value="all">
                        所有组件
                      </DropdownMenuRadioItem>
                    )}
                    {!getComponentStatus('main')?.running && (
                      <DropdownMenuRadioItem value="main">
                        Maibot 主程序
                      </DropdownMenuRadioItem>
                    )}
                    {!getComponentStatus('napcat')?.running && (
                      <DropdownMenuRadioItem value="napcat">
                        NapCat 服务
                      </DropdownMenuRadioItem>
                    )}
                    {!getComponentStatus('napcat-ada')?.running && (
                      <DropdownMenuRadioItem value="napcat-ada">
                        NapCat 适配器
                      </DropdownMenuRadioItem>
                    )}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            )}
            
            {/* 停止和重启按钮 - 仅当有组件运行时显示 */}
            {hasAnyComponentRunning && (
              <>
                <div className="inline-flex divide-x divide-white/30 rounded-lg shadow-sm overflow-hidden">
                  <Button
                    onClick={() => handleStopInstance()}
                    disabled={actionLoading === 'stop'}
                    className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10
                             bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700
                             text-white font-medium gap-2"
                  >
                    {actionLoading === 'stop' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    停止
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10
                                 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700"
                        aria-label="选择组件"
                      >
                        <ChevronDown className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleStopInstance()}>
                        所有组件
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStopInstance('main')}>
                        Maibot 主程序
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStopInstance('napcat')}>
                        NapCat 服务
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStopInstance('napcat-ada')}>
                        NapCat 适配器
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="inline-flex divide-x divide-white/30 rounded-lg shadow-sm overflow-hidden">
                  <Button
                    onClick={() => handleRestartInstance()}
                    disabled={actionLoading === 'restart'}
                    className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10
                             bg-gradient-to-r from-honolulu_blue-600 to-blue_green-600 hover:from-honolulu_blue-700 hover:to-blue_green-700
                             text-white font-medium gap-2"
                  >
                    {actionLoading === 'restart' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCw className="w-4 h-4" />
                    )}
                    重启
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10
                                 bg-gradient-to-r from-honolulu_blue-600 to-blue_green-600 hover:from-honolulu_blue-700 hover:to-blue_green-700"
                        aria-label="选择组件"
                      >
                        <ChevronDown className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleRestartInstance()}>
                        所有组件
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRestartInstance('main')}>
                        Maibot 主程序
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRestartInstance('napcat')}>
                        NapCat 服务
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRestartInstance('napcat-ada')}>
                        NapCat 适配器
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden flex">
        {/* 左侧信息面板 */}
        <div className="w-[45%] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* 统计信息卡片 */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl p-6 
                          border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
              <h3 className="text-lg font-bold text-federal_blue-500 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                实例统计
              </h3>
              
              <div className="space-y-4">
                {/* Maibot 版本 */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-uranian_blue-100 to-light_sky_blue-100 
                              dark:from-marian_blue-900/30 dark:to-honolulu_blue-900/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-honolulu_blue-500" />
                    <span className="text-sm font-medium text-federal_blue-600 dark:text-gray-300">
                      Maibot 版本
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-federal_blue-700 dark:text-white">
                    {instance.bot_version || '未知'}
                  </span>
                </div>
                
                {/* 运行时长 */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-uranian_blue-100 to-light_sky_blue-100 
                              dark:from-marian_blue-900/30 dark:to-honolulu_blue-900/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue_green-500" />
                    <span className="text-sm font-medium text-federal_blue-600 dark:text-gray-300">
                      累计运行时长
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-federal_blue-700 dark:text-white">
                    {formatDuration(instance.run_time)}
                  </span>
                </div>
                
                {/* 最后启动时间 */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-uranian_blue-100 to-light_sky_blue-100 
                              dark:from-marian_blue-900/30 dark:to-honolulu_blue-900/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-pacific_cyan-500" />
                    <span className="text-sm font-medium text-federal_blue-600 dark:text-gray-300">
                      最后启动
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-federal_blue-700 dark:text-white">
                    {formatTime(instance.last_run)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 配置管理卡片 */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl p-6 
                          border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
              <h3 className="text-lg font-bold text-federal_blue-500 dark:text-white mb-4 flex items-center gap-2">
                <Server className="w-5 h-5" />
                配置管理
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Bot 配置 */}
                <button
                  onClick={() => { setIsConfigModalOpen(true); }}
                  className="group p-4 bg-gradient-to-br from-honolulu_blue-50 to-blue_green-50 
                           dark:from-honolulu_blue-900/20 dark:to-blue_green-900/20 
                           hover:from-honolulu_blue-100 hover:to-blue_green-100
                           dark:hover:from-honolulu_blue-900/30 dark:hover:to-blue_green-900/30
                           rounded-lg border border-honolulu_blue-200/50 dark:border-honolulu_blue-700/50
                           transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Server className="w-5 h-5 text-honolulu_blue-600 dark:text-honolulu_blue-400" />
                    <div className="text-sm font-semibold text-federal_blue-600 dark:text-white">
                      Bot 配置
                    </div>
                  </div>
                </button>
                
                {/* 自动计划 */}
                <button
                  className="group p-4 bg-gradient-to-br from-pacific_cyan-50 to-vivid_sky_blue-50 
                           dark:from-pacific_cyan-900/20 dark:to-vivid_sky_blue-900/20 
                           hover:from-pacific_cyan-100 hover:to-vivid_sky_blue-100
                           dark:hover:from-pacific_cyan-900/30 dark:hover:to-vivid_sky_blue-900/30
                           rounded-lg border border-pacific_cyan-200/50 dark:border-pacific_cyan-700/50
                           transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Clock className="w-5 h-5 text-pacific_cyan-600 dark:text-pacific_cyan-400" />
                    <div className="text-sm font-semibold text-federal_blue-600 dark:text-white">
                      自动计划
                    </div>
                  </div>
                </button>
                
                {/* 日志查看 */}
                <button
                  className="group p-4 bg-gradient-to-br from-thistle-50 to-fairy_tale-50 
                           dark:from-thistle-900/20 dark:to-fairy_tale-900/20 
                           hover:from-thistle-100 hover:to-fairy_tale-100
                           dark:hover:from-thistle-900/30 dark:hover:to-fairy_tale-900/30
                           rounded-lg border border-thistle-200/50 dark:border-thistle-700/50
                           transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Activity className="w-5 h-5 text-thistle-600 dark:text-thistle-400" />
                    <div className="text-sm font-semibold text-federal_blue-600 dark:text-white">
                      日志查看
                    </div>
                  </div>
                </button>
                
                {/* 高级设置 */}
                <button
                  className="group p-4 bg-gradient-to-br from-carnation_pink-50 to-light_sky_blue-50 
                           dark:from-carnation_pink-900/20 dark:to-light_sky_blue-900/20 
                           hover:from-carnation_pink-100 hover:to-light_sky_blue-100
                           dark:hover:from-carnation_pink-900/30 dark:hover:to-light_sky_blue-900/30
                           rounded-lg border border-carnation_pink-200/50 dark:border-carnation_pink-700/50
                           transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex flex-col items-center gap-2">
                    <RotateCw className="w-5 h-5 text-carnation_pink-600 dark:text-carnation_pink-400" />
                    <div className="text-sm font-semibold text-federal_blue-600 dark:text-white">
                      高级设置
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* 右侧终端区域 */}
        <div className="flex-1 flex flex-col bg-white/50 dark:bg-gray-800/50 backdrop-blur-md">
          <Tabs 
            value={selectedComponent} 
            onValueChange={(value) => setSelectedComponent(value as ComponentType)}
            className="flex-1 flex flex-col"
          >
            {/* Tab 栏 */}
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 pt-3">
              <TabsList className="bg-transparent h-auto p-0 gap-1">
                <TabsTrigger 
                  value="main"
                  className="relative px-4 py-2 data-[state=active]:bg-white/80 dark:data-[state=active]:bg-gray-700/80 
                           data-[state=active]:shadow-sm rounded-t-lg border-b-2 border-transparent 
                           data-[state=active]:border-honolulu_blue-500 transition-all"
                >
                  <span className="flex items-center gap-2">
                    Maibot
                    <span 
                      className={`w-2 h-2 rounded-full transition-colors ${
                        getComponentStatus('main')?.running 
                          ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
                          : 'bg-gray-400'
                      }`}
                    />
                  </span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="napcat-ada"
                  className="relative px-4 py-2 data-[state=active]:bg-white/80 dark:data-[state=active]:bg-gray-700/80 
                           data-[state=active]:shadow-sm rounded-t-lg border-b-2 border-transparent 
                           data-[state=active]:border-honolulu_blue-500 transition-all"
                >
                  <span className="flex items-center gap-2">
                    ada
                    <span 
                      className={`w-2 h-2 rounded-full transition-colors ${
                        getComponentStatus('napcat-ada')?.running 
                          ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
                          : 'bg-gray-400'
                      }`}
                    />
                  </span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="napcat"
                  className="relative px-4 py-2 data-[state=active]:bg-white/80 dark:data-[state=active]:bg-gray-700/80 
                           data-[state=active]:shadow-sm rounded-t-lg border-b-2 border-transparent 
                           data-[state=active]:border-honolulu_blue-500 transition-all"
                >
                  <span className="flex items-center gap-2">
                    Napcat
                    <span 
                      className={`w-2 h-2 rounded-full transition-colors ${
                        getComponentStatus('napcat')?.running 
                          ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
                          : 'bg-gray-400'
                      }`}
                    />
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* 终端内容 */}
            <TabsContent value="main" className="flex-1 p-4 m-0">
              <TerminalComponent
                key={`${instance.id}-main`}
                instanceId={instance.id}
                component="main"
                className="h-full"
                isRunning={getComponentStatus('main')?.running === true}
              />
            </TabsContent>
            
            <TabsContent value="napcat-ada" className="flex-1 p-4 m-0">
              <TerminalComponent
                key={`${instance.id}-napcat-ada`}
                instanceId={instance.id}
                component="napcat-ada"
                className="h-full"
                isRunning={getComponentStatus('napcat-ada')?.running === true}
              />
            </TabsContent>
            
            <TabsContent value="napcat" className="flex-1 p-4 m-0">
              <TerminalComponent
                key={`${instance.id}-napcat`}
                instanceId={instance.id}
                component="napcat"
                className="h-full"
                isRunning={getComponentStatus('napcat')?.running === true}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 配置模态框 */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        instanceId={instance.id}
      />
    </div>
  );
};
