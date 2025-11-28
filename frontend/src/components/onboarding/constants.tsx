import {
  PaletteIcon,
  ServerIcon,
  SearchCheckIcon,
  SettingsIcon,
  FolderOpenIcon,
} from 'lucide-react'
import type { OnboardingStep } from '@/types/onboarding'
import { ThemeSelector } from '@/components/theme/ThemeSelector'
import { BackendConnectivity } from './BackendConnectivity'
import { EnvironmentDetection } from './EnvironmentDetection'
import { EnvironmentSettings } from './EnvironmentSettings'
import { InstallPathConfig } from './InstallPathConfig'

/**
 * 引导步骤数据
 * 职责：存储引导流程的所有步骤配置
 * 
 * 步骤流程：
 * 1. 外观设置 - 选择主题
 * 2. 联通性检查 - 配置后端服务地址
 * 3. 环境检测 - 检查 Git 和 Python 是否安装
 * 4. 环境配置 - 选择 Python 版本和虚拟环境类型
 * 5. 安装配置 - 设置 Bot 实例安装路径
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: '外观设置',
    subtitle: '选择你喜欢的主题风格',
    description: [],
    icon: <PaletteIcon className="w-8 h-8" />,
    gradient: 'from-[#a2d2ff] to-[#bde0fe]',
    color: '#a2d2ff',
    component: <ThemeSelector />
  },
  {
    id: 2,
    title: '联通性检查',
    subtitle: '配置后端服务连接',
    description: [],
    icon: <ServerIcon className="w-8 h-8" />,
    gradient: 'from-[#90e0ef] to-[#00b4d8]',
    color: '#00b4d8',
    component: <BackendConnectivity stepColor="#00b4d8" />
  },
  {
    id: 3,
    title: '环境检测',
    subtitle: '检查必要的开发工具',
    description: [],
    icon: <SearchCheckIcon className="w-8 h-8" />,
    gradient: 'from-[#ffafcc] to-[#ffc8dd]',
    color: '#ffafcc',
    component: <EnvironmentDetection stepColor="#ffafcc" />
  },
  {
    id: 4,
    title: '环境配置',
    subtitle: '配置 Python 运行环境',
    description: [],
    icon: <SettingsIcon className="w-8 h-8" />,
    gradient: 'from-[#cdb4db] to-[#ffc8dd]',
    color: '#cdb4db',
    component: <EnvironmentSettings stepColor="#cdb4db" />
  },
  {
    id: 5,
    title: '安装配置',
    subtitle: '设置 Bot 实例安装位置',
    description: [],
    icon: <FolderOpenIcon className="w-8 h-8" />,
    gradient: 'from-[#bde0fe] to-[#a2d2ff]',
    color: '#bde0fe',
    component: <InstallPathConfig stepColor="#bde0fe" />
  }
]
