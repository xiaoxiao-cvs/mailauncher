/**
 * 迷你折线图组件
 * 用于展示数据趋势的小型可视化图表
 * 支持从点到线的入场动画效果
 */

import { useMemo } from 'react';
import { LineChart, Line, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

interface SparklineProps {
  /** 数据点数组 */
  data: number[];
  /** 线条颜色，支持 CSS 颜色值 */
  color?: string;
  /** 图表宽度 */
  width?: number | string;
  /** 图表高度 */
  height?: number;
  /** 是否显示动画 */
  animate?: boolean;
  /** 动画时长（毫秒） */
  animationDuration?: number;
  /** 线条宽度 */
  strokeWidth?: number;
  /** 是否显示渐变填充 */
  showGradient?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ==================== 颜色预设 ====================

export const SPARKLINE_COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  pink: '#ec4899',
  orange: '#f97316',
  cyan: '#06b6d4',
} as const;

// ==================== 组件 ====================

export function Sparkline({
  data,
  color = SPARKLINE_COLORS.cyan,
  width = '100%',
  height = 32,
  animate = true,
  animationDuration = 1000,
  strokeWidth = 2,
  showGradient = true,
  className,
}: SparklineProps) {
  // 将数据转换为 recharts 格式
  const chartData = useMemo(() => {
    // 如果没有数据或只有一个点，生成一条直线（用两个相同的点）
    if (!data || data.length === 0) {
      return [
        { index: 0, value: 0 },
        { index: 1, value: 0 },
      ];
    }
    if (data.length === 1) {
      return [
        { index: 0, value: data[0] },
        { index: 1, value: data[0] },
      ];
    }
    return data.map((value, index) => ({
      index,
      value,
    }));
  }, [data]);

  // 生成唯一的渐变 ID
  const gradientId = useMemo(() => `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`, []);

  // 计算实际宽度
  const actualWidth = typeof width === 'number' ? width : 60;
  const actualHeight = typeof height === 'number' ? height : 32;

  return (
    <div className={cn("relative", className)} style={{ width: actualWidth, height: actualHeight }}>
      <LineChart 
        data={chartData} 
        width={actualWidth}
        height={actualHeight}
        margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
      >
          {/* 渐变定义 */}
          {showGradient && (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="50%" stopColor={color} stopOpacity={0.7} />
                <stop offset="100%" stopColor={color} stopOpacity={1} />
              </linearGradient>
            </defs>
          )}
          
          {/* 隐藏的 Y 轴，用于自动计算范围 */}
          <YAxis domain={['dataMin', 'dataMax']} hide />
          
          {/* 折线 */}
          <Line
            type="monotone"
            dataKey="value"
            stroke={showGradient ? `url(#${gradientId})` : color}
            strokeWidth={strokeWidth}
            dot={false}
            activeDot={false}
            isAnimationActive={animate}
            animationBegin={0}
            animationDuration={animationDuration}
            animationEasing="ease-out"
          />
        </LineChart>
    </div>
  );
}

// ==================== 带标签的 Sparkline ====================

interface LabeledSparklineProps extends SparklineProps {
  /** 标签文本 */
  label?: string;
  /** 当前值 */
  value?: string | number;
  /** 值的单位 */
  unit?: string;
}

export function LabeledSparkline({
  label,
  value,
  unit,
  ...sparklineProps
}: LabeledSparklineProps) {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {label}:
        </span>
      )}
      {value !== undefined && (
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          {value}{unit}
        </span>
      )}
      <Sparkline {...sparklineProps} />
    </div>
  );
}
