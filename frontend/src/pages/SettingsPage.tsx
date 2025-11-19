import { useState, useEffect, useRef, useId } from "react"
import {
  Settings,
  Server,
  RefreshCw,
  Palette,
  GitBranch,
  FolderOpen,
  FileCode,
  Cpu,
  Save,
  CheckCircle2
} from "lucide-react"
import { animate, stagger } from "animejs"

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * 设置页面
 * 职责：应用配置和设置
 */
export function SettingsPage() {
  const [channel, setChannel] = useState("main")
  const [version, setVersion] = useState("latest")
  
  // 环境配置状态
  const [gitPath, setGitPath] = useState("/usr/bin/git")
  const [deployPath, setDeployPath] = useState("/Users/xaoxiao/mailauncher-data")
  const [pythonPath, setPythonPath] = useState("/usr/bin/python3")
  const [venvType, setVenvType] = useState("venv")
  const [theme, setTheme] = useState("system")

  // 动画引用
  const containerRef = useRef<HTMLDivElement>(null)

  // 模拟版本数据
  const versions = {
    main: [
      { id: "latest", label: "Latest (v1.0.0)", date: "2023-10-27" },
      { id: "v0.9.9", label: "v0.9.9", date: "2023-10-20" },
    ],
    beta: [
      { id: "latest", label: "Latest (v1.1.0-beta.1)", date: "2023-11-01" },
    ],
    develop: [
      { id: "latest", label: "Latest (dev-build-123)", date: "2023-11-05" },
    ]
  }

  const currentVersions = versions[channel as keyof typeof versions] || []
  const selectedVersionLabel = currentVersions.find(v => v.id === version)?.label

  // 入场动画
  useEffect(() => {
    if (containerRef.current) {
      animate(
        containerRef.current.querySelectorAll('.animate-card'),
        {
          translateY: [20, 0],
          opacity: [0, 1],
          delay: stagger(100),
          duration: 800,
          easing: 'easeOutExpo'
        }
      )
    }
  }, [])

  // 自定义 Select 组件 (参考 comp-204)
  const CustomSelect = ({ 
    label, 
    value, 
    onChange, 
    options, 
    placeholder,
    className 
  }: { 
    label: string, 
    value: string, 
    onChange: (val: string) => void, 
    options: { value: string, label: string, desc?: string }[], 
    placeholder?: string,
    className?: string
  }) => {
    const id = useId()
    return (
      <div className={cn("space-y-2", className)}>
        <Label htmlFor={id} className="text-sm font-medium text-muted-foreground">{label}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id} className="h-10 bg-background/50 border-input/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex flex-col items-start text-left">
                  <span className="font-medium">{opt.label}</span>
                  {opt.desc && <span className="text-xs text-muted-foreground">{opt.desc}</span>}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-gradient-to-br from-background to-muted/30">
      <div className="pt-8 px-8 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90 mb-2">设置</h1>
        <p className="text-muted-foreground">管理启动器偏好与环境配置</p>
      </div>

      <Tabs defaultValue="launcher" className="w-full flex-1 flex flex-col overflow-hidden">
        <div className="px-8 flex-none">
          <ScrollArea className="w-full">
            <TabsList className="h-auto gap-6 bg-transparent p-0 text-muted-foreground">
              <TabsTrigger
                value="launcher"
                className="relative pb-3 pt-2 bg-transparent shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none transition-all duration-300 hover:text-foreground"
              >
                <Settings className="mr-2 h-4 w-4" />
                启动器设置
              </TabsTrigger>
              <TabsTrigger
                value="environment"
                className="relative pb-3 pt-2 bg-transparent shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none transition-all duration-300 hover:text-foreground"
              >
                <Server className="mr-2 h-4 w-4" />
                环境配置
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="flex-1 overflow-y-auto p-8" ref={containerRef}>
          <TabsContent value="launcher" className="space-y-6 mt-0 outline-none">
            {/* 外观设置 */}
            <div className="animate-card group relative overflow-hidden rounded-3xl border bg-card/50 p-6 shadow-sm transition-all hover:shadow-md hover:bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Palette size={20} />
                </div>
                <h3 className="text-lg font-semibold">外观设置</h3>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                <CustomSelect
                  label="主题模式"
                  value={theme}
                  onChange={setTheme}
                  options={[
                    { value: "light", label: "浅色模式", desc: "明亮清新的外观" },
                    { value: "dark", label: "深色模式", desc: "护眼舒适的暗色" },
                    { value: "system", label: "跟随系统", desc: "自动匹配系统设置" },
                  ]}
                />
                {/* 预留更多外观设置 */}
              </div>
            </div>

            {/* 检查更新 */}
            <div className="animate-card group relative overflow-hidden rounded-3xl border bg-card/50 p-6 shadow-sm transition-all hover:shadow-md hover:bg-card/80 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400">
                    <RefreshCw size={20} />
                  </div>
                  <h3 className="text-lg font-semibold">检查更新</h3>
                </div>
                <Badge variant="secondary" className="font-mono px-3 py-1 rounded-full bg-muted/50">
                  当前版本: v0.0.1
                </Badge>
              </div>
              
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-1/3">
                    <CustomSelect
                      label="更新通道"
                      value={channel}
                      onChange={(val) => { setChannel(val); setVersion("latest"); }}
                      options={[
                        { value: "main", label: "Main (Stable)", desc: "稳定版本，适合日常使用" },
                        { value: "beta", label: "Beta (Testing)", desc: "测试版本，体验新功能" },
                        { value: "develop", label: "Develop (Nightly)", desc: "开发版本，更新最快但不稳定" },
                      ]}
                    />
                  </div>
                  <div className="w-full md:w-2/3">
                    <CustomSelect
                      label="选择版本"
                      value={version}
                      onChange={setVersion}
                      options={currentVersions.map(v => ({
                        value: v.id,
                        label: v.label,
                        desc: `发布于 ${v.date}`
                      }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <Button variant="outline" className="rounded-xl h-10 px-6 hover:bg-primary/5 hover:text-primary border-input/50">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    检查更新
                  </Button>
                  
                  {version !== "latest" && (
                     <Button className="rounded-xl h-10 px-6 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 transition-all hover:scale-105 active:scale-95">
                       更新到 {selectedVersionLabel}
                     </Button>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="environment" className="space-y-6 mt-0 outline-none">
             {/* 环境配置 */}
             <div className="animate-card group relative overflow-hidden rounded-3xl border bg-card/50 p-6 shadow-sm transition-all hover:shadow-md hover:bg-card/80 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Server size={20} />
                  </div>
                  <h3 className="text-lg font-semibold">环境配置</h3>
                </div>
                <Button size="sm" className="rounded-full h-8 px-4 bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20">
                  <Save className="mr-2 h-3.5 w-3.5" />
                  保存配置
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                 <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <GitBranch size={14} /> Git 可执行文件路径
                    </Label>
                    <Input 
                      value={gitPath} 
                      onChange={(e) => setGitPath(e.target.value)}
                      className="h-10 rounded-xl bg-background/50 border-input/50 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                 </div>
                 
                 <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <FolderOpen size={14} /> 部署根目录
                    </Label>
                    <Input 
                      value={deployPath} 
                      onChange={(e) => setDeployPath(e.target.value)}
                      className="h-10 rounded-xl bg-background/50 border-input/50 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                 </div>

                 <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <FileCode size={14} /> Python 可执行文件路径
                    </Label>
                    <Input 
                      value={pythonPath} 
                      onChange={(e) => setPythonPath(e.target.value)}
                      className="h-10 rounded-xl bg-background/50 border-input/50 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                 </div>

                 <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Cpu size={14} /> 虚拟环境类型
                    </Label>
                    <CustomSelect
                      label=""
                      value={venvType}
                      onChange={setVenvType}
                      className="mt-0"
                      options={[
                        { value: "venv", label: "venv (Standard)", desc: "Python 标准库虚拟环境" },
                        { value: "conda", label: "Conda", desc: "Anaconda / Miniconda 环境" },
                        { value: "poetry", label: "Poetry", desc: "Poetry 依赖管理" },
                      ]}
                    />
                 </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
