/**
 * Tab 页签配置
 */
export interface OnboardingTab {
  id: string
  label: string
  component: React.ReactNode
}

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
  /** 是否为设置步骤（显示表单而非描述列表） */
  isSettingsStep?: boolean
  /** 是否为环境检查步骤 */
  isEnvironmentStep?: boolean
  /** Tabs 配置（如果有则显示 Tabs）- 已废弃，使用 component */
  tabs?: OnboardingTab[]
  /** 步骤组件（直接渲染组件，无需 Tabs） */
  component?: React.ReactNode
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
