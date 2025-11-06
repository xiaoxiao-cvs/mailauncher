import { Sidebar } from '@/components/sidebar'

/**
 * 主页组件
 * 职责：展示应用主界面（当前为空白页占位）
 */
export function HomePage() {
  return (
    <div className="flex h-screen bg-[#f8f9fa] dark:bg-[#0a0a0a] transition-colors duration-500">
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区 */}
      <main className="flex-1 flex items-center justify-center overflow-auto">
        <div className="text-center space-y-6 p-8">
          <h1 className="text-4xl font-bold text-[#03045e] dark:text-white">
            欢迎使用 MAI Launcher
          </h1>
          <p className="text-xl text-[#023e8a]/70 dark:text-white/80">
            主页开发中...
          </p>
          <div className="text-sm text-[#023e8a]/50 dark:text-white/50">
            引导流程已完成 ✓
          </div>
        </div>
      </main>
    </div>
  )
}
