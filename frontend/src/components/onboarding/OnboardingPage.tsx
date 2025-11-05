import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { OnboardingSidebar } from './OnboardingSidebar'
import { OnboardingContent } from './OnboardingContent'
import { useOnboardingAnimation } from './useOnboardingAnimation'
import { ONBOARDING_STEPS } from './constants'
import type { OnboardingCallbacks } from '@/types/onboarding'

/**
 * 引导页主组件
 * 职责：协调各个子组件，管理引导流程状态
 */
export function OnboardingPage({ onComplete, onSkip }: OnboardingCallbacks = {}) {
  const [currentStep, setCurrentStep] = useState(0)
  const { contentRef, isAnimating, animateTransition } = useOnboardingAnimation()

  const currentStepData = ONBOARDING_STEPS[currentStep]

  const handleNext = () => {
    if (isAnimating) return
    
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      animateTransition(() => setCurrentStep(currentStep + 1), 'next')
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (isAnimating || currentStep === 0) return
    animateTransition(() => setCurrentStep(currentStep - 1), 'prev')
  }

  const handleStepClick = (index: number) => {
    if (!isAnimating && index !== currentStep) {
      const direction = index > currentStep ? 'next' : 'prev'
      animateTransition(() => setCurrentStep(index), direction)
    }
  }

  const handleSkip = () => {
    animateTransition(() => {
      onSkip?.()
    }, 'next')
  }

  const handleComplete = () => {
    console.log('引导完成！')
    onComplete?.()
  }

  return (
    <div 
      className="min-h-screen bg-white flex items-center justify-center p-4 overflow-hidden relative"
      style={{
        ['--step-color' as string]: currentStepData.color,
        ['--step-color-light' as string]: `${currentStepData.color}20`,
        ['--step-color-lighter' as string]: `${currentStepData.color}10`,
        ['--step-color-fade' as string]: `${currentStepData.color}40`
      } as React.CSSProperties}
    >
      {/* 优化的动态渐变背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="gradient-blob blob-1 absolute top-0 left-0 w-[900px] h-[900px] rounded-full blur-3xl opacity-40" />
        <div className="gradient-blob blob-2 absolute top-1/3 right-0 w-[800px] h-[800px] rounded-full blur-3xl opacity-45" />
        <div className="gradient-blob blob-3 absolute bottom-0 left-1/3 w-[850px] h-[850px] rounded-full blur-3xl opacity-35" />
      </div>

      {/* 全新左右分栏式布局 */}
      <div className="relative w-full max-w-6xl z-10 flex gap-8">
        {/* 左侧：步骤导航 */}
        <OnboardingSidebar
          steps={ONBOARDING_STEPS}
          currentStep={currentStep}
          isAnimating={isAnimating}
          onStepClick={handleStepClick}
        />

        {/* 右侧：内容展示区 */}
        <OnboardingContent
          steps={ONBOARDING_STEPS}
          currentStep={currentStep}
          currentStepData={currentStepData}
          isAnimating={isAnimating}
          contentRef={contentRef}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      </div>

      {/* 跳过按钮 - 绝对定位在左下角 */}
      <div className="absolute bottom-8 left-8 hidden md:block">
        <Button
          variant="ghost"
          onClick={handleSkip}
          disabled={isAnimating}
          className="text-[#023e8a]/60 hover:text-[#023e8a] hover:bg-white/50"
        >
          跳过引导，直接开始
        </Button>
      </div>
    </div>
  )
}
