import { Icon } from "@iconify/react";
import { motion } from "motion/react";
import {
  Surface,
  Input,
  Label,
  TactileButton,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ls";
import { springSettle } from "@/design/motion";
import type { MaibotVersion } from "@/types/download";

// 由 DownloadsPage 父级 staggerChildren 按 hidden/show 键编排逐块落定入场。
const panelChild = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: springSettle },
};

interface InstanceConfigPanelProps {
  instanceName: string;
  setInstanceName: (name: string) => void;
  selectedMaibotVersion: MaibotVersion;
  setSelectedMaibotVersion: (version: MaibotVersion) => void;
  maibotVersions: MaibotVersion[];
  deploymentPath: string;
  setDeploymentPath: (path: string) => void;
  selectDeploymentPath: () => void;
  isLoadingPath: boolean;
  hasDownloading: boolean;
}

export function InstanceConfigPanel({
  instanceName,
  setInstanceName,
  selectedMaibotVersion,
  setSelectedMaibotVersion,
  maibotVersions,
  deploymentPath,
  setDeploymentPath,
  selectDeploymentPath,
  isLoadingPath,
  hasDownloading,
}: InstanceConfigPanelProps) {
  return (
    <motion.div className="lg:col-span-7" variants={panelChild}>
      <Surface variant="panel" className="overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-12 h-12 flex items-center justify-center flex-shrink-0"
              style={{
                borderRadius: "var(--ls-r-card)",
                background: "var(--ls-surface-hi)",
                border: "1px solid var(--ls-hairline)",
                boxShadow: "var(--ls-shadow-soft)",
                color: "var(--ls-ink)",
              }}
            >
              <Icon icon="ph:robot-fill" className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className="text-lg font-semibold"
                  style={{ color: "var(--ls-ink)" }}
                >
                  Maibot
                </h3>
                <span
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide"
                  style={{
                    background: "var(--ls-life-soft)",
                    color: "var(--ls-life)",
                  }}
                >
                  核心
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
                MAI 机器人核心框架
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="ml-0.5">实例名称</Label>
              <Input
                type="text"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="给您的机器人起个名字..."
                disabled={hasDownloading}
                className="px-4 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="ml-0.5">选择版本</Label>
              <SelectRoot
                value={selectedMaibotVersion.value}
                onValueChange={(value) => {
                  const version = maibotVersions.find((v) => v.value === value);
                  if (version) setSelectedMaibotVersion(version);
                }}
                disabled={hasDownloading}
              >
                <SelectTrigger className="h-11 px-4">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {maibotVersions.map((version) => (
                    <SelectItem key={version.value} value={version.value}>
                      <div className="flex items-center gap-2">
                        <Icon
                          icon={
                            version.source === "latest"
                              ? "ph:code-bold"
                              : version.source === "tag"
                                ? "ph:tag-bold"
                                : "ph:git-branch-bold"
                          }
                          className="w-4 h-4"
                          style={{ color: "var(--ls-ink-soft)" }}
                        />
                        <span className="font-medium">{version.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--ls-hairline)" }} />

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Icon
              icon="ph:folder-open"
              className="w-5 h-5"
              style={{ color: "var(--ls-ink-soft)" }}
            />
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--ls-ink)" }}
            >
              部署位置
            </h3>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                value={deploymentPath}
                onChange={(e) => setDeploymentPath(e.target.value)}
                placeholder="选择安装目录..."
                disabled={hasDownloading || isLoadingPath}
                className="px-4 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {isLoadingPath && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Icon
                    icon="ph:spinner-bold"
                    className="w-4 h-4 animate-spin"
                    style={{ color: "var(--ls-ink-soft)" }}
                  />
                </div>
              )}
            </div>

            <TactileButton
              variant="solid"
              onClick={selectDeploymentPath}
              disabled={hasDownloading || isLoadingPath}
              className="px-4 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Icon icon="ph:folder-simple-bold" className="w-4 h-4" />
            </TactileButton>
          </div>
        </div>
      </Surface>
    </motion.div>
  );
}
