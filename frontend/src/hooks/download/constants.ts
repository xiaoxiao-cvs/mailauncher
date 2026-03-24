import type { DownloadItem, MaibotVersion } from '@/types/download'

export const getPlatform = (): 'macos' | 'windows' | 'linux' => {
  const platform = window.navigator.platform.toLowerCase()
  if (platform.includes('mac')) return 'macos'
  if (platform.includes('win')) return 'windows'
  return 'linux'
}

export const initializeDownloadItems = (): DownloadItem[] => {
  const platform = getPlatform()

  const items: DownloadItem[] = [
    {
      id: 'maibot',
      type: 'maibot',
      name: 'Maibot',
      description: 'MAI 机器人核心框架',
      status: 'pending',
      required: true,
      platform: 'all'
    },
    {
      id: 'adapter',
      type: 'adapter',
      name: 'MaiBot-Napcat-Adapter',
      description: 'Napcat 适配器',
      status: 'pending',
      required: true,
      platform: 'all'
    },
    {
      id: 'napcat',
      type: 'napcat',
      name: 'Napcat',
      description: 'Shell 版本',
      status: 'pending',
      required: true,
      platform: 'all'
    }
  ]

  // macOS 需要额外安装 Quick-algo 编译依赖
  if (platform === 'macos') {
    items.push({
      id: 'quick-algo',
      type: 'quick-algo',
      name: 'MaiMBot-LPMM',
      description: '编译 Quick-algo',
      status: 'pending',
      required: true,
      platform: 'macos'
    })
  }

  return items
}

export const MAIBOT_VERSIONS: MaibotVersion[] = [
  {
    source: 'latest',
    value: 'latest',
    label: '最新代码 (main)'
  },
  // 这些将从后端 API 获取
  // {
  //   source: 'tag',
  //   value: 'v1.0.0',
  //   label: 'v1.0.0'
  // },
  // {
  //   source: 'branch',
  //   value: 'develop',
  //   label: 'develop 分支'
  // }
]
