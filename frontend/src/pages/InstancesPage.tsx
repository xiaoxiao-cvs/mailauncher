import { Sidebar } from '@/components/sidebar'
import { InstanceListPage } from './InstanceListPage'

/**
 * 实例管理页面
 * 职责：管理 MaiBot、NapCat 等实例
 */
export function InstancesPage() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-[#F5F5F7] to-[#E5E5EA] dark:from-[#000000] dark:to-[#1C1C1E] transition-colors duration-500 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-400/10 dark:bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-400/10 dark:bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />

      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto relative z-10">
        <InstanceListPage />
      </main>
    </div>
  )
}
