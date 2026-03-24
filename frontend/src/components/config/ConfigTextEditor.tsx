import React from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TomlEditor } from '@/components/TomlEditor'

export interface ConfigTextEditorProps {
  rawText: string
  hasChanges: boolean
  saving: boolean
  editMode: 'tree' | 'text'
  onRawTextChange: (value: string) => void
  onResetChanges: () => void
  onSave: () => void
}

export const ConfigTextEditor: React.FC<ConfigTextEditorProps> = ({
  rawText,
  hasChanges,
  saving,
  editMode,
  onRawTextChange,
  onResetChanges,
  onSave,
}) => {
  return (
    <div
      className={`absolute inset-0 flex flex-col overflow-hidden transition-transform duration-500 ease-in-out ${
        editMode === 'text' ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex-1 overflow-hidden relative">
        <TomlEditor
          value={rawText}
          onChange={(value) => {
            onRawTextChange(value)
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
            onClick={onResetChanges}
            disabled={!hasChanges}
            className="rounded-lg"
          >
            重置更改
          </Button>
          <Button
            variant="default"
            onClick={onSave}
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
  )
}
