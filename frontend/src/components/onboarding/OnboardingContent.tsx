import { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRightIcon, CheckCircle2Icon } from 'lucide-react'
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

  return (
    <div className="flex-1 h-full flex flex-col p-4 sm:p-6 md:p-8 lg:p-10 overflow-hidden">
      {/* 内容区域 - 包含移动端指示器以确保动画一致 */}
      <div ref={contentRef} className="flex-1 flex flex-col w-full min-h-0">
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
        <div className="mb-4 sm:mb-6 text-center md:text-left flex-shrink-0">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-gray-100 dark:bg-white/10 mb-3">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            {currentStepData.title}
          </h2>
          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
            {currentStepData.subtitle}
          </p>
        </div>

        {/* 内容区域 - 直接渲染步骤组件 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent min-h-0 mb-4">
          <div className="pr-2">
          {currentStepData.component ? (
            /* 直接渲染步骤组件 */
            currentStepData.component
          ) : currentStepData.description.length > 0 ? (
            /* 特性列表（向后兼容） */
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
          ) : (
            /* 空状态 */
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
              <p>暂无内容</p>
            </div>
          )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="ghost"
                onClick={onPrevious}
                disabled={isAnimating}
                className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full px-6"
              >
                上一步
              </Button>
            )}
          </div>
          
          <Button
            onClick={onNext}
            disabled={isAnimating}
            className="rounded-full px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-[15px] font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white"
            style={{
              backgroundColor: currentStepData.color,
            }}
          >
            {currentStep === steps.length - 1 ? (
              <>
                <CheckCircle2Icon className="w-5 h-5 mr-2" />
                开始使用
              </>
            ) : (
              <>
                继续
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
