import { SidebarNavItemComponent } from "./SidebarNavItem";
import { SIDEBAR_NAV_ITEMS, SIDEBAR_BOTTOM_ITEMS } from "./constants";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";
import { cn } from "@/lib/utils";
// import { useSidebar } from '@/hooks/useSidebar'
import { useNotificationContext } from "@/contexts/NotificationContext";
import { useState, useEffect } from "react";
import InstallLogModal from "../install/InstallLogModal";
import { Notification } from "@/types/notification";
import {
  registerNotificationHandlers,
  setupNotificationTestCommands,
} from "@/utils/notificationTestTool";

/**
 * 侧边栏组件
 * 职责：提供应用导航
 *
 * 设计特点（生息 Living Surfaces）：
 * - 始终展开状态
 * - 悬浮圆角矩形设计
 * - 实色哑光面：--ls-surface 背景 + 发丝边 + 柔影 + 顶高光，零玻璃
 * - 当前页面高亮显示
 * - 通知中心功能
 */
export function Sidebar() {
  // 始终保持展开状态
  const isCollapsed = false;

  // 通知管理
  const {
    notifications,
    unreadCount,
    isPopoverOpen,
    removeNotification,
    clearAllNotifications,
    togglePopover,
    closePopover,
    addMessageNotification,
    addWarningNotification,
    addErrorNotification,
    addTaskNotification,
    updateTaskProgress,
  } = useNotificationContext();

  // 注册测试工具（开发环境）
  useEffect(() => {
    if (import.meta.env.DEV) {
      registerNotificationHandlers({
        addMessageNotification,
        addWarningNotification,
        addErrorNotification,
        addTaskNotification,
        updateTaskProgress,
        clearAllNotifications,
      });
      setupNotificationTestCommands();
    }
  }, [
    addMessageNotification,
    addWarningNotification,
    addErrorNotification,
    addTaskNotification,
    updateTaskProgress,
    clearAllNotifications,
  ]);

  // 调试日志
  useEffect(() => {
    console.log("[Notification] 通知列表更新:", notifications);
    console.log("[Notification] 未读数量:", unreadCount);
  }, [notifications, unreadCount]);

  // 日志模态框状态
  const [logModal, setLogModal] = useState<{
    isOpen: boolean;
    notification: Notification | null;
  }>({
    isOpen: false,
    notification: null,
  });

  // 处理通知点击 - 所有类型的通知都可以点击查看详情
  const handleNotificationClick = (notification: Notification) => {
    setLogModal({
      isOpen: true,
      notification,
    });
    closePopover();
  };

  return (
    <aside
      className={cn(
        // 实色哑光面 + 布局
        "h-full flex flex-col relative z-50",
        // 宽度
        "w-64",
      )}
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-hairline)",
        borderRadius: "var(--ls-r-panel)",
        boxShadow: "var(--ls-shadow-soft), inset 0 1px 0 var(--ls-top-hi)",
      }}
    >
      {/* 顶部：Logo 区域 */}
      <div
        className="px-4 py-6 overflow-hidden"
        style={{ borderBottom: "1px solid var(--ls-hairline)" }}
      >
        <div className="flex items-center gap-3 justify-start">
          {/* Logo 图标 —— 生命色克制点缀 */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "var(--ls-life)",
              boxShadow: "inset 0 1px 0 var(--ls-top-hi)",
            }}
          >
            <span className="font-bold text-sm" style={{ color: "#fff" }}>
              MAI
            </span>
          </div>

          {/* Logo 文字 */}
          <span
            className="text-lg font-semibold whitespace-nowrap"
            style={{ color: "var(--ls-ink)" }}
          >
            mailauncher
          </span>
        </div>
      </div>

      {/* 中间：主导航区域 */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {SIDEBAR_NAV_ITEMS.map((item) => (
          <SidebarNavItemComponent
            key={item.id}
            item={item}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* 底部：通知和设置 */}
      <div className="px-3 pb-4 space-y-2 pt-4 mt-auto">
        {/* 通知铃铛 */}
        <NotificationBell
          unreadCount={unreadCount}
          isCollapsed={isCollapsed}
          onClick={togglePopover}
        />

        {/* 设置按钮 */}
        {SIDEBAR_BOTTOM_ITEMS.map((item) => (
          <SidebarNavItemComponent
            key={item.id}
            item={item}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>

      {/* 通知气泡 */}
      <NotificationPopover
        isOpen={isPopoverOpen}
        notifications={notifications}
        onRemove={removeNotification}
        onClearAll={clearAllNotifications}
        onClose={closePopover}
        onNotificationClick={handleNotificationClick}
        isCollapsed={isCollapsed}
      />

      {/* 通知详情模态框 */}
      <InstallLogModal
        isOpen={logModal.isOpen}
        notification={logModal.notification}
        onClose={() => setLogModal({ isOpen: false, notification: null })}
      />
    </aside>
  );
}
