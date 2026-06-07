import { Icon } from "@iconify/react";
import { motion } from "motion/react";
import { Notification } from "@/types/notification";
import { NotificationItem } from "./NotificationItem";
import { TactileButton } from "@/components/ls";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { springSettle } from "@/design/motion";

interface NotificationPopoverProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 通知列表 */
  notifications: Notification[];
  /** 删除单个通知 */
  onRemove: (id: string) => void;
  /** 清空所有通知 */
  onClearAll: () => void;
  /** 关闭气泡 */
  onClose: () => void;
  /** 点击通知项 */
  onNotificationClick: (notification: Notification) => void;
  /** 气泡左缘像素位置(贴栏右缘,由侧栏计算) */
  anchorLeft: number;
  /** 气泡上缘像素位置(对齐铃铛纵向位置) */
  anchorTop: number;
}

/** 列表交错入场:父级编排、子项落定(替代原 anime.js stack-item 动画)。 */
const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};
const listChild = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: springSettle },
};

/**
 * 职责：
 * - 显示通知列表
 * - 支持删除单个通知
 * - 支持清空所有通知
 * - 点击外部区域关闭
 * - 已完成任务堆叠显示
 */
export function NotificationPopover({
  isOpen,
  notifications,
  onRemove,
  onClearAll,
  onClose,
  onNotificationClick,
  anchorLeft,
  anchorTop,
}: NotificationPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isStackExpanded, setIsStackExpanded] = useState(false);

  // 关闭时重置堆叠状态
  useEffect(() => {
    if (!isOpen) setIsStackExpanded(false);
  }, [isOpen]);

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 是否显示堆叠视图
  const showStack = notifications.length > 1 && !isStackExpanded;

  return (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={springSettle}
      className={cn(
        "ls-panel fixed z-50",
        "w-[400px]",
        "max-h-[60vh]",
        "flex flex-col",
      )}
      style={{
        left: anchorLeft,
        top: anchorTop,
      }}
    >
      {/* 头部 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--ls-hairline)" }}
      >
        <h3
          className="text-[13px] font-semibold tracking-wide"
          style={{ color: "var(--ls-ink)" }}
        >
          {notifications.length > 1
            ? `共 ${notifications.length} 个通知`
            : "通知中心"}
        </h3>

        {notifications.length > 0 && (
          <button
            onClick={onClearAll}
            className="ls-item p-1.5 rounded-full transition-colors"
            style={{ color: "var(--ls-ink-soft)" }}
            title="全部清除"
          >
            <Icon icon="ph:trash" className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 通知列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
        {notifications.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-32"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            <Icon icon="ph:bell-slash" className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-xs">暂无通知</p>
          </div>
        ) : showStack ? (
          // 堆叠视图:顶卡之下用凹陷面错位铺出"还有更多"的层叠暗示
          <div
            className="group relative cursor-pointer select-none pt-2 px-1"
            onClick={() => setIsStackExpanded(true)}
          >
            <div className="ls-inset absolute top-0 left-2 right-2 h-full transform scale-[0.96] translate-y-1 z-0 transition-transform duration-300 group-hover:translate-y-2" />
            <div className="ls-inset absolute top-2 left-4 right-4 h-full transform scale-[0.92] translate-y-2 -z-10 transition-transform duration-300 group-hover:translate-y-4" />

            {/* 顶部卡片 - 点击展开 */}
            <div className="relative z-10">
              <NotificationItem
                notification={notifications[0]}
                onRemove={onRemove}
                onClick={() => setIsStackExpanded(true)}
              />
            </div>
          </div>
        ) : (
          // 展开列表视图:交错入场
          <motion.div
            className="space-y-2"
            variants={listContainer}
            initial="hidden"
            animate="show"
          >
            {isStackExpanded && (
              <div className="flex justify-end px-1">
                <TactileButton
                  variant="solid"
                  onClick={() => setIsStackExpanded(false)}
                  className="px-2 py-0.5 text-[10px]"
                >
                  折叠
                </TactileButton>
              </div>
            )}
            {notifications.map((notification) => (
              <motion.div key={notification.id} variants={listChild}>
                <NotificationItem
                  notification={notification}
                  onRemove={onRemove}
                  onClick={onNotificationClick}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
