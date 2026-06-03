import { Icon } from "@iconify/react";
import { motion } from "motion/react";
import { InstallOverviewState, TaskStatus } from "@/types/notification";
import { Surface, Badge } from "@/components/ls";
import { springSoft } from "@/design/motion";

interface InstallOverviewProps {
  state: InstallOverviewState;
}

/**
 * 安装概要卡片组件
 * 职责：
 * - 显示安装任务的基本信息
 * - 骨架屏加载效果
 * - 状态变化动画
 */
export function InstallOverview({ state }: InstallOverviewProps) {
  const {
    visible,
    instanceName,
    version,
    components,
    deploymentPath,
    status,
    loading,
  } = state;

  if (!visible) return null;

  return (
    <motion.div
      className="flex-1 flex items-center justify-center p-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
    >
      <div className="w-full max-w-2xl">
        <Surface variant="panel" className="p-8">
          {loading ? (
            // 骨架屏
            <div className="space-y-6 animate-pulse">
              <div
                className="h-8 rounded w-2/3"
                style={{ background: "var(--ls-bg-2)" }}
              />
              <div className="space-y-3">
                <div
                  className="h-4 rounded w-full"
                  style={{ background: "var(--ls-bg-2)" }}
                />
                <div
                  className="h-4 rounded w-5/6"
                  style={{ background: "var(--ls-bg-2)" }}
                />
                <div
                  className="h-4 rounded w-4/6"
                  style={{ background: "var(--ls-bg-2)" }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 标题 */}
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "var(--ls-life)",
                    color: "#fff",
                    boxShadow: "var(--ls-shadow-soft)",
                  }}
                >
                  <Icon icon="ph:robot" className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h2
                    className="text-2xl font-bold mb-1"
                    style={{ color: "var(--ls-ink)" }}
                  >
                    {getStatusTitle(status)}
                  </h2>
                  <p
                    className="text-sm"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    {instanceName} · {version}
                  </p>
                </div>
              </div>

              {/* 详情 */}
              <div className="space-y-4">
                {/* 组件列表 */}
                <div>
                  <label
                    className="text-sm font-medium mb-2 block"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    安装组件
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {components.map((component, index) => (
                      <Badge key={index} tone="life" className="text-sm">
                        {component}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* 部署路径 */}
                <div>
                  <label
                    className="text-sm font-medium mb-2 block"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    部署路径
                  </label>
                  <Surface
                    variant="inset"
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    <Icon
                      icon="ph:folder-open"
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: "var(--ls-ink-faint)" }}
                    />
                    <span
                      className="ls-num text-sm font-mono truncate"
                      style={{ color: "var(--ls-ink-soft)" }}
                    >
                      {deploymentPath}
                    </span>
                  </Surface>
                </div>

                {/* 提示信息 */}
                <Surface variant="inset" className="flex items-start gap-2 p-3">
                  <Icon
                    icon="ph:info"
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: "var(--ls-life)" }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    可在通知中查看安装进度和详细日志
                  </p>
                </Surface>
              </div>
            </div>
          )}
        </Surface>
      </div>
    </motion.div>
  );
}

// 获取状态标题
function getStatusTitle(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.PENDING:
      return "准备安装";
    case TaskStatus.DOWNLOADING:
      return "正在下载";
    case TaskStatus.INSTALLING:
      return "正在安装";
    case TaskStatus.SUCCESS:
      return "安装成功";
    case TaskStatus.FAILED:
      return "安装失败";
    default:
      return "处理中";
  }
}
