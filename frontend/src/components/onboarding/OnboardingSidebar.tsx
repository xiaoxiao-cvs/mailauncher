import { BotIcon, CheckCircle2Icon, SparklesIcon } from 'lucide-react'
import type { OnboardingStep } from '@/types/onboarding'

interface OnboardingSidebarProps {
  steps: OnboardingStep[]
  currentStep: number
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
  isAnimating,
  onStepClick
}: OnboardingSidebarProps) {
  return (
    <div className="hidden md:flex flex-col w-80 gap-4">
      <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-6 border border-white/60 shadow-xl">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a2d2ff] to-[#bde0fe] flex items-center justify-center">
            <BotIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#03045e]">MAI Launcher</h1>
            <p className="text-xs text-[#023e8a]/60">引导设置</p>
          </div>
        </div>

        {/* 步骤列表 */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => onStepClick(index)}
              disabled={isAnimating}
              className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                index === currentStep
                  ? 'bg-white shadow-lg scale-105'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div 
                  className={`step-icon-bg w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-md transition-all duration-300 ${
                    index === currentStep ? 'scale-110' : ''
                  }`}
                  style={{
                    ['--icon-color' as string]: step.color,
                    ['--icon-color-dark' as string]: `${step.color}dd`
                  } as React.CSSProperties}
                >
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[#023e8a]/60">
                      步骤 {index + 1}
                    </span>
                    {index === currentStep && (
                      <SparklesIcon className="w-3 h-3 text-[#ffafcc]" />
                    )}
                  </div>
                  <p className={`text-sm font-semibold truncate ${
                    index === currentStep ? 'text-[#03045e]' : 'text-[#023e8a]/70'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < currentStep && (
                  <CheckCircle2Icon className="w-5 h-5 text-[#a2d2ff]" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
