/**
 * 实例详情页面
 * 显示实例的详细信息和终端
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ComponentType } from '@/services/instanceApi';
import { TerminalComponent } from '@/components/terminal/TerminalComponent';
import { ConfigModal } from '@/components/ConfigModal';
import { ScheduleModal } from '@/components/ScheduleModal';
import { VersionManagementSection } from '@/components/instances/VersionManagementSection';
import { VersionManagerModal } from '@/components/instances/VersionManagerModal';
import {
  ArrowLeft,
  Play,
  Square,
  RotateCw,
  Clock,
  Server,
  ChevronDown,
  Loader2,
  FileText,
} from 'lucide-react';
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
import { animate, utils } from 'animejs';
import {
  useInstanceQuery,
  useComponentStatusQuery,
  useStartInstanceMutation,
  useStopInstanceMutation,
  useRestartInstanceMutation,
  useStartComponentMutation,
  useStopComponentMutation,
} from '@/hooks/queries/useInstanceQueries';

export const InstanceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // 使用 React Query hooks
  const { data: instance, isLoading } = useInstanceQuery(id, { refetchInterval: 10000 });
  
  // 组件状态查询
  const { data: maibotStatus } = useComponentStatusQuery(id, 'MaiBot', { refetchInterval: 10000 });
  const { data: napcatStatus } = useComponentStatusQuery(id, 'NapCat', { refetchInterval: 10000 });
  const { data: adapterStatus } = useComponentStatusQuery(id, 'MaiBot-Napcat-Adapter', { refetchInterval: 10000 });
  
  // Mutations
  const startInstanceMutation = useStartInstanceMutation();
  const stopInstanceMutation = useStopInstanceMutation();
  const restartInstanceMutation = useRestartInstanceMutation();
  const startComponentMutation = useStartComponentMutation();
  const stopComponentMutation = useStopComponentMutation();
  
  const [selectedComponent, setSelectedComponent] = useState<ComponentType>('MaiBot');
  const [actionLoading, setActionLoading] = useState<'start' | 'stop' | 'restart' | null>(null);
  const [selectedStartTarget, setSelectedStartTarget] = useState<ComponentType | 'all'>('all');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isVersionManagerOpen, setIsVersionManagerOpen] = useState(false);

  // 获取组件状态的辅助函数
  const getComponentStatus = (component: ComponentType) => {
    switch (component) {
      case 'MaiBot':
        return maibotStatus;
      case 'NapCat':
        return napcatStatus;
      case 'MaiBot-Napcat-Adapter':
        return adapterStatus;
      default:
        return undefined;
    }
  };
  
  // Animation effect - 只在 ID 改变且实例存在时执行动画
  const animatedRef = React.useRef<string | null>(null);
  const [shouldAnimate, setShouldAnimate] = React.useState(false);
  
  // 当实例加载完成后，触发动画标记
  useEffect(() => {
    if (instance && id && !shouldAnimate) {
      setShouldAnimate(true);
    }
  }, [id, instance?.id, shouldAnimate]);
  
  // 实际执行动画
  useEffect(() => {
    if (!shouldAnimate || !id) return;
    
    // 如果已经为当前实例执行过动画，跳过
    if (animatedRef.current === id) return;
    
    animatedRef.current = id;
    
    // 延迟执行动画,确保 DOM 已经渲染
    const timer = setTimeout(() => {
      // 检查元素是否存在再执行动画
      const fadeInElements = document.querySelectorAll('.animate-fade-in');
      if (fadeInElements.length > 0) {
        animate('.animate-fade-in', {
          opacity: [0, 1],
          translateY: [-10, 0],
          duration: 600,
          easing: 'easeOutExpo',
          delay: 100
        });
      }

      const slideUpElements = document.querySelectorAll('.animate-slide-up');
      if (slideUpElements.length > 0) {
        animate('.animate-slide-up', {
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 800,
          delay: utils.stagger(100, {start: 200}),
          easing: 'easeOutExpo'
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [shouldAnimate, id]); // 依赖动画触发标记和 id
  
  // 自动更新 selectedStartTarget - 当当前选中的组件启动后，切换到下一个未启动的组件
  useEffect(() => {
    if (!instance) return;
    
    const allComponents: ComponentType[] = ['MaiBot', 'NapCat', 'MaiBot-Napcat-Adapter'];
    const anyRunning = allComponents.some(comp => getComponentStatus(comp)?.running);
    
    // 只在当前选中的组件已经在运行时才自动切换
    if (selectedStartTarget !== 'all' && 
        getComponentStatus(selectedStartTarget as ComponentType)?.running) {
      // 查找第一个未运行的组件
      const nextComponent = allComponents.find(comp => !getComponentStatus(comp)?.running);
      
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
  }, [maibotStatus, napcatStatus, adapterStatus, instance, selectedStartTarget]);
  
  if (!instance) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          {isLoading ? (
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
  
  // 处理实例启动
  const handleStartInstance = async (component?: ComponentType) => {
    setActionLoading('start');
    try {
      if (component) {
        // 启动单个组件
        await startComponentMutation.mutateAsync({ instanceId: instance.id, component });
        // 启动单个组件后不改变选择状态，保持启动按钮可见
      } else {
        // 启动所有组件
        await startInstanceMutation.mutateAsync(instance.id);
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
      if (component) {
        await stopComponentMutation.mutateAsync({ instanceId: instance.id, component });
      } else {
        await stopInstanceMutation.mutateAsync(instance.id);
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
      if (component) {
        // 重启单个组件：先停止再启动
        await stopComponentMutation.mutateAsync({ instanceId: instance.id, component });
        await new Promise(resolve => setTimeout(resolve, 1000));
        await startComponentMutation.mutateAsync({ instanceId: instance.id, component });
      } else {
        await restartInstanceMutation.mutateAsync(instance.id);
      }
    } catch (error) {
      console.error('重启失败:', error);
    } finally {
      setActionLoading(null);
    }
  };
  
  const isRunning = instance.status === 'running';
  const isStopped = instance.status === 'stopped';
  
  // 检查是否有任何组件在运行
  const hasAnyComponentRunning = ['MaiBot', 'NapCat', 'MaiBot-Napcat-Adapter'].some(
    (comp) => getComponentStatus(comp as ComponentType)?.running
  );
  
  // 检查是否所有组件都在运行
  const allComponentsRunning = ['MaiBot', 'NapCat', 'MaiBot-Napcat-Adapter'].every(
    (comp) => getComponentStatus(comp as ComponentType)?.running
  );
  
  return (
    <div className="h-full flex flex-col p-6 gap-6 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/instances')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-white/20 dark:border-gray-700/30 shadow-sm hover:scale-105 transition-transform duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {instance.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                isStopped ? 'bg-gray-400' : 'bg-yellow-500'
              }`} />
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {instance.description || '无描述'}
              </p>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`px-4 py-1.5 rounded-full text-sm font-semibold backdrop-blur-md border shadow-sm ${
          isRunning
            ? 'bg-green-500/10 text-green-600 border-green-200/50 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30'
            : isStopped
            ? 'bg-gray-200/50 text-gray-600 border-gray-200/50 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600/30'
            : 'bg-yellow-500/10 text-yellow-600 border-yellow-200/50 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30'
        }`}>
          {instance.status === 'running' ? '运行中' : 
           instance.status === 'stopped' ? '已停止' : 
           instance.status === 'starting' ? '启动中' : 
           instance.status === 'stopping' ? '停止中' : '错误'}
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Left Panel: Stats & Actions */}
        <div className="col-span-4 flex flex-col gap-6 overflow-y-auto scrollbar-thin pr-2 pb-2">
          {/* Quick Actions */}
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl p-6 border border-white/40 dark:border-gray-700/40 shadow-sm animate-slide-up opacity-0">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-500" />
              快捷操作
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setIsConfigModalOpen(true)}
                className="flex flex-col items-center justify-center p-4 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/20 rounded-2xl border border-blue-100/50 dark:border-blue-800/30 transition-all duration-200 hover:scale-[1.02] active:scale-95"
              >
                <Server className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">配置</span>
              </button>
              <button 
                onClick={() => setIsScheduleModalOpen(true)}
                className="flex flex-col items-center justify-center p-4 bg-purple-50/50 dark:bg-purple-900/10 hover:bg-purple-100/50 dark:hover:bg-purple-900/20 rounded-2xl border border-purple-100/50 dark:border-purple-800/30 transition-all duration-200 hover:scale-[1.02] active:scale-95"
              >
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">计划</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-100/50 dark:hover:bg-orange-900/20 rounded-2xl border border-orange-100/50 dark:border-orange-800/30 transition-all duration-200 hover:scale-[1.02] active:scale-95">
                <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400 mb-2" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">日志</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 bg-gray-50/50 dark:bg-gray-700/10 hover:bg-gray-100/50 dark:hover:bg-gray-700/20 rounded-2xl border border-gray-100/50 dark:border-gray-600/30 transition-all duration-200 hover:scale-[1.02] active:scale-95">
                <RotateCw className="w-6 h-6 text-gray-600 dark:text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">更多</span>
              </button>
            </div>
          </div>

          {/* Component Versions */}
          <VersionManagementSection instanceId={instance.id} />
        </div>

        {/* Right Panel: Terminal & Controls */}
        <div className="col-span-8 flex flex-col gap-4 min-h-0 animate-slide-up opacity-0">
          {/* Terminal Window */}
          <div className="flex-1 bg-[#1e1e1e] dark:bg-[#000000] rounded-3xl shadow-lg border border-gray-800/50 overflow-hidden flex flex-col">
            {/* Terminal Header / Tabs */}
            <div className="flex items-center px-4 py-3 bg-[#252526] dark:bg-[#111111] border-b border-gray-800">
              <div className="flex gap-2 mr-4">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              
              <Tabs 
                value={selectedComponent} 
                onValueChange={(value) => setSelectedComponent(value as ComponentType)}
                className="flex-1"
              >
                <TabsList className="bg-transparent h-auto p-0 gap-2">
                  {['MaiBot', 'NapCat', 'MaiBot-Napcat-Adapter'].map((comp) => (
                    <TabsTrigger 
                      key={comp}
                      value={comp}
                      className="relative px-3 py-1 text-xs font-medium text-gray-400 data-[state=active]:text-white data-[state=active]:bg-gray-700/50 rounded-md transition-all"
                    >
                      <span className="flex items-center gap-2">
                        {comp === 'MaiBot' ? 'MaiBot' : comp === 'NapCat' ? 'NapCat' : 'Adapter'}
                        <span 
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            getComponentStatus(comp as ComponentType)?.running 
                              ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]' 
                              : 'bg-gray-600'
                          }`}
                        />
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Terminal Content */}
            <div className="flex-1 relative">
              <Tabs value={selectedComponent} className="h-full">
                <TabsContent value="MaiBot" className="h-full m-0">
                  <TerminalComponent
                    key={`${instance.id}-MaiBot`}
                    instanceId={instance.id}
                    component="MaiBot"
                    className="h-full"
                    isRunning={getComponentStatus('MaiBot')?.running === true}
                  />
                </TabsContent>
                <TabsContent value="NapCat" className="h-full m-0">
                  <TerminalComponent
                    key={`${instance.id}-NapCat`}
                    instanceId={instance.id}
                    component="NapCat"
                    className="h-full"
                    isRunning={getComponentStatus('NapCat')?.running === true}
                  />
                </TabsContent>
                <TabsContent value="MaiBot-Napcat-Adapter" className="h-full m-0">
                  <TerminalComponent
                    key={`${instance.id}-MaiBot-Napcat-Adapter`}
                    instanceId={instance.id}
                    component="MaiBot-Napcat-Adapter"
                    className="h-full"
                    isRunning={getComponentStatus('MaiBot-Napcat-Adapter')?.running === true}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Control Bar */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-3 border border-white/40 dark:border-gray-700/40 shadow-sm flex items-center justify-between">
             <div className="flex items-center gap-2">
                {/* Start Button Group */}
                {!allComponentsRunning && (
                  <div className="flex items-center bg-green-500/10 rounded-xl p-1 border border-green-500/20">
                    <Button
                      onClick={async () => {
                        if (selectedStartTarget === 'all') {
                          await handleStartInstance();
                        } else {
                          await handleStartInstance(selectedStartTarget as ComponentType);
                        }
                      }}
                      disabled={actionLoading === 'start'}
                      className="bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm h-9 px-4"
                    >
                      {actionLoading === 'start' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-2 fill-current" />}
                      {selectedStartTarget === 'all' ? '启动所有' : 
                       selectedStartTarget === 'MaiBot' ? '启动 MaiBot' : 
                       selectedStartTarget === 'NapCat' ? '启动 NapCat' : 
                       selectedStartTarget === 'MaiBot-Napcat-Adapter' ? '启动 Adapter' : '启动'}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-8 text-green-600 hover:bg-green-500/20 rounded-lg ml-1">
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuRadioGroup value={selectedStartTarget} onValueChange={(v) => setSelectedStartTarget(v as any)}>
                          {!hasAnyComponentRunning && <DropdownMenuRadioItem value="all">所有组件</DropdownMenuRadioItem>}
                          {!getComponentStatus('MaiBot')?.running && <DropdownMenuRadioItem value="MaiBot">MaiBot</DropdownMenuRadioItem>}
                          {!getComponentStatus('NapCat')?.running && <DropdownMenuRadioItem value="NapCat">NapCat</DropdownMenuRadioItem>}
                          {!getComponentStatus('MaiBot-Napcat-Adapter')?.running && <DropdownMenuRadioItem value="MaiBot-Napcat-Adapter">Adapter</DropdownMenuRadioItem>}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* Stop/Restart Group */}
                {hasAnyComponentRunning && (
                  <>
                    <div className="flex items-center bg-red-500/10 rounded-xl p-1 border border-red-500/20">
                      <Button
                        onClick={() => handleStopInstance()}
                        disabled={actionLoading === 'stop'}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm h-9 px-4"
                      >
                        {actionLoading === 'stop' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 mr-2 fill-current" />}
                        停止
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-8 text-red-600 hover:bg-red-500/20 rounded-lg ml-1">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStopInstance()}>所有组件</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStopInstance('MaiBot')}>MaiBot</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStopInstance('NapCat')}>NapCat</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStopInstance('MaiBot-Napcat-Adapter')}>Adapter</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center bg-blue-500/10 rounded-xl p-1 border border-blue-500/20">
                      <Button
                        onClick={() => handleRestartInstance()}
                        disabled={actionLoading === 'restart'}
                        className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm h-9 px-4"
                      >
                        {actionLoading === 'restart' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4 mr-2" />}
                        重启
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-8 text-blue-600 hover:bg-blue-500/20 rounded-lg ml-1">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRestartInstance()}>所有组件</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRestartInstance('MaiBot')}>MaiBot</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRestartInstance('NapCat')}>NapCat</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRestartInstance('MaiBot-Napcat-Adapter')}>Adapter</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </>
                )}
             </div>
             
             <div className="text-xs text-gray-400 font-medium px-2">
                {selectedComponent === 'MaiBot' ? 'MaiBot Console' : selectedComponent === 'NapCat' ? 'NapCat Console' : 'Adapter Console'}
             </div>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        instanceId={instance.id}
      />

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        instanceId={instance.id}
      />

      {/* Version Manager Modal */}
      <VersionManagerModal
        isOpen={isVersionManagerOpen}
        onClose={() => setIsVersionManagerOpen(false)}
        instanceId={instance.id}
      />
    </div>
  );
};
