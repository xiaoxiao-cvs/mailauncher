import { InstanceListPage } from './InstanceListPage'

/**
 * 实例管理页面
 * 职责：管理 MaiBot、NapCat 等实例
 */
export function InstancesPage() {
  return (
    <div className="h-full overflow-auto scrollbar-thin relative z-10">
      <InstanceListPage />
    </div>
  )
}
