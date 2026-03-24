import { useState, useId } from "react"
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
  Sun,
  Moon,
  Monitor,
  Check,
  Download
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useTheme } from "@/hooks/useTheme"
import { 
  useCurrentVersionQuery,
  useChannelVersionsQuery,
  useCheckUpdateQuery,
  useInstallTauriUpdateMutation,
  useOpenDownloadPageMutation
} from "@/hooks/queries/useUpdateQueries"
import { UpdateDialog } from "@/components/update/UpdateDialog"

/**
 * 设置页面
 * 职责：应用配置和设置
 */
export function SettingsPage() {
  const [activeTab, setActiveTab] = useState("launcher")
  
  // 环境配置状态
  const [gitPath, setGitPath] = useState("/usr/bin/git")
  const [deployPath, setDeployPath] = useState("/Users/xaoxiao/mailauncher-data")
  const [pythonPath, setPythonPath] = useState("/usr/bin/python3")
  const [venvType, setVenvType] = useState("venv")
  const [isSaving, setIsSaving] = useState(false)

  const { theme: currentTheme, setTheme: setThemeMode } = useTheme()
  
  // 更新相关状态
  const [selectedChannel, setSelectedChannel] = useState('stable')
  const [selectedVersion, setSelectedVersion] = useState('')
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  
  const { data: currentVersion } = useCurrentVersionQuery()
  const { data: channelVersions } = useChannelVersionsQuery(selectedChannel)
  const { data: updateInfo, isLoading: isChecking, refetch: checkForUpdates } = useCheckUpdateQuery(selectedChannel)
  const installTauriUpdateMutation = useInstallTauriUpdateMutation()
  const openDownloadMutation = useOpenDownloadPageMutation()
  
  const installUpdate = async (_onProgress: (progress: number) => void) => {
    // 简化处理，实际应该使用 updateInfo
    if (updateInfo) {
      await installTauriUpdateMutation.mutateAsync(updateInfo)
    }
  }
  
  const downloadManually = () => {
    const url = 'https://github.com/xiaoxiao-cvs/mailauncher/releases'
    openDownloadMutation.mutate(url)
  }
  
  const pendingUpdate = updateInfo

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
            {/* 外观设置 */}
            <div className="group relative overflow-hidden rounded-3xl border border-border/50 bg-card/30 p-6 shadow-sm transition-all hover:shadow-md hover:bg-card/50 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Palette size={20} />
                </div>
                <h3 className="text-lg font-semibold">外观设置</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-3 block">主题模式</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: '浅色模式', icon: Sun, desc: '明亮清新的外观' },
                      { value: 'dark', label: '深色模式', icon: Moon, desc: '护眼舒适的暗色' },
                      { value: 'system', label: '跟随系统', icon: Monitor, desc: '自动匹配系统设置' }
                    ].map((option) => {
                      const Icon = option.icon
                      const isSelected = currentTheme === option.value
                      return (
                        <button
                          key={option.value}
                          onClick={() => setThemeMode(option.value as 'light' | 'dark' | 'system')}
                          className={cn(
                            "relative p-4 rounded-xl border-2 transition-all duration-200 text-left group/theme",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-input/50 bg-background/50 hover:border-primary/50 hover:bg-primary/5"
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className={cn(
                              "p-2 rounded-lg transition-colors",
                              isSelected 
                                ? "bg-primary/10 text-primary" 
                                : "bg-muted/50 text-muted-foreground group-hover/theme:bg-primary/10 group-hover/theme:text-primary"
                            )}>
                              <Icon size={18} />
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check size={14} className="text-primary-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-semibold mb-1">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 检查更新 */}
            <div className="group relative overflow-hidden rounded-3xl border border-border/50 bg-card/30 p-6 shadow-sm transition-all hover:shadow-md hover:bg-card/50 backdrop-blur-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400">
                    <RefreshCw size={20} />
                  </div>
                  <h3 className="text-lg font-semibold">检查更新</h3>
                </div>
                <Badge variant="secondary" className="font-mono px-3 py-1 rounded-full bg-muted/50">
                  当前版本: v{currentVersion}
                </Badge>
              </div>
              
              <div className="space-y-5">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-1/3">
                    <CustomSelect
                      label="更新通道"
                      value={selectedChannel}
                      onChange={(val) => { setSelectedChannel(val); setSelectedVersion("latest"); }}
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
                      value={selectedVersion}
                      onChange={setSelectedVersion}
                      options={(channelVersions?.versions || []).map((v: any) => ({
                        value: v.version || v,
                        label: v.version || v,
                        desc: v.date ? `发布于 ${v.date}` : ''
                      }))}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Button 
                    onClick={() => checkForUpdates()}
                    disabled={isChecking}
                    className="rounded-full h-11 px-6 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white border border-gray-200/50 dark:border-gray-700/50 shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    <RefreshCw className={cn("mr-2 h-4 w-4", isChecking && "animate-spin")} />
                    {isChecking ? '检查中...' : '检查更新'}
                  </Button>
                  
                  {updateInfo?.has_update && (
                    <div className="flex items-center justify-between gap-3 px-4 h-11 bg-white dark:bg-gray-800/50 rounded-full shadow-sm border border-gray-200/50 dark:border-gray-700/50">
                      <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {updateInfo.update_available?.version || selectedVersion}
                      </span>
                      
                      <Button
                        onClick={() => pendingUpdate ? setShowUpdateDialog(true) : downloadManually()}
                        className="rounded-full h-8 px-5 text-sm bg-gray-900 hover:bg-black dark:bg-gray-900 dark:hover:bg-black text-white border-0 shadow-sm transition-all duration-200 active:scale-95 whitespace-nowrap"
                      >
                        开始安装
                        <Download className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="environment" className="space-y-6 mt-0 outline-none">
            {/* Git 环境 */}
            <div className="group relative overflow-hidden rounded-3xl border border-border/50 bg-card/30 p-6 shadow-sm transition-all hover:shadow-md hover:bg-card/50 backdrop-blur-md">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <GitBranch size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Git 环境</h3>
                    <p className="text-xs text-muted-foreground mt-1">克隆和更新 Bot 实例所需</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input 
                    value={gitPath} 
                    onChange={(e) => setGitPath(e.target.value)}
                    placeholder="/usr/bin/git"
                    className="flex-1 h-10 rounded-xl bg-background/50 border-input/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl px-4 h-10 bg-background/50 border-input/50 hover:bg-primary/5 hover:border-primary/50"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    浏览
                  </Button>
                </div>
                
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    💡 提示：输入 Git 可执行文件的完整路径。如果 Git 已添加到系统 PATH，通常为 /usr/bin/git (macOS/Linux) 或 C:\Program Files\Git\bin\git.exe (Windows)
                  </p>
                </div>
              </div>
            </div>

            {/* 部署路径 */}
            <div className="group relative overflow-hidden rounded-3xl border border-border/50 bg-card/30 p-6 shadow-sm transition-all hover:shadow-md hover:bg-card/50 backdrop-blur-md">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400">
                    <FolderOpen size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">部署路径</h3>
                    <p className="text-xs text-muted-foreground mt-1">Bot 实例将安装到此目录</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input 
                    value={deployPath} 
                    onChange={(e) => setDeployPath(e.target.value)}
                    placeholder="/path/to/deployments"
                    className="flex-1 h-10 rounded-xl bg-background/50 border-input/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <Button
                    size="sm"
                    className="rounded-xl px-4 h-10 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    选择文件夹
                  </Button>
                </div>
                
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    💡 提示：可以直接输入路径，或点击按钮选择文件夹。默认路径为后端同目录下的 deployments 文件夹。
                  </p>
                </div>
              </div>
            </div>

            {/* Python 环境 */}
            <div className="group relative overflow-hidden rounded-3xl border border-border/50 bg-card/30 p-6 shadow-sm transition-all hover:shadow-md hover:bg-card/50 backdrop-blur-md">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <FileCode size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Python 环境</h3>
                    <p className="text-xs text-muted-foreground mt-1">运行 Bot 实例的 Python 解释器</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">Python 可执行文件路径</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={pythonPath} 
                      onChange={(e) => setPythonPath(e.target.value)}
                      placeholder="/usr/bin/python3"
                      className="flex-1 h-10 rounded-xl bg-background/50 border-input/50 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl px-4 h-10 bg-background/50 border-input/50 hover:bg-primary/5 hover:border-primary/50"
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      浏览
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">虚拟环境类型</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'venv', label: 'venv', icon: FileCode, desc: 'Python 标准库' },
                      { value: 'conda', label: 'Conda', icon: Cpu, desc: 'Anaconda 环境' },
                      { value: 'poetry', label: 'Poetry', icon: FileCode, desc: '依赖管理' }
                    ].map((option) => {
                      const Icon = option.icon
                      const isSelected = venvType === option.value
                      return (
                        <button
                          key={option.value}
                          onClick={() => setVenvType(option.value)}
                          className={cn(
                            "relative p-3 rounded-xl border-2 transition-all duration-200 text-left group/venv",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-input/50 bg-background/50 hover:border-primary/50 hover:bg-primary/5"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              isSelected 
                                ? "bg-primary/10 text-primary" 
                                : "bg-muted/50 text-muted-foreground group-hover/venv:bg-primary/10 group-hover/venv:text-primary"
                            )}>
                              <Icon size={16} />
                            </div>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                <Check size={10} className="text-primary-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-semibold mb-0.5">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 保存按钮 */}
            <div className="flex justify-end pt-2">
              <Button 
                size="lg" 
                disabled={isSaving}
                onClick={() => {
                  setIsSaving(true)
                  setTimeout(() => setIsSaving(false), 1500)
                }}
                className="rounded-xl px-8 bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? '保存中...' : '保存配置'}
              </Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* 更新对话框 */}
      <UpdateDialog
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
        versionInfo={updateInfo?.update_available || null}
        onConfirm={installUpdate}
      />
    </div>
  )
}
