/**
 * 统计仪表板组件
 * 创新设计：毛玻璃卡片 + 渐变色 + 动态数字动画
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
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
import { MessageQueuePanel } from '@/components/message-queue/MessageQueuePanel';

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

// 模型颜色配置 - 从红/粉渐变到紫/蓝（数量越多越红）
const MODEL_COLORS = [
  '#f43f5e', // Rose - 最多
  '#ec4899', // Pink
  '#d946ef', // Fuchsia
  '#a855f7', // Purple
  '#8b5cf6', // Violet
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#22c55e', // Green - 最少
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

// ==================== 模型分布组合组件（左侧列表 + 右侧饼图 + 连线） ==

interface ModelDistributionProps {
  data: ModelStats[];
  type: 'cost' | 'requests' | 'tokens';
}

function ModelDistribution({ data, type }: ModelDistributionProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const listItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pieContainerRef = useRef<HTMLDivElement>(null);
  const [lineCoords, setLineCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  
  // 仅在首次渲染时触发入场动画
  useEffect(() => {
    if (isInitialRender) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsInitialRender(false);
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isInitialRender]);
  
  // 根据类型获取对应的值
  const getValue = useCallback((model: ModelStats) => {
    switch (type) {
      case 'cost': return model.total_cost;
      case 'requests': return model.request_count;
      case 'tokens': return model.total_tokens;
    }
  }, [type]);
  
  // 获取前5个模型（不排序，保持原始顺序用于渲染）
  const top5Models = useMemo(() => {
    // 先按当前类型排序获取前5，但保留原始数据用于稳定渲染
    const sorted = [...data].sort((a, b) => getValue(b) - getValue(a)).slice(0, 5);
    return sorted;
  }, [data, getValue]);
  
  // 计算每个模型在当前排序中的位置索引
  const positionMap = useMemo(() => {
    const sorted = [...top5Models].sort((a, b) => getValue(b) - getValue(a));
    const map = new Map<string, number>();
    sorted.forEach((model, idx) => map.set(model.model_name, idx));
    return map;
  }, [top5Models, getValue]);
  
  // 为保持稳定的 key，按模型名排序渲染
  const stableModels = useMemo(() => {
    return [...top5Models].sort((a, b) => a.model_name.localeCompare(b.model_name));
  }, [top5Models]);
  
  const chartData = useMemo(() => {
    // 按当前类型排序
    const sorted = [...top5Models].sort((a, b) => getValue(b) - getValue(a));
    return sorted.map((model, index) => ({
      name: model.display_name || model.model_name,
      value: getValue(model),
      color: MODEL_COLORS[index % MODEL_COLORS.length],
      model,
    })).filter(d => d.value > 0);
  }, [top5Models, getValue]);
  
  const total = useMemo(() => chartData.reduce((sum, d) => sum + d.value, 0), [chartData]);
  
  // 格式化显示值
  const formatValue = (model: ModelStats) => {
    switch (type) {
      case 'cost': return formatCurrency(model.total_cost);
      case 'requests': return `${formatNumber(model.request_count)} 次`;
      case 'tokens': return formatNumber(model.total_tokens);
    }
  };
  
  const maxValue = Math.max(...top5Models.map(model => getValue(model)), 1);
  
  // 每个列表项的高度（包含 padding 和 margin）
  const ITEM_HEIGHT = 60;
  
  // 计算扇形中心点位置
  const calculateSectorCenter = useCallback((index: number) => {
    if (!containerRef.current || !pieContainerRef.current || !listItemRefs.current[index]) return null;
    
    const container = containerRef.current.getBoundingClientRect();
    const pieContainer = pieContainerRef.current.getBoundingClientRect();
    const listItem = listItemRefs.current[index]?.getBoundingClientRect();
    
    if (!listItem || total === 0) return null;
    
    // 列表项右侧中心点
    const x1 = listItem.right - container.left;
    const y1 = listItem.top + listItem.height / 2 - container.top;
    
    // 饼图中心（相对于容器）
    const pieCenterX = pieContainer.left + pieContainer.width / 2 - container.left;
    const pieCenterY = pieContainer.top + pieContainer.height / 2 - container.top;
    
    // 计算该扇区的角度位置
    // recharts 饼图默认从 0°（右侧）开始，逆时针方向
    let startAngle = 0;
    for (let i = 0; i < index; i++) {
      if (chartData[i]) {
        startAngle += (chartData[i].value / total) * 360;
      }
    }
    const segmentAngle = chartData[index] ? (chartData[index].value / total) * 360 : 0;
    const midAngle = startAngle + segmentAngle / 2;
    
    // 转换为弧度（recharts 默认逆时针，角度从右侧 0° 开始）
    const radians = (midAngle * Math.PI) / 180;
    
    // 扇形中心点（在内外半径的中间位置）
    const innerRadius = 50;
    const outerRadius = 80;
    const midRadius = (innerRadius + outerRadius) / 2;
    
    const x2 = pieCenterX + Math.cos(radians) * midRadius;
    const y2 = pieCenterY - Math.sin(radians) * midRadius;
    
    return { x1, y1, x2, y2 };
  }, [chartData, total]);
  
  const handleMouseEnter = useCallback((index: number) => {
    setHoveredIndex(index);
    const coords = calculateSectorCenter(index);
    setLineCoords(coords);
  }, [calculateSectorCenter]);
  
  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
    setLineCoords(null);
  }, []);
  
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
  
  return (
    <div ref={containerRef} className="relative flex gap-4" style={{ minHeight: '280px' }}>
      {/* 连接线 SVG - 从列表项连接到扇形中心 */}
      {lineCoords && hoveredIndex !== null && (
        <svg 
          className="absolute inset-0 pointer-events-none z-10"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`line-gradient-${hoveredIndex}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={MODEL_COLORS[hoveredIndex % MODEL_COLORS.length]} stopOpacity="0.6" />
              <stop offset="100%" stopColor={MODEL_COLORS[hoveredIndex % MODEL_COLORS.length]} stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <path
            d={`M ${lineCoords.x1} ${lineCoords.y1} 
                Q ${(lineCoords.x1 + lineCoords.x2) / 2} ${lineCoords.y1}, 
                  ${lineCoords.x2} ${lineCoords.y2}`}
            fill="none"
            stroke={`url(#line-gradient-${hoveredIndex})`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="6 4"
          />
          <circle
            cx={lineCoords.x1}
            cy={lineCoords.y1}
            r="4"
            fill={MODEL_COLORS[hoveredIndex % MODEL_COLORS.length]}
          />
          <circle
            cx={lineCoords.x2}
            cy={lineCoords.y2}
            r="5"
            fill={MODEL_COLORS[hoveredIndex % MODEL_COLORS.length]}
            className="animate-pulse"
          />
        </svg>
      )}
      
      {/* 左侧：模型列表（使用绝对定位实现平滑排序动画） */}
      <div className="flex-1 pr-2 relative" style={{ height: `${stableModels.length * ITEM_HEIGHT}px` }}>
        {stableModels.map((model) => {
          const position = positionMap.get(model.model_name) ?? 0;
          const colorIndex = position;
          
          return (
            <div 
              key={model.model_name}
              ref={el => listItemRefs.current[position] = el}
              className={cn(
                "absolute left-0 right-0 group cursor-pointer p-2 rounded-lg transition-all duration-500 ease-out",
                hoveredIndex === position 
                  ? "bg-gray-100 dark:bg-gray-800 scale-[1.02]" 
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
              )}
              style={{
                transform: `translateY(${position * ITEM_HEIGHT}px)`,
              }}
              onMouseEnter={() => handleMouseEnter(position)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div 
                    className={cn(
                      "w-3 h-3 rounded-full transition-all duration-500",
                      hoveredIndex === position && "scale-125"
                    )}
                    style={{ backgroundColor: MODEL_COLORS[colorIndex % MODEL_COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[120px]">
                    {model.display_name || model.model_name}
                  </span>
                </div>
                <span className={cn(
                  "text-sm transition-colors duration-200",
                  hoveredIndex === position 
                    ? "text-gray-900 dark:text-white font-medium"
                    : "text-gray-500 dark:text-gray-400"
                )}>
                  {formatValue(model)}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ 
                    width: isInitialRender 
                      ? '0%'
                      : `${maxValue > 0 ? (getValue(model) / maxValue) * 100 : 0}%`,
                    backgroundColor: MODEL_COLORS[colorIndex % MODEL_COLORS.length],
                    transitionDelay: isInitialRender ? `${position * 80}ms` : '0ms',
                    opacity: hoveredIndex === null || hoveredIndex === position ? 1 : 0.4,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 右侧：饼图 */}
      <div ref={pieContainerRef} className="w-[200px] flex-shrink-0" onMouseLeave={handleMouseLeave}>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart onMouseLeave={handleMouseLeave}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
              onMouseEnter={(_, index) => handleMouseEnter(index)}
              onMouseLeave={handleMouseLeave}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="transparent"
                  className="cursor-pointer transition-opacity duration-200"
                  style={{
                    opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.4,
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
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
        {/* 模型使用分布 - 饼图/条状图切换 */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              模型使用分布
            </h3>
            {/* 数据类型切换 */}
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
          
          {/* 模型分布：左侧列表 + 右侧饼图 */}
          <ModelDistribution data={modelStats} type={chartType} />
          
          {/* 效率指标 */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
        
        {/* 消息队列面板 - 根据选择显示对应实例的消息 */}
        <MessageQueuePanel instanceId={selectedInstance} />
      </div>
    </div>
  );
}
