import React from 'react'
import { X, Settings, FileCode, FileJson } from 'lucide-react'
import { ConfigHeaderProps } from './types'

export const ConfigHeader: React.FC<ConfigHeaderProps> = ({
  activeConfig,
  editMode,
  isCompact,
  isMobile,
  onConfigChange,
  onEditModeChange,
  onClose,
}) => {
  return (
    <div className="flex items-center justify-between px-4 md:px-6 h-16 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shrink-0 select-none">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white shrink-0">
            <Settings className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight truncate">
              配置管理
            </h2>
            {!isMobile && (
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium hidden sm:block">
                {activeConfig === 'bot' ? 'Bot Configuration' : activeConfig === 'model' ? 'Model Configuration' : activeConfig === 'adapter' ? 'Adapter Configuration' : 'NapCat Configuration'}
              </p>
            )}
          </div>
        </div>

        {/* Config Type Switcher */}
        {!isCompact ? (
          <div className="flex bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
            {(['bot', 'model', 'adapter', 'napcat'] as const).map((type) => (
              <button
                key={type}
                onClick={() => onConfigChange(type)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeConfig === type
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {type === 'bot' ? 'Bot' : type === 'model' ? 'Model' : type === 'adapter' ? 'Adapter' : 'NapCat'}
              </button>
            ))}
          </div>
        ) : (
          <div>
            <select 
              value={activeConfig}
              onChange={(e) => onConfigChange(e.target.value as any)}
              className="bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
            >
              <option value="bot">Bot Config</option>
              <option value="model">Model Config</option>
              <option value="adapter">Adapter Config</option>
              <option value="napcat">NapCat</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Edit Mode Switcher - 只在非 NapCat 配置时显示 */}
        {activeConfig !== 'napcat' && (
          <div className="flex bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
            <button
              onClick={() => onEditModeChange('tree')}
              className={`flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                editMode === 'tree'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              title="可视化模式"
            >
              <FileJson className="w-4 h-4" />
              {!isMobile && <span className="hidden md:inline">可视化</span>}
            </button>
            <button
              onClick={() => onEditModeChange('text')}
              className={`flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                editMode === 'text'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              title="源文件模式"
            >
              <FileCode className="w-4 h-4" />
              {!isMobile && <span className="hidden md:inline">源文件</span>}
            </button>
          </div>
        )}

        {activeConfig !== 'napcat' && (
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 md:mx-2" />
        )}

        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="关闭"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
    </div>
  )
}
