/**
 * 配置树视图组件
 * 用于显示和选择配置项的树形结构
 */
import React, { useState, useMemo, useEffect } from 'react'
import {
  hotkeysCoreFeature,
  searchFeature,
  selectionFeature,
  syncDataLoaderFeature,
  TreeState,
  expandAllFeature,
} from '@headless-tree/core'
import { useTree } from '@headless-tree/react'
import { FolderIcon, FolderOpenIcon, SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tree, TreeItem, TreeItemLabel } from '@/components/tree'

export interface TreeNode {
  id: string
  name: string
  children?: TreeNode[]
  isLeaf?: boolean
  data?: any
}

interface ConfigTreeViewProps {
  data: TreeNode[]
  onSelect?: (node: TreeNode | null) => void
  selectedId?: string | null
}

const ConfigTreeView: React.FC<ConfigTreeViewProps> = ({
  data,
  onSelect,
  selectedId,
}) => {
  // 将树节点转换为Record格式，并添加到root
  const itemsRecord = useMemo(() => {
    const record: Record<string, TreeNode> = {}
    const rootId = 'root'

    const processNode = (node: TreeNode) => {
      record[node.id] = node
      if (node.children) {
        node.children.forEach(processNode)
      }
    }

    // 处理所有数据节点
    data.forEach(processNode)
    
    // 创建根节点
    const root: TreeNode = {
      id: rootId,
      name: 'Configuration',
      children: data,
    }
    
    // 也将根节点添加到record中
    record[rootId] = root

    return record
  }, [data])
  
  const initialExpandedItems = useMemo(() => data.map((node) => node.id), [data])
  
  const [state, setState] = useState<Partial<TreeState<TreeNode>>>({})
  
  // 当数据改变时，清理不存在的展开项，并添加新的顶层项
  useEffect(() => {
    setState(prevState => {
      const currentExpanded = prevState.expandedItems || []
      // 过滤出仍然存在的项
      const validExpanded = currentExpanded.filter(id => itemsRecord[id] !== undefined)
      // 合并新的顶层项
      const newExpanded = [...new Set([...validExpanded, ...initialExpandedItems])]
      
      return {
        ...prevState,
        expandedItems: newExpanded,
      }
    })
  }, [itemsRecord, initialExpandedItems])

  const rootId = 'root'

  const tree = useTree<TreeNode>({
    state,
    setState,
    initialState: {
      expandedItems: initialExpandedItems,
    },
    indent: 20,
    rootItemId: rootId,
    getItemName: (item) => {
      const data = item.getItemData()
      return data?.name ?? 'Unknown'
    },
    isItemFolder: (item) => {
      const data = item.getItemData()
      if (!data) return false
      return !!data.children && data.children.length > 0
    },
    dataLoader: {
      getItem: (itemId) => {
        const node = itemsRecord[itemId]
        if (!node) {
          // 静默处理不存在的节点，返回一个虚拟节点
          // 这通常发生在数据切换的瞬间
          return { id: itemId, name: '', isLeaf: true }
        }
        return node
      },
      getChildren: (itemId) => {
        const node = itemsRecord[itemId]
        if (!node) return []
        return node.children?.map((child) => child.id) ?? []
      },
    },
    onPrimaryAction: (itemInstance) => {
      const node = itemInstance.getItemData()
      if (node?.isLeaf && onSelect) {
        onSelect(node)
      }
    },
    features: [
      syncDataLoaderFeature,
      hotkeysCoreFeature,
      selectionFeature,
      searchFeature,
      expandAllFeature,
    ],
  })

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* 搜索框 */}
      <div className="relative">
        <Input
          className="peer ps-9"
          {...(() => {
            const { ref, ...restProps } = tree.getSearchInputElementProps()
            return {
              ...restProps,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                const originalProps = tree.getSearchInputElementProps()
                if (originalProps.onChange) {
                  originalProps.onChange(e as any)
                }

                const value = e.target.value
                if (value.length > 0) {
                  tree.expandAll()
                } else {
                  setState((prevState) => ({
                    ...prevState,
                    expandedItems: initialExpandedItems,
                  }))
                }
              },
            }
          })()}
          type="search"
          placeholder="搜索配置..."
        />
        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
          <SearchIcon className="size-4" aria-hidden="true" />
        </div>
      </div>

      {/* 树形视图 */}
      <Tree indent={20} tree={tree}>
        {tree.getItems().map((item) => {
          const isSelected = selectedId === item.getId()
          
          return (
            <TreeItem 
              key={item.getId()} 
              item={item}
              className={`
                rounded-md hover:bg-gray-100 dark:hover:bg-gray-700
                ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
              `}
            >
              <TreeItemLabel>
                <span className="flex items-center gap-2">
                  {item.isFolder() &&
                    (item.isExpanded() ? (
                      <FolderOpenIcon className="pointer-events-none size-4 text-blue-500" />
                    ) : (
                      <FolderIcon className="pointer-events-none size-4 text-blue-500" />
                    ))}
                  {item.getItemName()}
                </span>
              </TreeItemLabel>
            </TreeItem>
          )
        })}
      </Tree>
    </div>
  )
}

export default ConfigTreeView
