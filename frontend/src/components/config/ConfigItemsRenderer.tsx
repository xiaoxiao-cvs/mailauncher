/**
 * 配置渲染组件
 */
import React from 'react'
import { TreeNode } from './types'
import { ConfigItemEditor } from './ConfigItemEditor'

interface ConfigItemsRendererProps {
  nodes: TreeNode[] | undefined
  level?: number
  selectedPath: string | null
  editValue: any
  hasChanges: boolean
  saving: boolean
  activeConfig: any
  botConfig: any
  modelConfig: any
  adapterConfig: any
  addingTagPath: string | null
  newTagValue: string
  onPathSelect: (path: string) => void
  onValueChange: (value: any) => void
  onSave: () => void
  onCancel: () => void
  onAddTag: (path: string) => void
  onNewTagValueChange: (value: string) => void
  onCancelAddTag: () => void
}

export const ConfigItemsRenderer: React.FC<ConfigItemsRendererProps> = ({
  nodes,
  level = 0,
  ...editorProps
}) => {
  if (!nodes) return null
  
  return (
    <>
      {nodes.map((node) => {
        if (node.isLeaf && node.data) {
          return (
            <ConfigItemEditor
              key={node.id}
              node={node}
              level={level}
              {...editorProps}
            />
          )
        } else {
          return (
            <details key={node.id} open className="mb-4">
              <summary className={`cursor-pointer font-semibold text-lg mb-3 ${level === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {node.name}
              </summary>
              <div className={`${level === 0 ? 'ml-0' : 'ml-4'} space-y-4`}>
                <ConfigItemsRenderer
                  nodes={node.children}
                  level={level + 1}
                  {...editorProps}
                />
              </div>
            </details>
          )
        }
      })}
    </>
  )
}
