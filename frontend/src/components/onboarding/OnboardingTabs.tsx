import { useState, useEffect } from 'react'

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
}

/**
 * 引导页 Tabs 组件
 * 用于在同一步骤内切换不同的配置页面
 */
export function OnboardingTabs({ tabs, stepColor, onTabChange, currentTab = 0 }: OnboardingTabsProps) {
  const [activeTab, setActiveTab] = useState(currentTab)

  // 当父组件的 currentTab 变化时，同步更新内部状态
  useEffect(() => {
    setActiveTab(currentTab)
  }, [currentTab])

  const handleTabClick = (index: number) => {
    setActiveTab(index)
    onTabChange?.(tabs[index].id, index)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs 导航 */}
      <div className="flex gap-1 mb-4 border-b border-[#023e8a]/10 dark:border-[#3a3a3a] flex-shrink-0">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(index)}
            className={`
              relative px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200
              ${activeTab === index
                ? 'text-[#023e8a] dark:text-white bg-white/60 dark:bg-[#2e2e2e]'
                : 'text-[#023e8a]/60 dark:text-white/60 hover:text-[#023e8a] dark:hover:text-white hover:bg-white/30 dark:hover:bg-[#2e2e2e]/50'
              }
            `}
          >
            {tab.label}
            {/* 活动指示器 */}
            {activeTab === index && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                style={{ backgroundColor: stepColor }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab 内容 - 固定高度，内部滚动 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="animate-in fade-in-0 slide-in-from-right-2 duration-300">
          {tabs[activeTab].component}
        </div>
      </div>
    </div>
  )
}
