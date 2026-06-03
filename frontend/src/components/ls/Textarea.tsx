import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";

import { cn } from "@/lib/utils";
import { springSoft } from "@/design/motion";

/**
 * 多行输入 —— Living Surfaces 的凹陷式 textarea(native textarea 封装),与 Input 同款观感。
 * ls-inset 观感:--ls-bg-2 底 + 发丝边 + 控件圆角,无投影,墨色文字。
 * 聚焦时边框与外环从发丝色弹簧过渡到生命色 --ls-life,给"激活"反馈;失焦归位。
 * 给合理 min-height 起步,纵向可拉伸(resize-y),横向锁死避免撑破栅格。
 * 明暗双主题全靠 var(--ls-*) 自适配,占位色贴 --ls-ink-faint。
 * forwardRef 透传到底层 textarea,className 与全部原生 textarea 属性原样透传。
 */
export type TextareaProps = HTMLMotionProps<"textarea">;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, style, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    return (
      <motion.textarea
        ref={ref}
        {...props}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        // 占位色经 Tailwind 任意值变体绑定 token,随明暗自适配(::placeholder 无法走内联 style)
        // resize-y 仅放开纵向拉伸,横向固定;leading-relaxed 提升多行阅读舒适度
        className={cn(
          "ls-num w-full resize-y px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-[color:var(--ls-ink-faint)]",
          className,
        )}
        style={{
          background: "var(--ls-bg-2)",
          color: "var(--ls-ink)",
          // borderWidth/Style 静态声明,聚焦仅用 animate 切 borderColor + 外环
          borderWidth: 1,
          borderStyle: "solid",
          borderRadius: "var(--ls-r-control)",
          minHeight: "5.5rem",
          ...style,
        }}
        animate={{
          borderColor: focused ? "var(--ls-life)" : "var(--ls-hairline)",
          boxShadow: focused
            ? "0 0 0 3px var(--ls-life-soft)"
            : "0 0 0 0 transparent",
        }}
        transition={springSoft}
      />
    );
  },
);
Textarea.displayName = "Textarea";
