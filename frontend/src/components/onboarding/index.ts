/**
 * 引导页模块导出
 */
export { OnboardingPage } from './OnboardingPage'
export { ONBOARDING_STEPS } from './constants'

// 新版步骤组件
export { BackendConnectivity } from './BackendConnectivity'
export { EnvironmentDetection } from './EnvironmentDetection'
export { EnvironmentSettings } from './EnvironmentSettings'
export { InstallPathConfig } from './InstallPathConfig'

// 旧版组件（已废弃，保留兼容）
export { EnvironmentCheck } from './EnvironmentCheck'
export { ConnectivityCheck } from './ConnectivityCheck'
export { OnboardingTabs } from './OnboardingTabs'
export { EnvironmentConfig } from './EnvironmentConfig'
export { PythonEnvironment } from './PythonEnvironment'
export { ApiProviderConfig } from './ApiProviderConfig'

// 类型导出
export type { OnboardingStep, OnboardingCallbacks, OnboardingTab } from '@/types/onboarding'
