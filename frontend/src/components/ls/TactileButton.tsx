import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";

import { cn } from "@/lib/utils";
import { springTap } from "@/design/motion";

/**
 * 跟手按压 —— Living Surfaces 的通用动作按钮(轻量、柔软回弹)。
 * 三种语气:ghost(透明无影)/ solid(高面+柔影)/ life(绿色生命色,用于"启动"类正向动作)。
 * whileTap / whileHover + springTap 给手感,视觉色彩全部来自 design token,不硬编码。
 */
export type TactileButtonVariant = "ghost" | "solid" | "life";

export interface TactileButtonProps extends HTMLMotionProps<"button"> {
  variant?: TactileButtonVariant;
}

const variantBackground: Record<TactileButtonVariant, string> = {
  ghost: "transparent",
  solid: "var(--ls-surface-hi)",
  life: "var(--ls-life)",
};

export const TactileButton = React.forwardRef<
  HTMLButtonElement,
  TactileButtonProps
>(({ variant = "ghost", className, style, type = "button", ...props }, ref) => (
  <motion.button
    ref={ref}
    type={type}
    {...props}
    className={cn(
      "ls-num inline-flex select-none items-center gap-2 px-3.5 py-2 text-sm font-medium",
      className,
    )}
    style={{
      background: variantBackground[variant],
      color: variant === "life" ? "#fff" : "var(--ls-ink)",
      border: "1px solid var(--ls-hairline)",
      borderRadius: "var(--ls-r-control)",
      boxShadow: variant === "ghost" ? "none" : "var(--ls-shadow-soft)",
      ...style,
    }}
    whileTap={{ scale: 0.95 }}
    whileHover={{ y: -1 }}
    transition={springTap}
  />
));
TactileButton.displayName = "TactileButton";
