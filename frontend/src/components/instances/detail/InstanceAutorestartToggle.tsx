/**
 * 自动重启开关 —— 实例详情左栏卡片。
 *
 * 读写后端 config KV "autorestart:<instanceId>":缺省视为开启,与后端看门狗的默认守护语义一致
 * (仅显式存 "false" 才关闭)。开关本身复用生息组件库的 Switch(哑光轨道 + 弹簧拇指)。
 *
 * 之所以单独建 hook 直连 tauriInvoke 而非塞进 useEnvironmentQueries:这是 per-instance 偏好,
 * 查询键需带 instanceId 隔离,与全局环境配置不同源,分开更清晰。
 */

import { motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Surface, Switch } from "@/components/ls";
import { springSoft } from "@/design/motion";
import { tauriInvoke } from "@/services/tauriInvoke";

const autorestartKey = (instanceId: string) =>
  ["instance", instanceId, "autorestart"] as const;

const configKeyFor = (instanceId: string) => `autorestart:${instanceId}`;

/**
 * 读取实例的自动重启偏好;后端缺省(null)按开启处理。
 */
function useAutorestartQuery(instanceId: string) {
  return useQuery({
    queryKey: autorestartKey(instanceId),
    queryFn: async () => {
      const value = await tauriInvoke<string | null>("get_config", {
        key: configKeyFor(instanceId),
      });
      // 仅显式 "false" 关闭,其余(含未设置)视为开启,对齐后端看门狗默认。
      return value !== "false";
    },
  });
}

/**
 * 写入实例的自动重启偏好;落库后失效查询以回读真实值。
 */
function useSetAutorestartMutation(instanceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      await tauriInvoke("set_config", {
        key: configKeyFor(instanceId),
        value: enabled ? "true" : "false",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: autorestartKey(instanceId) });
    },
  });
}

export function InstanceAutorestartToggle({
  instanceId,
}: {
  instanceId: string;
}) {
  const { data: enabled } = useAutorestartQuery(instanceId);
  const setAutorestart = useSetAutorestartMutation(instanceId);

  // 查询未回来前按默认开启展示,避免开关初始闪烁到关态。
  const checked = enabled ?? true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
    >
      <Surface variant="panel" className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h3
              className="flex items-center gap-2 text-lg font-bold"
              style={{ color: "var(--ls-ink)" }}
            >
              <RefreshCw size={20} style={{ color: "var(--ls-ink-soft)" }} />
              自动重启
            </h3>
            <p className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
              进程异常退出时由看门狗自动拉起(连续失败将退避并在数次后停手)。
            </p>
          </div>
          <Switch
            checked={checked}
            disabled={setAutorestart.isPending}
            onCheckedChange={(next) => setAutorestart.mutate(next)}
            aria-label="自动重启"
          />
        </div>
      </Surface>
    </motion.div>
  );
}
