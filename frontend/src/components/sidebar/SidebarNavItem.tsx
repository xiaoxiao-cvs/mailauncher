import { Icon } from "@iconify/react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import type { SidebarNavItem } from "@/types/sidebar";
import { cn } from "@/lib/utils";
import { springTap } from "@/design/motion";

interface SidebarNavItemComponentProps {
  item: SidebarNavItem;
  isCollapsed: boolean;
}

/**
 * 侧边栏导航项组件
 * 职责：渲染单个导航项，支持展开/收起状态
 *
 * 生息风格：激活态用 --ls-life 生命色（左侧指示条 + 文字/图标着色），
 * 静默行 hover 经 .ls-item 过渡到 --ls-bg-2；按压用 springTap 跟手回弹。
 */
export function SidebarNavItemComponent({
  item,
  isCollapsed,
}: SidebarNavItemComponentProps) {
  const location = useLocation();
  // 段前缀匹配:深链子路由(如 /monitor/cpu、/instances/:id)下父级导航项仍保持高亮
  const isActive =
    location.pathname === item.path ||
    location.pathname.startsWith(item.path + "/");

  return (
    <motion.div whileTap={{ scale: 0.95 }} transition={springTap}>
      <Link
        to={item.path}
        className={cn(
          "ls-item relative flex items-center overflow-hidden py-2.5",
          // 统一使用固定的左内边距，确保图标位置不变
          "pl-[18px]",
          // 展开时：右边距
          !isCollapsed && "pr-4",
          // 收起时：右边距与左边距相等，实现居中
          isCollapsed && "pr-[18px] justify-center",
        )}
        style={{
          borderRadius: "var(--ls-r-control)",
          // 激活态：实色面 + 发丝边 + 柔影 + 顶高光，从背景里“鼓”起来
          ...(isActive
            ? {
                background: "var(--ls-surface)",
                border: "1px solid var(--ls-hairline)",
                boxShadow:
                  "var(--ls-shadow-soft), inset 0 1px 0 var(--ls-top-hi)",
              }
            : null),
        }}
      >
        {/* 激活指示条 —— 生命色，唯一的正向信号点缀 */}
        {isActive && !isCollapsed && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
            style={{ background: "var(--ls-life)" }}
          />
        )}

        {/* 图标容器 - 固定宽度确保垂直居中对齐 */}
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <Icon
            icon={item.icon}
            width={20}
            height={20}
            style={{
              color: isActive ? "var(--ls-life)" : "var(--ls-ink-soft)",
            }}
          />
        </div>

        {/* 文字标签 - 仅在展开时显示，使用 margin 代替 gap，确保位置过渡平滑 */}
        <span
          className={cn(
            "text-sm font-medium whitespace-nowrap transition-all duration-200",
            // 收起时完全隐藏（opacity + width），展开时平滑出现
            isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100 ml-3",
          )}
          style={{ color: isActive ? "var(--ls-ink)" : "var(--ls-ink-soft)" }}
        >
          {item.label}
        </span>

        {/* 收起状态的激活描边 - 生命色发丝环，四边等宽 */}
        {isActive && isCollapsed && (
          <span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              border: "1px solid var(--ls-life)",
              borderRadius: "var(--ls-r-control)",
            }}
          />
        )}
      </Link>
    </motion.div>
  );
}
