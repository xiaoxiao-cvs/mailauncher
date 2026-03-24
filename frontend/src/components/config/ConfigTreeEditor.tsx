import React from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfigSidebar } from './ConfigSidebar'
import { ConfigItemsRenderer } from './ConfigItemsRenderer'
import { NapCatAccounts } from './NapCatAccounts'
import { TreeNode, ConfigType } from './types'
import { ConfigWithComments } from '@/services/configApi'

export interface ConfigTreeEditorProps {
  editMode: 'tree' | 'text'
  isCompact: boolean
  treeData: TreeNode[]
  selectedGroupId: string | null
  selectedGroup: TreeNode | null
  activeConfig: ConfigType
  selectedPath: string | null
  editValue: any
  hasChanges: boolean
  saving: boolean
  botConfig: ConfigWithComments | null
  modelConfig: ConfigWithComments | null
  adapterConfig: ConfigWithComments | null
  addingTagPath: string | null
  newTagValue: string
  napCatAccounts: Array<{ account: string; nickname: string }>
  selectedQQAccount: string | null
  originalQQAccount: string | null
  loadingAccounts: boolean
  onSelectGroup: (groupId: string) => void
  onPathSelect: (path: string) => void
  onValueChange: (value: any) => void
  onSave: () => void
  onCancel: () => void
  onAddTag: (path: string) => void
  onNewTagValueChange: (value: string) => void
  onCancelAddTag: () => void
  onLoadNapCatAccounts: () => void
  onSelectQQAccount: (account: string) => void
  onResetQQAccount: () => void
  onSaveQQAccount: () => void
}

export const ConfigTreeEditor: React.FC<ConfigTreeEditorProps> = ({
  editMode,
  isCompact,
  treeData,
  selectedGroupId,
  selectedGroup,
  activeConfig,
  selectedPath,
  editValue,
  hasChanges,
  saving,
  botConfig,
  modelConfig,
  adapterConfig,
  addingTagPath,
  newTagValue,
  napCatAccounts,
  selectedQQAccount,
  originalQQAccount,
  loadingAccounts,
  onSelectGroup,
  onPathSelect,
  onValueChange,
  onSave,
  onCancel,
  onAddTag,
  onNewTagValueChange,
  onCancelAddTag,
  onLoadNapCatAccounts,
  onSelectQQAccount,
  onResetQQAccount,
  onSaveQQAccount,
}) => {
  const renderNapCatContent = (group: TreeNode) => {
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
            onLoadAccounts={onLoadNapCatAccounts}
            onSelectAccount={onSelectQQAccount}
          />
        </div>
      )
    }
    return null
  }

  return (
    <div
      className={`absolute inset-0 flex overflow-hidden transition-transform duration-500 ease-in-out ${
        editMode === 'tree' ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {!isCompact && (
        <ConfigSidebar
          treeData={treeData}
          selectedGroupId={selectedGroupId}
          onSelectGroup={onSelectGroup}
        />
      )}

      <div className="flex-1 overflow-hidden relative bg-gray-50/50 dark:bg-black/5 flex flex-col">
        {isCompact && (
          <div className="p-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm overflow-x-auto no-scrollbar">
            <div className="flex gap-2">
              {treeData.map((group) => (
                <button
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
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
                      onPathSelect={onPathSelect}
                      onValueChange={onValueChange}
                      onSave={onSave}
                      onCancel={onCancel}
                      onAddTag={onAddTag}
                      onNewTagValueChange={onNewTagValueChange}
                      onCancelAddTag={onCancelAddTag}
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
              onClick={onResetQQAccount}
              disabled={selectedQQAccount === originalQQAccount}
              className="rounded-lg"
            >
              重置
            </Button>
            <Button
              variant="default"
              onClick={onSaveQQAccount}
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
  )
}
