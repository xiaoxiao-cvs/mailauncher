import { useId } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { DockSlot } from "./DockSlot";
import { SIDEBAR_NAV_ITEMS } from "./constants";
import { springSettle } from "@/design/motion";

/**
 * 竖栏中段导航。
 *
 * 三个主路由(主页/实例管理/下载)共用一块 --ls-surface-hi 方块高面滑块——切路由时
 * 方块以 layoutId + springSettle 在槽间竖向滑行落定(SegmentControl 滑块范式的竖向版),
 * 把「当前在哪」表达成一块会落定的方片。
 *
 * 注:设置项不在此、不参与本滑块(独立激活,见 Sidebar),刻意避免方块跨容器从中段
 * 飞到底段——那是最易被 overflow 裁切卡住的路径。
 */
export function SidebarDockNav() {
  const location = useLocation();
  const slideId = useId();

  // 段前缀匹配:深链子路由(如 /instances/:id)下父级导航项仍保持高亮。
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="flex flex-col items-center gap-1.5">
      {SIDEBAR_NAV_ITEMS.map((item) => {
        const active = isActive(item.path);
        return (
          <DockSlot
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={active}
            to={item.path}
          >
            {active && (
              <motion.span
                layoutId={slideId}
                aria-hidden
                className="absolute inset-1"
                style={{
                  background: "var(--ls-surface-hi)",
                  borderRadius: "var(--ls-r-control)",
                  boxShadow:
                    "var(--ls-shadow-soft), inset 0 1px 0 var(--ls-top-hi)",
                }}
                transition={springSettle}
              />
            )}
          </DockSlot>
        );
      })}
    </div>
  );
}
