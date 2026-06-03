import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 哑光面容器 —— Living Surfaces 的层级基元。
 * variant 直接映射到 tokens.css 锁定的工具类(.ls-panel / .ls-card / .ls-inset),
 * 层级靠柔和扩散投影 + 发丝边 + 纸面顶高光,绝不用玻璃模糊。
 */
export type SurfaceVariant = "panel" | "card" | "inset";

const variantClass: Record<SurfaceVariant, string> = {
  panel: "ls-panel",
  card: "ls-card",
  inset: "ls-inset",
};

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
}

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ variant = "panel", className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(variantClass[variant], className)}
      {...props}
    />
  ),
);
Surface.displayName = "Surface";
