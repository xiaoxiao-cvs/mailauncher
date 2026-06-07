import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { DockSlot } from "./DockSlot";
import { SidebarDockNav } from "./SidebarDockNav";
import { MaiMark } from "./MaiMark";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";
import { useNotificationContext } from "@/contexts/NotificationContext";
import InstallLogModal from "../install/InstallLogModal";
import { Notification } from "@/types/notification";
import {
  registerNotificationHandlers,
  setupNotificationTestCommands,
} from "@/utils/notificationTestTool";

/**
 * 侧边栏 —— 左侧顶对齐的紧凑实心栏(生息 Living Surfaces)
 *
 * 形态:贴左缘、顶对齐的紧凑窄栏(约 60px,纯图标),内容多高就多高、下方留白,
 * 不沾满高度、不浮岛居中、不展开折叠。实色哑光面三件套,零玻璃。
 * 激活态是一块会滑行落定的「方块高面」(见 SidebarDockNav);设置独立方块激活。
 * 导航纯图标,靠 title tooltip 认路。
 */

// 通知气泡贴栏右缘:外层 p-4 左留白(16)+ 栏宽(60)+ 气槽(10)
const POPOVER_LEFT = 16 + 60 + 10;

export function Sidebar() {
  const location = useLocation();

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

  // 注册测试工具(开发环境)
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

  // 通知气泡纵向锚点:贴齐铃铛(栏顶对齐后铃铛在上方,气泡随之上移、不再钉在底部)。
  const bellWrapRef = useRef<HTMLDivElement>(null);
  const [popoverTop, setPopoverTop] = useState(0);
  useLayoutEffect(() => {
    if (isPopoverOpen && bellWrapRef.current) {
      setPopoverTop(bellWrapRef.current.getBoundingClientRect().top);
    }
  }, [isPopoverOpen]);

  const settingsActive = location.pathname.startsWith("/settings");

  return (
    <div className="flex h-full flex-shrink-0 items-start p-4 pr-0">
      <aside
        aria-label="主导航"
        className="flex w-[60px] flex-col items-center gap-1.5 p-2"
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-hairline)",
          borderRadius: "var(--ls-r-panel)",
          boxShadow: "var(--ls-shadow-soft), inset 0 1px 0 var(--ls-top-hi)",
        }}
      >
        {/* 顶:品牌徽标 —— 麦麦头顶的嫩芽(生命色),立在素纸方片上 */}
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center"
          style={{
            background: "var(--ls-surface-hi)",
            border: "1px solid var(--ls-hairline)",
            borderRadius: "var(--ls-r-control)",
            boxShadow: "var(--ls-shadow-soft), inset 0 1px 0 var(--ls-top-hi)",
          }}
        >
          <MaiMark size={28} />
        </div>

        <div
          className="h-px w-7"
          style={{ background: "var(--ls-hairline)" }}
        />

        {/* 中:导航(主路由共用方块滑块) */}
        <SidebarDockNav />

        <div
          className="h-px w-7"
          style={{ background: "var(--ls-hairline)" }}
        />

        {/* 底:通知(非路由,弹气泡)+ 设置(独立方块激活) */}
        <div ref={bellWrapRef}>
          <DockSlot
            icon="ph:bell-thin"
            label="通知"
            onClick={togglePopover}
            badgeCount={unreadCount}
          />
        </div>
        <DockSlot
          icon="ph:gear-thin"
          label="设置"
          active={settingsActive}
          to="/settings"
        >
          {settingsActive && (
            <span
              aria-hidden
              className="absolute inset-1"
              style={{
                background: "var(--ls-surface-hi)",
                borderRadius: "var(--ls-r-control)",
                boxShadow:
                  "var(--ls-shadow-soft), inset 0 1px 0 var(--ls-top-hi)",
              }}
            />
          )}
        </DockSlot>
      </aside>

      {/* 通知气泡 —— 贴栏右缘、对齐铃铛纵向位置 */}
      <NotificationPopover
        isOpen={isPopoverOpen}
        notifications={notifications}
        onRemove={removeNotification}
        onClearAll={clearAllNotifications}
        onClose={closePopover}
        onNotificationClick={handleNotificationClick}
        anchorLeft={POPOVER_LEFT}
        anchorTop={popoverTop}
      />

      {/* 通知详情模态框 */}
      <InstallLogModal
        isOpen={logModal.isOpen}
        notification={logModal.notification}
        onClose={() => setLogModal({ isOpen: false, notification: null })}
      />
    </div>
  );
}
