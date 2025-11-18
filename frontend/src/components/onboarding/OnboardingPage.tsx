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
    // 背景光斑呼吸动画
    if (blobRef1.current && blobRef2.current) {
      animate(
        [blobRef1.current, blobRef2.current],
        {
          translateX: () => random(-50, 50),
          translateY: () => random(-50, 50),
          scale: [1, 1.2],
          opacity: [0.3, 0.5],
          duration: () => random(3000, 5000),
          delay: () => random(0, 1000),
          direction: 'alternate',
          loop: true,
          easing: 'easeInOutSine'
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
      className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] flex items-center justify-center p-4 overflow-hidden relative transition-colors duration-700 font-sans"
      style={{
        ['--step-color' as string]: currentStepData.color,
      } as React.CSSProperties}
    >
      {/* 极简风格的动态背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          ref={blobRef1}
          className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] rounded-full blur-[120px] opacity-30 transition-colors duration-1000 ease-in-out"
          style={{ backgroundColor: currentStepData.color }}
        />
        <div 
          ref={blobRef2}
          className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[100px] opacity-20 transition-colors duration-1000 ease-in-out delay-300"
          style={{ backgroundColor: currentStepData.color }}
        />
      </div>

      {/* macOS 风格的主窗口容器 */}
      <div className="relative w-full max-w-5xl h-[720px] z-10 flex bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-2xl rounded-[20px] shadow-2xl border border-white/40 dark:border-white/10 overflow-hidden transition-all duration-500">
        {/* 左侧：侧边栏 */}
        <div className="w-[280px] flex-shrink-0 border-r border-black/5 dark:border-white/5 bg-gray-50/30 dark:bg-[#252525]/30 flex flex-col">
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
          className="text-[#023e8a]/60 dark:text-white/70 hover:text-[#023e8a] dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10"
        >
          跳过引导，直接开始
        </Button>
      </div>
    </div>
  )
}
