import { LoaderIcon, AlertCircleIcon, CheckIcon } from "lucide-react";
import { motion } from "motion/react";
import {
  usePythonVersionsQuery,
  usePythonDefaultQuery,
  useSetPythonDefaultMutation,
  useVenvTypeQuery,
  useSetVenvTypeMutation,
} from "@/hooks/queries/useEnvironmentQueries";
import { useState, useEffect } from "react";

import {
  Surface,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ls";
import { springTap } from "@/design/motion";

// 仅本组件内部使用；规范的导出版本在 hooks/usePythonEnvironment.ts
const VENV_TYPES = [
  { value: "venv", label: "venv", desc: "Python 内置虚拟环境" },
  { value: "uv", label: "uv", desc: "快速的 Python 包管理器" },
  { value: "conda", label: "conda", desc: "Conda 环境管理" },
];

interface PythonEnvironmentProps {
  // 由引导步骤注入的强调色；生息风格下层级靠 token 表达，强调色不参与上色，保留以兼容调用方契约。
  stepColor: string;
}

/**
 * Python 环境配置组件
 * 职责：选择默认 Python 版本（优化显示，避免滚动条）
 */
export function PythonEnvironment(_props: PythonEnvironmentProps) {
  // Python 版本管理
  const {
    data: pythonVersions = [],
    isLoading: isLoadingPython,
    error: pythonErrorObj,
  } = usePythonVersionsQuery();
  const { data: selectedPython } = usePythonDefaultQuery();
  const savePythonMutation = useSetPythonDefaultMutation();
  const pythonError = pythonErrorObj ? String(pythonErrorObj) : null;

  // Venv 类型管理
  const { data: venvType = "venv", isLoading: isLoadingVenv } =
    useVenvTypeQuery();
  const saveVenvMutation = useSetVenvTypeMutation();

  // 本地状态:存所选 Python 的可执行路径(usePythonDefaultQuery 返回 {version, path} 对象)
  const [localSelectedPython, setLocalSelectedPython] = useState(
    selectedPython?.path || "",
  );
  const [localVenvType, setLocalVenvType] = useState(venvType);

  // 同步 selectedPython
  useEffect(() => {
    if (selectedPython?.path) {
      setLocalSelectedPython(selectedPython.path);
    }
  }, [selectedPython]);

  // 同步 venvType
  useEffect(() => {
    if (typeof venvType === "string") {
      setLocalVenvType(venvType);
    }
  }, [venvType]);

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Python 版本选择 - 优化布局，不超出区域 */}
      <Surface variant="card" className="p-3.5">
        <div className="mb-3 flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-[var(--ls-r-control)]"
            style={{
              background: "var(--ls-bg-2)",
              color: "var(--ls-ink-soft)",
            }}
          >
            {isLoadingPython ? (
              <LoaderIcon className="h-[18px] w-[18px] animate-spin" />
            ) : (
              <span className="text-xs font-bold">Py</span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold">默认 Python 版本</h3>
            <p className="text-xs" style={{ color: "var(--ls-ink-soft)" }}>
              新建实例时使用的 Python 版本
            </p>
          </div>
        </div>

        {pythonError ? (
          <Surface variant="inset" className="flex items-start gap-2 p-2.5">
            <AlertCircleIcon
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: "var(--ls-danger)" }}
            />
            <p className="text-xs" style={{ color: "var(--ls-danger)" }}>
              {pythonError}
            </p>
          </Surface>
        ) : isLoadingPython ? (
          <div className="py-6 text-center">
            <LoaderIcon
              className="mx-auto h-5 w-5 animate-spin"
              style={{ color: "var(--ls-ink-soft)" }}
            />
            <p className="mt-2 text-xs" style={{ color: "var(--ls-ink-soft)" }}>
              加载中...
            </p>
          </div>
        ) : pythonVersions.length > 0 ? (
          <div className="space-y-3">
            {/* 当前选中的版本 */}
            <SelectRoot
              value={localSelectedPython}
              onValueChange={(value) => {
                setLocalSelectedPython(value);
                savePythonMutation.mutate(value);
              }}
              disabled={savePythonMutation.isPending}
            >
              <SelectTrigger className="h-auto py-2">
                <SelectValue placeholder="选择 Python 版本">
                  {localSelectedPython ? (
                    <span className="flex flex-col text-left">
                      <span className="text-sm font-medium">
                        {pythonVersions.find(
                          (v) => v.path === localSelectedPython,
                        )?.version || "未选择"}
                      </span>
                      <span
                        className="max-w-md truncate font-mono text-xs"
                        style={{ color: "var(--ls-ink-soft)" }}
                      >
                        {localSelectedPython}
                      </span>
                    </span>
                  ) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {pythonVersions.map((version) => (
                  <SelectItem key={version.path} value={version.path}>
                    <span className="flex flex-col">
                      <span className="text-xs font-medium">
                        {version.version}
                        {version.is_default && (
                          <span
                            className="ml-2 text-[10px]"
                            style={{ color: "var(--ls-ink-faint)" }}
                          >
                            (默认)
                          </span>
                        )}
                      </span>
                      <span
                        className="truncate font-mono text-[10px]"
                        style={{ color: "var(--ls-ink-soft)" }}
                      >
                        {version.path}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>

            {/* 提示信息 - 简化 */}
            <Surface variant="inset" className="p-2">
              <p className="text-xs" style={{ color: "var(--ls-ink-soft)" }}>
                共{" "}
                <span className="ls-num font-semibold">
                  {pythonVersions.length}
                </span>{" "}
                个版本可用
              </p>
            </Surface>
          </div>
        ) : (
          <Surface variant="inset" className="p-3">
            <p className="text-xs" style={{ color: "var(--ls-warn)" }}>
              未检测到 Python 环境
            </p>
          </Surface>
        )}
      </Surface>

      {/* 虚拟环境类型选择 */}
      <Surface variant="card" className="p-3.5">
        <div className="mb-3 flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-[var(--ls-r-control)]"
            style={{
              background: "var(--ls-bg-2)",
              color: "var(--ls-ink-soft)",
            }}
          >
            <span className="text-xs font-bold">Env</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold">虚拟环境类型</h3>
            <p className="text-xs" style={{ color: "var(--ls-ink-soft)" }}>
              新建实例时使用的虚拟环境管理器
            </p>
          </div>
        </div>

        {isLoadingVenv ? (
          <div className="py-4 text-center">
            <LoaderIcon
              className="mx-auto h-5 w-5 animate-spin"
              style={{ color: "var(--ls-ink-soft)" }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {VENV_TYPES.map((type) => {
              const isSelected = localVenvType === type.value;
              return (
                <motion.button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setLocalVenvType(type.value);
                    saveVenvMutation.mutate(type.value);
                  }}
                  disabled={saveVenvMutation.isPending}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ y: -1 }}
                  transition={springTap}
                  className="relative p-2 text-center outline-none disabled:opacity-60"
                  style={{
                    background: isSelected
                      ? "var(--ls-surface-hi)"
                      : "var(--ls-bg-2)",
                    border: `1px solid ${isSelected ? "var(--ls-life)" : "var(--ls-hairline)"}`,
                    borderRadius: "var(--ls-r-card)",
                    boxShadow: isSelected ? "var(--ls-shadow-soft)" : "none",
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-semibold">{type.label}</span>
                    {isSelected && (
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded-full"
                        style={{ background: "var(--ls-life)" }}
                      >
                        <CheckIcon
                          className="h-2.5 w-2.5"
                          style={{ color: "#fff" }}
                        />
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-1 text-[10px]"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    {type.desc}
                  </p>
                </motion.button>
              );
            })}
          </div>
        )}
      </Surface>
    </div>
  );
}
