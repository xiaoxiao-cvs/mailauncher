import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeRange, ModelStats } from '@/hooks/queries/useStatsQueries';
import type { StatsSummary } from '@/hooks/queries/useStatsQueries';

const MODEL_COLORS = [
  '#f43f5e',
  '#ec4899',
  '#d946ef',
  '#a855f7',
  '#8b5cf6',
  '#6366f1',
  '#3b82f6',
  '#06b6d4',
  '#14b8a6',
  '#22c55e',
];

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '1h': '最近1小时',
  '6h': '最近6小时',
  '12h': '最近12小时',
  '24h': '最近24小时',
  '7d': '最近7天',
  '30d': '最近30天',
};

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

type ChartType = 'cost' | 'requests' | 'tokens';

interface ModelDistributionProps {
  data: ModelStats[];
  type: ChartType;
}

function ModelDistribution({ data, type }: ModelDistributionProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const listItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pieContainerRef = useRef<HTMLDivElement>(null);
  const [lineCoords, setLineCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

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

  const getValue = useCallback((model: ModelStats) => {
    switch (type) {
      case 'cost': return model.total_cost;
      case 'requests': return model.request_count;
      case 'tokens': return model.total_tokens;
    }
  }, [type]);

  const top5Models = useMemo(() => {
    const sorted = [...data].sort((a, b) => getValue(b) - getValue(a)).slice(0, 5);
    return sorted;
  }, [data, getValue]);

  const positionMap = useMemo(() => {
    const sorted = [...top5Models].sort((a, b) => getValue(b) - getValue(a));
    const map = new Map<string, number>();
    sorted.forEach((model, idx) => map.set(model.model_name, idx));
    return map;
  }, [top5Models, getValue]);

  const stableModels = useMemo(() => {
    return [...top5Models].sort((a, b) => a.model_name.localeCompare(b.model_name));
  }, [top5Models]);

  const chartData = useMemo(() => {
    const sorted = [...top5Models].sort((a, b) => getValue(b) - getValue(a));
    return sorted.map((model, index) => ({
      name: model.display_name || model.model_name,
      value: getValue(model),
      color: MODEL_COLORS[index % MODEL_COLORS.length],
      model,
    })).filter(d => d.value > 0);
  }, [top5Models, getValue]);

  const total = useMemo(() => chartData.reduce((sum, d) => sum + d.value, 0), [chartData]);

  const formatValue = (model: ModelStats) => {
    switch (type) {
      case 'cost': return formatCurrency(model.total_cost);
      case 'requests': return `${formatNumber(model.request_count)} 次`;
      case 'tokens': return formatNumber(model.total_tokens);
    }
  };

  const maxValue = Math.max(...top5Models.map(model => getValue(model)), 1);

  const ITEM_HEIGHT = 60;

  const calculateSectorCenter = useCallback((index: number) => {
    if (!containerRef.current || !pieContainerRef.current || !listItemRefs.current[index]) return null;

    const container = containerRef.current.getBoundingClientRect();
    const pieContainer = pieContainerRef.current.getBoundingClientRect();
    const listItem = listItemRefs.current[index]?.getBoundingClientRect();

    if (!listItem || total === 0) return null;

    const x1 = listItem.right - container.left;
    const y1 = listItem.top + listItem.height / 2 - container.top;

    const pieCenterX = pieContainer.left + pieContainer.width / 2 - container.left;
    const pieCenterY = pieContainer.top + pieContainer.height / 2 - container.top;

    let startAngle = 0;
    for (let i = 0; i < index; i++) {
      if (chartData[i]) {
        startAngle += (chartData[i].value / total) * 360;
      }
    }
    const segmentAngle = chartData[index] ? (chartData[index].value / total) * 360 : 0;
    const midAngle = startAngle + segmentAngle / 2;

    const radians = (midAngle * Math.PI) / 180;

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
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center space-y-2">
          <Cpu className="w-12 h-12 mx-auto opacity-50" />
          <p>暂无模型使用数据</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex gap-4" style={{ minHeight: '280px' }}>
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

      <div className="flex-1 pr-2 relative" style={{ height: `${stableModels.length * ITEM_HEIGHT}px` }}>
        {stableModels.map((model) => {
          const position = positionMap.get(model.model_name) ?? 0;
          const colorIndex = position;

          return (
            <div
              key={model.model_name}
              ref={el => listItemRefs.current[position] = el}
              className={cn(
                "absolute left-0 right-0 group cursor-pointer p-2 rounded-control transition-all duration-500 ease-out",
                hoveredIndex === position
                  ? "bg-muted scale-[1.02]"
                  : "hover:bg-muted/50"
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
                  <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                    {model.display_name || model.model_name}
                  </span>
                </div>
                <span className={cn(
                  "text-sm transition-colors duration-200",
                  hoveredIndex === position
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}>
                  {formatValue(model)}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
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

interface ModelDistributionChartProps {
  modelStats: ModelStats[];
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  summary: StatsSummary | undefined;
  timeRange: TimeRange;
}

export function ModelDistributionChart({
  modelStats,
  chartType,
  onChartTypeChange,
  summary,
  timeRange,
}: ModelDistributionChartProps) {
  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          模型使用分布
        </h3>
        <div className="flex gap-1 p-1 bg-muted rounded-control">
          {(['cost', 'requests', 'tokens'] as const).map((type) => (
            <button
              key={type}
              onClick={() => onChartTypeChange(type)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                chartType === type
                  ? "bg-card text-foreground shadow-panel"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {type === 'cost' && '花费'}
              {type === 'requests' && '请求'}
              {type === 'tokens' && 'Token'}
            </button>
          ))}
        </div>
      </div>

      <ModelDistribution data={modelStats} type={chartType} />

      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted rounded-card">
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(summary?.total_cost || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {TIME_RANGE_LABELS[timeRange]}花费
            </p>
          </div>
          <div className="text-center p-3 bg-muted rounded-card">
            <p className="text-2xl font-bold text-foreground">
              {formatNumber(summary?.total_tokens || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {TIME_RANGE_LABELS[timeRange]} Token
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
