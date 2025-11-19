import { useState } from "react"
import {
  Settings,
  Server,
  RefreshCw,
  Palette,
  GitBranch,
  FolderOpen,
  FileCode,
  Cpu
} from "lucide-react"

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

/**
 * 设置页面
 * 职责：应用配置和设置
 */
export function SettingsPage() {
  const [channel, setChannel] = useState("main")
  const [version, setVersion] = useState("latest")

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

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col pt-8 px-6">
      <Tabs defaultValue="launcher" className="w-full h-full flex flex-col">
        <div className="flex-none">
          <ScrollArea>
            <TabsList className="mb-3 h-auto gap-2 rounded-none border-b bg-transparent px-0 py-1 text-foreground">
              <TabsTrigger
                value="launcher"
                className="relative after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent"
              >
                <Settings
                  className="-ms-0.5 me-1.5 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                启动器设置
              </TabsTrigger>
              <TabsTrigger
                value="environment"
                className="relative after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent"
              >
                <Server
                  className="-ms-0.5 me-1.5 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                环境配置
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="launcher" className="space-y-8 p-1">
            {/* 外观设置区域 */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-medium text-foreground/90">
                <Palette size={20} />
                <h3>外观设置</h3>
              </div>
              <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                <p className="text-muted-foreground text-sm">外观设置功能开发中...</p>
              </div>
            </section>

            {/* 检查更新区域 */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-medium text-foreground/90">
                  <RefreshCw size={20} />
                  <h3>检查更新</h3>
                </div>
                <Badge variant="secondary" className="font-mono">
                  当前版本: v0.0.1
                </Badge>
              </div>
              
              <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    更新通道与版本
                  </label>
                  <div className="flex gap-4">
                    {/* 通道选择 */}
                    <Select value={channel} onValueChange={(val) => { setChannel(val); setVersion("latest"); }}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="选择通道" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Main (Stable)</SelectItem>
                        <SelectItem value="beta">Beta (Testing)</SelectItem>
                        <SelectItem value="develop">Develop (Nightly)</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* 版本选择 */}
                    <Select value={version} onValueChange={setVersion}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="选择版本" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentVersions.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            <div className="flex justify-between w-full gap-4">
                              <span>{v.label}</span>
                              <span className="text-muted-foreground text-xs">{v.date}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    检查更新
                  </Button>
                  
                  {version !== "latest" && (
                     <Button className="bg-green-600 hover:bg-green-700 text-white">
                       更新到 {selectedVersionLabel}
                     </Button>
                  )}
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="environment" className="space-y-8 p-1">
             {/* 环境配置区域 */}
             <section className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-medium text-foreground/90">
                <Server size={20} />
                <h3>环境信息</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                 <div className="p-4 border rounded-lg bg-card space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GitBranch size={16} />
                      <h4 className="font-medium text-sm">Git 环境</h4>
                    </div>
                    <p className="font-mono text-sm pl-6">/usr/bin/git</p>
                 </div>
                 <div className="p-4 border rounded-lg bg-card space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FolderOpen size={16} />
                      <h4 className="font-medium text-sm">部署路径</h4>
                    </div>
                    <p className="font-mono text-sm pl-6">/Users/xaoxiao/mailauncher-data</p>
                 </div>
                 <div className="p-4 border rounded-lg bg-card space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileCode size={16} />
                      <h4 className="font-medium text-sm">Python 环境</h4>
                    </div>
                    <p className="font-mono text-sm pl-6">/usr/bin/python3</p>
                 </div>
                 <div className="p-4 border rounded-lg bg-card space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Cpu size={16} />
                      <h4 className="font-medium text-sm">虚拟环境类型</h4>
                    </div>
                    <p className="font-mono text-sm pl-6">venv</p>
                 </div>
              </div>
            </section>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
