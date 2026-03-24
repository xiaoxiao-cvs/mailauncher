import { Icon } from '@iconify/react'
import { InstallOverviewState, TaskStatus } from '@/types/notification'
import { cn } from '@/lib/utils'

interface InstallOverviewProps {
  state: InstallOverviewState
}

/**
 * 安装概要卡片组件
 * 职责：
 * - 显示安装任务的基本信息
 * - 骨架屏加载效果
 * - 状态变化动画
 */
export function InstallOverview({ state }: InstallOverviewProps) {
  const { visible, instanceName, version, components, deploymentPath, status, loading } = state

  if (!visible) return null

  return (
    <div className={cn(
      'flex-1 flex items-center justify-center p-6',
      'animate-in fade-in slide-in-from-right-4 duration-500'
    )}>
      <div className="w-full max-w-2xl">
        <div className={cn(
          'p-8 rounded-xl border',
          'bg-card',
          'border-border',
          'shadow-lg'
        )}>
          {loading ? (
            // 骨架屏
            <div className="space-y-6 animate-pulse">
              <div className="h-8 bg-muted rounded w-2/3" />
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-5/6" />
                <div className="h-4 bg-muted rounded w-4/6" />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 标题 */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand to-brand/70 flex items-center justify-center text-white shadow-md flex-shrink-0">
                  <Icon icon="ph:robot" className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    {getStatusIcon(status)} {getStatusTitle(status)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {instanceName} · {version}
                  </p>
                </div>
              </div>

              {/* 详情 */}
              <div className="space-y-4">
                {/* 组件列表 */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    安装组件
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {components.map((component, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-sm font-medium rounded-lg bg-brand-muted text-brand"
                      >
                        {component}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 部署路径 */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    部署路径
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                    <Icon icon="ph:folder-open" className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground font-mono truncate">
                      {deploymentPath}
                    </span>
                  </div>
                </div>

                {/* 提示信息 */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-muted">
                  <Icon icon="ph:info" className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    可在通知中查看安装进度和详细日志
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 获取状态图标
function getStatusIcon(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.PENDING:
      return '[等待]'
    case TaskStatus.DOWNLOADING:
      return '[下载]'
    case TaskStatus.INSTALLING:
      return '[安装]'
    case TaskStatus.SUCCESS:
      return '[成功]'
    case TaskStatus.FAILED:
      return '[失败]'
    default:
      return '[处理中]'
  }
}

// 获取状态标题
function getStatusTitle(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.PENDING:
      return '准备安装'
    case TaskStatus.DOWNLOADING:
      return '正在下载'
    case TaskStatus.INSTALLING:
      return '正在安装'
    case TaskStatus.SUCCESS:
      return '安装成功'
    case TaskStatus.FAILED:
      return '安装失败'
    default:
      return '处理中'
  }
}
