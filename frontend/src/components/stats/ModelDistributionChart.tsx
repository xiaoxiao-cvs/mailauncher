import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Cpu } from "lucide-react";
import { Surface, SegmentControl } from "@/components/ls";
import { springSettle, springTap } from "@/design/motion";
import type { TimeRange, ModelStats } from "@/hooks/queries/useStatsQueries";
import type { StatsSummary } from "@/hooks/queries/useStatsQueries";

/**
 * 模型分布配色:暖色 + 生命色调板,与 HomeView 顶部 MODEL_TONES 同序。
 * 生命色(运行/活跃)打头,其后暖色梯度;按花费降序循环取用。
 */
const MODEL_TONES = [
  "var(--ls-life)",
  "#cf9442",
  "#c5563e",
  "#7f9b6a",
  "#b07d56",
] as const;

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "1h": "最近1小时",
  "6h": "最近6小时",
  "12h": "最近12小时",
  "24h": "最近24小时",
  "7d": "最近7天",
  "30d": "最近30天",
};

function formatNumber(num: number, decimals: number = 0): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toFixed(decimals);
}

function formatCurrency(num: number): string {
  if (num >= 100) {
    return "¥" + num.toFixed(0);
  }
  if (num >= 10) {
    return "¥" + num.toFixed(1);
  }
  return "¥" + num.toFixed(2);
}

