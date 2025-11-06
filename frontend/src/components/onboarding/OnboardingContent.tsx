import { RefObject, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRightIcon, CheckCircle2Icon } from 'lucide-react'
import { ThemeSelector } from '@/components/theme'
import { EnvironmentCheck } from './EnvironmentCheck'
import { OnboardingTabs } from './OnboardingTabs'
import type { OnboardingStep } from '@/types/onboarding'

interface OnboardingContentProps {
  steps: OnboardingStep[]
  currentStep: number
  currentStepData: OnboardingStep
  isAnimating: boolean
  contentRef: RefObject<HTMLDivElement>
  onNext: () => void
  onPrevious: () => void
}

/**
 * 引导页内容区组件
 * 职责：展示当前步骤的详细内容和操作按钮
 */
export function OnboardingContent({
  steps,
  currentStep,
  currentStepData,
  isAnimating,
  contentRef,
  onNext,
  onPrevious
}: OnboardingContentProps) {
  const [currentTabIndex, setCurrentTabIndex] = useState(0)
  const hasTabs = currentStepData.tabs && currentStepData.tabs.length > 0
  const isLastTab = hasTabs && currentTabIndex === (currentStepData.tabs?.length ?? 0) - 1

  // 当步骤改变时，重置 Tab 索引
  useEffect(() => {
    setCurrentTabIndex(0)
  }, [currentStep])

  // 处理下一页（Tab）或下一步
  const handleNext = () => {
    if (hasTabs && !isLastTab) {
      // 如果有 Tabs 且不是最后一个 Tab，切换到下一个 Tab
      setCurrentTabIndex(prev => prev + 1)
    } else {
      // 否则，进入下一步
      setCurrentTabIndex(0) // 重置 Tab 索引
      onNext()
    }
  }

  // 处理上一页（Tab）或上一步
  const handlePrevious = () => {
    if (hasTabs && currentTabIndex > 0) {
      // 如果有 Tabs 且不是第一个 Tab，切换到上一个 Tab
      setCurrentTabIndex(prev => prev - 1)
    } else {
      // 否则，返回上一步
      onPrevious()
    }
  }

  return (
    <div className="flex-1">
      <div className="bg-white/50 dark:bg-[#1f1f1f]/50 backdrop-blur-xl rounded-2xl p-8 md:p-12 border border-white/60 dark:border-[#2e2e2e]/40 shadow-xl min-h-[680px] flex flex-col transition-colors duration-500">
        {/* 内容区域 - 包含移动端指示器以确保动画一致 */}
        <div ref={contentRef} className="flex-1 flex flex-col">
          {/* 移动端步骤指示器 */}
          <div className="md:hidden flex justify-center gap-2 mb-6">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`step-indicator-bg h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep ? 'w-8' : 'w-1.5'
                }`}
                style={{
                  ['--indicator-color' as string]: index === currentStep 
                    ? currentStepData.color 
                    : `${currentStepData.color}40`
                } as React.CSSProperties}
              />
            ))}
          </div>

          {/* 标题区域 */}
          <div className="mb-8">
            <div className="step-badge-bg inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4">
              <span className="step-text-color text-xs font-medium">
                步骤 {currentStep + 1} / {steps.length}
              </span>
            </div>
            <h2 className="text-4xl font-bold text-[#03045e] dark:text-white mb-3">
              {currentStepData.title}
            </h2>
            <p className="text-xl text-[#023e8a]/70 dark:text-white/80 font-medium">
              {currentStepData.subtitle}
            </p>
          </div>

          {/* 内容区域 - 根据步骤类型显示不同内容 */}
          <div className="mb-8 flex flex-col h-[420px] overflow-hidden">
            {hasTabs ? (
              /* 显示 Tabs */
              <OnboardingTabs
                tabs={currentStepData.tabs!}
                stepColor={currentStepData.color}
                currentTab={currentTabIndex}
                onTabChange={(_tabId, tabIndex) => setCurrentTabIndex(tabIndex)}
              />
            ) : currentStepData.isSettingsStep ? (
              /* 设置表单 */
              <div className="space-y-4">
                <ThemeSelector />
              </div>
            ) : currentStepData.isEnvironmentStep ? (
              /* 环境检查 */
              <EnvironmentCheck stepColor={currentStepData.color} />
            ) : (
              /* 特性列表 */
              <div className="space-y-4">
                {currentStepData.description.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white/60 dark:bg-[#2e2e2e] hover:bg-white/80 dark:hover:bg-[#3a3a3a] transition-all duration-300 hover:shadow-md"
                  >
                    <div 
                      className="step-icon-bg w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0"
                      style={{
                        ['--icon-color' as string]: currentStepData.color,
                        ['--icon-color-dark' as string]: `${currentStepData.color}dd`
                      } as React.CSSProperties}
                    >
                      {index + 1}
                    </div>
                    <p className="text-[#023e8a] dark:text-white leading-relaxed flex-1 text-sm pt-1.5">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-between gap-4 pt-6 border-t border-[#023e8a]/10 dark:border-[#2e2e2e]">
            {(currentStep > 0 || (hasTabs && currentTabIndex > 0)) ? (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isAnimating}
                className="bg-white/60 dark:bg-[#2e2e2e] border-[#023e8a]/20 dark:border-[#3a3a3a] text-[#023e8a] dark:text-white hover:bg-white dark:hover:bg-[#3a3a3a]"
              >
                {hasTabs && currentTabIndex > 0 ? '上一页' : '上一步'}
              </Button>
            ) : (
              <div></div>
            )}
            
            <Button
              onClick={handleNext}
              disabled={isAnimating}
              className="step-icon-bg text-white border-0 px-8 py-6 text-base shadow-lg hover:shadow-xl transition-all"
              style={{
                ['--icon-color' as string]: currentStepData.color,
                ['--icon-color-dark' as string]: `${currentStepData.color}dd`
              } as React.CSSProperties}
            >
              {currentStep === steps.length - 1 && (!hasTabs || isLastTab) ? (
                <>
                  <CheckCircle2Icon className="w-5 h-5 mr-2" />
                  开始使用 MAI Launcher
                </>
              ) : hasTabs && !isLastTab ? (
                <>
                  下一页
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </>
              ) : (
                <>
                  下一步
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
