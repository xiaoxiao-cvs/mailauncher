import { Sidebar } from '@/components/sidebar'

/**
 * 下载页面
 * 职责：管理资源下载
 */
export function DownloadsPage() {
  return (
    <div className="flex h-screen bg-[#f8f9fa] dark:bg-[#0a0a0a] transition-colors duration-500">
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区 */}
      <main className="flex-1 flex items-center justify-center overflow-auto">
        <div className="text-center space-y-6 p-8">
          <h1 className="text-4xl font-bold text-[#03045e] dark:text-white">
            下载管理
          </h1>
          <p className="text-xl text-[#023e8a]/70 dark:text-white/80">
            功能开发中...
          </p>
        </div>
      </main>
    </div>
  )
}
