import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { OnboardingSidebar } from './OnboardingSidebar'
import { OnboardingContent } from './OnboardingContent'
import { useOnboardingAnimation } from '@/hooks/useOnboardingAnimation'
import { useConfetti } from '@/hooks/useConfetti'
import { ONBOARDING_STEPS } from './constants'
import { EulaContext } from './EulaContext'
import { routerLogger } from '@/utils/logger'
import type { OnboardingCallbacks } from '@/types/onboarding'

/**
 * 引导页主组件
 * 职责：协调各个子组件，管理引导流程状态
 */
export function OnboardingPage({ onComplete, onSkip }: OnboardingCallbacks = {}) {
  const [currentStep, setCurrentStep] = useState(0)
  // 记录用户曾经到达过的最远步骤
  const [maxReachedStep, setMaxReachedStep] = useState(0)
  // EULA 步骤的 canProceed 控制
  const [canProceed, setCanProceed] = useState(true)
  const [buttonLabel, setButtonLabel] = useState<string | null>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const { contentRef, isAnimating, animateTransition } = useOnboardingAnimation()
  const { triggerConfetti } = useConfetti(windowRef)

  // 稳定的回调引用
  const handleCanProceedChange = useCallback((v: boolean) => setCanProceed(v), [])
  const handleButtonLabelChange = useCallback((v: string | null) => setButtonLabel(v), [])

  // 切换步骤时重置 canProceed（非 EULA 步骤默认可继续）
  useEffect(() => {
    if (currentStep !== 0) {
      setCanProceed(true)
      setButtonLabel(null)
    }
  }, [currentStep])

  const currentStepData = ONBOARDING_STEPS[currentStep]


  const handleNext = () => {
    if (isAnimating) return
    
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      const nextStep = currentStep + 1
      animateTransition(() => {
        setCurrentStep(nextStep)
        // 更新最远到达步骤
        setMaxReachedStep(Math.max(maxReachedStep, nextStep))
      }, 'next')
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (isAnimating || currentStep === 0) return
    animateTransition(() => setCurrentStep(currentStep - 1), 'prev')
  }

  const handleStepClick = (index: number) => {
    // 只允许返回到之前到达过的步骤，不允许跳过未到达的步骤
    if (!isAnimating && index !== currentStep && index <= maxReachedStep) {
      const direction = index > currentStep ? 'next' : 'prev'
      animateTransition(() => setCurrentStep(index), direction)
    }
  }

  const handleSkip = () => {
    animateTransition(() => {
      onSkip?.()
    }, 'next')
  }

  const handleComplete = async () => {
    const btn = document.querySelector<HTMLElement>('[data-complete-btn]')
    if (btn) {
      await triggerConfetti(btn)
    }
    routerLogger.success('引导完成！')
    onComplete?.()
  }

  return (
    <div 
      className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] flex items-center justify-center p-12 overflow-hidden relative transition-colors duration-700 font-sans"
      style={{
        ['--step-color' as string]: currentStepData.color,
      } as React.CSSProperties}
    >
      {/* 主窗口容器 */}
      <div ref={windowRef} className="relative w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[72vw] max-w-[1100px] h-[82vh] min-h-[580px] max-h-[760px] z-10 flex bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-[0_8px_60px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_60px_-12px_rgba(0,0,0,0.5)] border border-black/[0.06] dark:border-white/10 overflow-hidden">
        {/* 左侧：侧边栏 */}
        <div className="hidden md:flex w-[220px] lg:w-[240px] flex-shrink-0 border-r border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] flex-col">
          <OnboardingSidebar
            steps={ONBOARDING_STEPS}
            currentStep={currentStep}
            maxReachedStep={maxReachedStep}
            isAnimating={isAnimating}
            onStepClick={handleStepClick}
          />
        </div>

        {/* 右侧：内容展示区 */}
        <div className="flex-1 relative flex flex-col min-w-0">
          <EulaContext.Provider value={{ onCanProceedChange: handleCanProceedChange, onButtonLabelChange: handleButtonLabelChange }}>
            <OnboardingContent
              steps={ONBOARDING_STEPS}
              currentStep={currentStep}
              currentStepData={currentStepData}
              isAnimating={isAnimating}
              contentRef={contentRef}
              onNext={handleNext}
              onPrevious={handlePrevious}
              canProceed={canProceed}
              buttonLabel={buttonLabel}
            />
          </EulaContext.Provider>
        </div>
      </div>

      {/* 跳过按钮 - EULA 步骤不允许跳过 */}
      {currentStep > 0 && (
        <div className="absolute bottom-8 left-8 hidden md:block">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isAnimating}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            跳过引导，直接开始
          </Button>
        </div>
      )}
    </div>
  )
}
