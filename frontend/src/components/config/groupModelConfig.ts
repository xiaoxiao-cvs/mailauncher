/**
 * Model 配置分组构建器
 */
import { TreeNode } from './types'
import { buildTreeData } from './utils'

export const groupModelConfig = (data: Record<string, any>): TreeNode[] => {
  const groups: TreeNode[] = []

  // 1. API提供商
  if (data.api_providers && Array.isArray(data.api_providers)) {
    const providerChildren: TreeNode[] = []
    
    data.api_providers.forEach((provider: any, index: number) => {
      const providerName = provider.name || `提供商 ${index + 1}`
      const providerPath = `api_providers[${index}]`
      const providerItems = buildTreeData(provider, providerPath)
      
      providerChildren.push({
        id: `provider-${index}`,
        name: `${providerName}`,
        children: providerItems,
      })
    })
    
    groups.push({
      id: 'group-providers',
      name: 'API提供商',
      children: providerChildren,
    })
  }

  // 2. 模型配置
  if (data.models && Array.isArray(data.models)) {
    const modelChildren: TreeNode[] = []
    
    data.models.forEach((model: any, index: number) => {
      const modelName = model.name || model.model_identifier || `模型 ${index + 1}`
      const modelPath = `models[${index}]`
      const modelItems = buildTreeData(model, modelPath)
      
      modelChildren.push({
        id: `model-${index}`,
        name: `${modelName}`,
        children: modelItems,
      })
    })
    
    groups.push({
      id: 'group-models',
      name: '模型配置',
      children: modelChildren,
    })
  }

  // 3. 任务配置
  if (data.model_task_config) {
    const taskConfigItems = buildTreeData({ model_task_config: data.model_task_config }, '')[0]?.children || []
    
    if (taskConfigItems.length > 0) {
      groups.push({
        id: 'group-tasks',
        name: '任务配置',
        children: taskConfigItems,
      })
    }
  }

  // 4. 其他配置
  const otherData: Record<string, any> = {}
  const groupedKeys = new Set(['api_providers', 'models', 'model_task_config', 'inner'])
  
  Object.keys(data).forEach(key => {
    if (!groupedKeys.has(key)) {
      otherData[key] = data[key]
    }
  })
  
  if (Object.keys(otherData).length > 0) {
    groups.push({
      id: 'group-other',
      name: '其他配置',
      children: buildTreeData(otherData, ''),
    })
  }

  return groups
}
