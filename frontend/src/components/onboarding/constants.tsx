import {
  SettingsIcon,
  RocketIcon,
  ZapIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import type { OnboardingStep } from '@/types/onboarding'
import { ThemeSelector } from '@/components/theme/ThemeSelector'
import { ConnectivityCheck } from './ConnectivityCheck'
import { EnvironmentConfig } from './EnvironmentConfig'
import { PythonEnvironment } from './PythonEnvironment'
import { ApiProviderConfig } from './ApiProviderConfig'

/**
 * 引导步骤数据
 * 职责：存储引导流程的所有步骤配置
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: '系统设置',
    subtitle: '配置你的 MAI Launcher',
    description: [],
    icon: <SettingsIcon className="w-8 h-8" />,
    gradient: 'from-[#a2d2ff] to-[#bde0fe]',
    color: '#a2d2ff',
    tabs: [
      {
        id: 'appearance',
        label: '外观设计',
        component: <ThemeSelector />
      },
      {
        id: 'connectivity',
        label: '联通性检查',
        component: <ConnectivityCheck stepColor="#a2d2ff" />
      }
    ]
  },
  {
    id: 2,
    title: '环境检查与配置',
    subtitle: '你也不想Git Not Found吧？',
    description: [],
    icon: <RocketIcon className="w-8 h-8" />,
    gradient: 'from-[#ffafcc] to-[#ffc8dd]',
    color: '#ffafcc',
    tabs: [
      {
        id: 'environment',
        label: '环境配置',
        component: <EnvironmentConfig stepColor="#ffafcc" />
      },
      {
        id: 'python',
        label: 'Python 环境',
        component: <PythonEnvironment stepColor="#ffafcc" />
      }
    ]
  },
  {
    id: 3,
    title: 'API 配置',
    subtitle: '配置 AI 模型服务',
    description: [],
    icon: <ZapIcon className="w-8 h-8" />,
    gradient: 'from-[#cdb4db] to-[#ffc8dd]',
    color: '#cdb4db',
    tabs: [
      {
        id: 'api-providers',
        label: '模型供应商',
        component: <ApiProviderConfig stepColor="#cdb4db" />
      }
    ]
  },
  {
    id: 4,
    title: '安全稳定',
    subtitle: '7×24 小时稳定运行',
    description: [
      '完善的错误处理和自动重启机制',
      '详细的日志记录，方便问题排查',
      '定期备份配置，数据安全无忧'
    ],
    icon: <ShieldCheckIcon className="w-8 h-8" />,
    gradient: 'from-[#bde0fe] to-[#cdb4db]',
    color: '#bde0fe'
  }
]
