import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Badge, StatusDot, Surface, TactileButton } from "@/components/ls";
import { Instance, InstanceStatus } from "@/services/instanceApi";

const statusLabel: Record<InstanceStatus, string> = {
  pending: "待命中",
  starting: "启动中",
  running: "运行中",
  partial: "部分运行",
  stopping: "停止中",
  stopped: "已停止",
  failed: "失败",
  unknown: "未知",
};

/** 顶部状态药丸语气:活跃=生命色,失败=危险色,其余过渡/停止态=中性。 */
function statusTone(
  status: InstanceStatus,
): "life" | "warn" | "danger" | "neutral" {
  if (status === "running" || status === "partial") return "life";
  if (status === "failed") return "danger";
  if (status === "stopped") return "neutral";
  return "warn";
}

interface InstanceHeaderProps {
  instance: Instance;
}

export function InstanceHeader({ instance }: InstanceHeaderProps) {
  const navigate = useNavigate();

  const isActive =
    instance.status === "running" || instance.status === "partial";
  const runtimeKindLabel =
    instance.runtime_profile.kind === "wsl2" ? "WSL2" : "Local";

  return (
    <>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <TactileButton
            variant="solid"
            aria-label="返回列表"
            onClick={() => navigate("/instances")}
            className="h-10 w-10 justify-center !px-0"
          >
            <ArrowLeft size={20} style={{ color: "var(--ls-ink-soft)" }} />
          </TactileButton>

          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--ls-ink)" }}
            >
              {instance.name}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <StatusDot running={isActive} />
              <p
                className="text-sm font-medium"
                style={{ color: "var(--ls-ink-soft)" }}
              >
                {instance.description ? instance.description : "—"}
              </p>
              <Badge tone="neutral" className="uppercase tracking-wide">
                {runtimeKindLabel}
              </Badge>
            </div>
          </div>
        </div>

        <Badge
          tone={statusTone(instance.status)}
          className="px-4 py-1.5 text-sm font-semibold"
        >
          {statusLabel[instance.status]}
        </Badge>
      </header>

      {instance.last_error && (
        <Surface
          variant="panel"
          className="px-4 py-3 text-sm"
          style={{ color: "var(--ls-danger)" }}
        >
          <div className="font-semibold">最近错误</div>
          <div className="mt-1 break-all">{instance.last_error}</div>
          {instance.last_status_reason && (
            <div
              className="mt-1 text-xs"
              style={{ color: "var(--ls-ink-faint)" }}
            >
              {instance.last_status_reason}
            </div>
          )}
        </Surface>
      )}
    </>
  );
}
