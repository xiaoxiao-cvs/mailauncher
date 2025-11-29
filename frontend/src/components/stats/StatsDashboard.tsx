/**
 * 统计仪表板组件
 * 创新设计：毛玻璃卡片 + 渐变色 + 动态数字动画
 */

import { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Activity,
  Zap,
  DollarSign,
  Clock,
  MessageSquare,
  Reply,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  Server,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useStatsOverviewQuery,
  useInstanceStatsQuery,
  type TimeRange,
  type StatsSummary,
  type ModelStats,
} from '@/hooks/queries/useStatsQueries';
import { useInstancesQuery } from '@/hooks/queries/useInstanceQueries';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

// ==================== 配置 ====================

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1 小时' },
  { value: '6h', label: '6 小时' },
  { value: '12h', label: '12 小时' },
  { value: '24h', label: '24 小时' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
];

const REFRESH_INTERVALS = [
  { value: 15000, label: '15 秒' },
  { value: 30000, label: '30 秒' },
  { value: 60000, label: '60 秒' },
];

// 模型颜色配置 - 渐变色系
const MODEL_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
];

// ==================== 工具函数 ====================

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

// ==================== 动画数字组件 ====================

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
      // easeOutExpo
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

// ==================== 统计卡片组件 ====================

interface StatCardProps {
  title: string;
  value: number;
  formatter?: (n: number) => string;
  icon: React.ReactNode;
  trend?: number;
  gradient: string;
  delay?: number;
}

function StatCard({ title, value, formatter, icon, trend, gradient, delay = 0 }: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 transition-all duration-500",
        "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl",
        "border border-gray-200/50 dark:border-gray-700/50",
        "hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50",
        "hover:-translate-y-0.5",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      {/* 背景渐变装饰 */}
      <div 
        className={cn("absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-20 blur-2xl", gradient)}
      />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            <AnimatedNumber value={value} formatter={formatter} />
          </p>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend >= 0 ? "text-green-600" : "text-red-500"
            )}>
              <TrendingUp className={cn("w-3 h-3", trend < 0 && "rotate-180")} />
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          gradient
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ==================== 模型饼图组件 ====================

interface ModelPieChartProps {
  data: ModelStats[];
  type: 'cost' | 'requests' | 'tokens';
}

