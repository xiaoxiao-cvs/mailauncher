import { FileCode, Check, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

import { Surface, TactileButton, Label, Badge } from "@/components/ls";
import { springTap } from "@/design/motion";
import {
  usePythonVersionsQuery,
  useSetPythonDefaultMutation,
  useVenvTypeQuery,
  useSetVenvTypeMutation,
} from "@/hooks/queries/useEnvironmentQueries";

// 后端安装流程当前只实现了 venv(python -m venv);conda/poetry 未接线,标注暂未支持,不做假选项。
const VENV_OPTIONS = [
  { value: "venv", label: "venv", desc: "Python 标准库", supported: true },
  { value: "conda", label: "Conda", desc: "暂未支持", supported: false },
  { value: "poetry", label: "Poetry", desc: "暂未支持", supported: false },
] as const;

/**
 * Python 环境面板
 * 列出系统检测到的解释器,点选即经 select_python 设为默认;虚拟环境类型经 venv_type 持久化。
 */
export function PythonEnvironmentPanel() {
  const {
    data: versions = [],
    isLoading,
    isFetching,
    refetch,
  } = usePythonVersionsQuery();
  const selectPython = useSetPythonDefaultMutation();
  const { data: venvType = "venv" } = useVenvTypeQuery();
  const setVenvType = useSetVenvTypeMutation();

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
            <h3 className="text-lg font-semibold">Python 环境</h3>
            <p className="mt-1 text-xs" style={{ color: "var(--ls-ink-soft)" }}>
              运行 Bot 实例的 Python 解释器(需 3.12 及以上)
            </p>
          </div>
        </div>
        <TactileButton
          variant="ghost"
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          重新检测
        </TactileButton>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>已检测到的解释器</Label>
          {isLoading ? (
            <p className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
              正在检测...
            </p>
          ) : versions.length === 0 ? (
            <Surface
              variant="inset"
              className="flex items-center justify-between gap-3 p-3"
            >
              <p className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
                未检测到 Python
              </p>
              <a
                href="https://www.python.org/downloads/"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-sm hover:underline"
                style={{ color: "var(--ls-life)" }}
              >
                下载
              </a>
            </Surface>
          ) : (
            <div className="space-y-2">
              {versions.map((py) => {
                const isSelected = py.is_default ?? false;
                return (
                  <motion.button
                    key={py.path}
                    type="button"
                    onClick={() => selectPython.mutate(py.path)}
                    disabled={selectPython.isPending}
                    whileTap={{ scale: 0.99 }}
                    transition={springTap}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left outline-none disabled:opacity-60"
                    style={{
                      background: isSelected
                        ? "var(--ls-surface-hi)"
                        : "var(--ls-bg-2)",
                      border: `1px solid ${isSelected ? "var(--ls-life)" : "var(--ls-hairline)"}`,
                      borderRadius: "var(--ls-r-card)",
                      boxShadow: isSelected ? "var(--ls-shadow-soft)" : "none",
                    }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          Python {py.version}
                        </span>
                        {isSelected && <Badge tone="neutral">默认</Badge>}
                      </div>
                      <p
                        className="mt-0.5 truncate font-mono text-xs"
                        style={{ color: "var(--ls-ink-soft)" }}
                      >
                        {py.path}
                      </p>
                    </div>
                    {isSelected && (
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{ background: "var(--ls-life)" }}
                      >
                        <Check size={12} style={{ color: "#fff" }} />
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>虚拟环境类型</Label>
          <div className="grid grid-cols-3 gap-3">
            {VENV_OPTIONS.map((option) => {
              const isSelected = venvType === option.value;
              return (
                <motion.button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    option.supported && setVenvType.mutate(option.value)
                  }
                  disabled={!option.supported || setVenvType.isPending}
                  whileTap={option.supported ? { scale: 0.97 } : undefined}
                  transition={springTap}
                  className="relative p-3 text-left outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: isSelected
                      ? "var(--ls-surface-hi)"
                      : "var(--ls-bg-2)",
                    border: `1px solid ${isSelected ? "var(--ls-life)" : "var(--ls-hairline)"}`,
                    borderRadius: "var(--ls-r-card)",
                    boxShadow: isSelected ? "var(--ls-shadow-soft)" : "none",
                  }}
                >
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
