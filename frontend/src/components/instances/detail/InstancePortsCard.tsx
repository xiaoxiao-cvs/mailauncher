/**
 * 端口分配卡 —— 实例详情左栏卡片(G10-1)。
 *
 * 只读展示该实例分配的四个独立端口(NapCat 正向 WS / MaiBot 核心 maim / MaiBot WebUI / NapCat WebUI)。
 * 多实例并发时每个实例占用独立端口块,用户可据此手动打开面板或排障。未分配(从未启动过的旧实例)时
 * 提示"启动后分配"。
 */

import { motion } from "motion/react";
import { Network } from "lucide-react";
import { Surface } from "@/components/ls";
import { springSoft } from "@/design/motion";
import type { InstancePorts } from "@/services/instanceApi";

const PORT_ROWS: { key: keyof InstancePorts; label: string; hint: string }[] = [
  { key: "napcat_ws", label: "NapCat 正向 WS", hint: "适配器连入" },
  { key: "maim", label: "MaiBot 核心 WS", hint: "maim_message" },
  { key: "maibot_webui", label: "MaiBot WebUI", hint: "面板/直登" },
  { key: "napcat_webui", label: "NapCat WebUI", hint: "扫码面板" },
];

export function InstancePortsCard({ ports }: { ports?: InstancePorts | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
    >
      <Surface variant="panel" className="p-6">
        <h3
          className="mb-3 flex items-center gap-2 text-lg font-bold"
          style={{ color: "var(--ls-ink)" }}
        >
          <Network size={20} style={{ color: "var(--ls-ink-soft)" }} />
          端口分配
        </h3>

        {ports ? (
          <div className="flex flex-col gap-2">
            {PORT_ROWS.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm" style={{ color: "var(--ls-ink)" }}>
                  {row.label}
                  <span
                    className="ml-2 text-xs"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    {row.hint}
                  </span>
                </span>
                <span
                  className="ls-num text-sm font-semibold"
                  style={{ color: "var(--ls-ink)" }}
                >
                  {ports[row.key]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
            端口将在实例首次启动时分配
          </p>
        )}
      </Surface>
    </motion.div>
  );
}
