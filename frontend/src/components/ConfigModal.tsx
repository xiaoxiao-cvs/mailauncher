/**
 * MAIBot 配置模态框 - 重构版
 */
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { TomlEditor } from '@/components/TomlEditor'
import {
  getBotConfig,
  getModelConfig,
  updateBotConfig,
  updateModelConfig,
  getBotConfigRaw,
  getModelConfigRaw,
  saveBotConfigRaw,
  saveModelConfigRaw,
  getAdapterConfig,
  updateAdapterConfig,
  getAdapterConfigRaw,
  saveAdapterConfigRaw,
  ConfigWithComments,
  ConfigUpdateRequest,
} from '@/services/configApi'
import { instanceApi } from '@/services/instanceApi'
import {
  ConfigModalProps,
  ConfigType,
  ConfigHeader,
  ConfigSidebar,
  NapCatAccounts,
  ConfigItemsRenderer,
  groupBotConfig,
  groupModelConfig,
  buildTreeData,
  buildNapCatGroups,
} from '@/components/config'

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  defaultActive,
}) => {
  // 基础状态
  const [activeConfig, setActiveConfig] = useState<ConfigType>('bot')
  const [botConfig, setBotConfig] = useState<ConfigWithComments | null>(null)
  const [modelConfig, setModelConfig] = useState<ConfigWithComments | null>(null)
  const [adapterConfig, setAdapterConfig] = useState<ConfigWithComments | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // 编辑状态
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [addingTagPath, setAddingTagPath] = useState<string | null>(null)
  const [newTagValue, setNewTagValue] = useState<string>('')
  
  // 编辑模式
  const [editMode, setEditMode] = useState<'tree' | 'text'>('tree')
  const [rawText, setRawText] = useState<string>('')
  const [originalRawText, setOriginalRawText] = useState<string>('')
  
  // NapCat 状态
  const [napCatAccounts, setNapCatAccounts] = useState<Array<{account: string; nickname: string}>>([])
  const [selectedQQAccount, setSelectedQQAccount] = useState<string | null>(null)
  const [originalQQAccount, setOriginalQQAccount] = useState<string | null>(null)
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  
  // 布局状态
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number>(1200)
  const isCompact = containerWidth < 800
  const isMobile = containerWidth < 600

  // 监听容器大小变化
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [isOpen])

  // 加载配置
  const loadConfigs = async () => {
    setLoading(true)
    try {
      const [botRaw, modelRaw, adapterRaw] = await Promise.all([
        getBotConfigRaw(instanceId).catch(() => ''),
        getModelConfigRaw(instanceId).catch(() => ''),
        getAdapterConfigRaw(instanceId).catch(() => ''),
      ])
      
      const [bot, model, adapter] = await Promise.all([
        getBotConfig(instanceId).catch((err) => {
          toast.error(`Bot配置解析失败: ${err.message}`)
          return null
        }),
        getModelConfig(instanceId).catch((err) => {
          toast.error(`Model配置解析失败: ${err.message}`)
          return null
        }),
        getAdapterConfig(instanceId).catch((err) => {
          toast.error(`Adapter配置解析失败: ${err.message}`)
          return null
        }),
      ])
      
      setBotConfig(bot)
      setModelConfig(model)
      setAdapterConfig(adapter)
      
      if (activeConfig === 'bot') {
        setRawText(botRaw)
        setOriginalRawText(botRaw)
      } else if (activeConfig === 'model') {
        setRawText(modelRaw)
        setOriginalRawText(modelRaw)
      } else {
        setRawText(adapterRaw)
        setOriginalRawText(adapterRaw)
      }
      
      if (!bot || !model || !adapter) {
        setEditMode('text')
      }
    } catch (error) {
      console.error('加载配置失败:', error)
      toast.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }
  
  // 加载 NapCat 账号
  const loadNapCatAccounts = async () => {
    if (!instanceId) return
    setLoadingAccounts(true)
    try {
      const [accountsResponse, instanceData] = await Promise.all([
        instanceApi.getNapCatAccounts(instanceId),
        instanceApi.getInstance(instanceId)
      ])
      
      if (accountsResponse.success) {
        setNapCatAccounts(accountsResponse.accounts)
        const currentAccount = (instanceData as any).qq_account || null
        setSelectedQQAccount(currentAccount)
        setOriginalQQAccount(currentAccount)
        toast.success(accountsResponse.message || `找到 ${accountsResponse.accounts.length} 个已登录账号`)
      } else {
        toast.error(accountsResponse.message || '获取账号列表失败')
      }
    } catch (error) {
      console.error('获取NapCat账号失败:', error)
      toast.error('获取账号列表失败')
    } finally {
      setLoadingAccounts(false)
    }
  }

  // 切换配置类型时的处理
  useEffect(() => {
    setSelectedPath(null)
    setEditValue(null)
    setHasChanges(false)
    
    if (activeConfig === 'bot' && botConfig) {
      getBotConfigRaw(instanceId).then(text => {
        setRawText(text)
        setOriginalRawText(text)
      })
    } else if (activeConfig === 'model' && modelConfig) {
      getModelConfigRaw(instanceId).then(text => {
        setRawText(text)
        setOriginalRawText(text)
      })
    } else if (activeConfig === 'adapter' && adapterConfig) {
      getAdapterConfigRaw(instanceId).then(text => {
        setRawText(text)
        setOriginalRawText(text)
      })
    } else if (activeConfig === 'napcat') {
      loadNapCatAccounts()
    }
  }, [activeConfig, botConfig, modelConfig, adapterConfig, instanceId])

  // 初始化
  useEffect(() => {
    if (isOpen) {
      loadConfigs()
      setActiveConfig(defaultActive || 'bot')
      setHasChanges(false)
    }
  }, [isOpen, instanceId, defaultActive])

  // 构建树形数据
  const treeData = useMemo(() => {
    if (activeConfig === 'bot' && botConfig) {
      return groupBotConfig(botConfig.data || {})
    } else if (activeConfig === 'model' && modelConfig) {
      return groupModelConfig(modelConfig.data || {})
    } else if (activeConfig === 'adapter' && adapterConfig) {
      return buildTreeData(adapterConfig.data || {}, '')
    } else if (activeConfig === 'napcat') {
      return buildNapCatGroups()
    }
    return []
  }, [botConfig, modelConfig, adapterConfig, activeConfig])

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  useEffect(() => {
    if (treeData && treeData.length > 0) {
      setSelectedGroupId(treeData[0].id)
    } else {
      setSelectedGroupId(null)
    }
  }, [treeData])

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null
    return treeData.find((g) => g.id === selectedGroupId) || null
  }, [selectedGroupId, treeData])

  // 渲染 NapCat 内容
  const renderNapCatContent = (group: any) => {
    if (group.id === 'napcat-accounts') {
      return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              {group.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              配置 NapCat 使用的 QQ 账号
            </p>
          </div>
          <NapCatAccounts
            napCatAccounts={napCatAccounts}
            selectedQQAccount={selectedQQAccount}
            originalQQAccount={originalQQAccount}
            loadingAccounts={loadingAccounts}
            onLoadAccounts={loadNapCatAccounts}
            onSelectAccount={(account) => {
              setSelectedQQAccount(account)
              setHasChanges(account !== originalQQAccount)
            }}
          />
        </div>
      )
    }
    return null
  }

  // 保存更改
  const handleSave = async () => {
    setSaving(true)
    try {
      if (editMode === 'text') {
        if (activeConfig === 'bot') {
          await saveBotConfigRaw(rawText, instanceId)
          const [bot, botRaw] = await Promise.all([
            getBotConfig(instanceId),
            getBotConfigRaw(instanceId),
          ])
          setBotConfig(bot)
          setRawText(botRaw)
          setOriginalRawText(botRaw)
        } else if (activeConfig === 'model') {
          await saveModelConfigRaw(rawText, instanceId)
          const [model, modelRaw] = await Promise.all([
            getModelConfig(instanceId),
            getModelConfigRaw(instanceId),
          ])
          setModelConfig(model)
          setRawText(modelRaw)
          setOriginalRawText(modelRaw)
        } else {
          await saveAdapterConfigRaw(rawText, instanceId)
          const [adapter, adapterRaw] = await Promise.all([
            getAdapterConfig(instanceId),
            getAdapterConfigRaw(instanceId),
          ])
          setAdapterConfig(adapter)
          setRawText(adapterRaw)
          setOriginalRawText(adapterRaw)
        }
      } else {
        if (!selectedPath) return
        const request: ConfigUpdateRequest = {
          key_path: selectedPath,
          value: editValue,
        }
        if (activeConfig === 'bot') {
          const updated = await updateBotConfig(request, instanceId)
          setBotConfig(updated)
        } else if (activeConfig === 'model') {
          const updated = await updateModelConfig(request, instanceId)
          setModelConfig(updated)
        } else {
          const updated = await updateAdapterConfig(request, instanceId)
          setAdapterConfig(updated)
        }
      }

      setHasChanges(false)
      toast.success('保存成功')
    } catch (error) {
      console.error('保存失败:', error)
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] animate-in fade-in duration-200">
      <div className="absolute inset-0 backdrop-blur-md transition-opacity" onClick={onClose} />

      <div className="absolute top-0 right-0 bottom-0 left-0 md:left-[272px] flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 pointer-events-none">
        <div 
          ref={containerRef}
          className="relative w-full max-w-7xl h-[90vh] md:h-[85vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-black/5 pointer-events-auto"
        >
          <ConfigHeader
            activeConfig={activeConfig}
            editMode={editMode}
            isCompact={isCompact}
            isMobile={isMobile}
            onConfigChange={(config) => setActiveConfig(config)}
            onEditModeChange={(mode) => {
              setEditMode(mode)
              setHasChanges(mode === 'text' ? rawText !== originalRawText : false)
            }}
            onClose={onClose}
          />

          <div className="flex-1 flex overflow-hidden bg-gray-50/30 dark:bg-black/20 relative">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">正在加载配置...</p>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden relative">
                {/* 文本编辑器模式 */}
                <div 
                  className={`absolute inset-0 flex flex-col overflow-hidden transition-transform duration-500 ease-in-out ${
                    editMode === 'text' ? 'translate-x-0' : 'translate-x-full'
                  }`}
                >
                  <div className="flex-1 overflow-hidden relative">
                    <TomlEditor
                      value={rawText}
                      onChange={(value) => {
                        setRawText(value)
                        setHasChanges(value !== originalRawText)
                      }}
                      className="w-full h-full"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono hidden sm:block">
                      {rawText.length} characters
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRawText(originalRawText)
                          setHasChanges(false)
                        }}
                        disabled={!hasChanges}
                        className="rounded-lg"
                      >
                        重置更改
                      </Button>
                      <Button
                        variant="default"
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 rounded-lg min-w-[100px]"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            保存中
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            保存
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 可视化编辑模式 */}
                <div 
                  className={`absolute inset-0 flex overflow-hidden transition-transform duration-500 ease-in-out ${
                    editMode === 'tree' ? 'translate-x-0' : '-translate-x-full'
                  }`}
                >
                  {!isCompact && (
                    <ConfigSidebar
                      treeData={treeData}
                      selectedGroupId={selectedGroupId}
                      onSelectGroup={(groupId) => {
                        setSelectedGroupId(groupId)
                        setSelectedPath(null)
                        setEditValue(null)
                        setHasChanges(false)
                      }}
                    />
                  )}

                <div className="flex-1 overflow-hidden relative bg-gray-50/50 dark:bg-black/5 flex flex-col">
                  {isCompact && (
                    <div className="p-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm overflow-x-auto no-scrollbar">
                      <div className="flex gap-2">
                        {treeData.map((group) => (
                          <button
                            key={group.id}
                            onClick={() => {
                              setSelectedGroupId(group.id)
                              setSelectedPath(null)
                              setEditValue(null)
                              setHasChanges(false)
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                              selectedGroupId === group.id
                                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            {group.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto scrollbar-thin">
                    <div className={`p-4 md:p-6 lg:p-8 max-w-4xl mx-auto pb-20 ${isCompact ? 'px-4' : ''} animate-in fade-in slide-in-from-right-4 duration-300`}>
                      {selectedGroup ? (
                        activeConfig === 'napcat' ? (
                          renderNapCatContent(selectedGroup)
                        ) : (
                          <div>
                            <div className="mb-6">
                              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                                {selectedGroup.name}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                配置 {selectedGroup.name} 的相关参数
                              </p>
                            </div>
                            <div className="space-y-6">
                              <ConfigItemsRenderer
                                nodes={selectedGroup.children}
                                selectedPath={selectedPath}
                                editValue={editValue}
                                hasChanges={hasChanges}
                                saving={saving}
                                activeConfig={activeConfig}
                                botConfig={botConfig}
                                modelConfig={modelConfig}
                                adapterConfig={adapterConfig}
                                addingTagPath={addingTagPath}
                                newTagValue={newTagValue}
                                onPathSelect={(path) => {
                                  setSelectedPath(path)
                                  setHasChanges(true)
                                }}
                                onValueChange={setEditValue}
                                onSave={handleSave}
                                onCancel={() => {
                                  setEditValue(null)
                                  setSelectedPath(null)
                                  setHasChanges(false)
                                }}
                                onAddTag={setAddingTagPath}
                                onNewTagValueChange={setNewTagValue}
                                onCancelAddTag={() => setAddingTagPath(null)}
                              />
                            </div>
                          </div>
                        )
                      ) : null}
                    </div>
                  </div>
                </div>
                
                {activeConfig === 'napcat' && (
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-end px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedQQAccount(originalQQAccount)
                          setHasChanges(false)
                        }}
                        disabled={selectedQQAccount === originalQQAccount}
                        className="rounded-lg"
                      >
                        重置
                      </Button>
                      <Button
                        variant="default"
                        onClick={async () => {
                          setSaving(true)
                          try {
                            await instanceApi.updateInstance(instanceId!, { qq_account: selectedQQAccount } as any)
                            setOriginalQQAccount(selectedQQAccount)
                            toast.success('保存成功')
                            setHasChanges(false)
                          } catch (error) {
                            console.error('保存失败:', error)
                            toast.error('保存失败')
                          } finally {
                            setSaving(false)
                          }
                        }}
                        disabled={selectedQQAccount === originalQQAccount || saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 rounded-lg min-w-[100px]"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            保存中
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            保存
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
