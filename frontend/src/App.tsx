import { BrowserRouter as Router } from 'react-router-dom'
import { Button } from '@/components/ui/button'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">MAI Launcher</h1>
            <p className="text-sm text-muted-foreground">麦麦启动器 - 新手友好的管理工具</p>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-8">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">欢迎使用 MAI Launcher</h2>
            <p className="text-muted-foreground mb-4">
              项目初始化成功！React + TypeScript + Origin UI 已配置完成。
            </p>
            <div className="flex gap-2">
              <Button>开始使用</Button>
              <Button variant="outline">查看文档</Button>
            </div>
          </div>
        </main>
      </div>
    </Router>
  )
}

export default App
