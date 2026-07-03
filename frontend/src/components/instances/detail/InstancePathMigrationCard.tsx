/**
 * 部署目录迁移卡 —— 实例详情左栏卡片(G1-5)。
 *
 * 把实例的部署目录搬到新的相对目录名(重命名 / 改部署位置):移动磁盘目录并同步 DB 的
 * instance_path/config_path/python_path 等派生路径。后端强制要求实例已停止、目标目录不存在、
 * 失败回滚无半迁移态。仅停止态可用;提交前经 useConfirm 二次确认。newPath 为部署根下的相对目录名
 * (与创建时同规则:非空、无路径分隔符、非 Windows 保留名),后端服务层做同套校验并返回明确错误。
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { FolderInput } from "lucide-react";
import { toast } from "sonner";
import { Surface, TactileButton, Input } from "@/components/ls";
import { springSoft } from "@/design/motion";
import { useConfirm } from "@/hooks/useConfirm";
import { instanceApi, type Instance } from "@/services/instanceApi";
import { instanceKeys } from "@/hooks/queries/useInstanceQueries";

export function InstancePathMigrationCard({
  instance,
}: {
  instance: Instance;
}) {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [newPath, setNewPath] = useState("");
  const isStopped = instance.status === "stopped";
  const currentPath = instance.instance_path ?? instance.name;

  const migrateMutation = useMutation({
    mutationFn: (target: string) =>
      instanceApi.migrateInstancePath(instance.id, target),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: instanceKeys.detail(instance.id),
      });
      queryClient.invalidateQueries({ queryKey: instanceKeys.lists() });
    },
  });

  const handleMigrate = async () => {
    const target = newPath.trim();
    if (!target || target === currentPath) return;
    const ok = await confirm({
      title: "迁移部署目录",
      description: `确定把实例目录从「${currentPath}」迁移到「${target}」吗？将移动磁盘目录并更新记录,需实例已停止。`,
      confirmText: "迁移",
    });
    if (!ok) return;
    try {
      await migrateMutation.mutateAsync(target);
      toast.success(`已迁移到 ${target}`);
      setNewPath("");
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
          className="mb-3 flex items-center gap-2 text-lg font-bold"
          style={{ color: "var(--ls-ink)" }}
        >
          <FolderInput size={20} style={{ color: "var(--ls-ink-soft)" }} />
          部署目录
        </h3>

        <p className="mb-3 text-sm" style={{ color: "var(--ls-ink-soft)" }}>
          当前:
          <span className="ls-num ml-1" style={{ color: "var(--ls-ink)" }}>
            {currentPath}
          </span>
        </p>

        {isStopped ? (
          <div className="flex flex-col gap-2">
            <Input
              value={newPath}
              onChange={(e) => setNewPath(e.currentTarget.value)}
              placeholder="新目录名(部署根下的相对名)"
              aria-label="新部署目录名"
            />
            <TactileButton
              variant="solid"
              onClick={handleMigrate}
              disabled={
                migrateMutation.isPending ||
                !newPath.trim() ||
                newPath.trim() === currentPath
              }
              className="self-end disabled:opacity-50"
            >
              <FolderInput className="h-4 w-4" />
              迁移
            </TactileButton>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
            迁移需实例已停止,请先停止实例
          </p>
        )}
      </Surface>
    </motion.div>
  );
}
