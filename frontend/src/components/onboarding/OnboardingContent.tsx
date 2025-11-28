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
    <div className="flex-1 h-full flex flex-col p-6 sm:p-8 md:p-10 lg:p-12 xl:p-16 overflow-hidden">
      {/* 内容区域 - 包含移动端指示器以确保动画一致 */}
      <div ref={contentRef} className="flex-1 flex flex-col w-full min-h-0">
        {/* 移动端步骤指示器 */}
        <div className="md:hidden flex justify-center gap-2 mb-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`h-1 rounded-full transition-all duration-500 ${
                index === currentStep ? 'w-8 bg-[#007AFF]' : index < currentStep ? 'w-2 bg-[#007AFF]/40' : 'w-2 bg-gray-200 dark:bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* 标题区域 */}
        <div className="mb-8 sm:mb-10 text-center md:text-left flex-shrink-0">
          <p className="text-[13px] font-semibold text-[#007AFF] dark:text-[#0A84FF] mb-4 tracking-wide uppercase opacity-80">
            Step {currentStep + 1} of {steps.length}
          </p>
          <h2 className="text-4xl md:text-5xl font-semibold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight">
            {currentStepData.title}
          </h2>
          <p className="text-xl text-gray-500 dark:text-gray-400 font-normal leading-relaxed max-w-xl">
            {currentStepData.subtitle}
          </p>
        </div>

        {/* 内容区域 - 直接渲染步骤组件 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300/50 dark:scrollbar-thumb-white/10 scrollbar-track-transparent min-h-0 mb-6">
          <div className="pr-2">
          {currentStepData.component ? (
            /* 直接渲染步骤组件 */
            currentStepData.component
          ) : currentStepData.description.length > 0 ? (
            /* 特性列表（向后兼容） */
            <div className="space-y-4">
              {currentStepData.description.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] transition-all duration-200 hover:bg-gray-100/80 dark:hover:bg-white/[0.06]"
                >
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 mt-0.5 bg-[#007AFF]"
                  >
                    {index + 1}
                  </div>
                  <p className="text-gray-700 dark:text-gray-200 leading-relaxed text-[16px]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            /* 空状态 */
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <p>暂无内容</p>
            </div>
          )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between gap-4 pt-6 border-t border-gray-200/60 dark:border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="ghost"
                onClick={onPrevious}
                disabled={isAnimating}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full px-6 h-11 transition-colors"
              >
                上一步
              </Button>
            )}
          </div>
          
          <Button
            onClick={onNext}
            disabled={isAnimating}
            className="rounded-full px-8 h-12 text-[15px] font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white bg-[#007AFF] hover:bg-[#0071E3] dark:bg-[#0A84FF] dark:hover:bg-[#0077ED] active:scale-[0.98]"
          >
            {currentStep === steps.length - 1 ? (
              <>
                开始使用
                <CheckCircle2Icon className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                继续
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
