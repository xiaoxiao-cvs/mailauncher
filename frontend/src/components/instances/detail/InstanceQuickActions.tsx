import { motion } from "motion/react";
import { Clock, Server, History, Globe, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Surface, TactileButton } from "@/components/ls";
import { springSoft } from "@/design/motion";
import { instanceApi } from "@/services/instanceApi";

interface InstanceQuickActionsProps {
  instanceId: string;
  onOpenConfig: () => void;
  onOpenSchedule: () => void;
  onOpenVersionManager: () => void;
}

function ActionTile({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <TactileButton
      variant="ghost"
      onClick={onClick}
      className={`ls-inset flex-col justify-center gap-2 py-4 ${className ?? ""}`}
    >
      <Icon size={24} style={{ color: "var(--ls-ink-soft)" }} />
      <span
        className="text-sm font-medium"
        style={{ color: "var(--ls-ink-soft)" }}
      >
        {label}
      </span>
    </TactileButton>
  );
}

export function InstanceQuickActions({
  instanceId,
  onOpenConfig,
  onOpenSchedule,
  onOpenVersionManager,
}: InstanceQuickActionsProps) {
  // 打开 MaiBot WebUI:向后端取 token 直登 URL,再用临时 <a target=_blank> 交由 Tauri
  // 按外链方式打开(与引导页外链同一机制,无需 opener 插件)。实例没起时后端会明确报错。
  const openWebUI = async () => {
    try {
      const url = await instanceApi.getInstanceWebUiUrl(instanceId);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
    >
      <Surface variant="panel" className="p-6">
        <h3
          className="mb-4 flex items-center gap-2 text-lg font-bold"
          style={{ color: "var(--ls-ink)" }}
        >
          <Server size={20} style={{ color: "var(--ls-ink-soft)" }} />
          快捷操作
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <ActionTile icon={Server} label="配置" onClick={onOpenConfig} />
          <ActionTile icon={Clock} label="计划" onClick={onOpenSchedule} />
          <ActionTile icon={Globe} label="打开 WebUI" onClick={openWebUI} />
          <ActionTile
            icon={History}
            label="版本管理"
            onClick={onOpenVersionManager}
          />
        </div>
      </Surface>
    </motion.div>
  );
}
