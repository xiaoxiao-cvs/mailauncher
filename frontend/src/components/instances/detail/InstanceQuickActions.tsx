import { motion } from "motion/react";
import {
  Clock,
  Server,
  FileText,
  RotateCw,
  type LucideIcon,
} from "lucide-react";
import { Surface, TactileButton } from "@/components/ls";
import { springSoft } from "@/design/motion";

interface InstanceQuickActionsProps {
  onOpenConfig: () => void;
  onOpenSchedule: () => void;
}

function ActionTile({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <TactileButton
      variant="ghost"
      onClick={onClick}
      className="ls-inset flex-col justify-center gap-2 py-4"
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
  onOpenConfig,
  onOpenSchedule,
}: InstanceQuickActionsProps) {
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
          <ActionTile icon={FileText} label="日志" />
          <ActionTile icon={RotateCw} label="更多" />
        </div>
      </Surface>
    </motion.div>
  );
}
