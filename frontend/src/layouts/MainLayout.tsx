import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/sidebar'

export function MainLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F5F7] dark:bg-[#000000] transition-colors duration-500 relative">
      {/* Global Dynamic Background - 液态流动背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* 蓝色光斑 */}
        <div 
          className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-400/20 dark:bg-blue-600/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70 animate-blob" 
        />
        {/* 紫色光斑 */}
        <div 
          className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70 animate-blob animation-delay-2000" 
        />
        {/* 补充光斑 - 增加丰富度 */}
        <div 
          className="absolute top-[40%] left-[40%] w-[600px] h-[600px] bg-pink-300/20 dark:bg-indigo-500/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-60 animate-blob animation-delay-4000" 
        />
      </div>

      {/* Sidebar Container - Floating with padding */}
      <div className="relative z-20 h-full p-4 pr-0 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 overflow-auto p-4">
        <Outlet />
      </main>
    </div>
  )
}
