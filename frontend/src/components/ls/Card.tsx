import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";

import { cn } from "@/lib/utils";
import { springSettle, springTap } from "@/design/motion";

/**
 * 哑光卡片 —— 数据看板的基础容器(.ls-card + 内边距 + 悬浮微抬)。
 * 配合父级 variants 容器做交错入场:卡片自带 child 变体(淡入上移),
 * 父层用 staggerChildren 编排即可。whileHover 微抬给"跟手"反馈。
 */
const cardChild = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: springSettle },
};

export interface CardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={cardChild}
      whileHover={{ y: -2 }}
      transition={springTap}
      className={cn("ls-card p-4", className)}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
Card.displayName = "Card";
