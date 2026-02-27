import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { OnboardingSidebar } from './OnboardingSidebar'
import { OnboardingContent } from './OnboardingContent'
import { useOnboardingAnimation } from '@/hooks/useOnboardingAnimation'
import { ONBOARDING_STEPS } from './constants'
import { routerLogger } from '@/utils/logger'
import type { OnboardingCallbacks } from '@/types/onboarding'
import { animate } from 'animejs'

/**
 * 引导页主组件
 * 职责：协调各个子组件，管理引导流程状态
 */
export function OnboardingPage({ onComplete, onSkip }: OnboardingCallbacks = {}) {
  const [currentStep, setCurrentStep] = useState(0)
  // 记录用户曾经到达过的最远步骤
  const [maxReachedStep, setMaxReachedStep] = useState(0)
  const { contentRef, isAnimating, animateTransition } = useOnboardingAnimation()
  const blobRef1 = useRef<HTMLDivElement>(null)
  const blobRef2 = useRef<HTMLDivElement>(null)

  const currentStepData = ONBOARDING_STEPS[currentStep]

  const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  useEffect(() => {
    // 背景光斑缓慢漂移动画
    if (blobRef1.current && blobRef2.current) {
      animate(
        blobRef1.current,
        {
          translateX: [-20, 20],
          translateY: [-15, 15],
          scale: [1, 1.05],
          duration: 8000,
          direction: 'alternate',
          loop: true,
          easing: 'easeInOutQuad'
        }
      )
      animate(
        blobRef2.current,
        {
          translateX: [15, -15],
          translateY: [10, -10],
          scale: [1, 1.08],
          duration: 10000,
          direction: 'alternate',
          loop: true,
          easing: 'easeInOutQuad'
        }
      )
    }
  }, [])

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

  const handleComplete = () => {
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
      {/* 动态背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          ref={blobRef1}
          className="absolute top-[-30%] left-[-20%] w-[70vw] h-[70vw] rounded-full blur-[150px] opacity-10 bg-[#007AFF]/30 dark:bg-[#0A84FF]/20"
        />
        <div 
          ref={blobRef2}
          className="absolute bottom-[-30%] right-[-20%] w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-5 bg-[#007AFF]/20 dark:bg-[#0A84FF]/10"
        />
      </div>

      {/* 主窗口容器 */}
      <div className="relative w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[70vw] min-h-[600px] max-h-[90vh] h-[85vh] z-10 flex bg-white/70 dark:bg-[#1C1C1E]/80 backdrop-blur-3xl rounded-3xl shadow-[0_8px_60px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_60px_-12px_rgba(0,0,0,0.5)] border border-white/50 dark:border-white/10 overflow-hidden transition-all duration-500">
        {/* 左侧：侧边栏 */}
        <div className="hidden md:flex w-[240px] lg:w-[280px] xl:w-[300px] flex-shrink-0 border-r border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] flex-col">
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
      </div>

      {/* 跳过按钮 - 绝对定位在左下角 */}
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
    </div>
  )
}
