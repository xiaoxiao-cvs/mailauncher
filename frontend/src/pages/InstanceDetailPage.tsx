/**
 * 实例详情页面
 * 布局骨架 + 状态编排，UI 逻辑委托给子组件
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ComponentType } from '@/services/instanceApi';
import { ConfigModal } from '@/components/ConfigModal';
import { ScheduleModal } from '@/components/ScheduleModal';
import { VersionManagementSection } from '@/components/instances/VersionManagementSection';
import { VersionManagerModal } from '@/components/instances/VersionManagerModal';
import { InstanceHeader } from '@/components/instances/detail/InstanceHeader';
import { InstanceTerminalPanel } from '@/components/instances/detail/InstanceTerminalPanel';
import { InstanceControlBar } from '@/components/instances/detail/InstanceControlBar';
import { InstanceQuickActions } from '@/components/instances/detail/InstanceQuickActions';
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

  const { data: instance, isLoading } = useInstanceQuery(id, { refetchInterval: 10000 });

  const { data: maibotStatus } = useComponentStatusQuery(id, 'MaiBot', { refetchInterval: 10000 });
  const { data: napcatStatus } = useComponentStatusQuery(id, 'NapCat', { refetchInterval: 10000 });
  const { data: adapterStatus } = useComponentStatusQuery(id, 'MaiBot-Napcat-Adapter', { refetchInterval: 10000 });

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

  const getComponentStatus = (component: ComponentType) => {
    switch (component) {
      case 'MaiBot': return maibotStatus;
      case 'NapCat': return napcatStatus;
      case 'MaiBot-Napcat-Adapter': return adapterStatus;
      default: return undefined;
    }
  };

  // 入场动画
  const animatedRef = React.useRef<string | null>(null);
  const [shouldAnimate, setShouldAnimate] = React.useState(false);

  useEffect(() => {
    if (instance && id && !shouldAnimate) {
      setShouldAnimate(true);
    }
  }, [id, instance?.id, shouldAnimate]);

  useEffect(() => {
    if (!shouldAnimate || !id) return;
    if (animatedRef.current === id) return;
    animatedRef.current = id;

    const timer = setTimeout(() => {
      const fadeInElements = document.querySelectorAll('.animate-fade-in');
      if (fadeInElements.length > 0) {
        animate('.animate-fade-in', {
          opacity: [0, 1], translateY: [-10, 0],
          duration: 600, easing: 'easeOutExpo', delay: 100,
        });
      }
      const slideUpElements = document.querySelectorAll('.animate-slide-up');
      if (slideUpElements.length > 0) {
        animate('.animate-slide-up', {
          opacity: [0, 1], translateY: [20, 0],
          duration: 800, delay: utils.stagger(100, { start: 200 }),
          easing: 'easeOutExpo',
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [shouldAnimate, id]);

  // 自动切换启动目标
  useEffect(() => {
    if (!instance) return;
    const allComponents: ComponentType[] = instance.component_states?.length
      ? instance.component_states.map((state) => state.component)
      : ['MaiBot', 'NapCat', 'MaiBot-Napcat-Adapter'];

    if (selectedStartTarget !== 'all' &&
        getComponentStatus(selectedStartTarget as ComponentType)?.running) {
      const nextComponent = allComponents.find((comp) => !getComponentStatus(comp)?.running);
      setSelectedStartTarget(nextComponent ?? 'all');
    }
  }, [maibotStatus, napcatStatus, adapterStatus, instance]);

  if (!instance) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-muted-foreground">加载中...</p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">实例不存在</p>
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

  const handleStart = async (component?: ComponentType) => {
    setActionLoading('start');
    try {
      if (component) {
        await startComponentMutation.mutateAsync({ instanceId: instance.id, component });
      } else {
        await startInstanceMutation.mutateAsync(instance.id);
        setSelectedStartTarget('all');
      }
    } catch (error) {
      console.error('启动失败:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (component?: ComponentType) => {
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

  const handleRestart = async (component?: ComponentType) => {
    setActionLoading('restart');
    try {
      if (component) {
        await stopComponentMutation.mutateAsync({ instanceId: instance.id, component });
        await new Promise((resolve) => setTimeout(resolve, 1000));
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

  const availableComponents: ComponentType[] = instance.component_states?.length
    ? instance.component_states.map((state) => state.component)
    : ['MaiBot', 'NapCat', 'MaiBot-Napcat-Adapter'];

  const hasAnyComponentRunning = availableComponents.some((c) => getComponentStatus(c)?.running);
  const allComponentsRunning = availableComponents.every((c) => getComponentStatus(c)?.running);

  return (
    <div className="h-full flex flex-col p-6 gap-6 overflow-hidden">
      <InstanceHeader instance={instance} />

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        <div className="col-span-4 flex flex-col gap-6 overflow-y-auto scrollbar-thin pr-2 pb-2">
          <InstanceQuickActions
            onOpenConfig={() => setIsConfigModalOpen(true)}
            onOpenSchedule={() => setIsScheduleModalOpen(true)}
          />
          <VersionManagementSection instanceId={instance.id} />
        </div>

        <div className="col-span-8 flex flex-col gap-4 min-h-0 animate-slide-up opacity-0">
          <InstanceTerminalPanel
            instance={instance}
            selectedComponent={selectedComponent}
            onSelectComponent={setSelectedComponent}
            availableComponents={availableComponents}
            getComponentStatus={getComponentStatus}
          />
          <InstanceControlBar
            selectedComponent={selectedComponent}
            selectedStartTarget={selectedStartTarget}
            onSelectStartTarget={setSelectedStartTarget}
            actionLoading={actionLoading}
            allComponentsRunning={allComponentsRunning}
            hasAnyComponentRunning={hasAnyComponentRunning}
            getComponentStatus={getComponentStatus}
            onStart={handleStart}
            onStop={handleStop}
            onRestart={handleRestart}
          />
        </div>
      </div>

      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        instanceId={instance.id}
      />
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        instanceId={instance.id}
      />
      <VersionManagerModal
        isOpen={isVersionManagerOpen}
        onClose={() => setIsVersionManagerOpen(false)}
        instanceId={instance.id}
      />
    </div>
  );
};
