/**
 * 实例详情页面
 * 布局骨架 + 状态编排，UI 逻辑委托给子组件
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ComponentType } from "@/services/instanceApi";
import { TactileButton } from "@/components/ls";
import { springSettle, springSoft } from "@/design/motion";
import { ConfigModal } from "@/components/ConfigModal";
import { ScheduleModal } from "@/components/ScheduleModal";
import { VersionManagementSection } from "@/components/instances/VersionManagementSection";
import { VersionManagerModal } from "@/components/instances/VersionManagerModal";
import { InstanceHeader } from "@/components/instances/detail/InstanceHeader";
import { InstanceTerminalPanel } from "@/components/instances/detail/InstanceTerminalPanel";
import { InstanceControlBar } from "@/components/instances/detail/InstanceControlBar";
import { NapcatQrPanel } from "@/components/instances/detail/NapcatQrPanel";
import { InstanceQuickActions } from "@/components/instances/detail/InstanceQuickActions";
import { InstanceAutorestartToggle } from "@/components/instances/detail/InstanceAutorestartToggle";
import {
  useInstanceQuery,
  useComponentStatusQuery,
  useStartInstanceMutation,
  useStopInstanceMutation,
  useRestartInstanceMutation,
  useStartComponentMutation,
  useStopComponentMutation,
} from "@/hooks/queries/useInstanceQueries";

export const InstanceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: instance, isLoading } = useInstanceQuery(id, {
    refetchInterval: 10000,
  });

  const { data: maibotStatus } = useComponentStatusQuery(id, "MaiBot", {
    refetchInterval: 10000,
  });
  const { data: napcatStatus } = useComponentStatusQuery(id, "NapCat", {
    refetchInterval: 10000,
  });

  const startInstanceMutation = useStartInstanceMutation();
  const stopInstanceMutation = useStopInstanceMutation();
  const restartInstanceMutation = useRestartInstanceMutation();
  const startComponentMutation = useStartComponentMutation();
  const stopComponentMutation = useStopComponentMutation();

  const [selectedComponent, setSelectedComponent] =
    useState<ComponentType>("MaiBot");
  const [actionLoading, setActionLoading] = useState<
    "start" | "stop" | "restart" | null
  >(null);
  const [selectedStartTarget, setSelectedStartTarget] = useState<
    ComponentType | "all"
  >("all");
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isVersionManagerOpen, setIsVersionManagerOpen] = useState(false);

  const getComponentStatus = (component: ComponentType) => {
    switch (component) {
      case "MaiBot":
        return maibotStatus;
      case "NapCat":
        return napcatStatus;
      default:
        return undefined;
    }
  };

  // 自动切换启动目标
  useEffect(() => {
    if (!instance) return;
    const allComponents: ComponentType[] = instance.component_states?.length
      ? instance.component_states.map((state) => state.component)
      : ["MaiBot", "NapCat"];

    if (
      selectedStartTarget !== "all" &&
      getComponentStatus(selectedStartTarget as ComponentType)?.running
    ) {
      const nextComponent = allComponents.find(
        (comp) => !getComponentStatus(comp)?.running,
      );
      setSelectedStartTarget(nextComponent ?? "all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maibotStatus, napcatStatus, instance]);

  if (!instance) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          {isLoading ? (
            <>
              <div
                className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"
                style={{ borderColor: "var(--ls-life)" }}
              />
              <p style={{ color: "var(--ls-ink-soft)" }}>加载中...</p>
            </>
          ) : (
            <>
              <p className="mb-4" style={{ color: "var(--ls-ink-soft)" }}>
                实例不存在
              </p>
              <TactileButton
                variant="solid"
                onClick={() => navigate("/instances")}
                className="mx-auto"
              >
                返回列表
              </TactileButton>
            </>
          )}
        </div>
      </div>
    );
  }

  const handleStart = async (component?: ComponentType) => {
    setActionLoading("start");
    try {
      if (component) {
        await startComponentMutation.mutateAsync({
          instanceId: instance.id,
          component,
        });
      } else {
        await startInstanceMutation.mutateAsync(instance.id);
        setSelectedStartTarget("all");
      }
    } catch (error) {
      console.error("启动失败:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (component?: ComponentType) => {
    setActionLoading("stop");
    try {
      if (component) {
        await stopComponentMutation.mutateAsync({
          instanceId: instance.id,
          component,
        });
      } else {
        await stopInstanceMutation.mutateAsync(instance.id);
      }
    } catch (error) {
      console.error("停止失败:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestart = async (component?: ComponentType) => {
    setActionLoading("restart");
    try {
      if (component) {
        await stopComponentMutation.mutateAsync({
          instanceId: instance.id,
          component,
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await startComponentMutation.mutateAsync({
          instanceId: instance.id,
          component,
        });
      } else {
        await restartInstanceMutation.mutateAsync(instance.id);
      }
    } catch (error) {
      console.error("重启失败:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const availableComponents: ComponentType[] = instance.component_states?.length
    ? instance.component_states.map((state) => state.component)
    : ["MaiBot", "NapCat"];

  const hasAnyComponentRunning = availableComponents.some(
    (c) => getComponentStatus(c)?.running,
  );
  const allComponentsRunning = availableComponents.every(
    (c) => getComponentStatus(c)?.running,
  );

  return (
    <motion.div
      className="flex h-full flex-col gap-6 overflow-hidden p-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
    >
      <InstanceHeader instance={instance} />

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-6">
        <div className="scrollbar-thin col-span-4 flex flex-col gap-6 overflow-y-auto pb-2 pr-2">
          <InstanceQuickActions
            instanceId={instance.id}
            onOpenConfig={() => setIsConfigModalOpen(true)}
            onOpenSchedule={() => setIsScheduleModalOpen(true)}
            onOpenVersionManager={() => setIsVersionManagerOpen(true)}
          />
          <InstanceAutorestartToggle instanceId={instance.id} />
          <VersionManagementSection instanceId={instance.id} />
        </div>

        <motion.div
          className="col-span-8 flex min-h-0 flex-col gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSettle, delay: 0.08 }}
        >
          <NapcatQrPanel instanceId={instance.id} />
          <InstanceTerminalPanel
            instance={instance}
            selectedComponent={selectedComponent}
            onSelectComponent={setSelectedComponent}
            availableComponents={availableComponents}
            getComponentStatus={getComponentStatus}
          />
          <InstanceControlBar
            selectedComponent={selectedComponent}
            selectedStartTarget={selectedStartTarget}
            onSelectStartTarget={setSelectedStartTarget}
            actionLoading={actionLoading}
            allComponentsRunning={allComponentsRunning}
            hasAnyComponentRunning={hasAnyComponentRunning}
            getComponentStatus={getComponentStatus}
            onStart={handleStart}
            onStop={handleStop}
            onRestart={handleRestart}
          />
        </motion.div>
      </div>

      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        instanceId={instance.id}
      />
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        instanceId={instance.id}
      />
      <VersionManagerModal
        isOpen={isVersionManagerOpen}
        onClose={() => setIsVersionManagerOpen(false)}
        instanceId={instance.id}
      />
    </motion.div>
  );
};
