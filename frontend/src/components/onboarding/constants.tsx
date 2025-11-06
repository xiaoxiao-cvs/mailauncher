import {
  SettingsIcon,
  RocketIcon,
  ZapIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import type { OnboardingStep } from '@/types/onboarding'
import { ThemeSelector } from '@/components/theme/ThemeSelector'
import { ConnectivityCheck } from './ConnectivityCheck'

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
    subtitle: '从零到上线只需几分钟',
    description: [
      '智能配置向导,自动检测系统环境',
      '一键安装依赖,无需手动配置',
      '模板化配置,快速创建新实例'
    ],
    icon: <RocketIcon className="w-8 h-8" />,
    gradient: 'from-[#ffafcc] to-[#ffc8dd]',
    color: '#ffafcc',
    isEnvironmentStep: true
  },
  {
    id: 3,
    title: '多实例管理',
    subtitle: '同时管理多个机器人账号',
    description: [
      '支持多个 Bot 实例同时运行',
      '独立的配置和日志管理',
      '批量操作，提升管理效率'
    ],
    icon: <ZapIcon className="w-8 h-8" />,
    gradient: 'from-[#cdb4db] to-[#ffc8dd]',
    color: '#cdb4db'
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
