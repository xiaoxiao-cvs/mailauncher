/**
 * 实例详情页面
 * 显示实例的详细信息和终端
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ComponentType, InstanceComponentState, InstanceStatus, RuntimeProbeResult, RuntimeProfile, instanceApi } from '@/services/instanceApi';
import { TerminalComponent } from '@/components/terminal/TerminalComponent';
import { ConfigModal } from '@/components/ConfigModal';
import { ScheduleModal } from '@/components/ScheduleModal';
import { VersionManagementSection } from '@/components/instances/VersionManagementSection';
import { VersionManagerModal } from '@/components/instances/VersionManagerModal';
import { toast } from 'sonner';
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
  Save,
  Radar,
  ShieldCheck,
  AlertTriangle,
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

type RuntimeCapabilityState = 'ready' | 'warning' | 'blocked';

interface RuntimeCapabilityCard {
  key: string;
  title: string;
  detail: string;
  action: string;
  state: RuntimeCapabilityState;
}

function buildComponentRuntimeCard(state: InstanceComponentState): RuntimeCapabilityCard {
  if (!state.running) {
    return {
      key: `${state.component}-idle`,
      title: state.component,
      state: 'blocked',
      detail: '组件当前未运行，终端链路和外部接管能力都未激活。',
      action: '先启动组件，再检查会话和运行态能力。',
    };
  }

  if (state.externally_managed && state.terminal_reconnectable) {
    return {
      key: `${state.component}-external-reconnectable`,
      title: state.component,
      state: 'ready',
      detail: '组件当前通过外部会话接管，并已确认存在可重连终端。',
      action: '可以直接读取历史、写入输入并在刷新后重新接管会话。',
    };
  }

  if (state.externally_managed) {
    return {
      key: `${state.component}-external-readonly`,
      title: state.component,
      state: 'warning',
      detail: '组件当前仅以外部进程形式被探测到，缺少可重连终端会话。',
      action: '当前可以探测状态并停止进程，但无法安全重连终端。',
    };
  }

  return {
    key: `${state.component}-managed`,
    title: state.component,
    state: 'ready',
    detail: '组件由当前应用直接托管，终端交互和窗口 resize 可用。',
    action: '当前终端由启动器控制，适合直接调试和查看实时输出。',
  };
}

const capabilityStateClassName: Record<RuntimeCapabilityState, string> = {
  ready: 'border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300',
  warning: 'border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200',
  blocked: 'border-rose-200/70 bg-rose-50/70 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300',
};

function buildRuntimeCapabilityCards(
  runtimeDraft: RuntimeProfile,
  runtimeProbe: RuntimeProbeResult,
): RuntimeCapabilityCard[] {
  const issueMap = new Map(runtimeProbe.issues.map((issue) => [issue.code, issue]));
  const hasIssue = (...codes: string[]) => codes.some((code) => issueMap.has(code));

  const configState: RuntimeCapabilityState = hasIssue(
    'wsl_distribution_missing',
    'wsl_distribution_not_found',
    'wsl_workspace_missing',
  )
    ? 'blocked'
    : 'ready';

  const workspaceState: RuntimeCapabilityState = hasIssue('wsl_workspace_not_found')
    ? 'blocked'
    : 'ready';

  const reconnectState: RuntimeCapabilityState = hasIssue('wsl_tmux_missing')
    ? 'warning'
    : hasIssue('wsl_distribution_not_found')
      ? 'blocked'
      : 'ready';

  const attachState: RuntimeCapabilityState = hasIssue('wsl_distribution_not_found')
    ? 'blocked'
    : 'ready';

  return [
    {
      key: 'config',
      title: '配置完整性',
      state: configState,
      detail: configState === 'blocked'
        ? '当前 runtime_profile 仍缺少关键入口字段，保存前需要补全。'
        : runtimeDraft.kind === 'local'
          ? '本地运行时使用宿主机工作区与本地 Python 解析链路。'
          : `WSL2 入口已指向 ${runtimeDraft.distribution || '目标发行版'}。`,
      action: configState === 'blocked'
        ? runtimeDraft.kind === 'wsl2'
          ? '选择发行版并填写 guest 工作区。'
          : '补全本地 Python 或工作区设置。'
        : '当前可以继续保存并执行运行态刷新。',
    },
    {
      key: 'workspace',
      title: '工作区可达性',
      state: workspaceState,
      detail: workspaceState === 'blocked'
        ? 'guest 工作区当前不可达，冷启动恢复和命令分发都会失败。'
        : 'guest 工作区可以被解析，实例命令能够落到正确目录。',
      action: hasIssue('wsl_workspace_not_found')
        ? '检查 guest 路径是否与实例目录一致。'
        : '当前可以执行手动刷新或冷启动恢复。',
    },
    {
      key: 'reconnect',
      title: '终端重连',
      state: reconnectState,
      detail: reconnectState === 'ready'
        ? '新启动会话会优先挂到 tmux，支持历史回放、输入写入和窗口 resize。'
        : reconnectState === 'warning'
          ? '实例仍可启动，但缺少 tmux 时无法提供跨应用重连终端。'
          : '当前运行时还不具备稳定的会话重连前提。',
      action: hasIssue('wsl_tmux_missing')
        ? '在 guest 环境安装 tmux 后重新校验。'
        : '当前可以直接使用可重连终端链路。',
    },
    {
      key: 'attach',
      title: '外部进程接管',
      state: attachState,
      detail: attachState === 'blocked'
        ? '当前无法稳定探测 guest 进程，外部接管链路不可用。'
        : '冷启动后可以重发现 guest 进程，并将其同步进实例运行态。',
      action: attachState === 'ready'
        ? '适合配合手动刷新运行态，重建实例状态投影。'
        : '先修复入口环境，再进行冷启动恢复。',
    },
  ];
}

export const InstanceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // 使用 React Query hooks
  const { data: instance, isLoading, refetch: refetchInstance } = useInstanceQuery(id, { refetchInterval: 10000 });
  
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
  const [runtimeDraft, setRuntimeDraft] = useState<RuntimeProfile | null>(null);
  const [wslDistributions, setWslDistributions] = useState<Array<{ name: string; state: string; version: number; is_default: boolean }>>([]);
  const [loadingWsl, setLoadingWsl] = useState(false);
  const [savingRuntime, setSavingRuntime] = useState(false);
  const [refreshingRuntime, setRefreshingRuntime] = useState(false);
  const [probingRuntime, setProbingRuntime] = useState(false);
  const [runtimeProbe, setRuntimeProbe] = useState<RuntimeProbeResult | null>(null);

  const statusLabel = (status: InstanceStatus) => {
    switch (status) {
      case 'pending':
        return '待命中';
      case 'starting':
        return '启动中';
      case 'running':
        return '运行中';
      case 'partial':
        return '部分运行';
      case 'stopping':
        return '停止中';
      case 'failed':
        return '失败';
      case 'unknown':
        return '未知';
      default:
        return '已停止';
    }
  };

  const runtimeKindLabel = instance?.runtime_profile.kind === 'wsl2'
    ? 'WSL2'
    : 'Local';
  const runtimeCapabilityCards = runtimeDraft && runtimeProbe
    ? buildRuntimeCapabilityCards(runtimeDraft, runtimeProbe)
    : [];

  useEffect(() => {
    if (instance?.runtime_profile) {
      setRuntimeDraft(instance.runtime_profile);
      setRuntimeProbe(null);
    }
  }, [instance?.id, instance?.runtime_profile]);

  useEffect(() => {
    let cancelled = false;

    const loadWslDistributions = async () => {
      setLoadingWsl(true);
      try {
        const distributions = await instanceApi.listWslDistributions();
        if (!cancelled) {
          setWslDistributions(distributions);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('获取 WSL 发行版失败:', error);
          setWslDistributions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingWsl(false);
        }
      }
    };

    loadWslDistributions();

    return () => {
      cancelled = true;
    };
  }, []);

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
    
    const allComponents: ComponentType[] = instance.component_states?.length
      ? instance.component_states.map((state) => state.component)
      : ['MaiBot', 'NapCat', 'MaiBot-Napcat-Adapter'];
    
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
    
    // 注意：不再强制重置为 'all'，允许用户自由选择单个组件启动
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

  const handleRuntimeFieldChange = <K extends keyof RuntimeProfile>(key: K, value: RuntimeProfile[K]) => {
    setRuntimeProbe(null);
    setRuntimeDraft((current) => {
      if (!current) return current;

      if (key === 'kind' && value === 'local') {
        return {
          ...current,
          kind: value,
          guest_os: null,
          guest_workspace_root: null,
          distribution: null,
          user: null,
          path_mapping: 'native',
        };
      }

      if (key === 'kind' && value === 'wsl2') {
        return {
          ...current,
          kind: value,
          guest_os: 'linux',
          path_mapping: 'explicit',
          guest_workspace_root: current.guest_workspace_root || `/home/${current.user || 'mai'}/mailauncher-instances/${current.workspace_root}`,
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
  };

  const handleProbeRuntimeProfile = async () => {
    if (!runtimeDraft) return null;

    setProbingRuntime(true);
    try {
      const result = await instanceApi.validateRuntimeProfile(runtimeDraft);
      setRuntimeProbe(result);

      if (result.ok) {
        toast.success('运行时配置校验通过');
      } else {
        const errorCount = result.issues.filter((issue) => issue.severity === 'error').length;
        const warningCount = result.issues.filter((issue) => issue.severity === 'warning').length;
        toast.error(`运行时校验发现 ${errorCount} 个错误，${warningCount} 个警告`);
      }

      return result;
    } catch (error) {
      console.error('校验运行时配置失败:', error);
      toast.error('校验运行时配置失败');
      return null;
    } finally {
      setProbingRuntime(false);
    }
  };

  const handleSaveRuntimeProfile = async () => {
    if (!instance || !runtimeDraft) return;

    setSavingRuntime(true);
    try {
      const probe = await handleProbeRuntimeProfile();
      if (!probe || !probe.ok) {
        return;
      }

      await instanceApi.setInstanceRuntimeProfile(instance.id, runtimeDraft);
      await refetchInstance();
      toast.success('运行时配置已保存');
    } catch (error) {
      console.error('保存运行时配置失败:', error);
      toast.error('保存运行时配置失败');
    } finally {
      setSavingRuntime(false);
    }
  };

  const handleRefreshRuntimeState = async () => {
    if (!instance) return;

    setRefreshingRuntime(true);
    try {
      await instanceApi.refreshInstanceRuntimeState(instance.id);
      await refetchInstance();
      toast.success('运行态已刷新');
    } catch (error) {
      console.error('刷新运行态失败:', error);
      toast.error('刷新运行态失败');
    } finally {
      setRefreshingRuntime(false);
    }
  };
  
  const isStopped = instance.status === 'stopped';
  const availableComponents: ComponentType[] = instance.component_states?.length
    ? instance.component_states.map((state) => state.component)
    : ['MaiBot', 'NapCat', 'MaiBot-Napcat-Adapter'];
  const componentRuntimeCards = availableComponents
    .map((component) => getComponentStatus(component) ?? instance.component_states.find((state) => state.component === component))
    .filter((state): state is InstanceComponentState => Boolean(state))
    .map((state) => buildComponentRuntimeCard(state));
  
  // 检查是否有任何组件在运行
  const hasAnyComponentRunning = availableComponents.some(
    (comp) => getComponentStatus(comp as ComponentType)?.running
  );
  
  // 检查是否所有组件都在运行
  const allComponentsRunning = availableComponents.every(
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
            <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {instance.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${
                (instance.status === 'running' || instance.status === 'partial') ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                isStopped ? 'bg-gray-400' : 'bg-yellow-500'
              }`} />
              <p className="text-sm text-muted-foreground font-medium">
                {instance.description || '无描述'}
              </p>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wide">
                {runtimeKindLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`px-4 py-1.5 rounded-full text-sm font-semibold backdrop-blur-md border shadow-sm ${
          (instance.status === 'running' || instance.status === 'partial')
            ? 'bg-green-500/10 text-green-600 border-green-200/50 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30'
            : isStopped
            ? 'bg-gray-200/50 text-gray-600 border-gray-200/50 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600/30'
            : 'bg-yellow-500/10 text-yellow-600 border-yellow-200/50 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30'
        }`}>
          {statusLabel(instance.status)}
        </div>
      </header>

      {instance.last_error && (
        <div className="rounded-2xl border border-red-200/60 bg-red-50/70 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <div className="font-semibold">最近错误</div>
          <div className="mt-1 break-all">{instance.last_error}</div>
          {instance.last_status_reason && <div className="mt-1 text-xs opacity-80">{instance.last_status_reason}</div>}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Left Panel: Stats & Actions */}
        <div className="col-span-4 flex flex-col gap-6 overflow-y-auto scrollbar-thin pr-2 pb-2">
          {runtimeDraft && (
            <div className="bg-card backdrop-blur-xl rounded-3xl p-6 border border-border shadow-sm animate-slide-up opacity-0">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">运行时</h3>
                  <p className="text-sm text-muted-foreground">实例级 runtime_profile 与 WSL2 入口</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleProbeRuntimeProfile} disabled={probingRuntime || savingRuntime} variant="outline" className="gap-2 rounded-full">
                    {probingRuntime ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    校验配置
                  </Button>
                  <Button onClick={handleRefreshRuntimeState} disabled={refreshingRuntime} variant="outline" className="gap-2 rounded-full">
                    {refreshingRuntime ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
                    刷新运行态
                  </Button>
                  <Button onClick={handleSaveRuntimeProfile} disabled={savingRuntime} className="gap-2 rounded-full">
                    {savingRuntime ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    保存
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm">
                <label className="space-y-1">
                  <span className="text-muted-foreground">运行时类型</span>
                  <select
                    value={runtimeDraft.kind}
                    onChange={(event) => handleRuntimeFieldChange('kind', event.target.value as RuntimeProfile['kind'])}
                    className="w-full rounded-2xl border border-border bg-white/70 px-3 py-2 dark:bg-gray-900/60"
                  >
                    <option value="local">Local</option>
                    <option value="wsl2">WSL2</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-muted-foreground">工作区根目录</span>
                  <input
                    value={runtimeDraft.workspace_root}
                    onChange={(event) => handleRuntimeFieldChange('workspace_root', event.target.value)}
                    className="w-full rounded-2xl border border-border bg-white/70 px-3 py-2 dark:bg-gray-900/60"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-muted-foreground">Python 路径</span>
                  <input
                    value={runtimeDraft.python.path || ''}
                    onChange={(event) => setRuntimeDraft((current) => current ? {
                      ...current,
                      python: { ...current.python, path: event.target.value || null },
                    } : current)}
                    placeholder={runtimeDraft.kind === 'wsl2' ? 'python3' : '留空则优先使用 .venv'}
                    className="w-full rounded-2xl border border-border bg-white/70 px-3 py-2 dark:bg-gray-900/60"
                  />
                </label>

                {runtimeDraft.kind === 'wsl2' && (
                  <>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">WSL 发行版</span>
                      <select
                        value={runtimeDraft.distribution || ''}
                        onChange={(event) => handleRuntimeFieldChange('distribution', event.target.value || null)}
                        className="w-full rounded-2xl border border-border bg-white/70 px-3 py-2 dark:bg-gray-900/60"
                      >
                        <option value="">{loadingWsl ? '加载中...' : '请选择发行版'}</option>
                        {wslDistributions.map((distribution) => (
                          <option key={distribution.name} value={distribution.name}>
                            {distribution.name} ({distribution.state}, WSL{distribution.version})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-muted-foreground">Guest 用户</span>
                      <input
                        value={runtimeDraft.user || ''}
                        onChange={(event) => handleRuntimeFieldChange('user', event.target.value || null)}
                        placeholder="例如 mai"
                        className="w-full rounded-2xl border border-border bg-white/70 px-3 py-2 dark:bg-gray-900/60"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-muted-foreground">Guest 工作区</span>
                      <input
                        value={runtimeDraft.guest_workspace_root || ''}
                        onChange={(event) => handleRuntimeFieldChange('guest_workspace_root', event.target.value || null)}
                        placeholder="/home/user/mailauncher-instances/demo"
                        className="w-full rounded-2xl border border-border bg-white/70 px-3 py-2 dark:bg-gray-900/60"
                      />
                    </label>
                  </>
                )}

                {runtimeProbe && (
                  <div className={`rounded-2xl border px-4 py-3 ${runtimeProbe.ok
                    ? 'border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
                    : 'border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
                  }`}>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {runtimeProbe.ok ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      {runtimeProbe.ok ? '运行时校验通过' : '运行时校验发现问题'}
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      {runtimeCapabilityCards.map((card) => (
                        <div key={card.key} className={`rounded-2xl border px-3 py-3 ${capabilityStateClassName[card.state]}`}>
                          <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide">
                            <span>{card.title}</span>
                            <span>{card.state === 'ready' ? 'Ready' : card.state === 'warning' ? 'Warning' : 'Blocked'}</span>
                          </div>
                          <div className="mt-1 text-sm font-medium">{card.detail}</div>
                          <div className="mt-1 text-xs opacity-80">{card.action}</div>
                        </div>
                      ))}
                    </div>
                    {componentRuntimeCards.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {componentRuntimeCards.map((card) => (
                          <div key={card.key} className={`rounded-2xl border px-3 py-3 ${capabilityStateClassName[card.state]}`}>
                            <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide">
                              <span>{card.title}</span>
                              <span>Runtime</span>
                            </div>
                            <div className="mt-1 text-sm font-medium">{card.detail}</div>
                            <div className="mt-1 text-xs opacity-80">{card.action}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {runtimeProbe.issues.length > 0 && (
                      <div className="mt-2 space-y-2 text-xs leading-5">
                        {runtimeProbe.issues.map((issue) => (
                          <div key={issue.code} className="rounded-xl bg-white/50 px-3 py-2 dark:bg-black/10">
                            <span className="mr-2 font-semibold uppercase">{issue.severity}</span>
                            {issue.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-card backdrop-blur-xl rounded-3xl p-6 border border-border shadow-sm animate-slide-up opacity-0">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-500" />
              快捷操作
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setIsConfigModalOpen(true)}
                className="flex flex-col items-center justify-center p-4 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/20 rounded-2xl border border-blue-100/50 dark:border-blue-800/30 transition-all duration-200 hover:scale-[1.02] active:scale-95"
              >
                <Server className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
                <span className="text-sm font-medium text-muted-foreground">配置</span>
              </button>
              <button 
                onClick={() => setIsScheduleModalOpen(true)}
                className="flex flex-col items-center justify-center p-4 bg-purple-50/50 dark:bg-purple-900/10 hover:bg-purple-100/50 dark:hover:bg-purple-900/20 rounded-2xl border border-purple-100/50 dark:border-purple-800/30 transition-all duration-200 hover:scale-[1.02] active:scale-95"
              >
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
                <span className="text-sm font-medium text-muted-foreground">计划</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-100/50 dark:hover:bg-orange-900/20 rounded-2xl border border-orange-100/50 dark:border-orange-800/30 transition-all duration-200 hover:scale-[1.02] active:scale-95">
                <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400 mb-2" />
                <span className="text-sm font-medium text-muted-foreground">日志</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 bg-gray-50/50 dark:bg-gray-700/10 hover:bg-gray-100/50 dark:hover:bg-gray-700/20 rounded-2xl border border-gray-100/50 dark:border-gray-600/30 transition-all duration-200 hover:scale-[1.02] active:scale-95">
                <RotateCw className="w-6 h-6 text-muted-foreground mb-2" />
                <span className="text-sm font-medium text-muted-foreground">更多</span>
              </button>
            </div>
          </div>

          {/* Component Versions */}
          <VersionManagementSection instanceId={instance.id} />
        </div>

        {/* Right Panel: Terminal & Controls */}
        <div className="col-span-8 flex flex-col gap-4 min-h-0 animate-slide-up opacity-0">
          {/* Terminal Window */}
          <div className="flex-1 bg-[#1e1e1e] dark:bg-[#1e1e1e] rounded-3xl shadow-lg overflow-hidden flex flex-col">
            {/* Terminal Header / Tabs */}
            <div className="flex items-center px-4 py-3 bg-[#252526] dark:bg-[#252526] border-b border-gray-700/30">
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
                  {availableComponents.map((comp) => (
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
                    runtimeKind={getComponentStatus('MaiBot')?.runtime_kind ?? instance.runtime_profile.kind}
                  />
                </TabsContent>
                <TabsContent value="NapCat" className="h-full m-0">
                  <TerminalComponent
                    key={`${instance.id}-NapCat`}
                    instanceId={instance.id}
                    component="NapCat"
                    className="h-full"
                    isRunning={getComponentStatus('NapCat')?.running === true}
                    runtimeKind={getComponentStatus('NapCat')?.runtime_kind ?? instance.runtime_profile.kind}
                  />
                </TabsContent>
                <TabsContent value="MaiBot-Napcat-Adapter" className="h-full m-0">
                  <TerminalComponent
                    key={`${instance.id}-MaiBot-Napcat-Adapter`}
                    instanceId={instance.id}
                    component="MaiBot-Napcat-Adapter"
                    className="h-full"
                    isRunning={getComponentStatus('MaiBot-Napcat-Adapter')?.running === true}
                    runtimeKind={getComponentStatus('MaiBot-Napcat-Adapter')?.runtime_kind ?? instance.runtime_profile.kind}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Control Bar */}
          <div className="bg-card backdrop-blur-xl rounded-2xl p-3 border border-border shadow-sm flex items-center justify-between">
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
                        <DropdownMenuRadioGroup value={selectedStartTarget} onValueChange={(v) => setSelectedStartTarget(v as ComponentType | 'all')}>
                          {!hasAnyComponentRunning && (
                            <DropdownMenuRadioItem value="all">所有组件</DropdownMenuRadioItem>
                          )}
                          {!getComponentStatus('MaiBot')?.running && (
                            <DropdownMenuRadioItem value="MaiBot">MaiBot</DropdownMenuRadioItem>
                          )}
                          {!getComponentStatus('NapCat')?.running && (
                            <DropdownMenuRadioItem value="NapCat">NapCat</DropdownMenuRadioItem>
                          )}
                          {!getComponentStatus('MaiBot-Napcat-Adapter')?.running && (
                            <DropdownMenuRadioItem value="MaiBot-Napcat-Adapter">Adapter</DropdownMenuRadioItem>
                          )}
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
