import { Icon } from "@iconify/react";

import { METRIC_READERS } from "@/pages/home/widgets/statMetrics";
import type { MetricKey, WidgetSize } from "@/pages/home/widgets/types";
import type { WidgetRenderContext } from "@/pages/home/widgets/registry";

/**
 * 通用指标小卡(stat)—— 按 metric 从首页集中取的 overview/summary 读一个标量,
 * 展示"图标 + 标签 + 大数 + 副文案"。数据沿用 HomeView 已集中获取的 WidgetRenderContext
 * (单查询喂多卡,不放大 N+1);自身不发请求。
 *
 * 与富卡的区别:无钻取详情,纯静态读数;尺寸只影响大数字号(S 紧凑 / M 标准 / L 醒目)。
 * 视觉与 bento 卡一致:暖面 + 发丝边 + 柔影 + 顶高光,填满所在网格单元。
 * metric -> 取数规则见同目录 statMetrics(与画廊共用一份真理)。
 */

const PLACEHOLDER = "—";

/** 大数字号按尺寸分档:S 紧凑、M 标准、L 醒目。 */
const BIG_FONT: Record<WidgetSize, number> = { s: 24, m: 30, l: 40 };

interface StatWidgetProps {
  ctx: WidgetRenderContext;
  /** 显示哪个标量;缺省或未知 metric 走未配置占位(不静默空白)。 */
  metric: MetricKey | undefined;
  size: WidgetSize;
}

export function StatWidget({ ctx, metric, size }: StatWidgetProps) {
  const reader = metric ? METRIC_READERS[metric] : undefined;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        borderRadius: 16,
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-hairline)",
        boxShadow: "var(--ls-shadow-soft), inset 0 1px 0 var(--ls-top-hi)",
      }}
    >
      <div className="flex h-full flex-col p-3.5">
        <div className="flex items-center gap-[7px]" style={{ minWidth: 0 }}>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 20,
              height: 20,
              borderRadius: 7,
              background: "var(--ls-life-soft)",
              color: "var(--ls-life)",
              flexShrink: 0,
            }}
          >
            <Icon
              icon={reader?.icon ?? "ph:question-thin"}
              width={13}
              height={13}
            />
          </span>
          <span
            className="truncate"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.2,
              color: "var(--ls-ink-soft)",
            }}
          >
            {reader?.label ?? "未配置指标"}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5">
          <div
            className="ls-num"
            style={{
              fontSize: BIG_FONT[size],
              fontWeight: 600,
              color: "var(--ls-ink)",
              lineHeight: 1.05,
            }}
          >
            {reader ? (reader.read(ctx) ?? PLACEHOLDER) : PLACEHOLDER}
          </div>
          <div
            className="ls-num"
            style={{
              fontSize: 11,
              color: "var(--ls-ink-faint)",
              lineHeight: 1.3,
            }}
          >
            {reader
              ? (reader.sub(ctx) ?? PLACEHOLDER)
              : "在画廊重新选择一个指标"}
          </div>
        </div>
      </div>
    </div>
  );
}
