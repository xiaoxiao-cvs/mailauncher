import { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  DollarSign,
  Clock,
  MessageSquare,
  Reply,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StatsSummary } from '@/hooks/queries/useStatsQueries';

function formatNumber(num: number, decimals: number = 0): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toFixed(decimals);
}

function formatCurrency(num: number): string {
  if (num >= 100) {
    return '¥' + num.toFixed(0);
  }
  if (num >= 10) {
    return '¥' + num.toFixed(1);
  }
  return '¥' + num.toFixed(2);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分钟`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
}

function AnimatedNumber({
  value,
  formatter = (n: number) => n.toString(),
  duration = 800
}: {
  value: number;
  formatter?: (n: number) => string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const diff = value - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(startValue + diff * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{formatter(displayValue)}</span>;
}

interface StatCardProps {
  title: string;
  value: number;
  formatter?: (n: number) => string;
  icon: React.ReactNode;
  trend?: number;
  delay?: number;
}

function StatCard({ title, value, formatter, icon, trend, delay = 0 }: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        "rounded-card p-5 transition-all duration-500",
        "bg-card border border-border shadow-panel",
        "hover:shadow-panel-hover hover:-translate-y-0.5",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-control bg-brand-muted flex-shrink-0">
          {icon}
        </div>
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">
            <AnimatedNumber value={value} formatter={formatter} />
          </p>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend >= 0 ? "text-success" : "text-destructive"
            )}>
              <TrendingUp className={cn("w-3 h-3", trend < 0 && "rotate-180")} />
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatsOverviewCardsProps {
  summary: StatsSummary | undefined;
}

export function StatsOverviewCards({ summary }: StatsOverviewCardsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总请求数"
          value={summary?.total_requests || 0}
          formatter={(n) => formatNumber(n)}
          icon={<Activity className="w-5 h-5 text-brand" />}
          delay={0}
        />
        <StatCard
          title="总花费"
          value={summary?.total_cost || 0}
          formatter={(n) => formatCurrency(n)}
          icon={<DollarSign className="w-5 h-5 text-brand" />}
          delay={100}
        />
        <StatCard
          title="Token 消耗"
          value={summary?.total_tokens || 0}
          formatter={(n) => formatNumber(n)}
          icon={<Zap className="w-5 h-5 text-brand" />}
          delay={200}
        />
        <StatCard
          title="平均响应"
          value={summary?.avg_response_time || 0}
          formatter={(n) => `${n.toFixed(2)}s`}
          icon={<Clock className="w-5 h-5 text-brand" />}
          delay={300}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="在线时长"
          value={summary?.online_time || 0}
          formatter={(n) => formatDuration(n)}
          icon={<Clock className="w-5 h-5 text-brand" />}
          delay={400}
        />
        <StatCard
          title="消息处理"
          value={summary?.total_messages || 0}
          formatter={(n) => formatNumber(n)}
          icon={<MessageSquare className="w-5 h-5 text-brand" />}
          delay={500}
        />
        <StatCard
          title="回复数量"
          value={summary?.total_replies || 0}
          formatter={(n) => formatNumber(n)}
          icon={<Reply className="w-5 h-5 text-brand" />}
          delay={600}
        />
      </div>
    </>
  );
}
