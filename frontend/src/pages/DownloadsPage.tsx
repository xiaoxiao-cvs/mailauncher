import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { motion } from "motion/react";
import { TactileButton } from "@/components/ls";
import { InstallOverview } from "@/components/install/InstallOverview";
import { InstanceConfigPanel } from "@/components/downloads/InstanceConfigPanel";
import { DownloadComponentSelector } from "@/components/downloads/DownloadComponentSelector";
import { useDownload, useInstallOverview } from "@/hooks";
import { useInstallTask } from "@/contexts/InstallTaskContext";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { springSettle, springSoft } from "@/design/motion";
import { TaskStatus } from "@/types/notification";
import { useEffect } from "react";

// 看板交错入场:根容器 springSoft 浮起,子项(标题 + 两块面板)逐个 springSettle 落定。
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.04 } },
};
const itemChild = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: springSettle },
};

export function DownloadsPage() {
  const navigate = useNavigate();
  const {
    deploymentPath,
    instanceName,
    downloadItems,
    selectedMaibotVersion,
    maibotVersions,
    isLoadingPath,
    isDownloading,
    setDeploymentPath,
    setInstanceName,
    selectDeploymentPath,
    setSelectedMaibotVersion,
    downloadAll,
    toggleItemSelection,
    selectedItems,
  } = useDownload();

  const {
    state: overviewState,
    showOverview,
    updateStatus,
  } = useInstallOverview();
  const { addTaskNotification, updateTaskProgress, updateTaskId } =
    useNotificationContext();
  const { currentTask, startTask } = useInstallTask();

  useEffect(() => {
    if (currentTask && currentTask.isActive) {
      console.log("[DownloadsPage] 恢复活跃任务:", currentTask);

      showOverview({
        taskId: currentTask.taskId,
        instanceName: currentTask.instanceName,
        version: currentTask.version,
        components: currentTask.components,
        deploymentPath: currentTask.deploymentPath,
      });

      updateStatus(currentTask.status);
    }
    // 仅在挂载时恢复一次活跃任务，加入 currentTask 等依赖会在任务变化时重复触发 showOverview
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentTask) {
      console.log("[DownloadsPage] 任务状态更新:", {
        status: currentTask.status,
        isActive: currentTask.isActive,
      });
      updateStatus(currentTask.status);
    }
    // 仅按 status/isActive 粒度触发，避免 currentTask 其他字段变化引发多余更新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTask?.status, currentTask?.isActive, updateStatus]);

  const hasDownloading = downloadItems.some(
    (item) => item.status === "downloading",
  );

  const canStartDownload =
    deploymentPath.trim() !== "" &&
    instanceName.trim() !== "" &&
    !isDownloading &&
    selectedItems.size > 0;

  const handleStartInstall = async () => {
    const components = Array.from(selectedItems);
    const tempTaskId = `temp_${Date.now()}`;

    console.log("[Install] 立即添加任务通知...");
    addTaskNotification({
      taskId: tempTaskId,
      instanceName,
      version: selectedMaibotVersion.label,
      components,
      deploymentPath,
    });

    console.log("[Install] 开始创建下载任务...");
    const taskId = await downloadAll();

    if (!taskId) {
      console.error("[Install] 创建下载任务失败");
      updateTaskProgress(tempTaskId, 0, TaskStatus.FAILED, "创建任务失败");
      return;
    }

    console.log("[Install] 任务 ID 获取成功:", taskId);
    updateTaskId(tempTaskId, taskId);

    startTask({
      taskId,
      instanceName,
      version: selectedMaibotVersion.label,
      components,
      deploymentPath,
    });

    showOverview({
      taskId,
      instanceName,
      version: selectedMaibotVersion.label,
      components,
      deploymentPath,
    });

    navigate(`/install-progress?taskId=${taskId}`);

    console.log("[Install] 任务已提交,任务 ID:", taskId);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative z-10 font-sans">
      {overviewState.visible ? (
        <InstallOverview state={overviewState} />
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin z-10">
          <motion.div
            className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-5 pb-28"
            initial="hidden"
            animate="show"
            variants={containerVariants}
          >
            <motion.div variants={itemChild}>
              <h1
                className="text-2xl font-bold"
                style={{ color: "var(--ls-ink)" }}
              >
                下载与安装
              </h1>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--ls-ink-soft)" }}
              >
                配置实例信息，选择组件，一键部署。
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <InstanceConfigPanel
                instanceName={instanceName}
                setInstanceName={setInstanceName}
                selectedMaibotVersion={selectedMaibotVersion}
                setSelectedMaibotVersion={setSelectedMaibotVersion}
                maibotVersions={maibotVersions}
                deploymentPath={deploymentPath}
                setDeploymentPath={setDeploymentPath}
                selectDeploymentPath={selectDeploymentPath}
                isLoadingPath={isLoadingPath}
                hasDownloading={hasDownloading}
              />

              <DownloadComponentSelector
                downloadItems={downloadItems}
                selectedItems={selectedItems}
                hasDownloading={hasDownloading}
                toggleItemSelection={toggleItemSelection}
              />
            </div>
          </motion.div>

          <div className="fixed bottom-6 left-0 md:left-[272px] right-0 z-50 px-6 flex justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springSoft}
              className="ls-panel p-2 pl-6 flex items-center gap-4 pointer-events-auto"
            >
              <div className="min-w-0">
                {!instanceName.trim() ? (
                  <div
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "var(--ls-warn)" }}
                  >
                    <Icon
                      icon="ph:warning-circle-fill"
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <span className="font-medium">请设置实例名称</span>
                  </div>
                ) : !deploymentPath ? (
                  <div
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "var(--ls-warn)" }}
                  >
                    <Icon
                      icon="ph:warning-circle-fill"
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <span className="font-medium">请选择部署路径</span>
                  </div>
                ) : selectedItems.size === 0 ? (
                  <div
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    <Icon
                      icon="ph:info-fill"
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <span className="font-medium">请选择组件</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <Icon
                      icon="ph:check-circle-fill"
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: "var(--ls-life)" }}
                    />
                    <span
                      className="font-medium truncate max-w-[200px]"
                      style={{ color: "var(--ls-ink)" }}
                    >
                      {instanceName}
                    </span>
                    <span style={{ color: "var(--ls-ink-soft)" }}>
                      准备就绪
                    </span>
                  </div>
                )}
              </div>

              <TactileButton
                variant="life"
                onClick={handleStartInstall}
                disabled={!canStartDownload || hasDownloading}
                className="px-6 h-10 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {hasDownloading ? (
                  <>
                    <Icon
                      icon="ph:spinner-bold"
                      className="w-4 h-4 mr-2 animate-spin"
                    />
                    安装中...
                  </>
                ) : (
                  <>
                    开始安装
                    <Icon
                      icon="ph:arrow-right-bold"
                      className="w-3.5 h-3.5 ml-2"
                    />
                  </>
                )}
              </TactileButton>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
