import { useState } from "react";
import { Icon } from "@iconify/react";

import { Modal } from "@/components/ls";
import { WIDGET_REGISTRY, type WidgetDef } from "@/pages/home/widgets/registry";
import {
  STAT_METRICS,
  metricLabel,
  metricIcon,
} from "@/pages/home/widgets/statMetrics";
import type { MetricKey, WidgetKind } from "@/pages/home/widgets/types";

/**
 * 组件画廊弹层 —— 列出可添加的组件 kind;选 stat 进入指标二级选择,选定后回调 onAdd。
 * 富卡选中即添加;stat 需先选 metric(折中模型:通用指标小卡靠 metric 决定显示哪个标量)。
 * 用 ls Modal 作底座(实色面 + 弹簧入场,无毛玻璃)。
 */

interface WidgetGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 添加:kind 为 stat 时附带选定的 metric。 */
  onAdd: (kind: WidgetKind, metric?: MetricKey) => void;
}

/** 注册表全部条目(画廊顺序即注册表声明顺序)。 */
const ALL_DEFS: WidgetDef[] = Object.values(WIDGET_REGISTRY);

export function WidgetGallery({
  open,
  onOpenChange,
  onAdd,
}: WidgetGalleryProps) {
  // 二级:选中 stat 后进入指标选择(null = 一级 kind 列表)。
  const [pickMetricFor, setPickMetricFor] = useState<WidgetKind | null>(null);

  const close = () => {
    setPickMetricFor(null);
    onOpenChange(false);
  };

  const handlePickKind = (def: WidgetDef) => {
    if (def.needsMetric) {
      setPickMetricFor(def.kind);
      return;
    }
    onAdd(def.kind);
    close();
  };

  const handlePickMetric = (metric: MetricKey) => {
    if (pickMetricFor) onAdd(pickMetricFor, metric);
    close();
  };

  const inMetricStep = pickMetricFor !== null;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) setPickMetricFor(null);
        onOpenChange(next);
      }}
      title={inMetricStep ? "选择指标" : "添加组件"}
      description={
        inMetricStep
          ? "通用指标小卡:选一个标量在首页常驻显示"
          : "从下列组件中选择,加入首页布局"
      }
      className="max-w-lg"
    >
      {inMetricStep ? (
        <div>
          <div className="grid grid-cols-2 gap-2">
            {STAT_METRICS.map((m) => (
              <GalleryTile
                key={m}
                icon={metricIcon(m)}
                title={metricLabel(m)}
                onClick={() => handlePickMetric(m)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPickMetricFor(null)}
            className="ls-item mt-3 flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            <Icon icon="ph:arrow-left-thin" width={14} height={14} />
            返回
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ALL_DEFS.map((def) => (
            <GalleryTile
              key={def.kind}
              icon={def.icon}
              title={def.title}
              onClick={() => handlePickKind(def)}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}

/** 画廊单元:图标 + 名称的可点磁贴。 */
function GalleryTile({
  icon,
  title,
  onClick,
}: {
  icon: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ls-item flex flex-col items-start gap-2 rounded-[12px] p-3 text-left"
      style={{
        background: "var(--ls-bg-2)",
        border: "1px solid var(--ls-hairline)",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 28,
          height: 28,
          borderRadius: 9,
          background: "var(--ls-life-soft)",
          color: "var(--ls-life)",
        }}
      >
        <Icon icon={icon} width={17} height={17} />
      </span>
      <span className="text-xs font-medium" style={{ color: "var(--ls-ink)" }}>
        {title}
      </span>
    </button>
  );
}
