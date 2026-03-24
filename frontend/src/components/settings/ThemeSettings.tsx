import { Palette, Sun, Moon, Monitor, Check } from "lucide-react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useTheme } from "@/hooks/useTheme"

const THEME_OPTIONS = [
  { value: 'light', label: '\u6d45\u8272\u6a21\u5f0f', icon: Sun, desc: '\u660e\u4eae\u6e05\u65b0\u7684\u5916\u89c2' },
  { value: 'dark', label: '\u6df1\u8272\u6a21\u5f0f', icon: Moon, desc: '\u62a4\u773c\u8212\u9002\u7684\u6697\u8272' },
  { value: 'system', label: '\u8ddf\u968f\u7cfb\u7edf', icon: Monitor, desc: '\u81ea\u52a8\u5339\u914d\u7cfb\u7edf\u8bbe\u7f6e' },
] as const

export function ThemeSettings() {
  const { theme: currentTheme, setTheme: setThemeMode } = useTheme()

  return (
    <div className="group relative overflow-hidden rounded-panel border border-border/50 bg-card/30 p-6 shadow-panel transition-all hover:shadow-panel-hover hover:bg-card/50 backdrop-blur-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-panel bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <Palette size={20} />
        </div>
        <h3 className="text-lg font-semibold">{'\u5916\u89c2\u8bbe\u7f6e'}</h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-muted-foreground mb-3 block">{'\u4e3b\u9898\u6a21\u5f0f'}</Label>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon
              const isSelected = currentTheme === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => setThemeMode(option.value as 'light' | 'dark' | 'system')}
                  className={cn(
                    "relative p-4 rounded-card border-2 transition-all duration-200 text-left group/theme",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-panel-hover"
                      : "border-input/50 bg-background/50 hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={cn(
                      "p-2 rounded-control transition-colors",
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
  )
}
