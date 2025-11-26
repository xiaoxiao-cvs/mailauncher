/**
 * Bot 配置分组构建器
 */
import { TreeNode } from './types'
import { buildTreeData } from './utils'

export const groupBotConfig = (data: Record<string, any>): TreeNode[] => {
  const groups: TreeNode[] = []

  // 1. 基础信息
  if (data.bot) {
    const botData = { ...data.bot }
    const platforms = botData.platforms
    delete botData.platforms
    
    const botChildren = buildTreeData(botData, 'bot')
    
    if (platforms !== undefined) {
      botChildren.push(...buildTreeData({ platforms }, 'bot'))
    }
    
    groups.push({
      id: 'group-basic',
      name: '基础信息',
      children: botChildren,
    })
  }

  // 2. 人格设定
  if (data.personality) {
    groups.push({
      id: 'group-personality',
      name: '人格设定',
      children: buildTreeData(data.personality, 'personality'),
    })
  }
  
  // 3. 表达学习
  if (data.expression) {
    groups.push({
      id: 'group-expression',
      name: '表达学习',
      children: buildTreeData(data.expression, 'expression'),
    })
  }

  // 4. 聊天设置
  if (data.chat) {
    groups.push({
      id: 'group-chat',
      name: '聊天设置',
      children: buildTreeData(data.chat, 'chat'),
    })
  }
  
  // 5. 关键词反应
  if (data.keyword_reaction) {
    groups.push({
      id: 'group-keyword',
      name: '关键词反应',
      children: buildTreeData(data.keyword_reaction, 'keyword_reaction'),
    })
  }

  // 6-20 其他配置分组...
  const configGroups = [
    { key: 'memory', id: 'group-memory', name: '记忆系统' },
    { key: 'tool', id: 'group-tool', name: '工具系统' },
    { key: 'mood', id: 'group-mood', name: '情绪系统' },
    { key: 'lpmm_knowledge', id: 'group-database', name: 'LPMM知识库' },
    { key: 'emoji', id: 'group-emoji', name: '表情包' },
    { key: 'voice', id: 'group-voice', name: '语音识别' },
    { key: 'message_receive', id: 'group-message-receive', name: '消息过滤' },
    { key: 'response_post_process', id: 'group-post-process', name: '回复后处理' },
    { key: 'chinese_typo', id: 'group-typo', name: '错别字生成' },
    { key: 'response_splitter', id: 'group-splitter', name: '回复分割' },
    { key: 'log', id: 'group-log', name: '日志配置' },
    { key: 'debug', id: 'group-debug', name: '调试选项' },
    { key: 'maim_message', id: 'group-maim', name: 'MAIM消息服务' },
    { key: 'telemetry', id: 'group-telemetry', name: '遥测统计' },
  ]

  configGroups.forEach(({ key, id, name }) => {
    if (data[key]) {
      groups.push({
        id,
        name,
        children: buildTreeData(data[key], key),
      })
    }
  })

  // 其他配置
  const otherData: Record<string, any> = {}
  const groupedKeys = new Set([
    'bot', 'personality', 'expression', 'chat', 'keyword_reaction',
    'memory', 'tool', 'mood', 'emoji', 'voice', 'lpmm_knowledge',
    'message_receive', 'response_post_process', 'chinese_typo', 'response_splitter',
    'log', 'debug', 'maim_message', 'telemetry', 'inner', 'relationship', 'experimental'
  ])
  
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
