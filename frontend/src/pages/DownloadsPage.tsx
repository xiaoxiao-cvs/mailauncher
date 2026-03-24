import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InstallOverview } from '@/components/install/InstallOverview'
import { useDownload, useInstallOverview } from '@/hooks'
import { useInstallTask } from '@/contexts/InstallTaskContext'
import { useNotificationContext } from '@/contexts/NotificationContext'
import { cn } from '@/lib/utils'
import { TaskStatus } from '@/types/notification'
import { useEffect, useRef } from 'react'
import { animate, utils } from 'animejs'
import type { DownloadItem } from '@/types/download'

// ==================== 组件选择项 ====================

interface ComponentSelectItemProps {
  item: DownloadItem
  selected: boolean
  disabled: boolean
  locked?: boolean
  onToggle: () => void
  badge?: React.ReactNode
}

function ComponentSelectItem({ item, selected, disabled, locked, onToggle, badge }: ComponentSelectItemProps) {
  return (
    <div
      onClick={() => !disabled && !locked && item.status !== 'completed' && onToggle()}
      className={cn(
        "group p-3.5 rounded-xl border transition-all duration-200",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        selected
          ? "bg-brand-muted border-brand/20"
          : "bg-transparent border-transparent hover:bg-muted/60"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 flex-shrink-0",
          selected
            ? "bg-brand border-brand"
            : "border-border group-hover:border-muted-foreground"
        )}>
          {selected && <Icon icon="ph:check-bold" className="w-3 h-3 text-brand-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-sm font-medium text-foreground">{item.name}</h3>
            {item.status === 'completed' && (
              <Icon icon="ph:check-circle-fill" className="w-4 h-4 text-success" />
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
          {badge}
        </div>
      </div>
    </div>
  )
}

// ==================== 主页面 ====================

/**
 * 下载页面
 * 职责：管理 Maibot、Napcat、适配器等组件的下载和安装
 */
export function DownloadsPage() {
  const navigate = useNavigate()
  const {
    deploymentPath,
    instanceName,
    downloadItems,
    selectedMaibotVersion,
    maibotVersions,
    isLoadingPath,
    isDownloading,
    setDeploymentPath,
    setInstanceName,
    selectDeploymentPath,
    setSelectedMaibotVersion,
    downloadAll,
    toggleItemSelection,
    selectedItems
  } = useDownload()

  // 安装概要管理
  const { state: overviewState, showOverview, updateStatus } = useInstallOverview()

  // 通知管理
  const { addTaskNotification, updateTaskProgress, updateTaskId } = useNotificationContext()

  // 全局任务状态管理
  const { currentTask, startTask } = useInstallTask()

  // 动画容器引用
  const containerRef = useRef<HTMLDivElement>(null)

  // 入场动画
  useEffect(() => {
    if (!overviewState.visible && containerRef.current) {
      // 重置初始状态
      const elements = containerRef.current.querySelectorAll('.animate-item')
      utils.set(elements, { opacity: 0, translateY: 20 })

      // 执行动画
      animate(elements, {
        opacity: [0, 1],
        translateY: [20, 0],
        delay: utils.stagger(100),
        duration: 800,
        easing: 'easeOutExpo'
      })
    }
  }, [overviewState.visible])

  // 页面加载时恢复任务状态
  useEffect(() => {
    if (currentTask && currentTask.isActive) {
      console.log('[DownloadsPage] 恢复活跃任务:', currentTask)

      // 恢复概览显示
      showOverview({
        taskId: currentTask.taskId,
        instanceName: currentTask.instanceName,
        version: currentTask.version,
        components: currentTask.components,
        deploymentPath: currentTask.deploymentPath,
      })

      // 恢复任务状态
      updateStatus(currentTask.status)
    }
  }, []) // 只在组件挂载时执行

  // 监听全局任务状态变化，同步到本地概览
  useEffect(() => {
    if (currentTask) {
      console.log('[DownloadsPage] 任务状态更新:', {
        status: currentTask.status,
        isActive: currentTask.isActive
      })
      updateStatus(currentTask.status)
    }
  }, [currentTask?.status, currentTask?.isActive, updateStatus])

  // 检测平台
  const isMacOS = window.navigator.platform.toLowerCase().includes('mac')
  const isWindows = window.navigator.platform.toLowerCase().includes('win')

  // 获取各个组件
  const adapterItem = downloadItems.find(item => item.type === 'adapter')
  const napcatItem = downloadItems.find(item => item.type === 'napcat')
  const quickAlgoItem = downloadItems.find(item => item.type === 'quick-algo')

  // 检查是否有项目正在下载
  const hasDownloading = downloadItems.some(item => item.status === 'downloading')

  // 检查是否可以开始下载（需要有部署路径和实例名称）
  const canStartDownload =
    deploymentPath.trim() !== '' &&
    instanceName.trim() !== '' &&
    !isDownloading &&
    selectedItems.size > 0

  // 处理开始安装
  const handleStartInstall = async () => {
    // 获取选中的组件名称
    const components = Array.from(selectedItems)

    // 生成临时任务 ID
    const tempTaskId = `temp_${Date.now()}`

    // 立即添加通知（状态为 PENDING）- 给用户即时反馈
    console.log('[Install] 立即添加任务通知...')
    addTaskNotification({
      taskId: tempTaskId,
      instanceName,
      version: selectedMaibotVersion.label,
      components,
      deploymentPath,
    })

    // 调用下载方法获取真实任务 ID
    console.log('[Install] 开始创建下载任务...')
    const taskId = await downloadAll()

    if (!taskId) {
      // 下载失败，更新通知状态
      console.error('[Install] 创建下载任务失败')
      updateTaskProgress(tempTaskId, 0, TaskStatus.FAILED, '创建任务失败')
      return
    }

    // 成功获取任务 ID，更新通知
    console.log('[Install] 任务 ID 获取成功:', taskId)
    updateTaskId(tempTaskId, taskId)

    // 启动全局任务（持久化状态）
    startTask({
      taskId,
      instanceName,
      version: selectedMaibotVersion.label,
      components,
      deploymentPath,
    })

    // 显示安装概要卡片
    showOverview({
      taskId,
      instanceName,
      version: selectedMaibotVersion.label,
      components,
      deploymentPath,
    })

    // 导航到安装进度页
    navigate(`/install-progress?taskId=${taskId}`)

    console.log('[Install] 任务已提交,任务 ID:', taskId)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative z-10 font-sans selection:bg-brand selection:text-brand-foreground">
      {/* 根据是否显示概要卡片切换内容 */}
      {overviewState.visible ? (
          <InstallOverview state={overviewState} />
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin z-10">
            <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-5 pb-28" ref={containerRef}>

              {/* 页面标题 */}
              <div className="animate-item">
                <h1 className="text-2xl font-bold text-foreground">下载与安装</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  配置实例信息，选择组件，一键部署。
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

                {/* 左侧：实例配置（合并卡片） */}
                <div className="lg:col-span-7 animate-item">
                  <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    {/* Maibot 核心信息 */}
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-white flex-shrink-0">
                          <Icon icon="ph:robot-fill" className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-foreground">Maibot</h3>
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-destructive/10 text-destructive uppercase tracking-wide">
                              核心
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">MAI 机器人核心框架</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* 实例名称 */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground ml-0.5">实例名称</label>
                          <input
                            type="text"
                            value={instanceName}
                            onChange={(e) => setInstanceName(e.target.value)}
                            placeholder="给您的机器人起个名字..."
                            disabled={hasDownloading}
                            className={cn(
                              'w-full px-4 py-3 text-sm rounded-xl border border-border',
                              'bg-muted/50 text-foreground',
                              'placeholder:text-muted-foreground',
                              'focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/30',
                              'transition-all duration-200',
                              'disabled:opacity-60 disabled:cursor-not-allowed'
                            )}
                          />
                        </div>

                        {/* 版本选择 */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground ml-0.5">选择版本</label>
                          <Select
                            value={selectedMaibotVersion.value}
                            onValueChange={(value) => {
                              const version = maibotVersions.find(v => v.value === value)
                              if (version) setSelectedMaibotVersion(version)
                            }}
                            disabled={hasDownloading}
                          >
                            <SelectTrigger className="w-full h-11 px-4 rounded-xl border border-border bg-muted/50 text-foreground text-sm focus:ring-2 focus:ring-brand/20 transition-all duration-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border border-border bg-popover shadow-lg">
                              {maibotVersions.map((version) => (
                                <SelectItem key={version.value} value={version.value} className="rounded-lg my-0.5 cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <Icon
                                      icon={
                                        version.source === 'latest'
                                          ? 'ph:code-bold'
                                          : version.source === 'tag'
                                          ? 'ph:tag-bold'
                                          : 'ph:git-branch-bold'
                                      }
                                      className="w-4 h-4 text-muted-foreground"
                                    />
                                    <span className="font-medium">{version.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* 分隔线 */}
                    <div className="border-t border-border" />

                    {/* 部署路径 */}
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Icon icon="ph:folder-open" className="w-5 h-5 text-muted-foreground" />
                        <h3 className="text-sm font-semibold text-foreground">部署位置</h3>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={deploymentPath}
                            onChange={(e) => setDeploymentPath(e.target.value)}
                            placeholder="选择安装目录..."
                            disabled={hasDownloading || isLoadingPath}
                            className={cn(
                              'w-full px-4 py-3 text-sm rounded-xl border border-border',
                              'bg-muted/50 text-foreground',
                              'placeholder:text-muted-foreground',
                              'focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/30',
                              'transition-all duration-200',
                              'disabled:opacity-60 disabled:cursor-not-allowed'
                            )}
                          />
                          {isLoadingPath && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Icon icon="ph:spinner-bold" className="w-4 h-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={selectDeploymentPath}
                          disabled={hasDownloading || isLoadingPath}
                          variant="outline"
                          className="h-auto px-4 rounded-xl border-border"
                        >
                          <Icon icon="ph:folder-simple-bold" className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 右侧：组件选择 */}
                <div className="lg:col-span-5 animate-item">
                  <div className="bg-card rounded-2xl border border-border p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-foreground">组件选择</h2>
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                        已选 {selectedItems.size}
                      </span>
                    </div>

                    <div className="space-y-2 flex-1">
                      {adapterItem && (
                        <ComponentSelectItem
                          item={adapterItem}
                          selected={selectedItems.has(adapterItem.id)}
                          disabled={hasDownloading}
                          onToggle={() => toggleItemSelection(adapterItem.id)}
                        />
                      )}

                      {napcatItem && (
                        <ComponentSelectItem
                          item={napcatItem}
                          selected={selectedItems.has(napcatItem.id)}
                          disabled={hasDownloading}
                          onToggle={() => toggleItemSelection(napcatItem.id)}
                        />
                      )}

                      {quickAlgoItem && (
                        <ComponentSelectItem
                          item={quickAlgoItem}
                          selected={isMacOS || selectedItems.has(quickAlgoItem.id)}
                          disabled={isWindows || hasDownloading}
                          locked={isMacOS}
                          onToggle={() => toggleItemSelection(quickAlgoItem.id)}
                          badge={
                            isMacOS ? (
                              <span className="inline-block mt-1.5 text-[10px] font-medium text-brand bg-brand-muted px-2 py-0.5 rounded">
                                macOS 必需
                              </span>
                            ) : isWindows ? (
                              <span className="inline-block mt-1.5 text-[10px] text-muted-foreground">
                                Windows 无需编译
                              </span>
                            ) : undefined
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 底部悬浮操作栏 */}
            <div className="fixed bottom-6 left-0 md:left-[272px] right-0 z-50 px-6 flex justify-center pointer-events-none">
              <div className="bg-card/90 backdrop-blur-xl rounded-2xl shadow-lg border border-border p-2 pl-6 flex items-center gap-4 pointer-events-auto">
                <div className="min-w-0">
                  {!instanceName.trim() ? (
                    <div className="flex items-center gap-2 text-warning text-sm">
                      <Icon icon="ph:warning-circle-fill" className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">请设置实例名称</span>
                    </div>
                  ) : !deploymentPath ? (
                    <div className="flex items-center gap-2 text-warning text-sm">
                      <Icon icon="ph:warning-circle-fill" className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">请选择部署路径</span>
                    </div>
                  ) : selectedItems.size === 0 ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Icon icon="ph:info-fill" className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">请选择组件</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <Icon icon="ph:check-circle-fill" className="w-4 h-4 text-success flex-shrink-0" />
                      <span className="font-medium text-foreground truncate max-w-[200px]">
                        {instanceName}
                      </span>
                      <span className="text-muted-foreground">准备就绪</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleStartInstall}
                  disabled={!canStartDownload || hasDownloading}
                  className={cn(
                    'rounded-xl px-6 h-10 text-sm font-medium transition-all duration-200',
                    'bg-brand hover:bg-brand-hover text-brand-foreground',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {hasDownloading ? (
                    <>
                      <Icon icon="ph:spinner-bold" className="w-4 h-4 mr-2 animate-spin" />
                      安装中...
                    </>
                  ) : (
                    <>
                      开始安装
                      <Icon icon="ph:arrow-right-bold" className="w-3.5 h-3.5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
