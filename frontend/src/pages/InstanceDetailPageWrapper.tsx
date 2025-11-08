import { Sidebar } from '@/components/sidebar'
import { InstanceDetailPage } from './InstanceDetailPage'

/**
 * 实例详情页面包装器
 * 包含侧边栏的详情页面布局
 */
export function InstanceDetailPageWrapper() {
  return (
    <div className="flex h-screen bg-[#f8f9fa] dark:bg-[#0a0a0a] transition-colors duration-500">
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden">
        <InstanceDetailPage />
      </main>
    </div>
  )
}
