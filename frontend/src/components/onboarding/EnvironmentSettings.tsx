import { LoaderIcon, AlertCircleIcon } from "lucide-react";
import {
  usePythonVersionsQuery,
  usePythonDefaultQuery,
  useSetPythonDefaultMutation,
} from "@/hooks/queries/useEnvironmentQueries";
import { useState, useEffect } from "react";
import {
  Label,
  SelectRoot,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ls";

interface EnvironmentSettingsProps {
  stepColor?: string;
}

/**
 * 环境配置组件
 * 职责：选择默认 Python 版本
 */
export function EnvironmentSettings(_props: EnvironmentSettingsProps) {
  const {
    data: pythonVersions = [],
    isLoading: isLoadingPython,
    error: pythonErrorObj,
  } = usePythonVersionsQuery();
  const { data: selectedPython } = usePythonDefaultQuery();
  const savePythonMutation = useSetPythonDefaultMutation();
  const pythonError = pythonErrorObj ? String(pythonErrorObj) : null;

  const [localSelectedPython, setLocalSelectedPython] = useState(
    selectedPython?.path || "",
  );

  useEffect(() => {
    if (selectedPython?.path) {
      setLocalSelectedPython(selectedPython.path);
    }
  }, [selectedPython]);

  const currentVersion = pythonVersions.find(
    (v) => v.path === localSelectedPython,
  );

  return (
    <div className="space-y-6">
      {/* Python 版本 */}
      <div className="space-y-2">
        <Label>默认 Python 版本</Label>

        {pythonError ? (
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--ls-danger)" }}
          >
            <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{pythonError}</span>
          </div>
        ) : isLoadingPython ? (
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
            <span>检测中…</span>
          </div>
        ) : pythonVersions.length > 0 ? (
          <SelectRoot
            value={localSelectedPython || undefined}
            onValueChange={(path) => {
              setLocalSelectedPython(path);
              savePythonMutation.mutate(path);
            }}
            disabled={savePythonMutation.isPending}
          >
            <SelectTrigger className="h-auto py-2.5 px-3.5">
              {/* 触发器自渲染:展示版本号 + 等宽路径两行,而非 SelectValue 单行文本 */}
              {currentVersion ? (
                <div className="flex-1 min-w-0 text-left">
                  <div
                    className="text-sm font-medium"
                    style={{ color: "var(--ls-ink)" }}
                  >
                    {currentVersion.version}
                  </div>
                  <div
                    className="ls-num text-[11px] font-mono truncate mt-0.5"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    {localSelectedPython}
                  </div>
                </div>
              ) : (
                <span
                  className="text-sm"
                  style={{ color: "var(--ls-ink-faint)" }}
                >
                  选择 Python 版本
                </span>
              )}
            </SelectTrigger>
            <SelectContent>
              {pythonVersions.map((version) => (
                <SelectItem key={version.path} value={version.path}>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--ls-ink)" }}
                    >
                      {version.version}
                    </div>
                    <div
                      className="ls-num text-[11px] font-mono truncate"
                      style={{ color: "var(--ls-ink-soft)" }}
                    >
                      {version.path}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </SelectRoot>
        ) : (
          <p className="text-xs" style={{ color: "var(--ls-warn)" }}>
            未检测到 Python 环境，请返回上一步安装
          </p>
        )}
      </div>
    </div>
  );
}
