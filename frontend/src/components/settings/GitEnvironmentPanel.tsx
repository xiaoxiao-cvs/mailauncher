import { GitBranch, FolderOpen } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface GitEnvironmentPanelProps {
  gitPath: string
  onGitPathChange: (value: string) => void
}

export function GitEnvironmentPanel({ gitPath, onGitPathChange }: GitEnvironmentPanelProps) {
  return (
    <div className="group relative overflow-hidden rounded-panel border border-border/50 bg-card/30 p-6 shadow-panel transition-all hover:shadow-panel-hover hover:bg-card/50 backdrop-blur-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-panel bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <GitBranch size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Git {'\u73af\u5883'}</h3>
            <p className="text-xs text-muted-foreground mt-1">{'\u514b\u9686\u548c\u66f4\u65b0 Bot \u5b9e\u4f8b\u6240\u9700'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={gitPath}
            onChange={(e) => onGitPathChange(e.target.value)}
            placeholder="/usr/bin/git"
            className="flex-1 h-10 rounded-card bg-background/50 border-input/50 focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <Button
            variant="outline"
            size="sm"
            className="rounded-card px-4 h-10 bg-background/50 border-input/50 hover:bg-primary/5 hover:border-primary/50"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            {'\u6d4f\u89c8'}
          </Button>
        </div>

        <div className="p-3 rounded-control bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {'\ud83d\udca1 \u63d0\u793a\uff1a\u8f93\u5165 Git \u53ef\u6267\u884c\u6587\u4ef6\u7684\u5b8c\u6574\u8def\u5f84\u3002\u5982\u679c Git \u5df2\u6dfb\u52a0\u5230\u7cfb\u7edf PATH\uff0c\u901a\u5e38\u4e3a /usr/bin/git (macOS/Linux) \u6216 C:\\Program Files\\Git\\bin\\git.exe (Windows)'}
          </p>
        </div>
      </div>
    </div>
  )
}
