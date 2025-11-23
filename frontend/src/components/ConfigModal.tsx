/**
 * MAIBot 配置模态框
 * 用于可视化编辑 Bot Config 和 Model Config
 */
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { X, Save, Settings, Loader2, FileCode, FileJson, Info, Plus, XIcon, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
// 左侧树形改为分类按钮列表，移除原有树组件
import { TomlEditor } from '@/components/TomlEditor'
import {
  getBotConfig,
  getModelConfig,
  updateBotConfig,
  updateModelConfig,
  getBotConfigRaw,
  getModelConfigRaw,
  saveBotConfigRaw,
  saveModelConfigRaw,
  getAdapterConfig,
  updateAdapterConfig,
  getAdapterConfigRaw,
  saveAdapterConfigRaw,
  ConfigWithComments,
  ConfigUpdateRequest,
} from '@/services/configApi'

interface ConfigModalProps {
  isOpen: boolean
  onClose: () => void
  instanceId?: string
  defaultActive?: 'bot' | 'model' | 'adapter'
}

type ConfigType = 'bot' | 'model' | 'adapter'

interface TreeNode {
  id: string
  name: string
  children?: TreeNode[]
  isLeaf?: boolean
  data?: any
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  instanceId,
  defaultActive,
}) => {
  const [activeConfig, setActiveConfig] = useState<ConfigType>('bot')
  const [botConfig, setBotConfig] = useState<ConfigWithComments | null>(null)
  const [modelConfig, setModelConfig] = useState<ConfigWithComments | null>(null)
  const [adapterConfig, setAdapterConfig] = useState<ConfigWithComments | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>(null)
  const [hasChanges, setHasChanges] = useState(false)
  
  // Tag 添加状态：记录哪个路径正在添加新项
  const [addingTagPath, setAddingTagPath] = useState<string | null>(null)
  const [newTagValue, setNewTagValue] = useState<string>('')
  
  // 编辑模式：tree（树形编辑器）或 text（文本编辑器）
  const [editMode, setEditMode] = useState<'tree' | 'text'>('tree')
  const [rawText, setRawText] = useState<string>('')
  const [originalRawText, setOriginalRawText] = useState<string>('')

  // 容器响应式逻辑
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number>(1200) // 默认宽屏

  useEffect(() => {
    if (!containerRef.current) return
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [isOpen]) // isOpen 变化时重新绑定

  // 基于容器宽度的断点状态
  const isCompact = containerWidth < 800 // 紧凑模式阈值
  const isMobile = containerWidth < 600  // 移动端模式阈值

  // 加载配置
  const loadConfigs = async () => {
    setLoading(true)
    try {
      // 先尝试加载原始文本（更可靠）
      const [botRaw, modelRaw, adapterRaw] = await Promise.all([
        getBotConfigRaw(instanceId).catch(err => {
          console.error('加载Bot原始配置失败:', err)
          return ''
        }),
        getModelConfigRaw(instanceId).catch(err => {
          console.error('加载Model原始配置失败:', err)
          return ''
        }),
        getAdapterConfigRaw(instanceId).catch(err => {
          console.error('加载Adapter原始配置失败:', err)
          return ''
        }),
      ])
      
      // 再尝试加载解析后的配置（可能失败）
      const [bot, model, adapter] = await Promise.all([
        getBotConfig(instanceId).catch(err => {
          console.error('解析Bot配置失败:', err)
          toast.error(`Bot配置解析失败: ${err.message}。已切换到文本模式。`)
          return null
        }),
        getModelConfig(instanceId).catch(err => {
          console.error('解析Model配置失败:', err)
          toast.error(`Model配置解析失败: ${err.message}。已切换到文本模式。`)
          return null
        }),
        getAdapterConfig(instanceId).catch(err => {
          console.error('解析Adapter配置失败:', err)
          toast.error(`Adapter配置解析失败: ${err.message}。已切换到文本模式。`)
          return null
        }),
      ])
      
      setBotConfig(bot)
      setModelConfig(model)
      setAdapterConfig(adapter)
      
      // 保存原始文本
      if (activeConfig === 'bot') {
        setRawText(botRaw)
        setOriginalRawText(botRaw)
      } else if (activeConfig === 'model') {
        setRawText(modelRaw)
        setOriginalRawText(modelRaw)
      } else {
        setRawText(adapterRaw)
        setOriginalRawText(adapterRaw)
      }
      
      // 如果解析失败，自动切换到文本模式
      if (!bot || !model || !adapter) {
        setEditMode('text')
      }
    } catch (error) {
      console.error('加载配置失败:', error)
      toast.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }
  
  // 当切换配置类型时，更新rawText并清除选中状态
  useEffect(() => {
    // 清除选中的路径和编辑值
    setSelectedPath(null)
    setEditValue(null)
    setHasChanges(false)
    
    if (activeConfig === 'bot' && botConfig) {
      getBotConfigRaw(instanceId).then(text => {
        setRawText(text)
        setOriginalRawText(text)
      }).catch(err => console.error('加载Bot原始配置失败:', err))
    } else if (activeConfig === 'model' && modelConfig) {
      getModelConfigRaw(instanceId).then(text => {
        setRawText(text)
        setOriginalRawText(text)
      }).catch(err => console.error('加载Model原始配置失败:', err))
    } else if (activeConfig === 'adapter' && adapterConfig) {
      getAdapterConfigRaw(instanceId).then(text => {
        setRawText(text)
        setOriginalRawText(text)
      }).catch(err => console.error('加载Adapter原始配置失败:', err))
    }
  }, [activeConfig, botConfig, modelConfig, adapterConfig, instanceId])

  useEffect(() => {
    if (isOpen) {
      loadConfigs()
      if (defaultActive) {
        setActiveConfig(defaultActive)
      } else {
        setActiveConfig('bot')
      }
      setHasChanges(false)
    }
  }, [isOpen, instanceId, defaultActive])

  // 配置项的中文名称映射
  const configLabels: Record<string, string> = {
    // Bot配置
    'bot': '基础信息',
    'bot.platform': '主平台',
    'bot.qq_account': 'QQ账号',
    'bot.platforms': '多平台账号',
    'bot.nickname': '机器人昵称',
    'bot.alias_names': '昵称别名',
    
    // 人格配置
    'personality': '人格设定',
    'personality.personality': '人格描述',
    'personality.reply_style': '表达风格',
    'personality.interest': '兴趣设定',
    'personality.plan_style': '群聊行为准则',
    'personality.visual_style': '图片识别提示词',
    'personality.private_plan_style': '私聊行为准则',
    'personality.states': '随机状态列表',
    'personality.state_probability': '状态随机概率',
    
    // 表达配置
    'expression': '表达学习',
    'expression.mode': '表达模式',
    'expression.learning_list': '学习配置',
    'expression.expression_groups': '表达互通组',
    
    // 聊天配置
    'chat': '聊天设置',
    'chat.talk_value': '思考频率',
    'chat.mentioned_bot_reply': '@必回复',
    'chat.max_context_size': '上下文长度',
    'chat.auto_chat_value': '主动聊天值',
    'chat.planner_smooth': '规划器平滑',
    'chat.enable_talk_value_rules': '动态思考频率',
    'chat.enable_auto_chat_value_rules': '动态主动聊天',
    'chat.talk_value_rules': '思考频率规则',
    'chat.auto_chat_value_rules': '主动聊天规则',
    
    // 记忆配置
    'memory': '记忆系统',
    'memory.max_memory_number': '记忆数量上限',
    'memory.max_memory_size': '单条记忆大小',
    'memory.memory_build_frequency': '构建频率',
    
    // 工具配置
    'tool': '工具系统',
    'tool.enable_tool': '启用工具调用',
    
    // 情绪配置
    'mood': '情绪系统',
    'mood.enable_mood': '启用情绪',
    'mood.mood_update_threshold': '更新阈值',
    'mood.emotion_style': '情感特征描述',
    
    // 表情包配置
    'emoji': '表情包',
    'emoji.emoji_chance': '发送概率',
    'emoji.max_reg_num': '最大收藏数',
    'emoji.do_replace': '达到上限时替换',
    'emoji.check_interval': '检查间隔(分钟)',
    'emoji.steal_emoji': '偷取表情包',
    'emoji.content_filtration': '启用内容过滤',
    'emoji.filtration_prompt': '过滤要求',
    
    // 语音配置
    'voice': '语音识别',
    'voice.enable_asr': '启用ASR',
    
    // 消息接收配置
    'message_receive': '消息过滤',
    'message_receive.ban_words': '屏蔽关键词',
    'message_receive.ban_msgs_regex': '屏蔽正则',
    
    // 知识库配置
    'lpmm_knowledge': 'LPMM知识库',
    'lpmm_knowledge.enable': '启用知识库',
    'lpmm_knowledge.rag_synonym_search_top_k': '同义词搜索TopK',
    'lpmm_knowledge.rag_synonym_threshold': '同义词阈值',
    'lpmm_knowledge.info_extraction_workers': '提取线程数',
    'lpmm_knowledge.qa_relation_search_top_k': '关系搜索TopK',
    'lpmm_knowledge.qa_relation_threshold': '关系阈值',
    'lpmm_knowledge.qa_paragraph_search_top_k': '段落搜索TopK',
    'lpmm_knowledge.qa_paragraph_node_weight': '段落节点权重',
    'lpmm_knowledge.qa_ent_filter_top_k': '实体过滤TopK',
    'lpmm_knowledge.qa_ppr_damping': 'PPR阻尼系数',
    'lpmm_knowledge.qa_res_top_k': '最终结果TopK',
    'lpmm_knowledge.embedding_dimension': '嵌入向量维度',
    
    // 关键词反应配置
    'keyword_reaction': '关键词反应',
    'keyword_reaction.keyword_rules': '关键词规则',
    'keyword_reaction.regex_rules': '正则规则',
    
    // 回复后处理配置
    'response_post_process': '回复后处理',
    'response_post_process.enable_response_post_process': '启用后处理',
    
    // 错别字配置
    'chinese_typo': '错别字生成',
    'chinese_typo.enable': '启用错别字',
    'chinese_typo.error_rate': '单字替换概率',
    'chinese_typo.min_freq': '最小字频阈值',
    'chinese_typo.tone_error_rate': '声调错误概率',
    'chinese_typo.word_replace_rate': '整词替换概率',
    
    // 回复分割器配置
    'response_splitter': '回复分割',
    'response_splitter.enable': '启用分割器',
    'response_splitter.max_length': '最大字符数',
    'response_splitter.max_sentence_num': '最大句子数',
    'response_splitter.enable_kaomoji_protection': '保护颜文字',
    
    // 日志配置
    'log': '日志配置',
    'log.date_style': '日期格式',
    'log.log_level_style': '级别样式',
    'log.color_text': '文本颜色',
    'log.log_level': '全局日志级别',
    'log.console_log_level': '控制台级别',
    'log.file_log_level': '文件日志级别',
    'log.suppress_libraries': '屏蔽库日志',
    'log.library_log_levels': '第三方库级别',
    
    // 调试配置
    'debug': '调试选项',
    'debug.show_prompt': '显示Prompt',
    'debug.show_replyer_prompt': '显示回复Prompt',
    'debug.show_replyer_reasoning': '显示推理',
    
    // MAIM消息服务配置
    'maim_message': 'MAIM消息服务',
    'maim_message.use_custom': '使用自定义配置',
    'maim_message.host': '主机地址',
    'maim_message.port': '端口',
    'maim_message.mode': '连接模式',
    'maim_message.use_wss': '使用WSS',
    'maim_message.cert_file': 'SSL证书路径',
    'maim_message.key_file': 'SSL密钥路径',
    'maim_message.auth_token': '认证令牌',
    
    // 遥测配置
    'telemetry': '遥测统计',
    'telemetry.enable': '启用遥测',
    
    // 实验性功能
    'experimental': '实验性功能',
    'experimental.none': '无实验功能',
    
    // 关系系统（已废弃）
    'relationship': '关系系统',
    'relationship.enable_relationship': '启用关系',
    
    // Model Config相关
    'api_providers': 'API提供商',
    'models': '模型列表',
    'model_task_config': '任务配置',
    
    // API Provider字段
    'name': '名称',
    'base_url': 'API地址',
    'api_key': 'API密钥',
    'client_type': '客户端类型',
    'max_retry': '最大重试次数',
    'timeout': '超时时间(秒)',
    'retry_interval': '重试间隔(秒)',
    
    // Model字段
    'model_identifier': '模型标识符',
    'api_provider': '所属提供商',
    'price_in': '输入价格',
    'price_out': '输出价格',
    'force_stream_mode': '强制流式',
    'extra_params': '额外参数',
    'enable_thinking': '思考模式',
  }

  const getConfigHint = (path: string, comments: Record<string, string>): string => {
    if (configLabels[path]) return configLabels[path]
    const c = comments[path]
    if (!c) return ''
    const fl = c.split('\n')[0].replace(/^#\s*/, '')
    const simplified = fl.replace(/^建议[^，]*，?/, '')
    return simplified.length > 28 ? simplified.slice(0, 28) + '…' : simplified
  }

  // 获取配置项的显示名称
  const getConfigLabel = (key: string, path: string): string => {
    // 优先使用完整路径的映射
    if (configLabels[path]) {
      return configLabels[path]
    }
    // 否则使用键名
    return key
  }

  // 将配置数据转换为语义化的树结构
  const buildTreeData = (data: Record<string, any>, parentPath = ''): TreeNode[] => {
    return Object.entries(data).map(([key, value]) => {
      const path = parentPath ? `${parentPath}.${key}` : key
      const displayName = getConfigLabel(key, path)
      const isObject = value && typeof value === 'object' && !Array.isArray(value)
      const isArray = Array.isArray(value)

      if (isArray) {
        // 如果是字符串数组，直接作为叶子节点（用于tag展示）
        const isStringArray = value.every((v: any) => typeof v === 'string')
        if (isStringArray) {
          return {
            id: path,
            name: displayName,
            isLeaf: true,
            data: { path, value },
          }
        }
        
        // 其他数组类型展开为子项
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

  // 按功能模块分组Bot配置（扁平化，减少不必要的嵌套）
  const groupBotConfig = (data: Record<string, any>): TreeNode[] => {
    const groups: TreeNode[] = []

    // 1. 基础信息 - 直接展开 bot 的子项，但将 platforms 移到最后
    if (data.bot) {
      const botData = { ...data.bot }
      const platforms = botData.platforms
      delete botData.platforms
      
      const botChildren = buildTreeData(botData, 'bot')
      
      // 将 platforms 添加到最后
      if (platforms !== undefined) {
        botChildren.push(...buildTreeData({ platforms }, 'bot'))
      }
      
      groups.push({
        id: 'group-basic',
        name: '基础信息',
        children: botChildren,
      })
    }

    // 2. 人格设定 - 扁平化展示
    if (data.personality) {
      const personalityItems = buildTreeData(data.personality, 'personality')
      groups.push({
        id: 'group-personality',
        name: '人格设定',
        children: personalityItems,
      })
    }
    
    // 3. 表达学习 - 独立展示
    if (data.expression) {
      const expressionItems = buildTreeData(data.expression, 'expression')
      groups.push({
        id: 'group-expression',
        name: '表达学习',
        children: expressionItems,
      })
    }

    // 4. 聊天设置 - 扁平化展示
    if (data.chat) {
      const chatItems = buildTreeData(data.chat, 'chat')
      groups.push({
        id: 'group-chat',
        name: '聊天设置',
        children: chatItems,
      })
    }
    
    // 5. 关键词反应 - 独立展示
    if (data.keyword_reaction) {
      const keywordItems = buildTreeData(data.keyword_reaction, 'keyword_reaction')
      groups.push({
        id: 'group-keyword',
        name: '关键词反应',
        children: keywordItems,
      })
    }

    // 6. 记忆系统 - 独立展示
    if (data.memory) {
      const memoryItems = buildTreeData(data.memory, 'memory')
      groups.push({
        id: 'group-memory',
        name: '记忆系统',
        children: memoryItems,
      })
    }
    
    // 7. 工具系统 - 独立展示
    if (data.tool) {
      const toolItems = buildTreeData(data.tool, 'tool')
      groups.push({
        id: 'group-tool',
        name: '工具系统',
        children: toolItems,
      })
    }
    
    // 8. 情绪系统 - 独立展示
    if (data.mood) {
      const moodItems = buildTreeData(data.mood, 'mood')
      groups.push({
        id: 'group-mood',
        name: '情绪系统',
        children: moodItems,
      })
    }
    
    // 9. LPMM知识库 - 独立展示
    if (data.lpmm_knowledge) {
      const knowledgeItems = buildTreeData(data.lpmm_knowledge, 'lpmm_knowledge')
      groups.push({
        id: 'group-database',
        name: 'LPMM知识库',
        children: knowledgeItems,
      })
    }
    
    // 10. 表情包系统 - 独立展示
    if (data.emoji) {
      const emojiItems = buildTreeData(data.emoji, 'emoji')
      groups.push({
        id: 'group-emoji',
        name: '表情包',
        children: emojiItems,
      })
    }
    
    // 11. 语音识别 - 独立展示
    if (data.voice) {
      const voiceItems = buildTreeData(data.voice, 'voice')
      groups.push({
        id: 'group-voice',
        name: '语音识别',
        children: voiceItems,
      })
    }

    // 12. 消息过滤 - 独立展示
    if (data.message_receive) {
      const receiveItems = buildTreeData(data.message_receive, 'message_receive')
      groups.push({
        id: 'group-message-receive',
        name: '消息过滤',
        children: receiveItems,
      })
    }
    
    // 13. 回复后处理 - 独立展示
    if (data.response_post_process) {
      const postProcessItems = buildTreeData(data.response_post_process, 'response_post_process')
      groups.push({
        id: 'group-post-process',
        name: '回复后处理',
        children: postProcessItems,
      })
    }
    
    // 14. 错别字生成 - 独立展示
    if (data.chinese_typo) {
      const typoItems = buildTreeData(data.chinese_typo, 'chinese_typo')
      groups.push({
        id: 'group-typo',
        name: '错别字生成',
        children: typoItems,
      })
    }
    
    // 15. 回复分割 - 独立展示
    if (data.response_splitter) {
      const splitterItems = buildTreeData(data.response_splitter, 'response_splitter')
      groups.push({
        id: 'group-splitter',
        name: '回复分割',
        children: splitterItems,
      })
    }

    // 16. 日志配置 - 独立展示
    if (data.log) {
      const logItems = buildTreeData(data.log, 'log')
      groups.push({
        id: 'group-log',
        name: '日志配置',
        children: logItems,
      })
    }
    
    // 17. 调试选项 - 独立展示
    if (data.debug) {
      const debugItems = buildTreeData(data.debug, 'debug')
      groups.push({
        id: 'group-debug',
        name: '调试选项',
        children: debugItems,
      })
    }
    
    // 18. MAIM消息服务 - 独立展示
    if (data.maim_message) {
      const maimItems = buildTreeData(data.maim_message, 'maim_message')
      groups.push({
        id: 'group-maim',
        name: 'MAIM消息服务',
        children: maimItems,
      })
    }
    
    // 19. 遥测统计 - 独立展示
    if (data.telemetry) {
      const telemetryItems = buildTreeData(data.telemetry, 'telemetry')
      groups.push({
        id: 'group-telemetry',
        name: '遥测统计',
        children: telemetryItems,
      })
    }

    // 20. 其他配置（未分类的）
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
      const otherItems = buildTreeData(otherData, '')
      groups.push({
        id: 'group-other',
        name: '其他配置',
        children: otherItems,
      })
    }

    return groups
  }

  // 按功能分组Model配置（带子分组）
  const groupModelConfig = (data: Record<string, any>): TreeNode[] => {
    const groups: TreeNode[] = []

    // 1. API提供商（按服务商分组）
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

    // 2. 模型配置（按模型分组）
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

    // 3. 任务配置（如果存在，按任务类型分组）
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

  const treeData = useMemo(() => {
    if (activeConfig === 'bot' && botConfig) {
      return groupBotConfig(botConfig.data || {})
    } else if (activeConfig === 'model' && modelConfig) {
      return groupModelConfig(modelConfig.data || {})
    } else if (activeConfig === 'adapter' && adapterConfig) {
      return buildTreeData(adapterConfig.data || {}, '')
    }
    return []
  }, [botConfig, modelConfig, adapterConfig, activeConfig])

  // 当前选中的分类（group id）
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  // 当 treeData 更新时，默认选中第一个分类
  useEffect(() => {
    if (treeData && treeData.length > 0) {
      setSelectedGroupId((prev) => prev || treeData[0].id)
    } else {
      setSelectedGroupId(null)
    }
  }, [treeData])

  // 根据 group id 查找对应 group
  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null
    return treeData.find((g) => g.id === selectedGroupId) || null
  }, [selectedGroupId, treeData])

  // 递归渲染配置项（直接在右侧主区域展示，带编辑功能）
  const renderConfigItems = (nodes: TreeNode[] | undefined, level: number = 0): React.ReactNode => {
    if (!nodes) return null
    
    return nodes.map((node) => {
      if (node.isLeaf && node.data) {
        // 叶子节点：直接渲染编辑表单
        return renderConfigItemEditor(node, level)
      } else {
        // 非叶子节点：渲染为可折叠的分组
        return (
          <details key={node.id} open className="mb-4">
            <summary className={`cursor-pointer font-semibold text-lg mb-3 ${level === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {node.name}
            </summary>
            <div className={`${level === 0 ? 'ml-0' : 'ml-4'} space-y-4`}>
              {renderConfigItems(node.children, level + 1)}
            </div>
          </details>
        )
      }
    })
  }

  // 渲染单个配置项的编辑器
  const renderConfigItemEditor = (node: TreeNode, _level: number) => {
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
                  setSelectedPath(path)
                  setEditValue(e.target.value)
                  setHasChanges(true)
                }}
                className="mt-1 min-h-[120px] font-mono text-sm bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-lg resize-y"
                placeholder="输入字符串值"
              />
            ) : (
              <Input
                type="text"
                value={editValue && selectedPath === path ? editValue : value || ''}
                onChange={(e) => {
                  setSelectedPath(path)
                  setEditValue(e.target.value)
                  setHasChanges(true)
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
                setSelectedPath(path)
                setEditValue(Number(e.target.value))
                setHasChanges(true)
              }}
              className="mt-1 bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-lg h-10 font-mono"
              placeholder="输入数字"
            />
          )}

          {valueType === 'boolean' && (
            <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
              <Label className="cursor-pointer" onClick={() => {
                  setSelectedPath(path)
                  setEditValue(!(editValue && selectedPath === path ? editValue : value))
                  setHasChanges(true)
              }}>
                {(editValue && selectedPath === path ? editValue : value) ? '已启用' : '已禁用'}
              </Label>
              <Switch
                checked={editValue && selectedPath === path ? editValue : value}
                onCheckedChange={(checked: boolean) => {
                  setSelectedPath(path)
                  setEditValue(checked)
                  setHasChanges(true)
                }}
              />
            </div>
          )}

          {valueType === 'array' && (
            <>
              {/* 如果是字符串数组，用 Tag 展示 */}
              {Array.isArray(value) && value.every((v: any) => typeof v === 'string') ? (
                <div className="mt-2 p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex flex-wrap gap-2 items-center">
                    {(editValue && selectedPath === path ? editValue : value).map((item: string, idx: number) => (
                      <div
                        key={idx}
                        className="group/tag flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/30 rounded-full text-sm transition-all hover:bg-blue-100 dark:hover:bg-blue-900/40"
                      >
                        <span>{item}</span>
                        <button
                          onClick={() => {
                            const currentArray = editValue && selectedPath === path ? editValue : value
                            const newArray = currentArray.filter((_: any, i: number) => i !== idx)
                            setSelectedPath(path)
                            setEditValue(newArray)
                            setHasChanges(true)
                          }}
                          className="opacity-0 group-hover/tag:opacity-100 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-all"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    
                    {/* 添加新项的输入框和按钮 */}
                    {addingTagPath === path ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-200">
                        <Input
                          autoFocus
                          value={newTagValue}
                          onChange={(e) => setNewTagValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newTagValue.trim()) {
                              const currentArray = editValue && selectedPath === path ? editValue : value
                              const newArray = [...currentArray, newTagValue.trim()]
                              setSelectedPath(path)
                              setEditValue(newArray)
                              setHasChanges(true)
                              setNewTagValue('')
                              setAddingTagPath(null)
                            } else if (e.key === 'Escape') {
                              setNewTagValue('')
                              setAddingTagPath(null)
                            }
                          }}
                          className="h-9 w-40 rounded-full text-sm px-3 bg-white dark:bg-gray-800 border-blue-200 focus:ring-2 focus:ring-blue-500/20"
                          placeholder="输入内容..."
                        />
                        <button
                          onClick={() => {
                            if (newTagValue.trim()) {
                              const currentArray = editValue && selectedPath === path ? editValue : value
                              const newArray = [...currentArray, newTagValue.trim()]
                              setSelectedPath(path)
                              setEditValue(newArray)
                              setHasChanges(true)
                              setNewTagValue('')
                              setAddingTagPath(null)
                            }
                          }}
                          className="flex items-center justify-center w-9 h-9 bg-green-500 hover:bg-green-600 rounded-full text-white shadow-sm transition-all duration-200 shrink-0"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setNewTagValue('')
                            setAddingTagPath(null)
                          }}
                          className="flex items-center justify-center w-9 h-9 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-500 dark:text-gray-400 transition-all duration-200 shrink-0"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAddingTagPath(path)
                          setNewTagValue('')
                        }}
                        className="flex items-center justify-center w-9 h-9 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600 rounded-full text-gray-500 dark:text-gray-400 transition-all duration-200 shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* 其他类型数组用 JSON 编辑器 */
                <Textarea
                  value={editValue && selectedPath === path ? JSON.stringify(editValue, null, 2) : JSON.stringify(value, null, 2)}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      setSelectedPath(path)
                      setEditValue(parsed)
                      setHasChanges(true)
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
                  setSelectedPath(path)
                  setEditValue(parsed)
                  setHasChanges(true)
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
              onClick={handleSave}
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
              onClick={() => {
                setEditValue(value)
                setSelectedPath(null)
                setHasChanges(false)
              }}
              className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              取消
            </Button>
          </div>
        )}
      </div>
    )
  }  // 获取值的类型
  const getValueType = (value: any): string => {
    if (value === null) return 'null'
    if (Array.isArray(value)) return 'array'
    return typeof value
  }

  // 保存更改
  const handleSave = async () => {
    setSaving(true)
    try {
      if (editMode === 'text') {
        if (activeConfig === 'bot') {
          await saveBotConfigRaw(rawText, instanceId)
          const [bot, botRaw] = await Promise.all([
            getBotConfig(instanceId),
            getBotConfigRaw(instanceId),
          ])
          setBotConfig(bot)
          setRawText(botRaw)
          setOriginalRawText(botRaw)
        } else if (activeConfig === 'model') {
          await saveModelConfigRaw(rawText, instanceId)
          const [model, modelRaw] = await Promise.all([
            getModelConfig(instanceId),
            getModelConfigRaw(instanceId),
          ])
          setModelConfig(model)
          setRawText(modelRaw)
          setOriginalRawText(modelRaw)
        } else {
          await saveAdapterConfigRaw(rawText, instanceId)
          const [adapter, adapterRaw] = await Promise.all([
            getAdapterConfig(instanceId),
            getAdapterConfigRaw(instanceId),
          ])
          setAdapterConfig(adapter)
          setRawText(adapterRaw)
          setOriginalRawText(adapterRaw)
        }
      } else {
        if (!selectedPath) return
        const request: ConfigUpdateRequest = {
          key_path: selectedPath,
          value: editValue,
        }
        if (activeConfig === 'bot') {
          const updated = await updateBotConfig(request, instanceId)
          setBotConfig(updated)
        } else if (activeConfig === 'model') {
          const updated = await updateModelConfig(request, instanceId)
          setModelConfig(updated)
        } else {
          const updated = await updateAdapterConfig(request, instanceId)
          setAdapterConfig(updated)
        }
      }

      setHasChanges(false)
      toast.success('保存成功')
    } catch (error) {
      console.error('保存失败:', error)
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] animate-in fade-in duration-200">
      {/* Backdrop - 覆盖整个屏幕的纯透明磨砂遮罩 */}
      <div
        className="absolute inset-0 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Content Wrapper - 在主显示区域居中 */}
      <div className="absolute top-0 right-0 bottom-0 left-0 md:left-[272px] flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 pointer-events-none">
        {/* Modal Container */}
        <div 
          ref={containerRef}
          className="relative w-full max-w-7xl h-[90vh] md:h-[85vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-black/5 pointer-events-auto"
        >
        
        {/* Header / Toolbar */}
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
                      {activeConfig === 'bot' ? 'Bot Configuration' : activeConfig === 'model' ? 'Model Configuration' : 'Adapter Configuration'}
                    </p>
                  )}
               </div>
            </div>

            {/* Config Type Switcher */}
            {!isCompact ? (
              <div className="flex bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                {(['bot', 'model', 'adapter'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveConfig(type)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      activeConfig === type
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {type === 'bot' ? 'Bot' : type === 'model' ? 'Model' : 'Adapter'}
                  </button>
                ))}
              </div>
            ) : (
              /* Mobile Config Type Switcher */
              <div>
                 <select 
                    value={activeConfig}
                    onChange={(e) => setActiveConfig(e.target.value as any)}
                    className="bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                 >
                    <option value="bot">Bot Config</option>
                    <option value="model">Model Config</option>
                    <option value="adapter">Adapter Config</option>
                 </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-4">
             {/* Edit Mode Switcher */}
            <div className="flex bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
              <button
                onClick={() => {
                  setEditMode('tree')
                  setHasChanges(false)
                }}
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
                onClick={() => {
                  setEditMode('text')
                  setHasChanges(rawText !== originalRawText)
                }}
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

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 md:mx-2" />

            <button
              onClick={onClose}
              className="group p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
            >
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 group-hover:border-red-500/50 group-hover:bg-red-500 group-hover:text-white flex items-center justify-center text-transparent transition-all">
                 <X className="w-3 h-3" />
              </div>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden bg-gray-50/30 dark:bg-black/20">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">正在加载配置...</p>
            </div>
          ) : editMode === 'text' ? (
            /* Text Editor Mode */
            <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex-1 overflow-hidden relative">
                <TomlEditor
                  value={rawText}
                  onChange={(value) => {
                    setRawText(value)
                    setHasChanges(value !== originalRawText)
                  }}
                  className="w-full h-full"
                />
              </div>
              
              {/* Footer Actions */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono hidden sm:block">
                   {rawText.length} characters
                </div>
                <div className="flex gap-3 w-full sm:w-auto justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRawText(originalRawText)
                        setHasChanges(false)
                      }}
                      disabled={!hasChanges}
                      className="rounded-lg"
                    >
                      重置更改
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleSave}
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
          ) : (
            /* Tree/Visual Mode */
            <>
              {/* Sidebar - Hidden on compact mode */}
              {!isCompact && (
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
                            onClick={() => {
                              setSelectedGroupId(group.id)
                              setSelectedPath(null)
                              setEditValue(null)
                              setHasChanges(false)
                            }}
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
              )}

              {/* Main Content */}
              <div className="flex-1 overflow-hidden relative bg-gray-50/50 dark:bg-black/5 flex flex-col">
                
                {/* Compact Mode Category Selector */}
                {isCompact && (
                  <div className="p-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm overflow-x-auto no-scrollbar">
                     <div className="flex gap-2">
                        {treeData && treeData.length > 0 ? (
                          treeData.map((group) => (
                            <button
                              key={group.id}
                              onClick={() => {
                                setSelectedGroupId(group.id)
                                setSelectedPath(null)
                                setEditValue(null)
                                setHasChanges(false)
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                                selectedGroupId === group.id
                                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              {group.name}
                            </button>
                          ))
                        ) : null}
                     </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto scrollbar-thin">
                  <div className={`p-4 md:p-6 lg:p-8 max-w-4xl mx-auto pb-20 ${isCompact ? 'px-4' : ''}`}>
                    {selectedGroup ? (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                            {selectedGroup.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                配置 {selectedGroup.name} 的相关参数
                            </p>
                        </div>
                        <div className="space-y-6">
                            {renderConfigItems(selectedGroup.children)}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 dark:text-gray-600">
                        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
                            <Settings className="w-10 h-10 opacity-50" />
                        </div>
                        <p className="text-lg font-medium">选择左侧分类开始配置</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
