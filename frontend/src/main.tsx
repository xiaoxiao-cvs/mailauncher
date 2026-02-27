import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@/components/theme'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// 配置 QueryClient 全局选项
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000, // 5秒内数据视为新鲜
      gcTime: 10 * 60 * 1000, // 缓存保留10分钟
      retry: 1, // 失败后重试1次
      refetchOnWindowFocus: false, // 窗口聚焦时不自动重新获取
      refetchOnReconnect: true, // 网络重连时重新获取
    },
    mutations: {
      retry: 0, // mutation 失败不重试
    },
  },
})

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  // </StrictMode>
)
