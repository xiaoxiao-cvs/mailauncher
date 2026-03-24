import { Clock, Server, FileText, RotateCw } from 'lucide-react';

interface InstanceQuickActionsProps {
  onOpenConfig: () => void;
  onOpenSchedule: () => void;
}

export function InstanceQuickActions({ onOpenConfig, onOpenSchedule }: InstanceQuickActionsProps) {
  return (
    <div className="glass-panel p-6 animate-slide-up opacity-0">
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Server className="w-5 h-5 text-purple-500" />
        快捷操作
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onOpenConfig}
          className="flex flex-col items-center justify-center p-4 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/20 rounded-card border border-blue-100/50 dark:border-blue-800/30 transition-all duration-200 hover:scale-[1.02] active:scale-95"
        >
          <Server className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
          <span className="text-sm font-medium text-muted-foreground">配置</span>
        </button>
        <button
          onClick={onOpenSchedule}
          className="flex flex-col items-center justify-center p-4 bg-purple-50/50 dark:bg-purple-900/10 hover:bg-purple-100/50 dark:hover:bg-purple-900/20 rounded-card border border-purple-100/50 dark:border-purple-800/30 transition-all duration-200 hover:scale-[1.02] active:scale-95"
        >
          <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
          <span className="text-sm font-medium text-muted-foreground">计划</span>
        </button>
        <button className="flex flex-col items-center justify-center p-4 bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-100/50 dark:hover:bg-orange-900/20 rounded-card border border-orange-100/50 dark:border-orange-800/30 transition-all duration-200 hover:scale-[1.02] active:scale-95">
          <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400 mb-2" />
          <span className="text-sm font-medium text-muted-foreground">日志</span>
        </button>
        <button className="flex flex-col items-center justify-center p-4 bg-gray-50/50 dark:bg-gray-700/10 hover:bg-gray-100/50 dark:hover:bg-gray-700/20 rounded-card border border-gray-100/50 dark:border-gray-600/30 transition-all duration-200 hover:scale-[1.02] active:scale-95">
          <RotateCw className="w-6 h-6 text-muted-foreground mb-2" />
          <span className="text-sm font-medium text-muted-foreground">更多</span>
        </button>
      </div>
    </div>
  );
}
