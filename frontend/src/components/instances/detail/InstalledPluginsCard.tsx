/**
 * 已装插件卡 —— 实例详情左栏卡片(P2-25)。
 *
 * 展示该实例 MaiBot/plugins 下已装插件的 name/version/author/enabled。
 * manifest 损坏的插件目录后端已降级为 manifest_invalid 占位项,这里用醒目提示渲染,
 * 而不是当作正常插件静默展示——用户需要知道有插件读取异常。
 */

import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Blocks, TriangleAlert } from "lucide-react";
import { Surface, Badge } from "@/components/ls";
import { springSoft } from "@/design/motion";
import { instanceApi } from "@/services/instanceApi";

/** 单个已装插件展示信息(对应 Rust InstalledPlugin)。 */
export interface InstalledPlugin {
  dir_name: string;
  name: string;
  version: string;
  author: string | null;
  description: string | null;
  enabled: boolean;
  manifest_invalid: boolean;
}

export function InstalledPluginsCard({ instanceId }: { instanceId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["instance", instanceId, "plugins"],
    queryFn: () => instanceApi.listInstalledPlugins(instanceId),
    staleTime: 30000,
  });

  const plugins = data ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
    >
      <Surface variant="panel" className="p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3
            className="flex items-center gap-2 text-lg font-bold"
            style={{ color: "var(--ls-ink)" }}
          >
            <Blocks size={20} style={{ color: "var(--ls-ink-soft)" }} />
            已装插件
          </h3>
          {plugins.length > 0 && (
            <span
              className="ls-num text-xs"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              {plugins.length} 个
            </span>
          )}
        </div>

        {isLoading ? (
          <div
            className="flex h-20 items-center justify-center text-sm"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            加载中...
          </div>
        ) : plugins.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
            尚未安装任何插件
          </p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {plugins.map((plugin) => (
              <PluginRow key={plugin.dir_name} plugin={plugin} />
            ))}
          </div>
        )}
      </Surface>
    </motion.div>
  );
}

function PluginRow({ plugin }: { plugin: InstalledPlugin }) {
  if (plugin.manifest_invalid) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{
          background: "color-mix(in srgb, var(--ls-warn) 10%, var(--ls-bg-2))",
        }}
      >
        <TriangleAlert
          className="h-4 w-4 shrink-0"
          style={{ color: "var(--ls-warn)" }}
        />
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-medium"
            style={{ color: "var(--ls-ink)" }}
          >
            {plugin.dir_name}
          </p>
          <p className="text-xs" style={{ color: "var(--ls-ink-soft)" }}>
            manifest 解析失败
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
      style={{ background: "var(--ls-bg-2)" }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className="truncate text-sm font-medium"
            style={{ color: "var(--ls-ink)" }}
          >
            {plugin.name}
          </p>
          <span
            className="ls-num shrink-0 text-[10px]"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            v{plugin.version}
          </span>
        </div>
        {plugin.author && (
          <p
            className="truncate text-xs"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            {plugin.author}
          </p>
        )}
      </div>
      <Badge tone={plugin.enabled ? "life" : "neutral"} className="shrink-0">
        {plugin.enabled ? "已启用" : "已禁用"}
      </Badge>
    </div>
  );
}
