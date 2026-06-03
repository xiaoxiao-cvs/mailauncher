import {
  CheckCircle2Icon,
  XCircleIcon,
  LoaderIcon,
  AlertCircleIcon,
} from "lucide-react";
import {
  useGitEnvironmentQuery,
  usePythonVersionsQuery,
  usePythonDefaultQuery,
  useSetPythonDefaultMutation,
} from "@/hooks/queries/useEnvironmentQueries";
import { useState, useEffect } from "react";

import {
  Surface,
  TactileButton,
  StatusDot,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ls";

interface GitCheckProps {
  // 由引导步骤注入的强调色；生息风格下层级靠 token 表达，强调色不参与上色，保留以兼容调用方契约。
  stepColor: string;
  onGitStatusChange?: (isAvailable: boolean) => void;
}

/**
 * Git 环境检查与 Python 选择组件
 * 职责：检查 Git 环境并选择默认 Python 版本
 */
export function GitCheck({ onGitStatusChange }: GitCheckProps) {
  // Git 环境检查
  const {
    data: gitInfo,
    isLoading: isCheckingGit,
    error: gitErrorObj,
    refetch: checkGitEnvironment,
  } = useGitEnvironmentQuery();
  const gitError = gitErrorObj ? String(gitErrorObj) : null;

  // Python 版本管理
  const {
    data: pythonVersions = [],
    isLoading: isLoadingPython,
    error: pythonErrorObj,
  } = usePythonVersionsQuery();
  const pythonError = pythonErrorObj ? String(pythonErrorObj) : null;
  const { data: selectedPython } = usePythonDefaultQuery();
  const savePythonMutation = useSetPythonDefaultMutation();

  // 本地状态:存所选 Python 的可执行路径(usePythonDefaultQuery 返回 {version, path} 对象)
  const [localSelectedPython, setLocalSelectedPython] = useState(
    selectedPython?.path || "",
  );

  // 同步 selectedPython 到本地状态
  useEffect(() => {
    if (selectedPython?.path) {
      setLocalSelectedPython(selectedPython.path);
    }
  }, [selectedPython]);

  // 通知父组件 Git 状态变化
  useEffect(() => {
    if (gitInfo && onGitStatusChange) {
      onGitStatusChange(gitInfo.is_available);
    }
  }, [gitInfo, onGitStatusChange]);

  return (
    <div className="space-y-4">
      {/* Git 环境检查 */}
      <Surface variant="card" className="p-3.5">
        <div className="mb-2.5 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-[var(--ls-r-control)]"
              style={{
                background: "var(--ls-bg-2)",
                color: "var(--ls-ink-soft)",
              }}
            >
              {isCheckingGit ? (
                <LoaderIcon className="h-[18px] w-[18px] animate-spin" />
              ) : gitInfo?.is_available ? (
                <CheckCircle2Icon
                  className="h-[18px] w-[18px]"
                  style={{ color: "var(--ls-life)" }}
                />
              ) : (
                <XCircleIcon
                  className="h-[18px] w-[18px]"
                  style={{ color: "var(--ls-danger)" }}
                />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold">Git 环境</h3>
              <p className="text-xs" style={{ color: "var(--ls-ink-soft)" }}>
                克隆和更新 Bot 实例所需
              </p>
            </div>
          </div>
          <TactileButton
            variant="solid"
            onClick={() => checkGitEnvironment()}
            disabled={isCheckingGit}
            className="h-8 disabled:opacity-60"
          >
            {isCheckingGit ? "检查中..." : "重新检查"}
          </TactileButton>
        </div>

        {gitError ? (
          <Surface variant="inset" className="flex items-start gap-2 p-2.5">
            <AlertCircleIcon
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: "var(--ls-danger)" }}
            />
            <p className="text-xs" style={{ color: "var(--ls-danger)" }}>
              {gitError}
            </p>
          </Surface>
        ) : gitInfo ? (
          <div className="space-y-1.5">
            <Surface
              variant="inset"
              className="flex items-center justify-between px-2.5 py-1.5"
            >
              <span className="text-xs" style={{ color: "var(--ls-ink-soft)" }}>
                状态
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <StatusDot running={gitInfo.is_available} />
                <span
                  style={{
                    color: gitInfo.is_available
                      ? "var(--ls-life)"
                      : "var(--ls-danger)",
                  }}
                >
                  {gitInfo.is_available ? "已安装" : "未安装"}
                </span>
              </span>
            </Surface>

            {gitInfo.is_available && (
              <>
                <Surface
                  variant="inset"
                  className="flex items-center justify-between px-2.5 py-1.5"
                >
                  <span
                    className="text-xs"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    版本
                  </span>
                  <span className="ls-num font-mono text-xs font-medium">
                    {gitInfo.version}
                  </span>
                </Surface>
                <Surface
                  variant="inset"
                  className="flex items-center justify-between px-2.5 py-1.5"
                >
                  <span
                    className="text-xs"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    路径
                  </span>
                  <span className="max-w-xs truncate font-mono text-xs">
                    {gitInfo.path}
                  </span>
                </Surface>
              </>
            )}
          </div>
        ) : null}

        {gitInfo && !gitInfo.is_available && (
          <Surface variant="inset" className="mt-2.5 p-2.5">
            <p className="text-xs" style={{ color: "var(--ls-warn)" }}>
              未检测到 Git。请先安装 Git：
              <a
                href="https://git-scm.com/downloads"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 underline"
                style={{ color: "var(--ls-warn)" }}
              >
                下载 Git
              </a>
            </p>
          </Surface>
        )}
      </Surface>

      {/* Python 版本选择 */}
      <Surface variant="card" className="p-3.5">
        <div className="mb-2.5 flex items-center gap-2.5">
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
          <div className="py-3 text-center">
            <LoaderIcon
              className="mx-auto h-5 w-5 animate-spin"
              style={{ color: "var(--ls-ink-soft)" }}
            />
            <p className="mt-2 text-xs" style={{ color: "var(--ls-ink-soft)" }}>
              加载 Python 版本...
            </p>
          </div>
        ) : pythonVersions.length > 0 ? (
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
                    <span className="text-xs font-medium">
                      {pythonVersions.find(
                        (v) => v.path === localSelectedPython,
                      )?.version || "未选择"}
                    </span>
                    <span
                      className="truncate font-mono text-xs"
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
                    </span>
                    <span
                      className="truncate font-mono text-xs"
                      style={{ color: "var(--ls-ink-soft)" }}
                    >
                      {version.path}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </SelectRoot>
        ) : (
          <Surface variant="inset" className="p-2.5">
            <p className="text-xs" style={{ color: "var(--ls-warn)" }}>
              未检测到 Python 环境
            </p>
          </Surface>
        )}

        <Surface variant="inset" className="mt-2.5 p-2.5">
          <p className="text-xs" style={{ color: "var(--ls-ink-soft)" }}>
            提示：默认 Python 版本将在创建新实例时使用。每个实例也可以单独配置
            Python 版本。
          </p>
        </Surface>
      </Surface>
    </div>
  );
}
