/**
 * 实例列表页面
 * 显示所有实例的卡片网格
 */

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { InstanceCard } from "@/components/instances/InstanceCard";
import { Plus, RefreshCw, AlertCircle, Server } from "lucide-react";
import { Surface, Badge, StatusDot, TactileButton } from "@/components/ls";
import { springSettle } from "@/design/motion";
import {
  useInstancesQuery,
  useStartInstanceMutation,
  useStopInstanceMutation,
  useRestartInstanceMutation,
  useDeleteInstanceMutation,
  useUpdateInstanceMutation,
} from "@/hooks/queries/useInstanceQueries";

export const InstanceListPage: React.FC = () => {
  const navigate = useNavigate();

  // 使用 React Query hooks 获取数据
  const {
    data: instanceData,
    isLoading,
    error,
    refetch,
  } = useInstancesQuery({
    refetchInterval: 10000, // 每10秒自动刷新
  });

  // 实例操作 mutations
  const startMutation = useStartInstanceMutation();
  const stopMutation = useStopInstanceMutation();
  const restartMutation = useRestartInstanceMutation();
  const deleteMutation = useDeleteInstanceMutation();
  const updateMutation = useUpdateInstanceMutation();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // 排序用:运行实例的启动顺序(重排/入场动画交给 motion layout + 父级 stagger,无需手算 FLIP)
  const runningStartOrderRef = useRef<Map<string, number>>(new Map());
  const nextStartOrderRef = useRef<number>(1);

  // 对实例进行排序：运行中的在前，按状态和时间排序
  const instances = React.useMemo(() => {
    const list = instanceData?.instances || [];

    // 首次加载时，为已运行的实例初始化启动顺序（按运行时间降序）
    const runningInstances = list.filter(
      (inst) => inst.status === "running" || inst.status === "starting",
    );

    if (
      runningInstances.length > 0 &&
      runningStartOrderRef.current.size === 0
    ) {
      // 按运行时间降序排序，运行时间长的获得更小的序号（排在前面）
      const sortedByRunTime = [...runningInstances].sort(
        (a, b) => (b.run_time || 0) - (a.run_time || 0),
      );

      sortedByRunTime.forEach((instance) => {
        runningStartOrderRef.current.set(
          instance.id,
          nextStartOrderRef.current,
        );
        nextStartOrderRef.current += 1;
      });
    }

    return [...list].sort((a, b) => {
      // 运行中的实例优先
      const aRunning = a.status === "running" || a.status === "starting";
      const bRunning = b.status === "running" || b.status === "starting";

      if (aRunning && !bRunning) return -1;
      if (!aRunning && bRunning) return 1;

      // 相同状态下，按启动顺序排序（运行中）或名称排序（已停止）
      if (aRunning && bRunning) {
        // 按启动顺序排序：先启动的在前面
        const aOrder = runningStartOrderRef.current.get(a.id) || 0;
        const bOrder = runningStartOrderRef.current.get(b.id) || 0;

        if (aOrder !== 0 && bOrder !== 0) {
          return aOrder - bOrder;
        }
        // 如果某个没有启动顺序（刚启动），按运行时间排序
        return (b.run_time || 0) - (a.run_time || 0);
      }

      // 已停止的按名称排序（字母顺序）
      return a.name.localeCompare(b.name, "zh-CN");
    });
  }, [instanceData?.instances]);

  // 维护运行实例的启动顺序(供排序用);重排/入场动画交给 motion layout + 父级 stagger
  useEffect(() => {
    instances.forEach((instance) => {
      const isRunning =
        instance.status === "running" || instance.status === "starting";
      if (isRunning && !runningStartOrderRef.current.has(instance.id)) {
        runningStartOrderRef.current.set(
          instance.id,
          nextStartOrderRef.current,
        );
        nextStartOrderRef.current += 1;
      }
      if (!isRunning && runningStartOrderRef.current.has(instance.id)) {
        runningStartOrderRef.current.delete(instance.id);
      }
    });
  }, [instances]);

  // 卡片入场与重排动画由下方 motion layout + 父级 staggerChildren 负责(已移除手写 FLIP)。

  // 处理启动实例
  const handleStart = async (id: string) => {
    setActionLoading(id);
    try {
      await startMutation.mutateAsync(id);
    } catch (error) {
      console.error("启动实例失败:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // 处理停止实例
  const handleStop = async (id: string) => {
    setActionLoading(id);
    try {
      await stopMutation.mutateAsync(id);
    } catch (error) {
      console.error("停止实例失败:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // 处理重启实例
  const handleRestart = async (id: string) => {
    setActionLoading(id);
    try {
      await restartMutation.mutateAsync(id);
    } catch (error) {
      console.error("重启实例失败:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // 处理删除实例
  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个实例吗？此操作不可恢复。")) {
      return;
    }

    setActionLoading(id);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error("删除实例失败:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // 处理重命名实例
  const handleRename = async (id: string, newName: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { name: newName } });
    } catch (error) {
      console.error("重命名实例失败:", error);
    }
  };

  // 手动刷新
  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="container mx-auto px-6 py-10 max-w-7xl">
      {/* 页面头部 */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div
            className="text-xs uppercase tracking-[0.2em] mb-2"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            实例管理
          </div>
          <h1
            className="text-4xl font-semibold tracking-tight mb-3"
            style={{ color: "var(--ls-ink)" }}
          >
            全部实例
          </h1>
          <div className="flex items-center gap-3 text-sm font-medium">
            <Badge tone="neutral">
              总计 <span className="ls-num ml-1">{instances.length}</span>
            </Badge>
            <span
              className="flex items-center gap-1.5"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              <StatusDot running />
              运行中
              <span className="ls-num">
                {instances.filter((i) => i.status === "running").length}
              </span>
            </span>
            <span
              className="flex items-center gap-1.5"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              <StatusDot running={false} />
              已停止
              <span className="ls-num">
                {instances.filter((i) => i.status === "stopped").length}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TactileButton
            variant="ghost"
            onClick={handleRefresh}
            disabled={isLoading}
            className="disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            刷新状态
          </TactileButton>

          <TactileButton variant="solid" onClick={() => navigate("/downloads")}>
            <Plus className="w-4 h-4" />
            创建新实例
          </TactileButton>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Surface variant="panel" className="mb-8 p-4 flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background:
                "color-mix(in srgb, var(--ls-danger) 16%, transparent)",
            }}
          >
            <AlertCircle
              className="w-5 h-5"
              style={{ color: "var(--ls-danger)" }}
            />
          </div>
          <div className="flex-1">
            <p className="font-semibold" style={{ color: "var(--ls-danger)" }}>
              加载失败
            </p>
            <p
              className="text-sm mt-0.5"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              {error.message}
            </p>
          </div>
          <TactileButton
            variant="ghost"
            onClick={handleRefresh}
            style={{ color: "var(--ls-danger)" }}
          >
            重试
          </TactileButton>
        </Surface>
      )}

      {/* 实例卡片网格 */}
      {isLoading && instances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div
            className="w-16 h-16 rounded-full animate-spin mb-6"
            style={{
              border: "4px solid var(--ls-hairline)",
              borderTopColor: "var(--ls-life)",
            }}
          />
          <p className="font-medium" style={{ color: "var(--ls-ink-soft)" }}>
            正在加载实例数据...
          </p>
        </div>
      ) : instances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
            style={{ background: "var(--ls-bg-2)" }}
          >
            <Server
              className="w-10 h-10"
              style={{ color: "var(--ls-ink-faint)" }}
            />
          </div>
          <h3
            className="text-xl font-semibold mb-2"
            style={{ color: "var(--ls-ink)" }}
          >
            暂无实例
          </h3>
          <p
            className="max-w-md mx-auto mb-8"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            您还没有创建任何实例。点击右上角的"创建新实例"按钮开始您的第一个部署。
          </p>
          <TactileButton variant="life" onClick={() => navigate("/downloads")}>
            立即创建
          </TactileButton>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: 0.06, delayChildren: 0.04 },
            },
          }}
        >
          {instances.map((instance) => (
            <motion.div
              key={instance.id}
              layout
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0 },
              }}
              transition={springSettle}
            >
              <InstanceCard
                instance={instance}
                onStart={handleStart}
                onStop={handleStop}
                onRestart={handleRestart}
                onDelete={handleDelete}
                onRename={handleRename}
                loading={actionLoading === instance.id}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};
