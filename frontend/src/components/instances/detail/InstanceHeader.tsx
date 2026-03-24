import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Instance, InstanceStatus } from '@/services/instanceApi';

const statusLabel: Record<InstanceStatus, string> = {
  pending: '待命中',
  starting: '启动中',
  running: '运行中',
  partial: '部分运行',
  stopping: '停止中',
  stopped: '已停止',
  failed: '失败',
  unknown: '未知',
};

interface InstanceHeaderProps {
  instance: Instance;
}

export function InstanceHeader({ instance }: InstanceHeaderProps) {
  const navigate = useNavigate();

  const isStopped = instance.status === 'stopped';
  const isActive = instance.status === 'running' || instance.status === 'partial';
  const runtimeKindLabel = instance.runtime_profile.kind === 'wsl2' ? 'WSL2' : 'Local';

  return (
    <>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/instances')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-white/20 dark:border-gray-700/30 shadow-panel hover:scale-105 transition-transform duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {instance.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${
                isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
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

        <div className={`px-4 py-1.5 rounded-full text-sm font-semibold backdrop-blur-md border shadow-sm ${
          isActive
            ? 'bg-green-500/10 text-green-600 border-green-200/50 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30'
            : isStopped
            ? 'bg-gray-200/50 text-gray-600 border-gray-200/50 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600/30'
            : 'bg-yellow-500/10 text-yellow-600 border-yellow-200/50 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30'
        }`}>
          {statusLabel[instance.status]}
        </div>
      </header>

      {instance.last_error && (
        <div className="rounded-panel border border-red-200/60 bg-red-50/70 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <div className="font-semibold">最近错误</div>
          <div className="mt-1 break-all">{instance.last_error}</div>
          {instance.last_status_reason && <div className="mt-1 text-xs opacity-80">{instance.last_status_reason}</div>}
        </div>
      )}
    </>
  );
}
