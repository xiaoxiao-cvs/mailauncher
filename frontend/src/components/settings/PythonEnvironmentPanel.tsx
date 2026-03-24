import { FileCode, Cpu, FolderOpen, Check } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const VENV_OPTIONS = [
  { value: 'venv', label: 'venv', icon: FileCode, desc: 'Python \u6807\u51c6\u5e93' },
  { value: 'conda', label: 'Conda', icon: Cpu, desc: 'Anaconda \u73af\u5883' },
  { value: 'poetry', label: 'Poetry', icon: FileCode, desc: '\u4f9d\u8d56\u7ba1\u7406' },
] as const

interface PythonEnvironmentPanelProps {
  pythonPath: string
  onPythonPathChange: (value: string) => void
  venvType: string
  onVenvTypeChange: (value: string) => void
}

export function PythonEnvironmentPanel({
  pythonPath,
  onPythonPathChange,
  venvType,
  onVenvTypeChange,
}: PythonEnvironmentPanelProps) {
  return (
    <div className="group relative overflow-hidden rounded-panel border border-border/50 bg-card/30 p-6 shadow-panel transition-all hover:shadow-panel-hover hover:bg-card/50 backdrop-blur-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-panel bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <FileCode size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Python {'\u73af\u5883'}</h3>
            <p className="text-xs text-muted-foreground mt-1">{'\u8fd0\u884c Bot \u5b9e\u4f8b\u7684 Python \u89e3\u91ca\u5668'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">Python {'\u53ef\u6267\u884c\u6587\u4ef6\u8def\u5f84'}</Label>
          <div className="flex gap-2">
            <Input
              value={pythonPath}
              onChange={(e) => onPythonPathChange(e.target.value)}
              placeholder="/usr/bin/python3"
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
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">{'\u865a\u62df\u73af\u5883\u7c7b\u578b'}</Label>
          <div className="grid grid-cols-3 gap-3">
            {VENV_OPTIONS.map((option) => {
              const Icon = option.icon
              const isSelected = venvType === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => onVenvTypeChange(option.value)}
                  className={cn(
                    "relative p-3 rounded-card border-2 transition-all duration-200 text-left group/venv",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-panel-hover"
                      : "border-input/50 bg-background/50 hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn(
                      "p-1.5 rounded-control transition-colors",
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
  )
}
