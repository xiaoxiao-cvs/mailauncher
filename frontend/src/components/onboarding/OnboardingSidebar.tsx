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
    <div className="h-full flex flex-col p-4">
      {/* Logo 区域 */}
      <div className="flex items-center gap-3 px-3 py-6 mb-2 select-none">
        <div className="w-8 h-8 rounded-[8px] bg-gradient-to-b from-blue-500 to-blue-600 flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <BotIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight leading-none">MAI Launcher</h1>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Setup Guide</p>
        </div>
      </div>

      {/* 步骤列表 */}
      <div className="flex-1 space-y-3 overflow-y-auto scrollbar-none px-1">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isAccessible = index <= maxReachedStep
          
          return (
            <button
              key={step.id}
              onClick={() => onStepClick(index)}
              disabled={isAnimating || !isAccessible}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 group flex items-center gap-3.5 select-none ${
                isCurrent
                  ? 'bg-[#007AFF] text-white shadow-[0_4px_12px_rgba(0,122,255,0.25)] font-medium scale-[1.02]'
                  : isAccessible
                  ? 'text-gray-600 dark:text-gray-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.08] active:scale-[0.98]'
                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
              }`}
            >
              <div className={`flex items-center justify-center transition-colors ${
                isCurrent ? 'text-white' : isCompleted ? 'text-[#007AFF]' : 'text-current opacity-70'
              }`}>
                {isCompleted ? (
                  <CheckCircle2Icon className="w-4 h-4" />
                ) : (
                  <div className="w-4 h-4 flex items-center justify-center">
                    {/* 这里的 icon 可能需要调整大小，或者直接使用 */}
                    <div className="scale-75 transform origin-center">
                        {step.icon}
                    </div>
                  </div>
                )}
              </div>
              
              <span className="text-[13px] truncate flex-1">{step.title}</span>
              
              {isCurrent && (
                <SparklesIcon className="w-3 h-3 text-white/70 animate-pulse" />
              )}
            </button>
          )
        })}
      </div>
      
      {/* 底部版本号或其他信息 */}
      <div className="px-3 py-4 mt-auto border-t border-black/5 dark:border-white/5">
        <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center font-medium">
          MAI Launcher
        </p>
      </div>
    </div>
  )
}
