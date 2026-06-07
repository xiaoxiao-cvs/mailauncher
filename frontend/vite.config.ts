import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  // 浏览器/Tauri webview 无 Node 的 process。react-draggable / react-resizable 等库在
  // handleDragStart 里读 process.env.DRAGGABLE_DEBUG 等,未兜底会抛 ReferenceError 致拖拽/缩放
  // 整个崩掉。这里显式给 NODE_ENV(保 React 等 dev/prod 判断),其余 process.env.* 归空对象兜底。
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env': '{}',
  },
}))
