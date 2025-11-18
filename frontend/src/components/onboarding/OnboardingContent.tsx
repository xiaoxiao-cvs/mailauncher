import { RefObject, useState, useEffect, useCallback } from 'react'
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
  const [isBackendConnected, setIsBackendConnected] = useState(false)
  const [recheckFn, setRecheckFn] = useState<(() => void) | null>(null)
  const [isGitAvailable, setIsGitAvailable] = useState(false)
  
  const hasTabs = currentStepData.tabs && currentStepData.tabs.length > 0
  const isLastTab = hasTabs && currentTabIndex === (currentStepData.tabs?.length ?? 0) - 1

  // 当步骤改变时，重置 Tab 索引
  useEffect(() => {
    setCurrentTabIndex(0)
  }, [currentStep])

  // 处理后端连接状态变化
  const handleBackendStatusChange = useCallback((connected: boolean) => {
    setIsBackendConnected(connected)
  }, [])

  // 处理 Git 状态变化
  const handleGitStatusChange = useCallback((available: boolean) => {
    setIsGitAvailable(available)
  }, [])

  // 注册重新检查功能
  const handleRecheckRequest = useCallback((checkFn: () => void) => {
    setRecheckFn(() => checkFn)
  }, [])

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
    <div className="flex-1 h-full flex flex-col p-8 md:p-12 overflow-hidden">
      {/* 内容区域 - 包含移动端指示器以确保动画一致 */}
      <div ref={contentRef} className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        {/* 移动端步骤指示器 */}
        <div className="md:hidden flex justify-center gap-2 mb-6">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentStep ? 'w-8 bg-blue-500' : 'w-1.5 bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* 标题区域 */}
        <div className="mb-10 text-center md:text-left">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-gray-100 dark:bg-white/10 mb-4">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
            {currentStepData.title}
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
            {currentStepData.subtitle}
          </p>
        </div>

        {/* 内容区域 - 根据步骤类型显示不同内容 */}
        <div className="flex-1 overflow-y-auto scrollbar-none -mx-4 px-4 mb-6">
          {hasTabs ? (
            /* 显示 Tabs */
            <OnboardingTabs
              tabs={currentStepData.tabs!}
              stepColor={currentStepData.color}
              currentTab={currentTabIndex}
              onTabChange={(_tabId, tabIndex) => setCurrentTabIndex(tabIndex)}
              extraProps={{
                onStatusChange: handleBackendStatusChange,
                onRecheckRequest: handleRecheckRequest,
                onGitStatusChange: handleGitStatusChange
              }}
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
            <div className="space-y-3">
              {currentStepData.description.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: currentStepData.color }}
                  >
                    {index + 1}
                  </div>
                  <p className="text-gray-700 dark:text-gray-200 leading-relaxed text-[15px]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between gap-4 pt-6 border-t border-gray-200 dark:border-white/10 mt-auto">
          <div className="flex items-center gap-2">
            {(currentStep > 0 || (hasTabs && currentTabIndex > 0)) && (
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={isAnimating}
                className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full px-6"
              >
                {hasTabs && currentTabIndex > 0 ? 'Back' : 'Back'}
              </Button>
            )}
            {/* 重新检查按钮 - 仅在联通性检查标签显示 */}
            {hasTabs && currentStepData.tabs?.[currentTabIndex]?.id === 'connectivity' && recheckFn && (
              <Button
                variant="outline"
                onClick={recheckFn}
                disabled={isAnimating}
                className="rounded-full border-gray-200 dark:border-white/10"
              >
                Check Again
              </Button>
            )}
          </div>
          
          <Button
            onClick={handleNext}
            disabled={
              isAnimating || 
              (hasTabs && currentStepData.tabs?.[currentTabIndex]?.id === 'connectivity' && !isBackendConnected) ||
              (hasTabs && currentStepData.tabs?.[currentTabIndex]?.id === 'environment' && !isGitAvailable)
            }
            className="rounded-full px-8 py-6 text-[15px] font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white"
            style={{
              backgroundColor: currentStepData.color,
            }}
          >
            {currentStep === steps.length - 1 && (!hasTabs || isLastTab) ? (
              <>
                <CheckCircle2Icon className="w-5 h-5 mr-2" />
                Get Started
              </>
            ) : hasTabs && !isLastTab ? (
              <>
                Continue
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </>
            ) : (
              <>
                Continue
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
