import type { SidebarNavItem } from '@/types/sidebar'

/**
 * 侧边栏导航项配置
 * 使用 ph (Phosphor) 图标集的细线条图标
 */
export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    id: 'home',
    label: '主页',
    icon: 'ph:house-thin',
    path: '/home',
  },
  {
    id: 'instances',
    label: '实例管理',
    icon: 'ph:stack-thin',
    path: '/instances',
  },
  {
    id: 'downloads',
    label: '下载',
    icon: 'ph:download-simple-thin',
    path: '/downloads',
  },
]

/**
 * 底部导航项
 */
export const SIDEBAR_BOTTOM_ITEMS: SidebarNavItem[] = [
  {
    id: 'settings',
    label: '设置',
    icon: 'ph:gear-thin',
    path: '/settings',
  },
]
