/**
 * 组件版本卡片
 * 显示实例各组件的本地版本快照(component_versions 表),更新检查在版本管理弹层内按需触发。
 */
import React from "react";
import { Package, RefreshCw, Loader2, ArrowRight } from "lucide-react";
import {
  useComponentsVersionQuery,
  useCheckAllUpdates,
} from "@/hooks/queries/useVersionQueries";
import { getComponentDisplayName } from "@/services/versionApi";
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

  // 重新读取本地版本快照(DB 读取,廉价);更新检查走网络,在版本管理弹层内单组件按需触发。
  const refreshMutation = useCheckAllUpdates(instanceId);

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync();
    } catch (error) {
      console.error("刷新版本失败:", error);
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
          onClick={handleRefresh}
          disabled={isLoading || refreshMutation.isPending}
          className="px-2 py-1.5 disabled:opacity-50"
          title="刷新版本快照"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`}
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
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--ls-ink)" }}
                >
                  {getComponentDisplayName(component.component)}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--ls-ink-faint)" }}
                >
                  {component.install_method}
                </span>
              </div>
              <div
                className="ls-num font-mono text-xs"
                style={{ color: "var(--ls-ink-soft)" }}
              >
                {component.version || "—"}
                {component.commit_hash && (
                  <span className="ml-2 text-[10px]">
                    #{component.commit_hash.slice(0, 7)}
                  </span>
                )}
              </div>
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
