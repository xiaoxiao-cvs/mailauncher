/**
 * 实例卡片组件
 * 显示实例的基本信息和操作按钮
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Instance, InstanceStatus } from "@/services/instanceApi";
import {
  Play,
  Square,
  RotateCw,
  Trash2,
  Server,
  Pencil,
  Clock,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Card,
  Badge,
  StatusDot,
  Meter,
  IconMenu,
  TactileButton,
} from "@/components/ls";
import type { BadgeTone, IconMenuItem } from "@/components/ls";
import { InstanceRenameModal } from "./InstanceRenameModal";

interface InstanceCardProps {
  instance: Instance;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  onUpdate?: (id: string) => void;
  loading?: boolean;
}

// 状态语义 -> Badge 语气(生命/警示/危险/中性),映射到 var(--ls-*)。
const statusTone: Record<InstanceStatus, BadgeTone> = {
  pending: "neutral",
  running: "life",
  partial: "warn",
  stopped: "neutral",
  starting: "warn",
  stopping: "warn",
  failed: "danger",
  unknown: "neutral",
};

// 状态文本映射
const statusTexts: Record<InstanceStatus, string> = {
  pending: "待命中",
  running: "运行中",
  partial: "部分运行",
  stopped: "已停止",
  starting: "启动中",
  stopping: "停止中",
  failed: "失败",
  unknown: "未知",
};

const PLACEHOLDER = "—";

export const InstanceCard: React.FC<InstanceCardProps> = ({
  instance,
  onStart,
  onStop,
  onRestart,
  onDelete,
  onRename,
  loading = false,
}) => {
  const navigate = useNavigate();
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);

  // 计算组件数量（假设有 main, napcat, napcat-ada）
  const componentCount = instance.component_states?.length || 0;

  // 格式化最后运行时间
  const formatLastRun = (lastRun?: string) => {
    if (!lastRun) return "从未运行";
    try {
      return formatDistanceToNow(new Date(lastRun), {
        addSuffix: true,
        locale: zhCN,
      });
    } catch {
      return "未知";
    }
  };

  // 格式化运行时长
  const formatRunTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    if (minutes > 0) {
      return `${minutes}分钟`;
    }
    return `${seconds}秒`;
  };

  // 点击卡片进入详情页
  const handleCardClick = (e: React.MouseEvent) => {
    // 如果点击的是按钮，不触发卡片点击
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    navigate(`/instances/${instance.id}`);
  };

  // 阻止按钮事件冒泡
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const isRunning =
    instance.status === "running" || instance.status === "partial";
  const isStopped = instance.status === "stopped";
  const isTransitioning =
    instance.status === "pending" ||
    instance.status === "starting" ||
    instance.status === "stopping";
  const isBusy = loading || isTransitioning;
  const canStart =
    isStopped || instance.status === "failed" || instance.status === "unknown";

  // 资源读数:有真实采样才渲染数值,无采样用占位,不用 0 伪装成"已采集"。
  const hasCpu = instance.cpu_usage !== undefined && instance.cpu_usage > 0;
  const hasMem =
    instance.memory_usage !== undefined && instance.memory_usage > 0;
  const cpuText = hasCpu ? `${instance.cpu_usage!.toFixed(1)}%` : PLACEHOLDER;
  const memText = hasMem
    ? `${instance.memory_usage!.toFixed(0)} MB`
    : PLACEHOLDER;

  // 卡片右上"更多"操作:重命名 / 重启(运行时)/ 删除(危险)。
  const menuItems: IconMenuItem[] = [
    {
      icon: Pencil,
      label: "重命名",
      onSelect: () => setIsRenameModalOpen(true),
    },
    ...(isRunning
      ? [
          {
            icon: RotateCw,
            label: "重启",
            onSelect: () => onRestart(instance.id),
          } as IconMenuItem,
        ]
      : []),
    {
      icon: Trash2,
      label: isRunning ? "运行中无法删除" : "删除实例",
      danger: true,
      onSelect: () => {
        if (!isRunning) onDelete(instance.id);
      },
    },
  ];

  return (
    <Card
      onClick={handleCardClick}
      className={`group relative cursor-pointer ${isBusy ? "opacity-80" : ""}`}
    >
      {/* 头部:名称 + 运行点 + 更多菜单 */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <StatusDot running={isRunning} />
          <h3
            className="truncate text-lg font-semibold tracking-tight"
            style={{ color: "var(--ls-ink)" }}
          >
            {instance.name}
          </h3>
        </div>
        <div className="shrink-0">
          <IconMenu items={menuItems} align="right" />
        </div>
      </div>

      {/* 资源占用 —— 内存条(生命色填充 + 等宽读数);CPU 作右侧并列读数 */}
      <div className="mb-4">
        <Meter
          label="内存占用"
          used={hasMem ? instance.memory_usage! : 0}
          total={hasMem ? Math.max(instance.memory_usage! * 1.6, 1024) : 0}
          valueText={memText}
        />
        <div
          className="mt-2 flex items-baseline justify-between text-[11px] font-medium"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          <span>CPU</span>
          <span className="ls-num text-xs">{cpuText}</span>
        </div>
      </div>

      {/* 状态徽章组 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={statusTone[instance.status]}>
          {statusTexts[instance.status]}
        </Badge>

        {isRunning && instance.run_time !== undefined && (
          <Badge tone="neutral" className="gap-1.5">
            <Clock className="h-3 w-3" />
            <span className="ls-num">{formatRunTime(instance.run_time)}</span>
          </Badge>
        )}

        {!isRunning && instance.last_run && (
          <Badge tone="neutral" className="gap-1.5">
            <RotateCw className="h-3 w-3" />
            <span>{formatLastRun(instance.last_run)}</span>
          </Badge>
        )}

        <Badge tone={isRunning ? "life" : "neutral"} className="gap-1.5">
          <Server className="h-3 w-3" />
          <span className="ls-num">{componentCount}</span>
        </Badge>

        {instance.bot_version && (
          <Badge tone="neutral">
            <span className="ls-num text-[10px]">v{instance.bot_version}</span>
          </Badge>
        )}
      </div>

      {/* 主操作:启动(生命色)/ 停止(中性);次要操作收进右上菜单 */}
      <div className="pt-1">
        {canStart ? (
          <TactileButton
            variant="life"
            onClick={(e) => handleButtonClick(e, () => onStart(instance.id))}
            disabled={isBusy}
            className="w-full justify-center disabled:opacity-50"
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>启动</span>
              </>
            )}
          </TactileButton>
        ) : (
          <TactileButton
            variant="solid"
            onClick={(e) => handleButtonClick(e, () => onStop(instance.id))}
            disabled={isBusy}
            className="w-full justify-center disabled:opacity-50"
            style={{ color: "var(--ls-danger)" }}
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Square className="h-4 w-4 fill-current" />
                <span>停止</span>
              </>
            )}
          </TactileButton>
        )}
      </div>

      {/* 重命名模态框 */}
      <InstanceRenameModal
        isOpen={isRenameModalOpen}
        instanceName={instance.name}
        onClose={() => setIsRenameModalOpen(false)}
        onSave={(newName: string) => {
          if (onRename) {
            onRename(instance.id, newName);
          }
          setIsRenameModalOpen(false);
        }}
      />
    </Card>
  );
};
