import { motion } from "motion/react";

import { springTap } from "@/design/motion";

/**
 * 状态点 —— 绿色生命色=运行/活着,灰=停止。
 * 切换 running 时一次性弹入(key 变更重挂),刻意不做循环呼吸,保持"安静"。
 */
export interface StatusDotProps {
  running: boolean;
}

export function StatusDot({ running }: StatusDotProps) {
  return (
    <span
      role="status"
      aria-label={running ? "运行中" : "已停止"}
      className="relative inline-flex h-2.5 w-2.5 shrink-0"
    >
      <motion.span
        key={running ? "on" : "off"}
        initial={{ scale: 0.4 }}
        animate={{ scale: 1 }}
        transition={springTap}
        className="inline-flex h-2.5 w-2.5 rounded-full"
        style={{
          background: running ? "var(--ls-life)" : "var(--ls-ink-faint)",
          boxShadow: running ? "0 0 0 3px var(--ls-life-soft)" : "none",
        }}
      />
    </span>
  );
}
StatusDot.displayName = "StatusDot";
