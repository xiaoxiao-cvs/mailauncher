import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { MaibotVersion } from '@/types/download'

interface InstanceConfigPanelProps {
  instanceName: string
  setInstanceName: (name: string) => void
  selectedMaibotVersion: MaibotVersion
  setSelectedMaibotVersion: (version: MaibotVersion) => void
  maibotVersions: MaibotVersion[]
  deploymentPath: string
  setDeploymentPath: (path: string) => void
  selectDeploymentPath: () => void
  isLoadingPath: boolean
  hasDownloading: boolean
}

export function InstanceConfigPanel({
  instanceName,
  setInstanceName,
  selectedMaibotVersion,
  setSelectedMaibotVersion,
  maibotVersions,
  deploymentPath,
  setDeploymentPath,
  selectDeploymentPath,
  isLoadingPath,
  hasDownloading,
}: InstanceConfigPanelProps) {
  return (
    <div className="lg:col-span-7 animate-item">
      <div className="glass-panel overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-card bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-white flex-shrink-0">
              <Icon icon="ph:robot-fill" className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">Maibot</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-destructive/10 text-destructive uppercase tracking-wide">
                  核心
                </span>
              </div>
              <p className="text-sm text-muted-foreground">MAI 机器人核心框架</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-0.5">实例名称</label>
              <input
                type="text"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="给您的机器人起个名字..."
                disabled={hasDownloading}
                className={cn(
                  'w-full px-4 py-3 text-sm rounded-control border border-border',
                  'bg-muted/50 text-foreground',
                  'placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/30',
                  'transition-all duration-200',
                  'disabled:opacity-60 disabled:cursor-not-allowed'
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-0.5">选择版本</label>
              <Select
                value={selectedMaibotVersion.value}
                onValueChange={(value) => {
                  const version = maibotVersions.find(v => v.value === value)
                  if (version) setSelectedMaibotVersion(version)
                }}
                disabled={hasDownloading}
              >
                <SelectTrigger className="w-full h-11 px-4 rounded-control border border-border bg-muted/50 text-foreground text-sm focus:ring-2 focus:ring-brand/20 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-card border border-border bg-popover shadow-overlay">
                  {maibotVersions.map((version) => (
                    <SelectItem key={version.value} value={version.value} className="rounded-control my-0.5 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Icon
                          icon={
                            version.source === 'latest'
                              ? 'ph:code-bold'
                              : version.source === 'tag'
                              ? 'ph:tag-bold'
                              : 'ph:git-branch-bold'
                          }
                          className="w-4 h-4 text-muted-foreground"
                        />
                        <span className="font-medium">{version.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Icon icon="ph:folder-open" className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">部署位置</h3>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={deploymentPath}
                onChange={(e) => setDeploymentPath(e.target.value)}
                placeholder="选择安装目录..."
                disabled={hasDownloading || isLoadingPath}
                className={cn(
                  'w-full px-4 py-3 text-sm rounded-control border border-border',
                  'bg-muted/50 text-foreground',
                  'placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/30',
                  'transition-all duration-200',
                  'disabled:opacity-60 disabled:cursor-not-allowed'
                )}
              />
              {isLoadingPath && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Icon icon="ph:spinner-bold" className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <Button
              onClick={selectDeploymentPath}
              disabled={hasDownloading || isLoadingPath}
              variant="outline"
              className="h-auto px-4 rounded-control border-border"
            >
              <Icon icon="ph:folder-simple-bold" className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
