/**
 * 组件版本卡片
 * 显示实例各组件的版本信息和更新状态
 */
import React from "react";
import {
  Package,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  useComponentsVersionQuery,
  useCheckAllUpdates,
} from "@/hooks/queries/useVersionQueries";
import { getComponentDisplayName } from "@/services/versionApi";
import type { ComponentVersionInfo } from "@/services/versionApi";
import { Card, Surface, TactileButton } from "@/components/ls";

interface ComponentVersionCardProps {
  instanceId: string;
  onOpenVersionManager: () => void;
}

export const ComponentVersionCard: React.FC<ComponentVersionCardProps> = ({
  instanceId,
  onOpenVersionManager,
}) => {
  const { data: components = [], isLoading } = useComponentsVersionQuery(
    instanceId,
    {
      manualFetch: true, // 手动触发获取，不自动加载
    },
  );

  const checkAllMutation = useCheckAllUpdates(instanceId);

  // 获取状态图标(颜色走语义 token:正常=life、警示=warn、危险=danger、缺省=faint)
  const getStatusIcon = (status: string, hasUpdate?: boolean) => {
    if (status === "checking") {
      return (
        <Loader2
          className="h-3.5 w-3.5 animate-spin"
          style={{ color: "var(--ls-ink-soft)" }}
        />
      );
    }
    if (status === "update_available" || hasUpdate) {
      return (
        <AlertCircle
          className="h-3.5 w-3.5"
          style={{ color: "var(--ls-warn)" }}
        />
      );
    }
    if (status === "up_to_date") {
      return (
        <CheckCircle
          className="h-3.5 w-3.5"
          style={{ color: "var(--ls-life)" }}
        />
      );
    }
    if (status === "not_installed") {
      return (
        <AlertCircle
          className="h-3.5 w-3.5"
          style={{ color: "var(--ls-ink-faint)" }}
        />
      );
    }
    if (status === "check_failed") {
      return (
        <AlertCircle
          className="h-3.5 w-3.5"
          style={{ color: "var(--ls-danger)" }}
        />
      );
    }
    return null;
  };

  // 获取状态文本
  const getStatusText = (component: ComponentVersionInfo) => {
    if (!component.installed) return "未安装";
    if (component.status === "checking") return "检查中...";
    if (component.status === "check_failed") return "检查失败";
    if (component.has_update) {
      return component.commits_behind
        ? `落后 ${component.commits_behind} 个提交`
        : "有新版本";
    }
    return "最新";
  };

  const handleCheckAll = async () => {
    try {
      await checkAllMutation.mutateAsync();
    } catch (error) {
      console.error("检查更新失败:", error);
    }
  };

  return (
    <Card initial="hidden" animate="show">
      <div className="mb-4 flex items-center justify-between">
        <h3
          className="flex items-center gap-2 text-lg font-semibold"
          style={{ color: "var(--ls-ink)" }}
        >
          <Package className="h-5 w-5" style={{ color: "var(--ls-life)" }} />
          组件版本
        </h3>
        <TactileButton
          variant="ghost"
          onClick={handleCheckAll}
          disabled={isLoading || checkAllMutation.isPending}
          className="px-2 py-1.5 disabled:opacity-50"
          title="检查所有更新"
        >
          <RefreshCw
            className={`h-4 w-4 ${checkAllMutation.isPending ? "animate-spin" : ""}`}
            style={{ color: "var(--ls-ink-soft)" }}
          />
        </TactileButton>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2
            className="h-5 w-5 animate-spin"
            style={{ color: "var(--ls-ink-faint)" }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {components.map((component) => (
            <Surface key={component.component} variant="inset" className="p-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--ls-ink)" }}
                  >
                    {getComponentDisplayName(component.component)}
                  </span>
                  {getStatusIcon(component.status, component.has_update)}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{
                    color: component.has_update
                      ? "var(--ls-warn)"
                      : "var(--ls-ink-soft)",
                  }}
                >
                  {getStatusText(component)}
                </span>
              </div>
              {component.installed && component.local_version && (
                <div
                  className="ls-num font-mono text-xs"
                  style={{ color: "var(--ls-ink-soft)" }}
                >
                  {component.local_version}
                  {component.local_commit && (
                    <span className="ml-2 text-[10px]">
                      #{component.local_commit}
                    </span>
                  )}
                </div>
              )}
            </Surface>
          ))}

          {components.length === 0 && (
            <div
              className="py-4 text-center text-sm"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              暂无组件信息
            </div>
          )}

          {/* 底部操作按钮 */}
          <div className="flex gap-2 pt-2">
            <TactileButton
              variant="solid"
              onClick={onOpenVersionManager}
              className="flex-1 justify-center"
            >
              <Package className="h-4 w-4" />
              版本管理
              <ArrowRight className="h-3.5 w-3.5" />
            </TactileButton>
          </div>
        </div>
      )}
    </Card>
  );
};
