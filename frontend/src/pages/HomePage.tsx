/**
 * 主页 — 仪表盘
 * 实例快览 + 统计概览
 */

import { useNavigate } from 'react-router-dom';
import { Play, Square, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Instance, InstanceStatus } from '@/services/instanceApi';
import {
  useInstancesQuery,
  useStartInstanceMutation,
  useStopInstanceMutation,
} from '@/hooks/queries/useInstanceQueries';
import { StatsDashboard } from '@/components/stats/StatsDashboard';
import { Button } from '@/components/ui/button';

const statusLabel: Record<InstanceStatus, string> = {
  pending: '待命',
  starting: '启动中',
  running: '运行中',
  partial: '部分运行',
  stopping: '停止中',
  stopped: '已停止',
  failed: '失败',
  unknown: '未知',
};

const statusDotColor: Record<InstanceStatus, string> = {
  pending: 'bg-slate-400',
  starting: 'bg-yellow-500 animate-pulse',
  running: 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]',
  partial: 'bg-amber-500',
  stopping: 'bg-orange-500 animate-pulse',
  stopped: 'bg-gray-400',
  failed: 'bg-red-500',
  unknown: 'bg-zinc-400',
};

function InstanceMiniCard({ instance }: { instance: Instance }) {
  const navigate = useNavigate();
  const startMutation = useStartInstanceMutation();
  const stopMutation = useStopInstanceMutation();

  const isActive = instance.status === 'running' || instance.status === 'partial';
  const isTransitioning = instance.status === 'starting' || instance.status === 'stopping';
  const busy = startMutation.isPending || stopMutation.isPending;

  return (
    <div
      onClick={() => navigate(`/instances/${instance.id}`)}
      className={cn(
        'glass-panel flex items-center gap-3 px-4 py-3 cursor-pointer',
        'transition-all duration-200 hover:shadow-panel-hover hover:-translate-y-0.5',
      )}
    >
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusDotColor[instance.status])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{instance.name}</p>
        <p className="text-xs text-muted-foreground">{statusLabel[instance.status]}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isActive) {
            stopMutation.mutate(instance.id);
          } else if (!isTransitioning) {
            startMutation.mutate(instance.id);
          }
        }}
        disabled={busy || isTransitioning}
        className={cn(
          'w-8 h-8 rounded-control flex items-center justify-center transition-colors flex-shrink-0',
          isActive
            ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
            : 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
          (busy || isTransitioning) && 'opacity-40 pointer-events-none',
        )}
      >
        {isActive ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
      </button>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { data } = useInstancesQuery();
  const instances = data?.instances;

  const runningCount = instances?.filter((i) => i.status === 'running' || i.status === 'partial').length ?? 0;
  const totalCount = instances?.length ?? 0;

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      {/* 实例快览 */}
      {instances && instances.length > 0 && (
        <div className="px-6 pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">实例</h2>
              <p className="text-sm text-muted-foreground">
                {runningCount}/{totalCount} 运行中
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={() => navigate('/instances')}
            >
              管理
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {instances.map((instance) => (
              <InstanceMiniCard key={instance.id} instance={instance} />
            ))}
          </div>
        </div>
      )}

      {/* 统计仪表板 */}
      <StatsDashboard />
    </div>
  );
}
