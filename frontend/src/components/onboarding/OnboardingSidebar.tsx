import { BotIcon, CheckCircle2Icon, SparklesIcon } from 'lucide-react'
import type { OnboardingStep } from '@/types/onboarding'

interface OnboardingSidebarProps {
  steps: OnboardingStep[]
  currentStep: number
  maxReachedStep: number
  isAnimating: boolean
  onStepClick: (index: number) => void
}

/**
 * 引导页侧边栏组件
 * 职责：展示步骤列表和 Logo
 */
export function OnboardingSidebar({
  steps,
  currentStep,
  maxReachedStep,
  isAnimating,
  onStepClick
}: OnboardingSidebarProps) {
  return (
    <div className="hidden md:flex flex-col w-80 gap-4">
      <div className="bg-white/50 dark:bg-[#1f1f1f]/50 backdrop-blur-xl rounded-2xl p-6 border border-white/60 dark:border-[#2e2e2e]/40 shadow-xl transition-colors duration-500">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a2d2ff] to-[#bde0fe] flex items-center justify-center">
            <BotIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#03045e] dark:text-white">MAI Launcher</h1>
            <p className="text-xs text-[#023e8a]/60 dark:text-white/70">引导设置</p>
          </div>
        </div>

        {/* 步骤列表 */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            // 可访问：当前步骤或曾经到达过的步骤
            const isAccessible = index <= maxReachedStep
            
            return (
              <button
                key={step.id}
                onClick={() => onStepClick(index)}
                disabled={isAnimating || !isAccessible}
                className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                  isCurrent
                    ? 'bg-white dark:bg-[#2e2e2e] shadow-lg scale-105'
                    : isAccessible
                    ? 'bg-white/40 dark:bg-[#161616] hover:bg-white/60 dark:hover:bg-[#252525] cursor-pointer'
                    : 'bg-white/20 dark:bg-[#0f0f0f] opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className={`step-icon-bg w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-md transition-all duration-300 ${
                      isCurrent ? 'scale-110' : ''
                    } ${!isAccessible ? 'opacity-50' : ''}`}
                    style={{
                      ['--icon-color' as string]: step.color,
                      ['--icon-color-dark' as string]: `${step.color}dd`
                    } as React.CSSProperties}
                  >
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[#023e8a]/60 dark:text-white/60">
                        步骤 {index + 1}
                      </span>
                      {isCurrent && (
                        <SparklesIcon className="w-3 h-3 text-[#ffafcc]" />
                      )}
                    </div>
                    <p className={`text-sm font-semibold truncate ${
                      isCurrent ? 'text-[#03045e] dark:text-white' : 
                      isAccessible ? 'text-[#023e8a]/70 dark:text-white/70' :
                      'text-[#023e8a]/40 dark:text-white/40'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {isCompleted && (
                    <CheckCircle2Icon className="w-5 h-5 text-[#a2d2ff] dark:text-[#48cae4]" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
