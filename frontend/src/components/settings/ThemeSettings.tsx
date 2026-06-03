import { Palette, Sun, Moon, Monitor, Check } from "lucide-react";
import { motion } from "motion/react";

import { Surface, Label } from "@/components/ls";
import { springTap } from "@/design/motion";
import { useTheme } from "@/hooks/useTheme";

const THEME_OPTIONS = [
  { value: "light", label: "浅色模式", icon: Sun, desc: "明亮清新的外观" },
  { value: "dark", label: "深色模式", icon: Moon, desc: "护眼舒适的暗色" },
  {
    value: "system",
    label: "跟随系统",
    icon: Monitor,
    desc: "自动匹配系统设置",
  },
] as const;

export function ThemeSettings() {
  const { theme: currentTheme, setTheme: setThemeMode } = useTheme();

  return (
    <Surface variant="panel" className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[var(--ls-r-control)]"
          style={{ background: "var(--ls-bg-2)", color: "var(--ls-ink-soft)" }}
        >
          <Palette size={20} />
        </div>
        <h3 className="text-lg font-semibold">{"外观设置"}</h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="mb-3 block">{"主题模式"}</Label>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = currentTheme === option.value;
              return (
                <motion.button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setThemeMode(option.value as "light" | "dark" | "system")
                  }
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ y: -1 }}
                  transition={springTap}
                  className="relative p-4 text-left outline-none"
                  style={{
                    background: isSelected
                      ? "var(--ls-surface-hi)"
                      : "var(--ls-bg-2)",
                    border: `1px solid ${isSelected ? "var(--ls-life)" : "var(--ls-hairline)"}`,
                    borderRadius: "var(--ls-r-card)",
                    boxShadow: isSelected ? "var(--ls-shadow-soft)" : "none",
                  }}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-[var(--ls-r-control)]"
                      style={{
                        background: isSelected
                          ? "var(--ls-life-soft)"
                          : "var(--ls-bg)",
                        color: isSelected
                          ? "var(--ls-life)"
                          : "var(--ls-ink-soft)",
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    {isSelected && (
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full"
                        style={{ background: "var(--ls-life)" }}
                      >
                        <Check size={14} style={{ color: "#fff" }} />
                      </span>
                    )}
                  </div>
                  <div className="mb-1 text-sm font-semibold">
                    {option.label}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    {option.desc}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </Surface>
  );
}
