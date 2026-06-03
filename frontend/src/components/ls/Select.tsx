import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 下拉选择 Select —— 包 @radix-ui/react-select,只换皮、逻辑沿用 Radix
 * (键盘导航 / typeahead / 焦点 / portal / 定位避让全部由 Radix 负责)。
 *
 * - Trigger = ls-inset 控件面(--ls-bg-2 底 + 发丝边 + 控件圆角 + ChevronDown 收尾)。
 * - Content = ls-panel 实色弹层(--ls-surface + 发丝边 + lift 影 + 顶高光),严禁 backdrop-blur 毛玻璃。
 * - Item 高亮态(Radix 的 data-highlighted)经作用域样式过渡到 --ls-bg-2,与 .ls-item:hover 一致;
 *   选中项右侧 lucide Check 生命色。
 *
 * 提供低层可组合件(SelectTrigger/Content/Item 等)与 options 驱动的高层便捷组件 Select。
 */

export const SelectRoot = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export type SelectTriggerProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Trigger
>;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, style, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex h-9 w-full items-center justify-between gap-2 px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    style={{
      background: "var(--ls-bg-2)",
      border: "1px solid var(--ls-hairline)",
      borderRadius: "var(--ls-r-control)",
      color: "var(--ls-ink)",
      ...style,
    }}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown size={15} style={{ color: "var(--ls-ink-faint)" }} />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export type SelectContentProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Content
>;

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(({ className, style, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn("z-50 min-w-[8rem] overflow-hidden p-1", className)}
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-hairline)",
        borderRadius: "var(--ls-r-card)",
        boxShadow: "var(--ls-shadow-lift), inset 0 1px 0 var(--ls-top-hi)",
        ...style,
      }}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={
          position === "popper"
            ? "w-[var(--radix-select-trigger-width)]"
            : undefined
        }
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export type SelectItemProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Item
>;

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(({ className, style, children, ...props }, ref) => {
  const rawId = React.useId();
  // CSS 类名首字符不能是数字,useId 形如 ":r0:",剥离冒号得合法选择器(同 DropdownMenuItem 范式)
  const scope = `ls-sel-item-${rawId.replace(/:/g, "")}`;
  return (
    <>
      <style>{`
        .${scope}[data-highlighted] { background: var(--ls-bg-2); }
        .${scope}[data-disabled] { opacity: 0.45; pointer-events: none; }
      `}</style>
      <SelectPrimitive.Item
        ref={ref}
        className={cn(
          "ls-item relative flex w-full cursor-default select-none items-center py-2 pl-2.5 pr-8 text-sm outline-none",
          scope,
          className,
        )}
        style={{ color: "var(--ls-ink)", borderRadius: 10, ...style }}
        {...props}
      >
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex items-center">
          <Check size={14} style={{ color: "var(--ls-life)" }} />
        </SelectPrimitive.ItemIndicator>
      </SelectPrimitive.Item>
    </>
  );
});
SelectItem.displayName = "SelectItem";

/** options 驱动的便捷选项 */
export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps
  extends React.ComponentProps<typeof SelectPrimitive.Root> {
  /** 选项列表 */
  options: SelectOption[];
  /** 未选时的占位文案 */
  placeholder?: string;
  /** 透传到 Trigger 的类名 */
  className?: string;
}

/**
 * 高层便捷组件:传 options + placeholder 即得一个完整的生息选择器。
 * 需要更细粒度组合时改用低层 SelectRoot/SelectTrigger/SelectContent/SelectItem。
 */
export function Select({
  options,
  placeholder,
  className,
  ...props
}: SelectProps) {
  return (
    <SelectRoot {...props}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );
}
Select.displayName = "Select";
