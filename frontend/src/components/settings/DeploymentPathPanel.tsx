import { FolderOpen } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface DeploymentPathPanelProps {
  deployPath: string
  onDeployPathChange: (value: string) => void
}

export function DeploymentPathPanel({ deployPath, onDeployPathChange }: DeploymentPathPanelProps) {
  return (
    <div className="group relative overflow-hidden rounded-panel border border-border/50 bg-card/30 p-6 shadow-panel transition-all hover:shadow-panel-hover hover:bg-card/50 backdrop-blur-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-panel bg-green-500/10 text-green-600 dark:text-green-400">
            <FolderOpen size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{'\u90e8\u7f72\u8def\u5f84'}</h3>
            <p className="text-xs text-muted-foreground mt-1">Bot {'\u5b9e\u4f8b\u5c06\u5b89\u88c5\u5230\u6b64\u76ee\u5f55'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={deployPath}
            onChange={(e) => onDeployPathChange(e.target.value)}
            placeholder="/path/to/deployments"
            className="flex-1 h-10 rounded-card bg-background/50 border-input/50 focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <Button
            size="sm"
            className="rounded-card px-4 h-10 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            {'\u9009\u62e9\u6587\u4ef6\u5939'}
          </Button>
        </div>

        <div className="p-3 rounded-control bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {'\ud83d\udca1 \u63d0\u793a\uff1a\u53ef\u4ee5\u76f4\u63a5\u8f93\u5165\u8def\u5f84\uff0c\u6216\u70b9\u51fb\u6309\u94ae\u9009\u62e9\u6587\u4ef6\u5939\u3002\u9ed8\u8ba4\u8def\u5f84\u4e3a\u540e\u7aef\u540c\u76ee\u5f55\u4e0b\u7684 deployments \u6587\u4ef6\u5939\u3002'}
          </p>
        </div>
      </div>
    </div>
  )
}
