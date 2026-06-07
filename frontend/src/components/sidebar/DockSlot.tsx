import { Icon } from "@iconify/react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { springTap } from "@/design/motion";

interface DockSlotProps {
  /** Iconify 图标(ph:*-thin,沿用侧栏图标契约) */
  icon: string;
  /** 用于 aria-label 与原生 tooltip(纯图标栏无文字,靠 title 认路) */
  label: string;
  /** 是否当前激活(图标染生命色) */
  active?: boolean;
  /** 路由项传 to(渲染 Link);非路由项(如通知)传 onClick(渲染 button) */
  to?: string;
  onClick?: () => void;
  /** 未读角标数(通知用,0/未传不显示) */
  badgeCount?: number;
  /**
   * 激活方块:由父级以绝对定位铺在图标之下——主导航传 layoutId 方块滑块、
   * 设置传静态方块。槽本身不画激活底、不设 overflow,以便方块在槽间无阻滑行。
   */
  children?: ReactNode;
}

/**
 * 竖栏图标格 —— 48px 方形,图标居中,纯图标(无文字),title 兜底可发现性。
 * 激活方块由父级渲染(见 children 注释),槽只负责图标 / 角标 / 按压回弹。
 */
export function DockSlot({
  icon,
  label,
  active,
  to,
  onClick,
  badgeCount,
  children,
}: DockSlotProps) {
  const inner = (
    <>
      {children}
      <span
        className="relative grid h-5 w-5 place-items-center"
        style={{ zIndex: 1 }}
      >
        <Icon
          icon={icon}
          width={18}
          height={18}
          style={{ color: active ? "var(--ls-life)" : "var(--ls-ink-soft)" }}
        />
        {badgeCount !== undefined && badgeCount > 0 && (
          <span
            className={cn(
              "ls-num absolute -right-1.5 -top-1.5 flex items-center justify-center rounded-full text-[10px] font-bold leading-none",
              badgeCount > 9 ? "h-4 w-4" : "h-3 w-3",
            )}
            style={{
              background: "var(--ls-danger)",
              color: "#fff",
              boxShadow: "var(--ls-shadow-soft)",
            }}
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </span>
    </>
  );

  const className = "ls-item relative grid h-11 w-11 place-items-center";
  const style = { borderRadius: "var(--ls-r-control)" };

  if (to) {
    return (
      <motion.div whileTap={{ scale: 0.92 }} transition={springTap}>
        <Link
          to={to}
          title={label}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={className}
          style={style}
        >
          {inner}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      transition={springTap}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={className}
      style={style}
    >
      {inner}
    </motion.button>
  );
}
