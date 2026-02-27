import React from 'react'
import { Info, Save, Loader2, Plus, XIcon, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ConfigEditorProps } from './types'
import { getConfigHint } from './constants'

const getValueType = (value: any): string => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

export const ConfigItemEditor: React.FC<ConfigEditorProps> = ({
  node,
  level: _level,
  selectedPath,
  editValue,
  hasChanges,
  saving,
  activeConfig,
  botConfig,
  modelConfig,
  adapterConfig,
  addingTagPath,
  newTagValue,
  onPathSelect,
  onValueChange,
  onSave,
  onCancel,
  onAddTag,
  onNewTagValueChange,
  onCancelAddTag,
}) => {
  const path = node.data.path
  const value = node.data.value
  const valueType = getValueType(value)
  const currentConfig = activeConfig === 'bot' ? botConfig : activeConfig === 'model' ? modelConfig : adapterConfig
  const comment = currentConfig?.comments[path]
  const hint = path ? getConfigHint(path, currentConfig?.comments || {}) : ''

  return (
    <div key={node.id} className="group relative p-5 bg-white/60 dark:bg-gray-800/40 hover:bg-white/80 dark:hover:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm transition-all duration-200 space-y-3 backdrop-blur-sm">
      {/* 配置项标题 */}
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-1">
          <Label className="text-base font-medium text-gray-900 dark:text-gray-100 tracking-tight">
            {node.name}
          </Label>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono opacity-60 select-all">{path}</p>
        </div>
        {comment && hint && (
          <div className="relative group/info ml-2">
            <Info className="w-4 h-4 text-blue-500/70 dark:text-blue-400/70 cursor-help transition-colors hover:text-blue-600 dark:hover:text-blue-300" />
            <div className="pointer-events-none absolute z-20 right-0 mt-2 hidden group-hover/info:block text-xs rounded-lg px-4 py-3 max-w-[300px] whitespace-normal break-words bg-white/95 text-gray-700 border border-gray-100 shadow-xl dark:bg-gray-900/95 dark:text-gray-200 dark:border-gray-800 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
              {comment.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ')}
            </div>
          </div>
        )}
      </div>

      {/* 提示信息 */}
      {comment && hint && (
        <div className="px-3 py-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg text-sm text-blue-600/90 dark:text-blue-300/90 border border-blue-100/50 dark:border-blue-800/20">
          {hint}
        </div>
      )}

      {/* 值编辑器 */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">
            {valueType}
          </Label>
        </div>
        
        {valueType === 'string' && (
          value && value.length > 50 ? (
            <Textarea
              value={editValue && selectedPath === path ? editValue : value}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                onPathSelect(path)
                onValueChange(e.target.value)
              }}
              className="mt-1 min-h-[120px] font-mono text-sm bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-lg resize-y"
              placeholder="输入字符串值"
            />
          ) : (
            <Input
              type="text"
              value={editValue && selectedPath === path ? editValue : value || ''}
              onChange={(e) => {
                onPathSelect(path)
                onValueChange(e.target.value)
              }}
              className="mt-1 bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-lg h-10"
              placeholder="输入字符串值"
            />
          )
        )}

        {valueType === 'number' && (
          <Input
            type="number"
            value={editValue && selectedPath === path ? editValue : (value ?? '')}
            onChange={(e) => {
              onPathSelect(path)
              onValueChange(Number(e.target.value))
            }}
            className="mt-1 bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-lg h-10 font-mono"
            placeholder="输入数字"
          />
        )}

        {valueType === 'boolean' && (
          <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
            <Label className="cursor-pointer" onClick={() => {
              onPathSelect(path)
              onValueChange(!(editValue && selectedPath === path ? editValue : value))
            }}>
              {(editValue && selectedPath === path ? editValue : value) ? '已启用' : '已禁用'}
            </Label>
            <Switch
              checked={editValue && selectedPath === path ? editValue : value}
              onCheckedChange={(checked: boolean) => {
                onPathSelect(path)
                onValueChange(checked)
              }}
            />
          </div>
        )}

        {valueType === 'array' && (
          <>
            {Array.isArray(value) && value.every((v: any) => typeof v === 'string') ? (
              <div className="mt-2 p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex flex-wrap gap-2 items-center">
                  {(editValue && selectedPath === path ? editValue : value).map((item: string, idx: number) => (
                    <div
                      key={idx}
                      className="group/tag flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/30 rounded-lg text-sm transition-all hover:bg-blue-100 dark:hover:bg-blue-900/40"
                    >
                      <span>{item}</span>
                      <button
                        onClick={() => {
                          const currentArray = editValue && selectedPath === path ? editValue : value
                          const newArray = currentArray.filter((_: any, i: number) => i !== idx)
                          onPathSelect(path)
                          onValueChange(newArray)
                        }}
                        className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-md p-0.5 transition-all"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  
                  {addingTagPath === path ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-200">
                      <Input
                        autoFocus
                        value={newTagValue}
                        onChange={(e) => onNewTagValueChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTagValue.trim()) {
                            const currentArray = editValue && selectedPath === path ? editValue : value
                            const newArray = [...currentArray, newTagValue.trim()]
                            onPathSelect(path)
                            onValueChange(newArray)
                            onNewTagValueChange('')
                            onCancelAddTag()
                          } else if (e.key === 'Escape') {
                            onNewTagValueChange('')
                            onCancelAddTag()
                          }
                        }}
                        className="h-9 w-40 rounded-lg text-sm px-3 bg-white dark:bg-gray-800 border-blue-200 focus:ring-2 focus:ring-blue-500/20"
                        placeholder="输入内容..."
                      />
                      <button
                        onClick={() => {
                          if (newTagValue.trim()) {
                            const currentArray = editValue && selectedPath === path ? editValue : value
                            const newArray = [...currentArray, newTagValue.trim()]
                            onPathSelect(path)
                            onValueChange(newArray)
                            onNewTagValueChange('')
                            onCancelAddTag()
                          }
                        }}
                        className="flex items-center justify-center w-9 h-9 bg-green-500 hover:bg-green-600 rounded-lg text-white shadow-sm transition-all duration-200 shrink-0"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          onNewTagValueChange('')
                          onCancelAddTag()
                        }}
                        className="flex items-center justify-center w-9 h-9 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-500 dark:text-gray-400 transition-all duration-200 shrink-0"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        onAddTag(path)
                        onNewTagValueChange('')
                      }}
                      className="flex items-center justify-center w-9 h-9 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 transition-all duration-200 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <Textarea
                value={editValue && selectedPath === path ? JSON.stringify(editValue, null, 2) : JSON.stringify(value, null, 2)}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    onPathSelect(path)
                    onValueChange(parsed)
                  } catch {
                    // 保持原值
                  }
                }}
                className="mt-1 min-h-[200px] font-mono text-sm bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 rounded-lg"
                placeholder="JSON 数组格式"
              />
            )}
          </>
        )}

        {valueType === 'object' && (
          <Textarea
            value={editValue && selectedPath === path ? JSON.stringify(editValue, null, 2) : JSON.stringify(value, null, 2)}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              try {
                const parsed = JSON.parse(e.target.value)
                onPathSelect(path)
                onValueChange(parsed)
              } catch {
                // 保持原值
              }
            }}
            className="mt-1 min-h-[200px] font-mono text-sm bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 rounded-lg"
            placeholder="JSON 对象格式"
          />
        )}
      </div>

      {/* 单项保存按钮 */}
      {selectedPath === path && hasChanges && (
        <div className="flex gap-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Button
            onClick={onSave}
            disabled={saving}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                保存中
              </>
            ) : (
              <>
                <Save className="w-3 h-3 mr-1" />
                保存更改
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            取消
          </Button>
        </div>
      )}
    </div>
  )
}
