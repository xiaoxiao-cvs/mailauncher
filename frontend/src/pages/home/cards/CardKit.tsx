import { motion } from "motion/react";

import { springSettle } from "@/design/motion";

/**
 * 卡片详情通用小件 —— 与 SystemCard 的本地版视觉一致,提升为共享件供各 bento 卡复用,
 * 保证展开详情的读数/分节/占用条/环心数字在全首页统一。
 * 本文件仅导出组件(满足 react-refresh 单一职责);占用率取色等纯函数放别处。
 */

/** 紧凑读数:小标签 + 单行等宽数值(不换行),适配固定框。 */
export function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg px-2.5 py-1.5"
      style={{ background: "var(--ls-bg-2)" }}
    >
      <div className="text-[10px]" style={{ color: "var(--ls-ink-faint)" }}>
        {label}
      </div>
      <div className="ls-num mt-0.5 truncate text-xs font-medium">{value}</div>
    </div>
  );
}

/** 分节标题:小标题 + 可选右侧提示。 */
export function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span
        className="text-[10px] font-medium"
        style={{ color: "var(--ls-ink-soft)" }}
      >
        {title}
      </span>
      {hint && (
        <span className="text-[10px]" style={{ color: "var(--ls-ink-faint)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

/** 内嵌占用条:贴合紧凑高度,占比随 springSettle 落定。 */
export function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div
      style={{
        height: 6,
        width: "100%",
        borderRadius: 999,
        background: "var(--ls-bg-2)",
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={false}
        animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        transition={springSettle}
        style={{ height: "100%", borderRadius: 999, background: color }}
      />
    </div>
  );
}

/** 环心数字:大号整数 + 小号 %。 */
export function RingNum({ value, big }: { value: number; big: number }) {
  return (
    <span style={{ display: "grid", placeItems: "center", lineHeight: 1 }}>
      <span className="ls-num" style={{ fontSize: big, fontWeight: 600 }}>
        {Math.round(value)}
      </span>
      <span style={{ fontSize: 9, color: "var(--ls-ink-faint)" }}>%</span>
    </span>
  );
}
