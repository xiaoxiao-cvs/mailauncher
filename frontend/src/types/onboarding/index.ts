/**
 * 引导步骤类型定义
 */
export interface OnboardingStep {
  id: number
  title: string
  subtitle: string
  description: string[]
  icon: React.ReactNode
  gradient: string
  color: string
}

/**
 * 引导页回调函数类型
 */
export interface OnboardingCallbacks {
  /** 完成引导时的回调 */
  onComplete?: () => void
  /** 跳过引导时的回调 */
  onSkip?: () => void
}