function ModelPieChart({ data, type }: ModelPieChartProps) {
  const chartData = useMemo(() => {
    return data.map((model, index) => ({
      name: model.display_name || model.model_name,
      value: type === 'cost' ? model.total_cost : 
             type === 'requests' ? model.request_count : 
             model.total_tokens,
      color: MODEL_COLORS[index % MODEL_COLORS.length],
    })).filter(d => d.value > 0);
  }, [data, type]);
  
  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center space-y-2">
          <Cpu className="w-12 h-12 mx-auto opacity-50" />
          <p>暂无模型使用数据</p>
        </div>
      </div>
    );
  }
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {type === 'cost' && formatCurrency(data.value)}
            {type === 'requests' && `${formatNumber(data.value)} 次`}
            {type === 'tokens' && `${formatNumber(data.value)} tokens`}
            <span className="ml-2 text-gray-400">({percentage}%)</span>
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          animationBegin={0}
          animationDuration={800}
        >
          {chartData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color}
              stroke="transparent"
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          verticalAlign="bottom"
          height={36}
          formatter={(value) => (
            <span className="text-sm text-gray-600 dark:text-gray-300">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ==================== 模型列表组件 ====================

interface ModelListProps {
  data: ModelStats[];
}

function ModelList({ data }: ModelListProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Cpu className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无模型数据</p>
      </div>
    );
  }
  
  const maxRequests = Math.max(...data.map(m => m.request_count));
  
  return (
    <div className="space-y-3">
      {data.slice(0, 5).map((model, index) => (
        <div key={model.model_name} className="group">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: MODEL_COLORS[index % MODEL_COLORS.length] }}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[140px]">
                {model.display_name || model.model_name}
              </span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatNumber(model.request_count)} 次
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${(model.request_count / maxRequests) * 100}%`,
                backgroundColor: MODEL_COLORS[index % MODEL_COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== 主仪表板组件 ====================

export function StatsDashboard() {
  // 状态
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'cost' | 'requests' | 'tokens'>('cost');
  
  // 获取实例列表
  const { data: instancesData } = useInstancesQuery();
  const instances = instancesData?.instances;
  
  // 根据选择获取统计数据
  const { 
    data: overviewData, 
    isLoading: overviewLoading,
    dataUpdatedAt: lastUpdated,
  } = useStatsOverviewQuery(timeRange, { 
    refetchInterval: refreshInterval 
  });
  
  const { 
    data: instanceData, 
    isLoading: instanceLoading 
  } = useInstanceStatsQuery(
    selectedInstance || undefined,
    timeRange,
    { refetchInterval: selectedInstance ? refreshInterval : false }
  );
  
  // 当前使用的数据
  const currentData = selectedInstance ? instanceData : overviewData;
  const isLoading = selectedInstance ? instanceLoading : overviewLoading;
  const summary: StatsSummary | undefined = currentData?.summary;
  const modelStats: ModelStats[] = selectedInstance 
    ? (instanceData?.model_stats || [])
    : (overviewData?.top_models || []);
  
  // 格式化最后更新时间
  const lastUpdatedText = lastUpdated 
    ? new Date(lastUpdated).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';
  
  return (
    <div className="h-full overflow-auto scrollbar-thin p-6 space-y-6">
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            统计概览
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {selectedInstance 
              ? `${instances?.find(i => i.id === selectedInstance)?.name || '实例'} 的运行统计`
              : '全部实例汇总统计'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 实例选择器 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Server className="w-4 h-4" />
                {selectedInstance 
                  ? instances?.find(i => i.id === selectedInstance)?.name || '实例'
                  : '全部实例'}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>选择数据源</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedInstance(null)}>
                <Server className="w-4 h-4 mr-2" />
                全部实例
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {instances?.map((instance) => (
                <DropdownMenuItem
                  key={instance.id}
                  onClick={() => setSelectedInstance(instance.id)}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full mr-2",
                    instance.status === 'running' ? "bg-green-500" : "bg-gray-400"
                  )} />
                  {instance.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* 时间范围选择器 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Clock className="w-4 h-4" />
                {TIME_RANGE_OPTIONS.find(o => o.value === timeRange)?.label}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {TIME_RANGE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setTimeRange(option.value)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* 刷新间隔选择器 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <RefreshCw className={cn(
                  "w-4 h-4 transition-transform",
                  isLoading && "animate-spin"
                )} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>自动刷新间隔</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {REFRESH_INTERVALS.map((interval) => (
                <DropdownMenuItem
                  key={interval.value}
                  onClick={() => setRefreshInterval(interval.value)}
                >
                  <span className={cn(
                    refreshInterval === interval.value && "font-semibold"
                  )}>
                    {interval.label}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* 状态提示 */}
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span>最后更新: {lastUpdatedText}</span>
        {!selectedInstance && overviewData && (
          <>
            <span>•</span>
            <span>{overviewData.total_instances} 个实例</span>
            <span>•</span>
            <span className="text-green-600">{overviewData.running_instances} 个运行中</span>
          </>
        )}
      </div>
      
      {/* 统计卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总请求数"
          value={summary?.total_requests || 0}
          formatter={(n) => formatNumber(n)}
          icon={<Activity className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-indigo-500 to-purple-600"
          delay={0}
        />
        <StatCard
          title="总花费"
          value={summary?.total_cost || 0}
          formatter={(n) => formatCurrency(n)}
          icon={<DollarSign className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          delay={100}
        />
        <StatCard
          title="Token 消耗"
          value={summary?.total_tokens || 0}
          formatter={(n) => formatNumber(n)}
          icon={<Zap className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          delay={200}
        />
        <StatCard
          title="平均响应"
          value={summary?.avg_response_time || 0}
          formatter={(n) => `${n.toFixed(2)}s`}
          icon={<Clock className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-pink-500 to-rose-600"
          delay={300}
        />
      </div>
      
      {/* 第二行卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="在线时长"
          value={summary?.online_time || 0}
          formatter={(n) => formatDuration(n)}
          icon={<Clock className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
          delay={400}
        />
        <StatCard
          title="消息处理"
          value={summary?.total_messages || 0}
          formatter={(n) => formatNumber(n)}
          icon={<MessageSquare className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          delay={500}
        />
        <StatCard
          title="回复数量"
          value={summary?.total_replies || 0}
          formatter={(n) => formatNumber(n)}
          icon={<Reply className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-fuchsia-500 to-pink-600"
          delay={600}
        />
      </div>
      
      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 模型消耗饼图 */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              模型使用分布
            </h3>
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {(['cost', 'requests', 'tokens'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                    chartType === type
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  )}
                >
                  {type === 'cost' && '花费'}
                  {type === 'requests' && '请求'}
                  {type === 'tokens' && 'Token'}
                </button>
              ))}
            </div>
          </div>
          <ModelPieChart data={modelStats} type={chartType} />
        </div>
        
        {/* 模型列表 */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            模型使用排行
          </h3>
          <ModelList data={modelStats} />
          
          {/* 效率指标 */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              效率指标
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary?.cost_per_hour || 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">每小时花费</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(summary?.tokens_per_hour || 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">每小时 Token</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
