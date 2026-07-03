/**
 * 存储数据卡 —— 实例详情左栏卡片(G8-3)。
 *
 * 按类别展示实例 MaiBot/data 的占用(数据库/图片/表情/记忆/知识库/插件/WebUI/临时等),
 * 对可再生缓存类(images/emoji/temp/html_imgs)提供按类清理入口;核心数据(cleanable=false)
 * 只展示占用不给清理入口。清理为危险操作:后端强制要求实例已停止,前端点击先经 useConfirm 二次确认。
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { HardDrive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Surface, TactileButton } from "@/components/ls";
import { springSoft } from "@/design/motion";
import { useConfirm } from "@/hooks/useConfirm";
import {
  getMaiBotDataStats,
  clearMaiBotDataCategory,
} from "@/services/versionMaintenanceApi";

/** 字节数格式化为 B/KB/MB/GB(1024 进制,最多一位小数)。 */
function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, i);
  return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
}

export function MaiBotDataCard({ instanceId }: { instanceId: string }) {
  const confirm = useConfirm();
  const [clearingId, setClearingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["instance", instanceId, "data-stats"],
    queryFn: () => getMaiBotDataStats(instanceId),
    staleTime: 30000,
  });

  const handleClear = async (categoryId: string, displayName: string) => {
    const ok = await confirm({
      title: "清理数据",
      description: `确定清空「${displayName}」缓存吗？该类为可再生缓存，MaiBot 会按需重建；清理需实例已停止。`,
      confirmText: "清理",
      destructive: true,
    });
    if (!ok) return;

    setClearingId(categoryId);
    try {
      const result = await clearMaiBotDataCategory(instanceId, categoryId);
      toast.success(`已释放 ${formatBytes(result.removedBytes)}`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setClearingId(null);
    }
  };

  const categories = data?.categories ?? [];

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
            <HardDrive size={20} style={{ color: "var(--ls-ink-soft)" }} />
            存储数据
          </h3>
          {data && (
            <span
              className="ls-num text-xs"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              共 {formatBytes(data.totalSizeBytes)}
            </span>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
            正在统计…
          </p>
        ) : !data?.dataDirExists ? (
          <p className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
            实例尚未产生数据(首次运行后生成)
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--ls-ink)" }}
                  >
                    {cat.displayName}
                  </span>
                  <span
                    className="ls-num ml-2 text-xs"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    {formatBytes(cat.sizeBytes)} · {cat.fileCount} 文件
                  </span>
                </div>
                {cat.cleanable && cat.sizeBytes > 0 && (
                  <TactileButton
                    variant="ghost"
                    onClick={() => handleClear(cat.id, cat.displayName)}
                    disabled={clearingId !== null}
                    className="shrink-0 disabled:opacity-50"
                    style={{ color: "var(--ls-danger)" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    清理
                  </TactileButton>
                )}
              </div>
            ))}
          </div>
        )}
      </Surface>
    </motion.div>
  );
}
