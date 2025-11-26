import React from 'react'
import { ConfigSidebarProps } from './types'

export const ConfigSidebar: React.FC<ConfigSidebarProps> = ({
  treeData,
  selectedGroupId,
  onSelectGroup,
}) => {
  return (
    <div className="w-56 lg:w-64 bg-white/50 dark:bg-gray-900/30 border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col backdrop-blur-sm shrink-0">
      <div className="p-4 h-full overflow-y-auto scrollbar-thin">
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-2">
          Categories
        </div>
        <div className="space-y-1">
          {treeData && treeData.length > 0 ? (
            treeData.map((group) => (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-between group ${
                  selectedGroupId === group.id 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className="truncate">{group.name}</span>
                {selectedGroupId === group.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                )}
              </button>
            ))
          ) : (
            <div className="text-sm text-gray-500 px-3 py-2">无配置分类</div>
          )}
        </div>
      </div>
    </div>
  )
}
