import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
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
import { useEffect, useRef } from 'react'
import { animate, utils } from 'animejs'

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
    <div className="flex h-screen bg-gradient-to-br from-[#F5F5F7] to-[#E5E5EA] dark:from-[#000000] dark:to-[#1C1C1E] transition-colors duration-500 font-sans selection:bg-[#0071e3] selection:text-white relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-400/10 dark:bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-400/10 dark:bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />

      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* 根据是否显示概要卡片切换内容 */}
        {overviewState.visible ? (
          <InstallOverview state={overviewState} />
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-hide z-10">
            <div className="max-w-6xl mx-auto p-6 md:p-10 lg:p-12 space-y-8 pb-32" ref={containerRef}>
              
              {/* 页面标题 */}
              <div className="text-center space-y-3 animate-item py-4">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                  下载与安装
                </h1>
                <p className="text-lg text-[#86868b] dark:text-[#86868b] max-w-2xl mx-auto font-medium">
                  构建您的专属 AI 助手，简单几步即可完成配置。
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* 左侧主要配置区 */}
                <div className="lg:col-span-7 space-y-6 animate-item">
                  
                  {/* Maibot 核心卡片 */}
                  <div className="group relative bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-sm hover:shadow-2xl border border-white/50 dark:border-gray-700/50 transition-all duration-500 ease-out hover:-translate-y-1">
                    {/* 装饰背景 */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-gray-400/20 to-gray-400/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-5 mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-white shadow-lg shadow-gray-500/20 flex-shrink-0 transform transition-transform group-hover:rotate-3">
                          <Icon icon="ph:robot-fill" className="w-9 h-9" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-2xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                              Maibot
                            </h3>
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#ff3b30]/10 text-[#ff3b30] dark:bg-[#ff453a]/20 dark:text-[#ff453a]">
                              核心组件
                            </span>
                            {maibotItem?.status === 'completed' && (
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#34c759]/10 text-[#34c759] dark:bg-[#30d158]/20 dark:text-[#30d158]">
                                已完成
                              </span>
                            )}
                          </div>
                          <p className="text-[#86868b] dark:text-[#98989d]">
                            MAI 机器人核心框架，提供基础运行环境
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* 实例名称 */}
                        <div className="space-y-3">
                          <label className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7] ml-1">
                            实例名称
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={instanceName}
                              onChange={(e) => setInstanceName(e.target.value)}
                              placeholder="给您的机器人起个名字..."
                              disabled={hasDownloading}
                              className={cn(
                                'w-full px-5 py-4 text-base rounded-2xl border-0',
                                'bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-sm',
                                'text-[#1d1d1f] dark:text-white',
                                'placeholder:text-[#86868b] dark:placeholder:text-[#636366]',
                                'focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/20',
                                'transition-all duration-200',
                                'disabled:opacity-60 disabled:cursor-not-allowed'
                              )}
                            />
                          </div>
                        </div>

                        {/* 版本选择 */}
                        <div className="space-y-3">
                          <label className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7] ml-1">
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
                            <SelectTrigger className="w-full h-14 px-5 rounded-2xl border-0 bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-sm text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/20 transition-all duration-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-0 bg-white/90 dark:bg-[#2c2c2e]/90 backdrop-blur-xl shadow-xl">
                              {maibotVersions.map((version) => (
                                <SelectItem key={version.value} value={version.value} className="rounded-lg my-1 focus:bg-gray-100 dark:focus:bg-gray-700 cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <Icon 
                                      icon={
                                        version.source === 'latest' 
                                          ? 'ph:code-bold' 
                                          : version.source === 'tag' 
                                          ? 'ph:tag-bold' 
                                          : 'ph:git-branch-bold'
                                      } 
                                      className="w-4 h-4 opacity-70"
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
                  </div>

                  {/* 部署路径卡片 */}
                  <div className="group relative bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-sm hover:shadow-2xl border border-white/50 dark:border-gray-700/50 transition-all duration-500 ease-out hover:-translate-y-1">
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-900 dark:text-white">
                          <Icon icon="ph:folder-open-fill" className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                          部署位置
                        </h3>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1 relative group/input">
                          <input
                            type="text"
                            value={deploymentPath}
                            onChange={(e) => setDeploymentPath(e.target.value)}
                            placeholder="选择安装目录..."
                            disabled={hasDownloading || isLoadingPath}
                            className={cn(
                              'w-full px-5 py-4 text-base rounded-2xl border-0',
                              'bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-sm',
                              'text-[#1d1d1f] dark:text-white',
                              'placeholder:text-[#86868b] dark:placeholder:text-[#636366]',
                              'focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/20',
                              'transition-all duration-200',
                              'disabled:opacity-60 disabled:cursor-not-allowed'
                            )}
                          />
                          {isLoadingPath && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              <Icon icon="ph:spinner-bold" className="w-5 h-5 animate-spin text-gray-500" />
                            </div>
                          )}
                        </div>
                        
                        <Button
                          onClick={selectDeploymentPath}
                          disabled={hasDownloading || isLoadingPath}
                          className="h-auto px-6 rounded-2xl bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-0 shadow-lg shadow-gray-900/10 transition-all duration-200 active:scale-95"
                        >
                          <Icon icon="ph:folder-simple-bold" className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 右侧：依赖组件 */}
                <div className="lg:col-span-5 animate-item h-full">
                  <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-sm hover:shadow-2xl border border-white/50 dark:border-gray-700/50 h-full flex flex-col transition-all duration-500 ease-out hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        组件选择
                      </h2>
                      <span className="text-sm font-medium text-[#86868b] bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                        已选 {selectedItems.size}
                      </span>
                    </div>

                    <div className="space-y-4 flex-1">
                      {/* Adapter */}
                      {adapterItem && (
                        <div 
                          onClick={() => !hasDownloading && adapterItem.status !== 'completed' && toggleItemSelection(adapterItem.id)}
                          className={cn(
                            "group relative p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer",
                            selectedItems.has(adapterItem.id)
                              ? "bg-gray-100/80 border-gray-900/10 dark:bg-white/10 dark:border-white/20"
                              : "bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors mt-1",
                              selectedItems.has(adapterItem.id)
                                ? "bg-gray-900 border-gray-900 dark:bg-white dark:border-white"
                                : "border-gray-300 dark:border-gray-600 group-hover:border-gray-900 dark:group-hover:border-white"
                            )}>
                              {selectedItems.has(adapterItem.id) && <Icon icon="ph:check-bold" className="w-3.5 h-3.5 text-white dark:text-gray-900" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-[#1d1d1f] dark:text-white">
                                  {adapterItem.name}
                                </h3>
                                {adapterItem.status === 'completed' && (
                                  <Icon icon="ph:check-circle-fill" className="w-5 h-5 text-[#34c759]" />
                                )}
                              </div>
                              <p className="text-sm text-[#86868b] dark:text-[#98989d] leading-relaxed">
                                {adapterItem.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Napcat */}
                      {napcatItem && (
                        <div 
                          onClick={() => !hasDownloading && napcatItem.status !== 'completed' && toggleItemSelection(napcatItem.id)}
                          className={cn(
                            "group relative p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer",
                            selectedItems.has(napcatItem.id)
                              ? "bg-gray-100/80 border-gray-900/10 dark:bg-white/10 dark:border-white/20"
                              : "bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors mt-1",
                              selectedItems.has(napcatItem.id)
                                ? "bg-gray-900 border-gray-900 dark:bg-white dark:border-white"
                                : "border-gray-300 dark:border-gray-600 group-hover:border-gray-900 dark:group-hover:border-white"
                            )}>
                              {selectedItems.has(napcatItem.id) && <Icon icon="ph:check-bold" className="w-3.5 h-3.5 text-white dark:text-gray-900" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-[#1d1d1f] dark:text-white">
                                  {napcatItem.name}
                                </h3>
                                {napcatItem.status === 'completed' && (
                                  <Icon icon="ph:check-circle-fill" className="w-5 h-5 text-[#34c759]" />
                                )}
                              </div>
                              <p className="text-sm text-[#86868b] dark:text-[#98989d] leading-relaxed">
                                {napcatItem.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Quick-algo */}
                      {quickAlgoItem && (
                        <div 
                          onClick={() => !isMacOS && !isWindows && !hasDownloading && quickAlgoItem.status !== 'completed' && toggleItemSelection(quickAlgoItem.id)}
                          className={cn(
                            "group relative p-4 rounded-2xl border-2 transition-all duration-200",
                            isWindows ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50" : "cursor-pointer",
                            !isWindows && (isMacOS || selectedItems.has(quickAlgoItem.id))
                              ? "bg-gray-100/80 border-gray-900/10 dark:bg-white/10 dark:border-white/20"
                              : !isWindows && "bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors mt-1",
                              (isMacOS || selectedItems.has(quickAlgoItem.id))
                                ? "bg-gray-900 border-gray-900 dark:bg-white dark:border-white"
                                : "border-gray-300 dark:border-gray-600 group-hover:border-gray-900 dark:group-hover:border-white"
                            )}>
                              {(isMacOS || selectedItems.has(quickAlgoItem.id)) && <Icon icon="ph:check-bold" className="w-3.5 h-3.5 text-white dark:text-gray-900" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-[#1d1d1f] dark:text-white">
                                  {quickAlgoItem.name}
                                </h3>
                                {quickAlgoItem.status === 'completed' && (
                                  <Icon icon="ph:check-circle-fill" className="w-5 h-5 text-[#34c759]" />
                                )}
                              </div>
                              <p className="text-sm text-[#86868b] dark:text-[#98989d] leading-relaxed">
                                {quickAlgoItem.description}
                              </p>
                              {isMacOS && (
                                <span className="inline-block mt-2 text-xs font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded">
                                  macOS 必需
                                </span>
                              )}
                              {isWindows && (
                                <span className="inline-block mt-2 text-xs font-medium text-[#86868b]">
                                  Windows 无需编译
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 底部悬浮操作栏 */}
            <div className="fixed bottom-8 left-0 right-0 z-50 px-6 animate-item flex justify-center pointer-events-none">
              <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-full shadow-[0_8px_40px_rgba(0,0,0,0.16)] border border-white/20 dark:border-white/10 p-2 pl-8 flex items-center gap-6 pointer-events-auto w-auto transition-all hover:scale-[1.02]">
                <div className="min-w-0">
                  {!instanceName.trim() ? (
                    <div className="flex items-center gap-2 text-[#ff9f0a]">
                      <Icon icon="ph:warning-circle-fill" className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">请设置实例名称</span>
                    </div>
                  ) : !deploymentPath ? (
                    <div className="flex items-center gap-2 text-[#ff9f0a]">
                      <Icon icon="ph:warning-circle-fill" className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">请选择部署路径</span>
                    </div>
                  ) : selectedItems.size === 0 ? (
                    <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                      <Icon icon="ph:info-fill" className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">请选择组件</span>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-xs text-[#86868b] uppercase tracking-wider font-semibold">准备就绪</span>
                      <span className="text-sm font-medium text-[#1d1d1f] dark:text-white truncate max-w-[200px]">
                        将安装到: {instanceName}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleStartInstall}
                  disabled={!canStartDownload || hasDownloading}
                  className={cn(
                    'rounded-full px-8 py-6 text-base font-semibold shadow-lg transition-all duration-300',
                    'bg-gray-900 hover:bg-black text-white border-0',
                    'dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    hasDownloading ? 'pl-6 pr-8' : ''
                  )}
                >
                  {hasDownloading ? (
                    <>
                      <Icon icon="ph:spinner-bold" className="w-5 h-5 mr-2 animate-spin" />
                      安装中...
                    </>
                  ) : (
                    <>
                      开始安装
                      <Icon icon="ph:arrow-right-bold" className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
