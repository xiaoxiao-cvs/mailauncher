import React, { useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import {
  useComponentsVersionQuery,
  useCheckComponentUpdateQuery,
  useUpdateComponentMutation,
} from "@/hooks/queries/useVersionQueries";
import {
  ComponentVersionInfo,
  ComponentUpdateCheck,
} from "@/services/versionApi";
import {
  reinstallInstanceDependencies,
  resetInstanceData,
  listComponentCommits,
  rollbackComponent,
  type ComponentCommitInfo,
} from "@/services/versionMaintenanceApi";
import { useTransportEvent } from "@/hooks/useTransportEvent";
import { useConfirm } from "@/hooks/useConfirm";
import {
  GitCommit,
  ArrowRight,
  Loader2,
  GitBranch,
  X,
  RefreshCw,
  Trash2,
  History,
} from "lucide-react";
import { Surface, TactileButton, Badge, Select } from "@/components/ls";
import { springSoft, springSettle } from "@/design/motion";

interface VersionManagementSectionProps {
  instanceId: string;
}

// 适配器现为 MaiBot 插件，不再作为独立可更新组件展示，本期版本管理聚焦 MaiBot。
const COMPONENT_MAP = {
  MaiBot: "MaiBot",
} as const;

type DisplayComponentType = keyof typeof COMPONENT_MAP;

export const VersionManagementSection: React.FC<
  VersionManagementSectionProps
> = ({ instanceId }) => {
  const confirm = useConfirm();
  const [activeTab] = useState<DisplayComponentType>("MaiBot");
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  // 更新检查走网络,默认不查;用户点"检查"后置真,触发该组件的 check_component_update。
  const [checkEnabled, setCheckEnabled] = useState(false);

  const { data: components = [], isLoading } = useComponentsVersionQuery(
    instanceId,
    {
      manualFetch: true, // 手动触发获取，不自动加载
    },
  );

  const realName = COMPONENT_MAP[activeTab];
  const localData = components.find((c) => c.component === realName);

  const {
    data: updateCheck,
    isFetching: isChecking,
    refetch: refetchCheck,
  } = useCheckComponentUpdateQuery(instanceId, realName, {
    enabled: checkEnabled,
  });

  const updateMutation = useUpdateComponentMutation();

  const handleCheck = () => {
    setCheckEnabled(true);
    if (checkEnabled) refetchCheck();
  };

  const handleUpdate = async (componentName: string) => {
    try {
      // 更新方式由后端按组件分发形态(has_releases)唯一判定(resolve_update_strategy),
      // 前端不再传 updateMethod 提示(旧提示会与真实分发形态漂移)。
      await updateMutation.mutateAsync({
        instanceId,
        component: componentName,
        createBackup: true,
      });
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  // ==================== 重装依赖(P2-19) ====================

  const [isReinstalling, setIsReinstalling] = useState(false);
  const [reinstallLogs, setReinstallLogs] = useState<string[]>([]);

  useTransportEvent<string>(
    isReinstalling ? `reinstall-deps-log-${instanceId}` : null,
    (line) => {
      setReinstallLogs((prev) => [...prev.slice(-49), line]);
    },
  );

  const handleReinstallDependencies = async () => {
    setReinstallLogs([]);
    setIsReinstalling(true);
    try {
      await reinstallInstanceDependencies(instanceId);
      toast.success("依赖重装完成");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsReinstalling(false);
    }
  };

  // ==================== 重置实例数据(P1-13) ====================

  const [isResettingData, setIsResettingData] = useState(false);

  const handleResetData = async () => {
    const ok = await confirm({
      description:
        "确定重置实例数据吗？将清空 MaiBot/data 目录下的聊天记录、知识库等运行数据，此操作不可撤销。配置与代码不受影响，实例需已停止。",
      confirmText: "重置数据",
      destructive: true,
    });
    if (!ok) return;
    setIsResettingData(true);
    try {
      await resetInstanceData(instanceId);
      toast.success("实例数据已重置");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsResettingData(false);
    }
  };

  const hasUpdate = updateCheck?.has_update ?? false;

  const renderHeader = (name: DisplayComponentType) => (
    <div className="mb-3 flex items-center gap-2">
      <span
        className="text-sm font-semibold"
        style={{ color: "var(--ls-ink)" }}
      >
        {name}
      </span>
      {isChecking ? (
        <Badge tone="neutral" className="gap-1.5">
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          检查中
        </Badge>
      ) : updateCheck ? (
        <Badge tone={hasUpdate ? "warn" : "life"}>
          {hasUpdate ? "有更新" : "最新"}
        </Badge>
      ) : (
        <Badge tone="neutral">未检查</Badge>
      )}
    </div>
  );

  const renderContent = (name: DisplayComponentType) => {
    if (!localData)
      return (
        <div
          className="p-4 text-center text-sm"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          {isLoading ? "加载中..." : "暂无组件信息"}
        </div>
      );

    // 已检查且无更新 = 最新;未检查时视为"未知",仅展示本地快照不下断言。
    const isUpToDate = updateCheck ? !hasUpdate : true;
    const localCommit = localData.commit_hash?.slice(0, 7) || "—";

    return (
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSettle}
      >
        {/* 本地版本快照卡 —— 凹陷面,点击展开版本可视化(检查后含远端对比) */}
        <Surface
          variant="inset"
          onClick={() => setIsVisualizerOpen(true)}
          className="group relative cursor-pointer p-3"
        >
          <div className="absolute right-2 top-2 opacity-40 transition-opacity group-hover:opacity-100">
            <ArrowRight
              className="h-4 w-4"
              style={{ color: "var(--ls-ink-faint)" }}
            />
          </div>

          <div className="flex items-start gap-2 pr-6">
            <div
              className="shrink-0 rounded-lg p-1.5"
              style={{
                background: isUpToDate
                  ? "var(--ls-life-soft)"
                  : "color-mix(in srgb, var(--ls-warn) 16%, transparent)",
                color: isUpToDate ? "var(--ls-life)" : "var(--ls-warn)",
              }}
            >
              <GitCommit className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-1.5">
                <span
                  className="ls-num rounded px-1.5 py-0.5 font-mono text-xs"
                  style={{
                    background: "var(--ls-bg-2)",
                    color: "var(--ls-ink-soft)",
                  }}
                >
                  {localCommit}
                </span>
                <span
                  className="truncate text-[10px]"
                  style={{ color: "var(--ls-ink-faint)" }}
                >
                  {localData.install_method}
                </span>
              </div>
              <p
                className="mb-1 line-clamp-1 text-sm font-medium"
                style={{ color: "var(--ls-ink)" }}
              >
                {localData.version || "未记录版本号"}
              </p>
              {localData.installed_at ? (
                <div
                  className="ls-num text-[10px]"
                  style={{ color: "var(--ls-ink-soft)" }}
                >
                  安装于 {localData.installed_at}
                </div>
              ) : null}
            </div>
          </div>
        </Surface>

        {/* 状态 + 操作 */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div
            className="flex items-center gap-1.5"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: !updateCheck
                  ? "var(--ls-ink-faint)"
                  : isUpToDate
                    ? "var(--ls-life)"
                    : "var(--ls-warn)",
              }}
            />
            <span className="truncate">
              {!updateCheck
                ? "尚未检查更新"
                : isUpToDate
                  ? "最新"
                  : `落后 ${updateCheck.commits_behind ?? "?"} 个版本`}
            </span>
          </div>

          <div className="flex shrink-0 gap-2">
            <TactileButton
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleCheck();
              }}
              disabled={isChecking}
              className="px-2 py-1 text-xs disabled:opacity-50"
            >
              检查
            </TactileButton>
            {hasUpdate && (
              <TactileButton
                variant="solid"
                className="px-2 py-1 text-xs disabled:opacity-50"
                onClick={() => handleUpdate(COMPONENT_MAP[name])}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <GitBranch className="h-3 w-3" />
                )}
                更新
              </TactileButton>
            )}
          </div>
        </div>

        {/* 维护操作(P2-19 重装依赖 / P1-13 重置数据):不常用、有一定破坏性,单独一行拉开与常规操作的距离 */}
        <div
          className="flex items-center justify-between gap-2 pt-2"
          style={{ borderTop: "1px solid var(--ls-hairline)" }}
        >
          <TactileButton
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleReinstallDependencies();
            }}
            disabled={isReinstalling}
            className="px-2 py-1 text-xs disabled:opacity-50"
          >
            {isReinstalling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            重装依赖
          </TactileButton>
          <TactileButton
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleResetData();
            }}
            disabled={isResettingData}
            className="px-2 py-1 text-xs disabled:opacity-50"
            style={{ color: "var(--ls-danger)" }}
          >
            {isResettingData ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            重置数据
          </TactileButton>
        </div>

        {(isReinstalling || reinstallLogs.length > 0) && (
          <Surface
            variant="inset"
            className="max-h-32 overflow-y-auto p-2 font-mono text-[11px]"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            {reinstallLogs.length === 0 ? (
              <div>正在启动...</div>
            ) : (
              reinstallLogs.map((line, i) => <div key={i}>{line}</div>)
            )}
          </Surface>
        )}

        <GitVisualizerModal
          isOpen={isVisualizerOpen}
          onClose={() => setIsVisualizerOpen(false)}
          local={localData}
          updateCheck={updateCheck}
          name={name}
          instanceId={instanceId}
          component={COMPONENT_MAP[name]}
        />
      </motion.div>
    );
  };

  return (
    <Surface variant="panel" className="p-4">
      {renderHeader(activeTab)}
      {renderContent(activeTab)}
    </Surface>
  );
};

const GitVisualizerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  local: ComponentVersionInfo;
  updateCheck: ComponentUpdateCheck | undefined;
  name: string;
  instanceId: string;
  component: string;
}> = ({ isOpen, onClose, local, updateCheck, name, instanceId, component }) => {
  const confirm = useConfirm();
  const isUpToDate = updateCheck ? !updateCheck.has_update : true;
  const currentCommit =
    updateCheck?.current_commit?.slice(0, 7) ||
    local.commit_hash?.slice(0, 7) ||
    "—";
  const latestCommit = updateCheck?.latest_commit?.slice(0, 7) || "—";

  // ==================== 历史版本回滚(P2-23) ====================

  const [isRollbackOpen, setIsRollbackOpen] = useState(false);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);
  const [commits, setCommits] = useState<ComponentCommitInfo[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<string>("");
  const [isRollingBack, setIsRollingBack] = useState(false);

  const openRollbackPicker = async () => {
    setIsRollbackOpen(true);
    if (commits.length > 0) return;
    setIsLoadingCommits(true);
    try {
      const list = await listComponentCommits(instanceId, component);
      setCommits(list);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingCommits(false);
    }
  };

  const handleRollback = async () => {
    if (!selectedCommit) return;
    const ok = await confirm({
      description: `确定回滚 ${component} 到 commit ${selectedCommit.slice(0, 7)} 吗？回滚前会自动备份当前配置与数据。`,
      confirmText: "回滚",
      destructive: true,
    });
    if (!ok) return;
    setIsRollingBack(true);
    try {
      await rollbackComponent(instanceId, component, selectedCommit);
      toast.success("回滚完成");
      setIsRollbackOpen(false);
      setSelectedCommit("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 遮罩:半透明纯暗,无毛玻璃 */}
          <motion.button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 cursor-default"
            style={{ background: "rgba(0,0,0,0.32)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-lg overflow-hidden"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={springSoft}
          >
            <Surface variant="panel" className="overflow-hidden p-0">
              <div
                className="flex items-center justify-between p-6"
                style={{ borderBottom: "1px solid var(--ls-hairline)" }}
              >
                <h3
                  className="flex items-center gap-2 text-lg font-semibold"
                  style={{ color: "var(--ls-ink)" }}
                >
                  <GitBranch
                    className="h-5 w-5"
                    style={{ color: "var(--ls-life)" }}
                  />
                  版本可视化 - {name}
                </h3>
                <TactileButton
                  variant="ghost"
                  onClick={onClose}
                  className="px-2 py-2"
                  aria-label="关闭"
                >
                  <X
                    className="h-5 w-5"
                    style={{ color: "var(--ls-ink-soft)" }}
                  />
                </TactileButton>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-6">
                {!updateCheck ? (
                  <div
                    className="py-8 text-center text-sm"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    尚未检查更新，关闭后点击「检查」获取远端版本对比。
                  </div>
                ) : (
                  <div
                    className="relative ml-4 flex flex-col gap-8 pl-8"
                    style={{ borderLeft: "2px dashed var(--ls-hairline)" }}
                  >
                    {/* 最新节点 */}
                    <div className="relative">
                      <div
                        className="absolute -left-[41px] top-0 flex h-5 w-5 items-center justify-center rounded-full"
                        style={{
                          background: "var(--ls-life)",
                          boxShadow: "0 0 0 4px var(--ls-surface)",
                        }}
                      >
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ background: "var(--ls-surface)" }}
                        />
                      </div>
                      <Surface
                        variant="inset"
                        className="p-4"
                        style={{
                          background:
                            "color-mix(in srgb, var(--ls-life) 10%, var(--ls-bg-2))",
                        }}
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <Badge tone="life">LATEST</Badge>
                          <span
                            className="ls-num font-mono text-xs"
                            style={{ color: "var(--ls-ink-soft)" }}
                          >
                            {latestCommit}
                          </span>
                        </div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--ls-ink)" }}
                        >
                          {updateCheck.latest_version ||
                            updateCheck.update_notes ||
                            "最新版本"}
                        </p>
                      </Surface>
                    </div>

                    {/* 落后提示 */}
                    {!isUpToDate && (
                      <div
                        className="flex items-center gap-2 py-2 text-sm"
                        style={{ color: "var(--ls-ink-faint)" }}
                      >
                        <div
                          className="h-1 w-1 rounded-full"
                          style={{ background: "var(--ls-ink-faint)" }}
                        />
                        <div
                          className="h-1 w-1 rounded-full"
                          style={{ background: "var(--ls-ink-faint)" }}
                        />
                        <div
                          className="h-1 w-1 rounded-full"
                          style={{ background: "var(--ls-ink-faint)" }}
                        />
                        <span
                          className="ml-2 rounded-full px-2 py-1 text-xs"
                          style={{
                            background: "var(--ls-bg-2)",
                            color: "var(--ls-ink-soft)",
                          }}
                        >
                          相差 {updateCheck.commits_behind ?? "?"} 个提交
                        </span>
                      </div>
                    )}

                    {/* 当前节点 */}
                    {!isUpToDate && (
                      <div className="relative">
                        <div
                          className="absolute -left-[41px] top-0 flex h-5 w-5 items-center justify-center rounded-full"
                          style={{
                            background: "var(--ls-ink-soft)",
                            boxShadow: "0 0 0 4px var(--ls-surface)",
                          }}
                        >
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ background: "var(--ls-surface)" }}
                          />
                        </div>
                        <Surface variant="inset" className="p-4">
                          <div className="mb-2 flex items-start justify-between">
                            <Badge tone="neutral">CURRENT</Badge>
                            <span
                              className="ls-num font-mono text-xs"
                              style={{ color: "var(--ls-ink-soft)" }}
                            >
                              {currentCommit}
                            </span>
                          </div>
                          <p
                            className="text-sm"
                            style={{ color: "var(--ls-ink-soft)" }}
                          >
                            {updateCheck.current_version || "当前运行版本"}
                          </p>
                        </Surface>
                      </div>
                    )}
                  </div>
                )}

                {/* 历史版本回滚(P2-23) */}
                <div
                  className="mt-6 pt-4"
                  style={{ borderTop: "1px solid var(--ls-hairline)" }}
                >
                  {!isRollbackOpen ? (
                    <TactileButton
                      variant="ghost"
                      onClick={openRollbackPicker}
                      className="px-2 py-1 text-xs"
                    >
                      <History className="h-3.5 w-3.5" />
                      回滚到历史版本
                    </TactileButton>
                  ) : (
                    <div className="space-y-2">
                      <div
                        className="flex items-center gap-1.5 text-xs"
                        style={{ color: "var(--ls-ink-soft)" }}
                      >
                        <History className="h-3.5 w-3.5" />
                        选择历史提交(本地仓库可见范围,可能不含完整远端历史)
                      </div>
                      {isLoadingCommits ? (
                        <div
                          className="flex items-center gap-2 text-xs"
                          style={{ color: "var(--ls-ink-faint)" }}
                        >
                          <Loader2 className="h-3 w-3 animate-spin" />
                          加载历史提交中...
                        </div>
                      ) : commits.length === 0 ? (
                        <div
                          className="text-xs"
                          style={{ color: "var(--ls-ink-faint)" }}
                        >
                          未获取到历史提交
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Select
                            className="max-w-xs"
                            placeholder="选择目标 commit"
                            value={selectedCommit}
                            onValueChange={setSelectedCommit}
                            options={commits.map((c) => ({
                              value: c.hash,
                              label: `${c.shortHash} · ${c.subject}`,
                            }))}
                          />
                          <TactileButton
                            variant="solid"
                            onClick={handleRollback}
                            disabled={!selectedCommit || isRollingBack}
                            className="px-2 py-1 text-xs disabled:opacity-50"
                          >
                            {isRollingBack ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <History className="h-3 w-3" />
                            )}
                            回滚到此版本
                          </TactileButton>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Surface>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
