import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

/**
 * 表单标签 Label —— 包 @radix-ui/react-label(点击标签聚焦关联控件由 Radix 负责)。
 * 视觉:最小字号 + 次要墨色,呼应面板内「标签 + 控件」的层级,与 SegmentControl/Meter 标签同调。
 */
export type LabelProps = React.ComponentPropsWithoutRef<
  typeof LabelPrimitive.Root
>;

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, style, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("text-[11px] font-medium", className)}
    style={{ color: "var(--ls-ink-soft)", ...style }}
    {...props}
  />
));
Label.displayName = "Label";
