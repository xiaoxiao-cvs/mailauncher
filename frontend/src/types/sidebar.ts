/**
 * 侧边栏导航项类型
 */
export interface SidebarNavItem {
  /** 导航项唯一标识 */
  id: string
  /** 导航项标签文字 */
  label: string
  /** Iconify 图标名称 */
  icon: string
  /** 路由路径 */
  path: string
}

/**
 * 侧边栏状态类型
 */
export type SidebarState = 'expanded' | 'collapsed'
