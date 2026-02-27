import React, { useState, useEffect } from 'react'

interface Tab {
  id: string
  label: string
  component: React.ReactNode
}

interface OnboardingTabsProps {
  tabs: Tab[]
  stepColor: string
  onTabChange?: (tabId: string, tabIndex: number) => void
  currentTab?: number
  extraProps?: Record<string, any>
}

/**
 * 引导页 Tabs 组件
 * 用于在同一步骤内切换不同的配置页面
 */
export function OnboardingTabs({ tabs, onTabChange, currentTab = 0, extraProps }: OnboardingTabsProps) {
  const [activeTab, setActiveTab] = useState(currentTab)

  // 当父组件的 currentTab 变化时，同步更新内部状态
  useEffect(() => {
    if (tabs && currentTab >= 0 && currentTab < tabs.length) {
      setActiveTab(currentTab)
    }
  }, [currentTab, tabs])

  // 安全检查 - 移到 hooks 之后
  if (!tabs || tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#023e8a]/40 dark:text-white/40">
        <p>暂无配置项</p>
      </div>
    )
  }

  const handleTabClick = (index: number) => {
    if (index >= 0 && index < tabs.length) {
      setActiveTab(index)
      onTabChange?.(tabs[index].id, index)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs 导航 */}
      <div className="flex p-1 mb-6 bg-gray-100 dark:bg-white/5 rounded-lg self-start">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(index)}
            className={`
              relative px-4 py-1.5 text-[13px] font-medium rounded-[6px] transition-all duration-200 select-none
              ${activeTab === index
                ? 'text-gray-900 dark:text-white bg-white dark:bg-[#636366] shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 - 固定高度，内部滚动 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden -mx-1 px-1">
        <div className="animate-in fade-in-0 slide-in-from-right-2 duration-300">
          {tabs[activeTab] && (
            extraProps && React.isValidElement(tabs[activeTab].component)
              ? React.cloneElement(tabs[activeTab].component as React.ReactElement, extraProps)
              : tabs[activeTab].component
          )}
        </div>
      </div>
    </div>
  )
}
