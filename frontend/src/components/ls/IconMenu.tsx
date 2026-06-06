import { useId, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

import { springMorph, springSettle, springPop } from "@/design/motion";

/**
 * 招牌交互:图标本体非线性形变为菜单(从图标长出,而非凭空出现)。
 * 同一块哑光面:闭合=36px 的 ··· chip;点击后 ··· 淡出消失、面 spring 长成菜单,
 * 菜单首行即第一项、无顶部空行;关闭时菜单缩回、··· 再带 springPop 弹性归位。
 *
 * 实现要点(与已定稿小样逐像素一致):
 * - 菜单项容器以固定展开宽度(EXPANDED_WIDTH)绝对锚定在角上,useLayoutEffect 测其自然高度(只含菜单项、
 *   不含图标行 -> 无顶部空行),展开时面动画到该高度。
 * - align 决定锚定边(右/左),其余动效与样式全部复用 design token。
 */
export interface IconMenuItem {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  onSelect?: () => void;
}

export interface IconMenuProps {
  items: IconMenuItem[];
  align?: "left" | "right";
}

const CLOSED = 36;
const EXPANDED_WIDTH = 184;

export function IconMenu({ items, align = "right" }: IconMenuProps) {
  const [open, setOpen] = useState(false);
  const itemsRef = useRef<HTMLDivElement>(null);
  const [openH, setOpenH] = useState(CLOSED);
  const menuId = useId();

  // 在固定展开宽度下测一次菜单自然高度(随 items 变化重测),保证展开后首行即第一项。
  useLayoutEffect(() => {
    if (itemsRef.current) setOpenH(itemsRef.current.scrollHeight);
  }, [items]);

  const edge = align === "right" ? "right-0" : "left-0";

  return (
    <div className="relative h-9 w-9">
      {open && (
        <button
          type="button"
          aria-label="关闭菜单"
          className="fixed inset-0 z-10 cursor-default"
          onClick={() => setOpen(false)}
        />
      )}

      <motion.div
        className={`absolute top-0 z-20 overflow-hidden ${edge}`}
        onPointerLeave={(e) => {
          // 鼠标/触控笔移出菜单即关(最轻);触摸设备无 hover,仍靠下方 fixed 背板点外部关闭。
          if (open && e.pointerType !== "touch") setOpen(false);
        }}
        initial={false}
        animate={{
          width: open ? EXPANDED_WIDTH : CLOSED,
          height: open ? openH : CLOSED,
          borderRadius: open ? 16 : 12,
        }}
        transition={springMorph}
        style={{
          background: "var(--ls-surface-hi)",
          border: "1px solid var(--ls-hairline)",
          boxShadow: open
            ? "var(--ls-shadow-lift), inset 0 1px 0 var(--ls-top-hi)"
            : "var(--ls-shadow-soft), inset 0 1px 0 var(--ls-top-hi)",
        }}
      >
        {/* 菜单项:首行即第一项,固定展开宽度以稳定测高;展开时由上而下逐条淡入 */}
        <div
          ref={itemsRef}
          id={menuId}
          role="menu"
          className={`absolute top-0 p-1.5 ${edge}`}
          style={{ width: EXPANDED_WIDTH }}
        >
          {items.map((it, i) => (
            <motion.button
              key={it.label}
              type="button"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onClick={() => {
                it.onSelect?.();
                setOpen(false);
              }}
              whileTap={{ scale: 0.97 }}
              initial={false}
              animate={{ opacity: open ? 1 : 0, x: open ? 0 : -8 }}
              transition={{
                ...springSettle,
                delay: open ? 0.05 + i * 0.04 : 0,
              }}
              style={{
                color: it.danger ? "var(--ls-danger)" : "var(--ls-ink)",
                borderRadius: 10,
                pointerEvents: open ? "auto" : "none",
              }}
              className="ls-item flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-sm"
            >
              <it.icon size={16} />
              {it.label}
            </motion.button>
          ))}
        </div>

        {/* ··· 图标:闭合时居中显示;点击展开后快速淡出消失;关闭时带弹性归位 */}
        <motion.button
          type="button"
          aria-label="更多"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen(true)}
          initial={false}
          animate={{ opacity: open ? 0 : 1, scale: open ? 0.7 : 1 }}
          transition={open ? { duration: 0.1 } : { ...springPop, delay: 0.06 }}
          className={`absolute top-0 flex h-9 w-9 items-center justify-center ${edge}`}
          style={{
            color: "var(--ls-ink-soft)",
            pointerEvents: open ? "none" : "auto",
          }}
        >
          <MoreHorizontal size={18} />
        </motion.button>
      </motion.div>
    </div>
  );
}
IconMenu.displayName = "IconMenu";
