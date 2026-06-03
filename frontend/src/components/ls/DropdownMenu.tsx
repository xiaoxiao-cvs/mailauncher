import * as React from "react";
import { motion } from "motion/react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

import { cn } from "@/lib/utils";
import { springPop } from "@/design/motion";

/**
 * 下拉菜单 —— 通用 anchored 菜单(包 @radix-ui/react-dropdown-menu)。
 * 与招牌 IconMenu(图标形变长出菜单)区别:这是标准锚定弹出菜单,适用于触发器旁弹出操作列表。
 *
 * 设计取舍:只换皮(Living Surfaces 面 / 控件样式 + 弹簧入场),交互与可访问性逻辑全部沿用 Radix
 * (键盘导航、focus 管理、portal、点击外部关闭、typeahead 均由 Radix 负责,不重写)。
 * - Content = ls-panel 实色面(var(--ls-surface) + 发丝边 + var(--ls-shadow-lift) + 顶高光),
 *   入场用 springPop 轻回弹 + 淡入;严禁 backdrop-blur 毛玻璃。
 * - Item = .ls-item 行,文字 var(--ls-ink);danger 项文字 var(--ls-danger);
 *   键盘/指针高亮态(Radix 的 data-highlighted)底色过渡到 var(--ls-bg-2),与 .ls-item:hover 一致。
 * - Separator = 1px var(--ls-hairline) 发丝线。
 * - Label = var(--ls-ink-faint) 最弱墨色分组标题。
 */

/** 根:透传 Radix Root,负责开合状态与可访问性上下文 */
export const DropdownMenu = DropdownMenuPrimitive.Root;

/** 触发器:透传 Radix Trigger(默认 asChild 由调用方决定),不强加样式以免覆盖触发元素自身观感 */
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

/** 分组:透传 Radix Group,用于语义聚合多条菜单项 */
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

/** Portal:透传 Radix Portal,允许调用方自定义挂载容器 */
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

export type DropdownMenuProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Root
>;
export type DropdownMenuTriggerProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Trigger
>;

/**
 * 菜单面板内容。Radix 在打开时 portal 挂载本组件,因此用 motion.div 包一层在挂载时播放一次入场
 * (springPop 轻回弹 + 淡入),随即归静——符合"动效只在交互/入场出现一次"。
 * sideOffset 默认 6 给触发器与面板一点呼吸;其余 Radix props(align/side/collisionPadding 等)全部透传。
 */
export type DropdownMenuContentProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Content
>;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  DropdownMenuContentProps
>(({ className, sideOffset = 6, style, children, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn("z-50 min-w-[11rem] p-1.5 outline-none", className)}
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-hairline)",
        borderRadius: "var(--ls-r-card)",
        boxShadow: "var(--ls-shadow-lift), inset 0 1px 0 var(--ls-top-hi)",
        // 弹簧入场放在内层 motion.div,容器本身不带过渡,避免与定位冲突
        transformOrigin: "var(--radix-dropdown-menu-content-transform-origin)",
        ...style,
      }}
      {...props}
      asChild
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={springPop}
      >
        {children}
      </motion.div>
    </DropdownMenuPrimitive.Content>
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

/**
 * 菜单项。沿用 .ls-item 行样式;高亮态(Radix 在键盘聚焦/指针悬停时置 data-highlighted)
 * 用与 .ls-item:hover 同样的 var(--ls-bg-2) 底,经 useId 注入一段作用域样式实现
 * (内联 style 无法命中 [data-highlighted] 选择器,故用 scoped <style>,颜色仍只走 var(--ls-*))。
 * danger=true 时文字与高亮边沿走 var(--ls-danger)。
 */
export interface DropdownMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  /** 破坏性动作(如删除),文字与高亮态走危险语义色 */
  danger?: boolean;
}

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuItemProps
>(({ className, danger, style, ...props }, ref) => {
  const rawId = React.useId();
  // CSS 类名首字符不能是数字,useId 形如 ":r0:",用前缀并剥离冒号得到合法选择器
  const scope = `ls-dd-item-${rawId.replace(/:/g, "")}`;
  return (
    <>
      <style>{`
        .${scope}[data-highlighted] {
          background: var(--ls-bg-2);
        }
        .${scope}[data-disabled] {
          opacity: 0.45;
          pointer-events: none;
        }
      `}</style>
      <DropdownMenuPrimitive.Item
        ref={ref}
        className={cn(
          "ls-item relative flex cursor-default select-none items-center gap-2.5 px-2.5 py-2 text-sm outline-none",
          scope,
          className,
        )}
        style={{
          color: danger ? "var(--ls-danger)" : "var(--ls-ink)",
          borderRadius: 10,
          ...style,
        }}
        {...props}
      />
    </>
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";

/** 发丝分隔线:1px var(--ls-hairline),左右负边距贴合面板内边距 */
export type DropdownMenuSeparatorProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Separator
>;

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  DropdownMenuSeparatorProps
>(({ className, style, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1.5 my-1.5 h-px", className)}
    style={{ background: "var(--ls-hairline)", ...style }}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

/** 分组标题:最弱墨色 var(--ls-ink-faint),小字号,用于在面板内为菜单项分段标注 */
export type DropdownMenuLabelProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Label
>;

export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  DropdownMenuLabelProps
>(({ className, style, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "select-none px-2.5 py-1.5 text-[11px] font-medium",
      className,
    )}
    style={{ color: "var(--ls-ink-faint)", ...style }}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";
