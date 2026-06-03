import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";
import { springTap } from "@/design/motion";

/**
 * 通用按钮 —— Living Surfaces 的按钮矩阵(与招牌特例 TactileButton 并存)。
 * TactileButton 是"重按压感"的单一语气特例;Button 覆盖六种通用语气的完整矩阵。
 * 视觉色彩全部取自 design token(明暗双主题自适配),手感由 springTap 弹簧回弹给出。
 */
export type ButtonVariant =
  | "solid"
  | "ghost"
  | "outline"
  | "destructive"
  | "life"
  | "link";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 以 Radix Slot 透传:把按钮的视觉/属性合并到子元素上,不额外包裹 motion。 */
  asChild?: boolean;
}

/** 各语气的背景填充(语气 -> CSS 背景值)。 */
const variantBackground: Record<ButtonVariant, string> = {
  solid: "var(--ls-surface-hi)",
  ghost: "transparent",
  outline: "transparent",
  destructive: "var(--ls-danger)",
  life: "var(--ls-life)",
  link: "transparent",
};

/** 各语气的文字色;destructive / life 为白字,link 以墨弱起 hover 转主墨。 */
const variantColor: Record<ButtonVariant, string> = {
  solid: "var(--ls-ink)",
  ghost: "var(--ls-ink)",
  outline: "var(--ls-ink)",
  destructive: "#fff",
  life: "#fff",
  link: "var(--ls-ink-soft)",
};

/** 仅 solid 用柔影起鼓;其余语气保持平面(outline 靠发丝边、ghost/link 全透明)。 */
const variantShadow: Record<ButtonVariant, string> = {
  solid: "var(--ls-shadow-soft)",
  ghost: "none",
  outline: "none",
  destructive: "var(--ls-shadow-soft)",
  life: "var(--ls-shadow-soft)",
  link: "none",
};

/** 仅 outline 描发丝边;link 完全无边、无内边距偏移,其余语气均无边框。 */
const variantBorder: Record<ButtonVariant, string> = {
  solid: "1px solid transparent",
  ghost: "1px solid transparent",
  outline: "1px solid var(--ls-hairline)",
  destructive: "1px solid transparent",
  life: "1px solid transparent",
  link: "1px solid transparent",
};

/** 尺寸 -> 内边距与字号的结构类(颜色一律走 token,此处仅排版)。 */
const sizeClass: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-4 py-2.5 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "solid",
      size = "md",
      asChild = false,
      className,
      style,
      type,
      ...props
    },
    ref,
  ) => {
    const isLink = variant === "link";
    const sharedStyle: React.CSSProperties = {
      background: variantBackground[variant],
      color: variantColor[variant],
      border: variantBorder[variant],
      // link 无底盘:不给圆角投影,只做文字态变化
      borderRadius: isLink ? 0 : "var(--ls-r-control)",
      boxShadow: variantShadow[variant],
      ...style,
    };

    // ghost / link 复用 .ls-item 的 hover 反馈(背景过渡到 --ls-bg-2,
    // 这是 token 层唯一允许的非弹簧 CSS hover 微过渡)。
    const baseClass = cn(
      "ls-num inline-flex select-none items-center justify-center gap-2 font-medium",
      isLink ? "px-0 py-0 underline-offset-4 hover:underline" : sizeClass[size],
      (variant === "ghost" || isLink) && "ls-item",
      className,
    );

    // asChild:用 Slot 把样式/属性合并进调用方提供的子元素,刻意不套 motion(按规格)。
    // props 内已含 children,直接整体透传给 Slot 即可。
    if (asChild) {
      return (
        <Slot ref={ref} className={baseClass} style={sharedStyle} {...props} />
      );
    }

    // 原生 button 属性与 motion 的少数同名事件处理器(onDrag* / onAnimation*)签名不同,
    // 本组件不使用这些处理器,故对透传属性做一次类型对齐(行为无影响)。
    const motionProps = props as HTMLMotionProps<"button">;
    // link 语气:hover 时墨色由弱(--ls-ink-soft)收紧到主墨(--ls-ink);
    // 因色值取自 token、无法用纯 CSS hover 类引用,故由 motion whileHover 驱动。
    const whileHover = isLink ? { color: "var(--ls-ink)" } : undefined;
    return (
      <motion.button
        ref={ref}
        type={type ?? "button"}
        className={baseClass}
        style={sharedStyle}
        whileHover={whileHover}
        whileTap={{ scale: 0.97 }}
        transition={springTap}
        {...motionProps}
      />
    );
  },
);
Button.displayName = "Button";
