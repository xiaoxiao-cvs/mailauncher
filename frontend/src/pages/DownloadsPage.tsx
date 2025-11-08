import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sidebar } from '@/components/sidebar'
import { InstallOverview } from '@/components/install/InstallOverview'
import { useDownload, useInstallOverview } from '@/hooks'
import { useInstallTask } from '@/contexts/InstallTaskContext'
import { useNotificationContext } from '@/contexts/NotificationContext'
import { cn } from '@/lib/utils'
import { TaskStatus } from '@/types/notification'
import { useEffect } from 'react'

/**
 * 下载页面
 * 职责：管理 Maibot、Napcat、适配器等组件的下载和安装
 */
export function DownloadsPage() {
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
  const maibotItem = downloadItems.find(item => item.type === 'maibot')
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

    console.log('[Install] 任务已提交,任务 ID:', taskId)
  }

  return (
    <div className="flex h-screen bg-[#f8f9fa] dark:bg-[#0a0a0a] transition-colors duration-500">
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区 - 固定高度，无滚动 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 根据是否显示概要卡片切换内容 */}
        {overviewState.visible ? (
          <InstallOverview state={overviewState} />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-3xl space-y-4">
            {/* 页面标题 - 紧凑 */}
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-[#03045e] dark:text-white">
                下载与安装
              </h1>
              <p className="text-sm text-[#023e8a]/70 dark:text-white/70">
                选择并安装 Maibot 及其依赖组件
              </p>
            </div>

            {/* Maibot 主组件卡片 */}
            <div className={cn(
              'p-5 rounded-xl border transition-all',
              'bg-white dark:bg-[#1a1a1a]',
              'border-[#023e8a]/10 dark:border-white/10',
              'shadow-sm'
            )}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0077b6] to-[#00b4d8] flex items-center justify-center text-white shadow-sm flex-shrink-0">
                  <Icon icon="ph:robot" className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-[#03045e] dark:text-white">
                      Maibot
                    </h3>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                      必需
                    </span>
                    {maibotItem?.status === 'completed' && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                        已完成
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#023e8a]/70 dark:text-white/70">
                    MAI 机器人核心框架
                  </p>
                </div>
              </div>

              {/* 实例名称输入框 */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-[#023e8a] dark:text-white">
                  实例名称
                </label>
                <input
                  type="text"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="例如：我的机器人"
                  disabled={hasDownloading}
                  className={cn(
                    'w-full px-3 py-2 text-sm rounded-lg border',
                    'bg-white dark:bg-[#2a2a2a]',
                    'text-[#023e8a] dark:text-white',
                    'placeholder:text-[#023e8a]/40 dark:placeholder:text-white/40',
                    'border-[#023e8a]/20 dark:border-white/20',
                    'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/30',
                    'transition-all',
                    'disabled:opacity-60 disabled:cursor-not-allowed'
                  )}
                />
              </div>

              {/* 版本选择下拉框 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#023e8a] dark:text-white">
                  选择版本
                </label>
                <Select
                  value={selectedMaibotVersion.value}
                  onValueChange={(value) => {
                    const version = maibotVersions.find(v => v.value === value)
                    if (version) setSelectedMaibotVersion(version)
                  }}
                  disabled={hasDownloading}
                >
                  <SelectTrigger className="w-full bg-white dark:bg-[#2a2a2a] border-[#023e8a]/20 dark:border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {maibotVersions.map((version) => (
                      <SelectItem key={version.value} value={version.value}>
                        <div className="flex items-center gap-2">
                          <Icon 
                            icon={
                              version.source === 'latest' 
                                ? 'ph:code' 
                                : version.source === 'tag' 
                                ? 'ph:tag' 
                                : 'ph:git-branch'
                            } 
                            className="w-4 h-4 text-[#0077b6] dark:text-[#00b4d8]"
                          />
                          <span>{version.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 依赖组件列表 */}
            <div className={cn(
              'p-5 rounded-xl border transition-all',
              'bg-white dark:bg-[#1a1a1a]',
              'border-[#023e8a]/10 dark:border-white/10'
            )}>
              <h2 className="text-base font-semibold text-[#03045e] dark:text-white mb-4">
                依赖组件
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Adapter */}
                {adapterItem && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-[#023e8a]/10 dark:border-white/10 hover:border-[#0077b6]/30 dark:hover:border-[#00b4d8]/30 transition-all">
                    <Checkbox
                      id="adapter"
                      checked={selectedItems.has(adapterItem.id)}
                      onCheckedChange={() => toggleItemSelection(adapterItem.id)}
                      disabled={hasDownloading || adapterItem.status === 'completed' || adapterItem.status === 'installed'}
                      className="mt-0.5"
                    />
                    <label htmlFor="adapter" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-[#03045e] dark:text-white">
                          {adapterItem.name}
                        </h3>
                        
                        {adapterItem.status === 'completed' && (
                          <Icon icon="ph:check-circle-fill" className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-[#023e8a]/70 dark:text-white/70">
                        {adapterItem.description}
                      </p>
                    </label>
                  </div>
                )}

                {/* Napcat */}
                {napcatItem && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-[#023e8a]/10 dark:border-white/10 hover:border-[#0077b6]/30 dark:hover:border-[#00b4d8]/30 transition-all">
                    <Checkbox
                      id="napcat"
                      checked={selectedItems.has(napcatItem.id)}
                      onCheckedChange={() => toggleItemSelection(napcatItem.id)}
                      disabled={hasDownloading || napcatItem.status === 'completed' || napcatItem.status === 'installed'}
                      className="mt-0.5"
                    />
                    <label htmlFor="napcat" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-[#03045e] dark:text-white">
                          {napcatItem.name}
                        </h3>
                        
                        {napcatItem.status === 'completed' && (
                          <Icon icon="ph:check-circle-fill" className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-[#023e8a]/70 dark:text-white/70">
                        {napcatItem.description}
                      </p>
                    </label>
                  </div>
                )}

                {/* Quick-algo (macOS 必需, Windows 禁用) */}
                {quickAlgoItem && (
                  <div 
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border transition-all',
                      isWindows 
                        ? 'border-[#023e8a]/5 dark:border-white/5 bg-gray-50 dark:bg-[#1a1a1a]/50 opacity-60'
                        : 'border-[#023e8a]/10 dark:border-white/10 hover:border-[#0077b6]/30 dark:hover:border-[#00b4d8]/30'
                    )}
                    title={isMacOS ? 'macOS 系统必需安装此组件' : isWindows ? 'Windows 平台有预编译包，无需编译' : ''}
                  >
                    <Checkbox
                      id="quick-algo"
                      checked={isMacOS ? true : selectedItems.has(quickAlgoItem.id)}
                      onCheckedChange={() => !isMacOS && toggleItemSelection(quickAlgoItem.id)}
                      disabled={isMacOS || isWindows || hasDownloading || quickAlgoItem.status === 'completed'}
                      className="mt-0.5"
                    />
                    <label htmlFor="quick-algo" className={cn('flex-1', !isWindows && 'cursor-pointer')}>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-[#03045e] dark:text-white">
                          {quickAlgoItem.name}
                        </h3>
                        {quickAlgoItem.status === 'completed' && (
                          <Icon icon="ph:check-circle-fill" className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-[#023e8a]/70 dark:text-white/70">
                        {quickAlgoItem.description}
                      </p>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* 部署路径 */}
            <div className={cn(
              'p-4 rounded-xl border transition-all',
              'bg-white dark:bg-[#1a1a1a]',
              'border-[#023e8a]/10 dark:border-white/10'
            )}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0077b6] to-[#00b4d8] flex items-center justify-center text-white shadow-sm flex-shrink-0">
                  <Icon icon="ph:folder-open" className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#03045e] dark:text-white">
                    部署路径
                  </h3>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={deploymentPath}
                    onChange={(e) => setDeploymentPath(e.target.value)}
                    placeholder="请选择部署路径..."
                    disabled={hasDownloading || isLoadingPath}
                    className={cn(
                      'w-full px-3 py-2 text-sm rounded-lg border',
                      'bg-white dark:bg-[#2a2a2a]',
                      'text-[#023e8a] dark:text-white',
                      'placeholder:text-[#023e8a]/40 dark:placeholder:text-white/40',
                      'border-[#023e8a]/20 dark:border-white/20',
                      'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/30',
                      'transition-all',
                      'disabled:opacity-60 disabled:cursor-not-allowed'
                    )}
                  />
                  {isLoadingPath && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Icon icon="ph:spinner" className="w-4 h-4 animate-spin text-[#023e8a] dark:text-white" />
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={selectDeploymentPath}
                  size="sm"
                  disabled={hasDownloading || isLoadingPath}
                  className="bg-gradient-to-r from-[#0077b6] to-[#00b4d8] hover:from-[#023e8a] hover:to-[#0077b6] text-white border-0 shadow-sm"
                >
                  <Icon icon="ph:folder-open" className="w-4 h-4 mr-1" />
                  选择
                </Button>
              </div>
            </div>

            {/* 底部操作栏 */}
            <div className="flex items-center justify-between gap-4 pt-2">
              {/* 左侧提示 */}
              <div className="flex-1 min-w-0">
                {!instanceName.trim() ? (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Icon icon="ph:warning" className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs">请先设置实例名称</span>
                  </div>
                ) : !deploymentPath ? (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Icon icon="ph:warning" className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs">请先设置部署路径</span>
                  </div>
                ) : selectedItems.size === 0 ? (
                  <div className="flex items-center gap-2 text-[#023e8a]/60 dark:text-white/60">
                    <Icon icon="ph:info" className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs">请选择要安装的组件</span>
                  </div>
                ) : (
                  <div className="text-xs text-[#023e8a]/60 dark:text-white/60">
                    实例：{instanceName} | 已选择 {selectedItems.size} 个组件
                  </div>
                )}
              </div>

              {/* 右侧安装按钮 */}
              <Button
                onClick={handleStartInstall}
                disabled={!canStartDownload || hasDownloading}
                size="lg"
                className={cn(
                  'bg-gradient-to-r from-[#0077b6] to-[#00b4d8]',
                  'hover:from-[#023e8a] hover:to-[#0077b6]',
                  'text-white border-0 shadow-md hover:shadow-lg',
                  'transition-all min-w-[140px]'
                )}
              >
                <Icon 
                  icon={hasDownloading ? 'ph:spinner' : 'ph:download-simple'} 
                  className={cn('w-5 h-5 mr-2', hasDownloading && 'animate-spin')} 
                />
                {hasDownloading ? '安装中...' : '开始安装'}
              </Button>
            </div>
          </div>
        </div>
        )}
      </main>
    </div>
  )
}
