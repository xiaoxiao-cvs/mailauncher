import React, { useId, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { springSettle } from "@/design/motion";

interface Tab {
  id: string;
  label: string;
  component: React.ReactNode;
}

interface OnboardingTabsProps {
  tabs: Tab[];
  stepColor: string;
  onTabChange?: (tabId: string, tabIndex: number) => void;
  currentTab?: number;
  extraProps?: Record<string, any>;
}

/**
 * 引导页 Tabs 组件
 * 用于在同一步骤内切换不同的配置页面
 *
 * 保留 bespoke 结构(而非 LS Tabs):需要把 extraProps 经 cloneElement 注入激活页,
 * 并与父级 currentTab 受控同步,Radix Tabs 的内容挂载模型不便承载。
 * 仅换皮为生息分段控件(凹陷轨 + 高面滑块 layoutId)+ 弹簧内容入场。
 */
export function OnboardingTabs({
  tabs,
  onTabChange,
  currentTab = 0,
  extraProps,
}: OnboardingTabsProps) {
  const [activeTab, setActiveTab] = useState(currentTab);
  const layoutId = useId();

  // 当父组件的 currentTab 变化时，同步更新内部状态
  useEffect(() => {
    if (tabs && currentTab >= 0 && currentTab < tabs.length) {
      setActiveTab(currentTab);
    }
  }, [currentTab, tabs]);

  // 安全检查 - 移到 hooks 之后
  if (!tabs || tabs.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        <p>暂无配置项</p>
      </div>
    );
  }

  const handleTabClick = (index: number) => {
    if (index >= 0 && index < tabs.length) {
      setActiveTab(index);
      onTabChange?.(tabs[index].id, index);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs 导航:生息凹陷分段轨 + 高面滑块 */}
      <div
        className="ls-inset flex p-0.5 mb-6 self-start text-sm"
        style={{ borderRadius: "var(--ls-r-control)" }}
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === index;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(index)}
              className="relative px-4 py-1.5 font-medium select-none outline-none"
              style={{
                color: isActive ? "var(--ls-ink)" : "var(--ls-ink-soft)",
              }}
            >
              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0"
                  style={{
                    background: "var(--ls-surface-hi)",
                    borderRadius: 9,
                    boxShadow: "var(--ls-shadow-soft)",
                  }}
                  transition={springSettle}
                />
              )}
              <span className="relative">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 内容 - 固定高度，内部滚动 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden -mx-1 px-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tabs[activeTab]?.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={springSettle}
          >
            {tabs[activeTab] &&
              (extraProps && React.isValidElement(tabs[activeTab].component)
                ? React.cloneElement(
                    tabs[activeTab].component as React.ReactElement,
                    extraProps,
                  )
                : tabs[activeTab].component)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