type ChartType = "cost" | "requests" | "tokens";

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
  const [lineCoords, setLineCoords] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

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

  const getValue = useCallback(
    (model: ModelStats) => {
      switch (type) {
        case "cost":
          return model.total_cost;
        case "requests":
          return model.request_count;
        case "tokens":
          return model.total_tokens;
      }
    },
    [type],
  );

  const top5Models = useMemo(() => {
    const sorted = [...data]
      .sort((a, b) => getValue(b) - getValue(a))
      .slice(0, 5);
    return sorted;
  }, [data, getValue]);

  const positionMap = useMemo(() => {
    const sorted = [...top5Models].sort((a, b) => getValue(b) - getValue(a));
    const map = new Map<string, number>();
    sorted.forEach((model, idx) => map.set(model.model_name, idx));
    return map;
  }, [top5Models, getValue]);

  const stableModels = useMemo(() => {
    return [...top5Models].sort((a, b) =>
      a.model_name.localeCompare(b.model_name),
    );
  }, [top5Models]);

  const chartData = useMemo(() => {
    const sorted = [...top5Models].sort((a, b) => getValue(b) - getValue(a));
    return sorted
      .map((model, index) => ({
        name: model.display_name || model.model_name,
        value: getValue(model),
        color: MODEL_TONES[index % MODEL_TONES.length],
        model,
      }))
      .filter((d) => d.value > 0);
  }, [top5Models, getValue]);

  const total = useMemo(
    () => chartData.reduce((sum, d) => sum + d.value, 0),
    [chartData],
  );

  const formatValue = (model: ModelStats) => {
    switch (type) {
      case "cost":
        return formatCurrency(model.total_cost);
      case "requests":
        return `${formatNumber(model.request_count)} 次`;
      case "tokens":
        return formatNumber(model.total_tokens);
    }
  };

  const maxValue = Math.max(...top5Models.map((model) => getValue(model)), 1);

  const ITEM_HEIGHT = 60;

  const calculateSectorCenter = useCallback(
    (index: number) => {
      if (
        !containerRef.current ||
        !pieContainerRef.current ||
        !listItemRefs.current[index]
      )
        return null;

      const container = containerRef.current.getBoundingClientRect();
      const pieContainer = pieContainerRef.current.getBoundingClientRect();
      const listItem = listItemRefs.current[index]?.getBoundingClientRect();

      if (!listItem || total === 0) return null;

      const x1 = listItem.right - container.left;
      const y1 = listItem.top + listItem.height / 2 - container.top;

      const pieCenterX =
        pieContainer.left + pieContainer.width / 2 - container.left;
      const pieCenterY =
        pieContainer.top + pieContainer.height / 2 - container.top;

      let startAngle = 0;
      for (let i = 0; i < index; i++) {
        if (chartData[i]) {
          startAngle += (chartData[i].value / total) * 360;
        }
      }
      const segmentAngle = chartData[index]
        ? (chartData[index].value / total) * 360
        : 0;
      const midAngle = startAngle + segmentAngle / 2;

      const radians = (midAngle * Math.PI) / 180;

      const innerRadius = 50;
      const outerRadius = 80;
      const midRadius = (innerRadius + outerRadius) / 2;

      const x2 = pieCenterX + Math.cos(radians) * midRadius;
      const y2 = pieCenterY - Math.sin(radians) * midRadius;

      return { x1, y1, x2, y2 };
    },
    [chartData, total],
  );

  const handleMouseEnter = useCallback(
    (index: number) => {
      setHoveredIndex(index);
      const coords = calculateSectorCenter(index);
      setLineCoords(coords);
    },
    [calculateSectorCenter],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
    setLineCoords(null);
  }, []);

  if (chartData.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-64"
        style={{ color: "var(--ls-ink-soft)" }}
      >
        <div className="text-center space-y-2">
          <Cpu
            className="w-12 h-12 mx-auto"
            style={{ color: "var(--ls-ink-faint)" }}
          />
          <p className="text-sm">暂无模型使用数据</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex gap-4"
      style={{ minHeight: "280px" }}
    >
      {lineCoords && hoveredIndex !== null && (
        <svg
          className="absolute inset-0 pointer-events-none z-10"
          style={{ overflow: "visible" }}
        >
          <path
            d={`M ${lineCoords.x1} ${lineCoords.y1}
                Q ${(lineCoords.x1 + lineCoords.x2) / 2} ${lineCoords.y1},
                  ${lineCoords.x2} ${lineCoords.y2}`}
            fill="none"
            stroke={MODEL_TONES[hoveredIndex % MODEL_TONES.length]}
            strokeOpacity="0.8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="6 4"
          />
          <circle
            cx={lineCoords.x1}
            cy={lineCoords.y1}
            r="4"
            fill={MODEL_TONES[hoveredIndex % MODEL_TONES.length]}
          />
          <circle
            cx={lineCoords.x2}
            cy={lineCoords.y2}
            r="5"
            fill={MODEL_TONES[hoveredIndex % MODEL_TONES.length]}
          />
        </svg>
      )}

      <div
        className="flex-1 pr-2 relative"
        style={{ height: `${stableModels.length * ITEM_HEIGHT}px` }}
      >
        {stableModels.map((model) => {
          const position = positionMap.get(model.model_name) ?? 0;
          const tone = MODEL_TONES[position % MODEL_TONES.length];
          const isHovered = hoveredIndex === position;
          const fillPct = isInitialRender
            ? 0
            : maxValue > 0
              ? (getValue(model) / maxValue) * 100
              : 0;

          return (
            <motion.div
              key={model.model_name}
              ref={(el) => {
                listItemRefs.current[position] = el;
              }}
              className="absolute left-0 right-0 cursor-pointer p-2"
              style={{
                borderRadius: "var(--ls-r-control)",
                background: isHovered ? "var(--ls-bg-2)" : "transparent",
              }}
              animate={{
                y: position * ITEM_HEIGHT,
                scale: isHovered ? 1.02 : 1,
              }}
              transition={springSettle}
              onMouseEnter={() => handleMouseEnter(position)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <motion.span
                    className="w-3 h-3 rounded-full"
                    style={{ background: tone }}
                    animate={{ scale: isHovered ? 1.25 : 1 }}
                    transition={springTap}
                  />
                  <span
                    className="text-sm font-medium truncate max-w-[120px]"
                    style={{ color: "var(--ls-ink)" }}
                  >
                    {model.display_name || model.model_name}
                  </span>
                </div>
                <span
                  className="ls-num text-sm"
                  style={{
                    color: isHovered ? "var(--ls-ink)" : "var(--ls-ink-soft)",
                    fontWeight: isHovered ? 600 : 400,
                  }}
                >
                  {formatValue(model)}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--ls-bg-2)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: tone,
                    opacity: hoveredIndex === null || isHovered ? 1 : 0.4,
                  }}
                  animate={{ width: `${fillPct}%` }}
                  transition={{
                    ...springSettle,
                    delay: isInitialRender ? position * 0.08 : 0,
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div
        ref={pieContainerRef}
        className="w-[200px] flex-shrink-0"
        onMouseLeave={handleMouseLeave}
      >
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
                    opacity:
                      hoveredIndex === null || hoveredIndex === index ? 1 : 0.4,
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

/** 图表维度标签 <-> 业务类型映射:SegmentControl 渲染标签字符串,onChange 回译为 ChartType。 */
const CHART_TYPE_OPTIONS = ["花费", "请求", "Token"] as const;
type ChartTypeLabel = (typeof CHART_TYPE_OPTIONS)[number];
const CHART_TYPE_LABEL: Record<ChartType, ChartTypeLabel> = {
  cost: "花费",
  requests: "请求",
  tokens: "Token",
};
const LABEL_TO_CHART_TYPE: Record<ChartTypeLabel, ChartType> = {
  花费: "cost",
  请求: "requests",
  Token: "tokens",
};

export function ModelDistributionChart({
  modelStats,
  chartType,
  onChartTypeChange,
  summary,
  timeRange,
}: ModelDistributionChartProps) {
  return (
    <Surface variant="panel" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--ls-ink)" }}
        >
          模型使用分布
        </h3>
        <SegmentControl
          options={CHART_TYPE_OPTIONS}
          value={CHART_TYPE_LABEL[chartType]}
          onChange={(label) => onChartTypeChange(LABEL_TO_CHART_TYPE[label])}
        />
      </div>

      <ModelDistribution data={modelStats} type={chartType} />

      <div
        className="mt-4 pt-4"
        style={{ borderTop: "1px solid var(--ls-hairline)" }}
      >
        <div className="grid grid-cols-2 gap-4">
          <Surface variant="inset" className="text-center p-3">
            <p
              className="ls-num text-2xl font-bold"
              style={{ color: "var(--ls-ink)" }}
            >
              {summary ? formatCurrency(summary.total_cost) : "—"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--ls-ink-soft)" }}>
              {TIME_RANGE_LABELS[timeRange]}花费
            </p>
          </Surface>
          <Surface variant="inset" className="text-center p-3">
            <p
              className="ls-num text-2xl font-bold"
              style={{ color: "var(--ls-ink)" }}
            >
              {summary ? formatNumber(summary.total_tokens) : "—"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--ls-ink-soft)" }}>
              {TIME_RANGE_LABELS[timeRange]} Token
            </p>
          </Surface>
        </div>
      </div>
    </Surface>
  );
}
