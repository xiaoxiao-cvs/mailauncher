import { useState } from "react"
import { Settings, Server, Save } from "lucide-react"

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  ThemeSettings,
  UpdateCheckSection,
  GitEnvironmentPanel,
  DeploymentPathPanel,
  PythonEnvironmentPanel,
} from "@/components/settings"

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState("launcher")

  const [gitPath, setGitPath] = useState("/usr/bin/git")
  const [deployPath, setDeployPath] = useState("/Users/xaoxiao/mailauncher-data")
  const [pythonPath, setPythonPath] = useState("/usr/bin/python3")
  const [venvType, setVenvType] = useState("venv")
  const [isSaving, setIsSaving] = useState(false)

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col">
      <div className="pt-8 px-8 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90 mb-2">设置</h1>
        <p className="text-muted-foreground">管理启动器偏好与环境配置</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
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

        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
          <TabsContent value="launcher" className="space-y-6 mt-0 outline-none">
            <ThemeSettings />
            <UpdateCheckSection />
          </TabsContent>

          <TabsContent value="environment" className="space-y-6 mt-0 outline-none">
            <GitEnvironmentPanel gitPath={gitPath} onGitPathChange={setGitPath} />
            <DeploymentPathPanel deployPath={deployPath} onDeployPathChange={setDeployPath} />
            <PythonEnvironmentPanel
              pythonPath={pythonPath}
              onPythonPathChange={setPythonPath}
              venvType={venvType}
              onVenvTypeChange={setVenvType}
            />

            <div className="flex justify-end pt-2">
              <Button
                size="lg"
                disabled={isSaving}
                onClick={() => {
                  setIsSaving(true)
                  setTimeout(() => setIsSaving(false), 1500)
                }}
                className="rounded-card px-8 bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? '保存中...' : '保存配置'}
              </Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
