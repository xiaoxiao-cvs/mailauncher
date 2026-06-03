import { FileCode, Cpu, FolderOpen, Check } from "lucide-react";
import { motion } from "motion/react";

import { Surface, Input, TactileButton, Label } from "@/components/ls";
import { springTap } from "@/design/motion";

const VENV_OPTIONS = [
  { value: "venv", label: "venv", icon: FileCode, desc: "Python 标准库" },
  { value: "conda", label: "Conda", icon: Cpu, desc: "Anaconda 环境" },
  { value: "poetry", label: "Poetry", icon: FileCode, desc: "依赖管理" },
] as const;

interface PythonEnvironmentPanelProps {
  pythonPath: string;
  onPythonPathChange: (value: string) => void;
  venvType: string;
  onVenvTypeChange: (value: string) => void;
}

export function PythonEnvironmentPanel({
  pythonPath,
  onPythonPathChange,
  venvType,
  onVenvTypeChange,
}: PythonEnvironmentPanelProps) {
  return (
    <Surface variant="panel" className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[var(--ls-r-control)]"
            style={{
              background: "var(--ls-bg-2)",
              color: "var(--ls-ink-soft)",
            }}
          >
            <FileCode size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Python {"环境"}</h3>
            <p className="mt-1 text-xs" style={{ color: "var(--ls-ink-soft)" }}>
              {"运行 Bot 实例的 Python 解释器"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Python {"可执行文件路径"}</Label>
          <div className="flex gap-2">
            <Input
              value={pythonPath}
              onChange={(e) => onPythonPathChange(e.target.value)}
              placeholder="/usr/bin/python3"
              className="flex-1"
            />
            <TactileButton variant="solid" className="shrink-0">
              <FolderOpen size={16} />
              {"浏览"}
            </TactileButton>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{"虚拟环境类型"}</Label>
          <div className="grid grid-cols-3 gap-3">
            {VENV_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = venvType === option.value;
              return (
                <motion.button
                  key={option.value}
                  type="button"
                  onClick={() => onVenvTypeChange(option.value)}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ y: -1 }}
                  transition={springTap}
                  className="relative p-3 text-left outline-none"
                  style={{
                    background: isSelected
                      ? "var(--ls-surface-hi)"
                      : "var(--ls-bg-2)",
                    border: `1px solid ${isSelected ? "var(--ls-life)" : "var(--ls-hairline)"}`,
                    borderRadius: "var(--ls-r-card)",
                    boxShadow: isSelected ? "var(--ls-shadow-soft)" : "none",
                  }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-[var(--ls-r-control)]"
                      style={{
                        background: isSelected
                          ? "var(--ls-life-soft)"
                          : "var(--ls-bg)",
                        color: isSelected
                          ? "var(--ls-life)"
                          : "var(--ls-ink-soft)",
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    {isSelected && (
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded-full"
                        style={{ background: "var(--ls-life)" }}
                      >
                        <Check size={10} style={{ color: "#fff" }} />
                      </span>
                    )}
                  </div>
                  <div className="mb-0.5 text-sm font-semibold">
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
