/**
 * 配置树构建工具函数
 */
import { TreeNode } from './types'
import { getConfigLabel } from './constants'

export const buildTreeData = (data: Record<string, any>, parentPath = ''): TreeNode[] => {
  return Object.entries(data).map(([key, value]) => {
    const path = parentPath ? `${parentPath}.${key}` : key
    const displayName = getConfigLabel(key, path)
    const isObject = value && typeof value === 'object' && !Array.isArray(value)
    const isArray = Array.isArray(value)

    if (isArray) {
      const isStringArray = value.every((v: any) => typeof v === 'string')
      if (isStringArray) {
        return {
          id: path,
          name: displayName,
          isLeaf: true,
          data: { path, value },
        }
      }
      
      const children = value.map((item, index) => {
        const itemPath = `${path}[${index}]`
        if (typeof item === 'object' && item !== null) {
          return {
            id: itemPath,
            name: `项目 ${index + 1}`,
            children: buildTreeData(item, itemPath),
          }
        }
        return {
          id: itemPath,
          name: `项目 ${index + 1}: ${String(item).substring(0, 30)}${String(item).length > 30 ? '...' : ''}`,
          isLeaf: true,
          data: { path: itemPath, value: item },
        }
      })
      
      return {
        id: path,
        name: `${displayName} (${value.length}项)`,
        children,
      }
    }

    if (isObject) {
      return {
        id: path,
        name: displayName,
        children: buildTreeData(value, path),
      }
    }

    return {
      id: path,
      name: displayName,
      isLeaf: true,
      data: { path, value },
    }
  })
}

export const buildNapCatGroups = (): TreeNode[] => {
  return [
    {
      id: 'napcat-accounts',
      name: '账号管理',
      isLeaf: true,
      data: { type: 'accounts' },
    },
  ]
}
