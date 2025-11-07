/**
 * Hooks 统一导出文件
 * 集中管理和导出所有自定义 hooks
 */

// 主题相关
export { useTheme } from './useTheme'

// 引导流程相关
export { useOnboardingAnimation } from './useOnboardingAnimation'
export { useApiProviderConfig, PRESET_PROVIDERS } from './useApiProviderConfig'
export type { ApiProvider } from './useApiProviderConfig'

// 环境配置相关
export { usePythonEnvironment, VENV_TYPES } from './usePythonEnvironment'
export type { PythonVersion } from './usePythonEnvironment'

export { useGitCheck } from './useGitCheck'
export type { GitInfo } from './useGitCheck'

export { useDeploymentPath } from './useDeploymentPath'

export { useEnvironmentConfig } from './useEnvironmentConfig'

// 连接检查相关
export { useConnectivityCheck } from './useConnectivityCheck'
export type { ConnectivityStatus } from './useConnectivityCheck'

// 日志相关
export { useLogViewer } from './useLogViewer'
export type { LogFile } from './useLogViewer'

// UI 组件相关
export { useSidebar } from './useSidebar'
