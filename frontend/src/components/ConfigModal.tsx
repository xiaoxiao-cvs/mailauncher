/**
 * MAIBot 配置模态框
 * 用于可视化编辑 Bot Config 和 Model Config
 */
import React, { useState, useEffect, useMemo } from 'react'
import { X, Save, FileText, Settings, Loader2, FileCode, FileJson } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import ConfigTreeView from '@/components/ConfigTreeView'
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
  ConfigWithComments,
  ConfigUpdateRequest,
} from '@/services/configApi'

interface ConfigModalProps {
  isOpen: boolean
  onClose: () => void
  instanceId?: string
}

type ConfigType = 'bot' | 'model'

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
}) => {
  const [activeConfig, setActiveConfig] = useState<ConfigType>('bot')
  const [botConfig, setBotConfig] = useState<ConfigWithComments | null>(null)
  const [modelConfig, setModelConfig] = useState<ConfigWithComments | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>(null)
  const [hasChanges, setHasChanges] = useState(false)
  
  // 编辑模式：tree（树形编辑器）或 text（文本编辑器）
  const [editMode, setEditMode] = useState<'tree' | 'text'>('tree')
  const [rawText, setRawText] = useState<string>('')
  const [originalRawText, setOriginalRawText] = useState<string>('')

  // 加载配置
  const loadConfigs = async () => {
    setLoading(true)
    try {
      // 先尝试加载原始文本（更可靠）
      const [botRaw, modelRaw] = await Promise.all([
        getBotConfigRaw(instanceId).catch(err => {
          console.error('加载Bot原始配置失败:', err)
          return ''
        }),
        getModelConfigRaw(instanceId).catch(err => {
          console.error('加载Model原始配置失败:', err)
          return ''
        }),
      ])
      
      // 再尝试加载解析后的配置（可能失败）
      const [bot, model] = await Promise.all([
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
      ])
      
      setBotConfig(bot)
      setModelConfig(model)
      
      // 保存原始文本
      if (activeConfig === 'bot') {
        setRawText(botRaw)
        setOriginalRawText(botRaw)
      } else {
        setRawText(modelRaw)
        setOriginalRawText(modelRaw)
      }
      
      // 如果解析失败，自动切换到文本模式
      if (!bot || !model) {
        setEditMode('text')
      }
    } catch (error) {
      console.error('加载配置失败:', error)
      toast.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }
  
  // 当切换配置类型时，更新rawText
  useEffect(() => {
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
    }
  }, [activeConfig, botConfig, modelConfig, instanceId])

  useEffect(() => {
    if (isOpen) {
      loadConfigs()
      setHasChanges(false)
    }
  }, [isOpen, instanceId])

  // 配置项的中文名称映射
  const configLabels: Record<string, string> = {
    // Bot配置
    'bot': 'Bot基础配置',
    'bot.platform': '平台类型',
    'bot.qq_account': 'QQ账号',
    'bot.platforms': '其他平台账号',
    'bot.nickname': '昵称',
    'bot.alias_names': '别名列表',
    
    // 人格配置
    'personality': '人格与行为',
    'personality.personality': '基础人格',
    'personality.reply_style': '回复风格',
    'personality.interest': '兴趣爱好',
    'personality.plan_style': '群聊行为规则',
    'personality.visual_style': '识图风格',
    'personality.private_plan_style': '私聊行为规则',
    'personality.states': '人格状态池',
    'personality.state_probability': '状态切换概率',
    
    // 表达配置
    'expression': '表达学习',
    'expression.mode': '表达模式',
    'expression.learning_list': '学习配置列表',
    'expression.expression_groups': '表达共享组',
    
    // 聊天配置
    'chat': '聊天行为',
    'chat.talk_value': '发言频率',
    'chat.mentioned_bot_reply': '提及必回',
    'chat.max_context_size': '上下文长度',
    'chat.auto_chat_value': '主动聊天频率',
    'chat.planner_smooth': '规划器平滑度',
    'chat.enable_talk_value_rules': '启用动态发言规则',
    'chat.enable_auto_chat_value_rules': '启用动态主动聊天规则',
    'chat.talk_value_rules': '动态发言规则',
    'chat.auto_chat_value_rules': '动态主动聊天规则',
    
    // 记忆配置
    'memory': '记忆系统',
    'memory.max_memory_number': '最大记忆数量',
    'memory.max_memory_size': '最大记忆大小',
    'memory.memory_build_frequency': '记忆构建频率',
    
    // 工具配置
    'tool': '工具系统',
    'tool.enable_tool': '启用工具',
    
    // 情绪配置
    'mood': '情绪系统',
    'mood.enable_mood': '启用情绪',
    'mood.mood_update_threshold': '情绪更新阈值',
    'mood.emotion_style': '情感特征',
    
    // 表情包配置
    'emoji': '表情包系统',
    'emoji.emoji_chance': '表情包概率',
    'emoji.max_reg_num': '最大注册数',
    'emoji.do_replace': '自动替换',
    'emoji.check_interval': '检查间隔',
    'emoji.steal_emoji': '偷取表情包',
    'emoji.content_filtration': '内容过滤',
    'emoji.filtration_prompt': '过滤规则',
    
    // 语音配置
    'voice': '语音识别',
    'voice.enable_asr': '启用语音识别',
    
    // 消息接收配置
    'message_receive': '消息过滤',
    'message_receive.ban_words': '屏蔽词列表',
    'message_receive.ban_msgs_regex': '屏蔽正则表达式',
    
    // 知识库配置
    'lpmm_knowledge': '知识库系统',
    'lpmm_knowledge.enable': '启用知识库',
    
    // 关键词反应配置
    'keyword_reaction': '关键词触发',
    'keyword_reaction.keyword_rules': '关键词规则',
    'keyword_reaction.regex_rules': '正则规则',
    
    // 回复后处理配置
    'response_post_process': '回复后处理',
    'response_post_process.enable_response_post_process': '启用后处理',
    
    // 错别字配置
    'chinese_typo': '中文错别字',
    'chinese_typo.enable': '启用错别字',
    'chinese_typo.error_rate': '单字替换率',
    'chinese_typo.min_freq': '最小字频',
    'chinese_typo.tone_error_rate': '声调错误率',
    'chinese_typo.word_replace_rate': '整词替换率',
    
    // 回复分割器配置
    'response_splitter': '回复分割',
    'response_splitter.enable': '启用分割',
    'response_splitter.max_length': '最大长度',
    'response_splitter.max_sentence_num': '最大句子数',
    'response_splitter.enable_kaomoji_protection': '颜文字保护',
    
    // 日志配置
    'log': '日志系统',
    'log.log_level': '日志级别',
    'log.console_log_level': '控制台级别',
    'log.file_log_level': '文件级别',
    
    // 调试配置
    'debug': '调试选项',
    'debug.show_prompt': '显示Prompt',
    'debug.show_replyer_prompt': '显示回复器Prompt',
    'debug.show_replyer_reasoning': '显示推理过程',
    
    // Model Config相关
    'api_providers': 'API提供商',
    'models': '模型列表',
    'model_task_config': '模型任务配置',
    
    // API Provider字段
    'name': '名称',
    'base_url': 'API地址',
    'api_key': 'API密钥',
    'client_type': '客户端类型',
    'max_retry': '最大重试次数',
    'timeout': '超时时间',
    'retry_interval': '重试间隔',
    
    // Model字段
    'model_identifier': '模型标识符',
    'api_provider': 'API提供商',
    'price_in': '输入价格',
    'price_out': '输出价格',
    'force_stream_mode': '强制流式输出',
    'extra_params': '额外参数',
    'enable_thinking': '启用思考模式',
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

      // 叶子节点：显示键名和值的预览
      let valuePreview = String(value)
      if (valuePreview.length > 50) {
        valuePreview = valuePreview.substring(0, 50) + '...'
      }
      
      return {
        id: path,
        name: `${displayName}: ${valuePreview}`,
        isLeaf: true,
        data: { path, value },
      }
    })
  }

  // 按功能模块分组Bot配置（带子分组）
  const groupBotConfig = (data: Record<string, any>): TreeNode[] => {
    const groups: TreeNode[] = []

    // 1. 基础配置
    if (data.bot) {
      const botChildren = buildTreeData({ bot: data.bot }, '')[0]?.children || []
      groups.push({
        id: 'group-basic',
        name: '基础配置',
        children: botChildren,
      })
    }

    // 2. 人格与表达（增加子分组）
    const personalityChildren: TreeNode[] = []
    
    // 2.1 人格配置子分组（细分为更小的类别）
    if (data.personality) {
      const personalityData = data.personality
      const personalitySubGroups: TreeNode[] = []
      
      // 2.1.1 基础人格
      const basicPersonality: Record<string, any> = {}
      if (personalityData.personality !== undefined) basicPersonality.personality = personalityData.personality
      if (personalityData.nickname !== undefined) basicPersonality.nickname = personalityData.nickname
      if (personalityData.alias_names !== undefined) basicPersonality.alias_names = personalityData.alias_names
      
      if (Object.keys(basicPersonality).length > 0) {
        const basicItems = buildTreeData(basicPersonality, 'personality')
        personalitySubGroups.push({
          id: 'personality-basic',
          name: '基础人格',
          children: basicItems,
        })
      }
      
      // 2.1.2 风格设定
      const styleSettings: Record<string, any> = {}
      if (personalityData.reply_style !== undefined) styleSettings.reply_style = personalityData.reply_style
      if (personalityData.interest !== undefined) styleSettings.interest = personalityData.interest
      if (personalityData.visual_style !== undefined) styleSettings.visual_style = personalityData.visual_style
      
      if (Object.keys(styleSettings).length > 0) {
        const styleItems = buildTreeData(styleSettings, 'personality')
        personalitySubGroups.push({
          id: 'personality-style',
          name: '风格设定',
          children: styleItems,
        })
      }
      
      // 2.1.3 行为规则
      const behaviorRules: Record<string, any> = {}
      if (personalityData.plan_style !== undefined) behaviorRules.plan_style = personalityData.plan_style
      if (personalityData.private_plan_style !== undefined) behaviorRules.private_plan_style = personalityData.private_plan_style
      
      if (Object.keys(behaviorRules).length > 0) {
        const behaviorItems = buildTreeData(behaviorRules, 'personality')
        personalitySubGroups.push({
          id: 'personality-behavior',
          name: '行为规则',
          children: behaviorItems,
        })
      }
      
      // 2.1.4 人格状态池
      const statePool: Record<string, any> = {}
      if (personalityData.states !== undefined) statePool.states = personalityData.states
      if (personalityData.state_probability !== undefined) statePool.state_probability = personalityData.state_probability
      
      if (Object.keys(statePool).length > 0) {
        const stateItems = buildTreeData(statePool, 'personality')
        personalitySubGroups.push({
          id: 'personality-states',
          name: '人格状态池',
          children: stateItems,
        })
      }
      
      // 2.1.5 其他人格配置
      const otherPersonality: Record<string, any> = {}
      const personalityGroupedKeys = new Set([
        'personality', 'nickname', 'alias_names', 'reply_style', 'interest', 
        'visual_style', 'plan_style', 'private_plan_style', 'states', 'state_probability'
      ])
      Object.keys(personalityData).forEach(key => {
        if (!personalityGroupedKeys.has(key)) {
          otherPersonality[key] = personalityData[key]
        }
      })
      
      if (Object.keys(otherPersonality).length > 0) {
        const otherItems = buildTreeData(otherPersonality, 'personality')
        personalitySubGroups.push({
          id: 'personality-other',
          name: '其他配置',
          children: otherItems,
        })
      }
      
      if (personalitySubGroups.length > 0) {
        personalityChildren.push({
          id: 'subgroup-personality',
          name: '人格配置',
          children: personalitySubGroups,
        })
      }
    }
    
    // 2.2 表达学习子分组
    if (data.expression) {
      const expressionItems = buildTreeData({ expression: data.expression }, '')[0]?.children || []
      personalityChildren.push({
        id: 'subgroup-expression',
        name: '表达学习',
        children: expressionItems,
      })
    }
    
    if (personalityChildren.length > 0) {
      groups.push({
        id: 'group-personality',
        name: '人格与表达',
        children: personalityChildren,
      })
    }

    // 3. 聊天行为（增加子分组）
    const chatChildren: TreeNode[] = []
    
    // 3.1 聊天设置子分组（细分）
    if (data.chat) {
      const chatData = data.chat
      const chatSubGroups: TreeNode[] = []
      
      // 3.1.1 基础聊天配置
      const basicChat: Record<string, any> = {}
      if (chatData.talk_value !== undefined) basicChat.talk_value = chatData.talk_value
      if (chatData.mentioned_bot_reply !== undefined) basicChat.mentioned_bot_reply = chatData.mentioned_bot_reply
      if (chatData.max_context_size !== undefined) basicChat.max_context_size = chatData.max_context_size
      if (chatData.planner_smooth !== undefined) basicChat.planner_smooth = chatData.planner_smooth
      
      if (Object.keys(basicChat).length > 0) {
        const basicChatItems = buildTreeData(basicChat, 'chat')
        chatSubGroups.push({
          id: 'chat-basic',
          name: '基础聊天',
          children: basicChatItems,
        })
      }
      
      // 3.1.2 主动聊天配置
      const autoChat: Record<string, any> = {}
      if (chatData.auto_chat_value !== undefined) autoChat.auto_chat_value = chatData.auto_chat_value
      if (chatData.enable_auto_chat_value_rules !== undefined) autoChat.enable_auto_chat_value_rules = chatData.enable_auto_chat_value_rules
      if (chatData.auto_chat_value_rules !== undefined) autoChat.auto_chat_value_rules = chatData.auto_chat_value_rules
      
      if (Object.keys(autoChat).length > 0) {
        const autoChatItems = buildTreeData(autoChat, 'chat')
        chatSubGroups.push({
          id: 'chat-auto',
          name: '主动聊天',
          children: autoChatItems,
        })
      }
      
      // 3.1.3 动态发言规则
      const talkRules: Record<string, any> = {}
      if (chatData.enable_talk_value_rules !== undefined) talkRules.enable_talk_value_rules = chatData.enable_talk_value_rules
      if (chatData.talk_value_rules !== undefined) talkRules.talk_value_rules = chatData.talk_value_rules
      
      if (Object.keys(talkRules).length > 0) {
        const talkRulesItems = buildTreeData(talkRules, 'chat')
        chatSubGroups.push({
          id: 'chat-rules',
          name: '动态发言规则',
          children: talkRulesItems,
        })
      }
      
      // 3.1.4 其他聊天配置
      const otherChat: Record<string, any> = {}
      const chatGroupedKeys = new Set([
        'talk_value', 'mentioned_bot_reply', 'max_context_size', 'planner_smooth',
        'auto_chat_value', 'enable_auto_chat_value_rules', 'auto_chat_value_rules',
        'enable_talk_value_rules', 'talk_value_rules'
      ])
      Object.keys(chatData).forEach(key => {
        if (!chatGroupedKeys.has(key)) {
          otherChat[key] = chatData[key]
        }
      })
      
      if (Object.keys(otherChat).length > 0) {
        const otherChatItems = buildTreeData(otherChat, 'chat')
        chatSubGroups.push({
          id: 'chat-other',
          name: '其他配置',
          children: otherChatItems,
        })
      }
      
      if (chatSubGroups.length > 0) {
        chatChildren.push({
          id: 'subgroup-chat-settings',
          name: '聊天设置',
          children: chatSubGroups,
        })
      }
    }
    
    // 3.2 关键词触发子分组
    if (data.keyword_reaction) {
      const keywordItems = buildTreeData({ keyword_reaction: data.keyword_reaction }, '')[0]?.children || []
      chatChildren.push({
        id: 'subgroup-keyword',
        name: '关键词触发',
        children: keywordItems,
      })
    }
    
    if (chatChildren.length > 0) {
      groups.push({
        id: 'group-chat',
        name: '聊天行为',
        children: chatChildren,
      })
    }

    // 4. 功能模块（增加子分组）
    const featuresChildren: TreeNode[] = []
    
    // 4.1 智能功能子分组
    const smartFeatures: TreeNode[] = []
    if (data.memory) {
      const memoryItems = buildTreeData({ memory: data.memory }, '')[0]?.children || []
      smartFeatures.push({
        id: 'subgroup-memory',
        name: '记忆系统',
        children: memoryItems,
      })
    }
    if (data.tool) {
      const toolItems = buildTreeData({ tool: data.tool }, '')[0]?.children || []
      smartFeatures.push({
        id: 'subgroup-tool',
        name: '工具系统',
        children: toolItems,
      })
    }
    if (data.mood) {
      const moodItems = buildTreeData({ mood: data.mood }, '')[0]?.children || []
      smartFeatures.push({
        id: 'subgroup-mood',
        name: '情绪系统',
        children: moodItems,
      })
    }
    if (data.lpmm_knowledge) {
      const knowledgeItems = buildTreeData({ lpmm_knowledge: data.lpmm_knowledge }, '')[0]?.children || []
      smartFeatures.push({
        id: 'subgroup-knowledge',
        name: '知识库',
        children: knowledgeItems,
      })
    }
    
    if (smartFeatures.length > 0) {
      featuresChildren.push({
        id: 'subgroup-smart-features',
        name: '智能功能',
        children: smartFeatures,
      })
    }
    
    // 4.2 多媒体功能子分组
    const mediaFeatures: TreeNode[] = []
    if (data.emoji) {
      const emojiItems = buildTreeData({ emoji: data.emoji }, '')[0]?.children || []
      mediaFeatures.push({
        id: 'subgroup-emoji',
        name: '表情包',
        children: emojiItems,
      })
    }
    if (data.voice) {
      const voiceItems = buildTreeData({ voice: data.voice }, '')[0]?.children || []
      mediaFeatures.push({
        id: 'subgroup-voice',
        name: '语音识别',
        children: voiceItems,
      })
    }
    
    if (mediaFeatures.length > 0) {
      featuresChildren.push({
        id: 'subgroup-media-features',
        name: '多媒体功能',
        children: mediaFeatures,
      })
    }
    
    if (featuresChildren.length > 0) {
      groups.push({
        id: 'group-features',
        name: '功能模块',
        children: featuresChildren,
      })
    }

    // 5. 消息处理（增加子分组）
    const messageChildren: TreeNode[] = []
    
    // 5.1 消息过滤子分组
    if (data.message_receive) {
      const receiveItems = buildTreeData({ message_receive: data.message_receive }, '')[0]?.children || []
      messageChildren.push({
        id: 'subgroup-message-filter',
        name: '消息过滤',
        children: receiveItems,
      })
    }
    
    // 5.2 回复处理子分组
    const replyProcessing: TreeNode[] = []
    if (data.response_post_process) {
      const postProcessItems = buildTreeData({ response_post_process: data.response_post_process }, '')[0]?.children || []
      replyProcessing.push({
        id: 'subgroup-post-process',
        name: '后处理总开关',
        children: postProcessItems,
      })
    }
    if (data.chinese_typo) {
      const typoItems = buildTreeData({ chinese_typo: data.chinese_typo }, '')[0]?.children || []
      replyProcessing.push({
        id: 'subgroup-typo',
        name: '错别字生成',
        children: typoItems,
      })
    }
    if (data.response_splitter) {
      const splitterItems = buildTreeData({ response_splitter: data.response_splitter }, '')[0]?.children || []
      replyProcessing.push({
        id: 'subgroup-splitter',
        name: '回复分割',
        children: splitterItems,
      })
    }
    
    if (replyProcessing.length > 0) {
      messageChildren.push({
        id: 'subgroup-reply-processing',
        name: '回复处理',
        children: replyProcessing,
      })
    }
    
    if (messageChildren.length > 0) {
      groups.push({
        id: 'group-message',
        name: '消息处理',
        children: messageChildren,
      })
    }

    // 6. 系统配置（增加子分组）
    const systemChildren: TreeNode[] = []
    
    // 6.1 运行配置子分组
    const runtimeConfig: TreeNode[] = []
    if (data.log) {
      const logItems = buildTreeData({ log: data.log }, '')[0]?.children || []
      runtimeConfig.push({
        id: 'subgroup-log',
        name: '日志配置',
        children: logItems,
      })
    }
    if (data.debug) {
      const debugItems = buildTreeData({ debug: data.debug }, '')[0]?.children || []
      runtimeConfig.push({
        id: 'subgroup-debug',
        name: '调试选项',
        children: debugItems,
      })
    }
    
    if (runtimeConfig.length > 0) {
      systemChildren.push({
        id: 'subgroup-runtime',
        name: '运行配置',
        children: runtimeConfig,
      })
    }
    
    // 6.2 服务配置子分组
    const serviceConfig: TreeNode[] = []
    if (data.maim_message) {
      const maimItems = buildTreeData({ maim_message: data.maim_message }, '')[0]?.children || []
      serviceConfig.push({
        id: 'subgroup-maim',
        name: 'MAIM消息服务',
        children: maimItems,
      })
    }
    if (data.telemetry) {
      const telemetryItems = buildTreeData({ telemetry: data.telemetry }, '')[0]?.children || []
      serviceConfig.push({
        id: 'subgroup-telemetry',
        name: '遥测统计',
        children: telemetryItems,
      })
    }
    
    if (serviceConfig.length > 0) {
      systemChildren.push({
        id: 'subgroup-service',
        name: '服务配置',
        children: serviceConfig,
      })
    }
    
    if (systemChildren.length > 0) {
      groups.push({
        id: 'group-system',
        name: '系统配置',
        children: systemChildren,
      })
    }

    // 7. 其他配置（未分类的）
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
    const currentConfig = activeConfig === 'bot' ? botConfig : modelConfig
    if (!currentConfig) return []

    // 根据配置类型返回分组后的树结构
    if (activeConfig === 'bot' && botConfig) {
      return groupBotConfig(botConfig.data || {})
    } else if (activeConfig === 'model' && modelConfig) {
      return groupModelConfig(modelConfig.data || {})
    }
    
    return []
  }, [botConfig, modelConfig, activeConfig])

  // 获取值的类型
  const getValueType = (value: any): string => {
    if (value === null) return 'null'
    if (Array.isArray(value)) return 'array'
    return typeof value
  }

  // 处理节点选择
  const handleNodeSelect = (node: TreeNode | null) => {
    if (!node || !node.data) return
    
    const currentConfig = activeConfig === 'bot' ? botConfig : modelConfig
    if (!currentConfig) return

    const path = node.data.path
    setSelectedPath(path)

    // 获取当前值
    const value = node.data.value
    setEditValue(value)
  }

  // 根据路径获取值
  const getValueByPath = (obj: any, path: string): any => {
    const keys = path.split(/\.|\[|\]/).filter(Boolean)
    let current = obj
    for (const key of keys) {
      if (current == null) return undefined
      current = current[key]
    }
    return current
  }

  // 保存更改
  const handleSave = async () => {
    setSaving(true)
    try {
      if (editMode === 'text') {
        // 文本模式：保存原始文本
        if (activeConfig === 'bot') {
          await saveBotConfigRaw(rawText, instanceId)
          const [bot, botRaw] = await Promise.all([
            getBotConfig(instanceId),
            getBotConfigRaw(instanceId),
          ])
          setBotConfig(bot)
          setRawText(botRaw)
          setOriginalRawText(botRaw)
        } else {
          await saveModelConfigRaw(rawText, instanceId)
          const [model, modelRaw] = await Promise.all([
            getModelConfig(instanceId),
            getModelConfigRaw(instanceId),
          ])
          setModelConfig(model)
          setRawText(modelRaw)
          setOriginalRawText(modelRaw)
        }
      } else {
        // 树形模式：保存单个配置项
        if (!selectedPath) return
        
        const request: ConfigUpdateRequest = {
          key_path: selectedPath,
          value: editValue,
        }

        if (activeConfig === 'bot') {
          const updated = await updateBotConfig(request, instanceId)
          setBotConfig(updated)
        } else {
          const updated = await updateModelConfig(request, instanceId)
          setModelConfig(updated)
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

  // 渲染编辑器
  const renderEditor = () => {
    if (!selectedPath) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>请在左侧选择一个配置项</p>
          </div>
        </div>
      )
    }

    const valueType = getValueType(editValue)
    const currentConfig = activeConfig === 'bot' ? botConfig : modelConfig
    const comment = currentConfig?.comments[selectedPath]

    return (
      <div className="space-y-4 p-6">
        <div>
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            配置路径
          </Label>
          <Input
            value={selectedPath}
            disabled
            className="mt-1 bg-gray-50 dark:bg-gray-800"
          />
        </div>

        {comment && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">{comment}</p>
          </div>
        )}

        <div>
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            值类型: {valueType}
          </Label>
          
          {valueType === 'string' && (
            editValue && editValue.length > 100 ? (
              <Textarea
                value={editValue}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setEditValue(e.target.value)
                  setHasChanges(true)
                }}
                className="mt-1 min-h-[120px] font-mono text-sm"
                placeholder="输入字符串值"
              />
            ) : (
              <Input
                type="text"
                value={editValue || ''}
                onChange={(e) => {
                  setEditValue(e.target.value)
                  setHasChanges(true)
                }}
                className="mt-1"
                placeholder="输入字符串值"
              />
            )
          )}

          {valueType === 'number' && (
            <Input
              type="number"
              value={editValue ?? ''}
              onChange={(e) => {
                setEditValue(Number(e.target.value))
                setHasChanges(true)
              }}
              className="mt-1"
              placeholder="输入数字"
            />
          )}

          {valueType === 'boolean' && (
            <div className="flex items-center space-x-2 mt-2">
              <Switch
                checked={editValue}
                onCheckedChange={(checked: boolean) => {
                  setEditValue(checked)
                  setHasChanges(true)
                }}
              />
              <Label>{editValue ? '是' : '否'}</Label>
            </div>
          )}

          {valueType === 'array' && (
            <Textarea
              value={JSON.stringify(editValue, null, 2)}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                try {
                  setEditValue(JSON.parse(e.target.value))
                  setHasChanges(true)
                } catch {
                  // 保持原值
                }
              }}
              className="mt-1 min-h-[200px] font-mono text-sm"
              placeholder="JSON 数组格式"
            />
          )}

          {valueType === 'object' && (
            <Textarea
              value={JSON.stringify(editValue, null, 2)}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                try {
                  setEditValue(JSON.parse(e.target.value))
                  setHasChanges(true)
                } catch {
                  // 保持原值
                }
              }}
              className="mt-1 min-h-[200px] font-mono text-sm"
              placeholder="JSON 对象格式"
            />
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存更改
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const currentConfig = activeConfig === 'bot' ? botConfig : modelConfig
              const originalValue = getValueByPath(currentConfig?.data || {}, selectedPath)
              setEditValue(originalValue)
              setHasChanges(false)
            }}
            disabled={!hasChanges}
          >
            重置
          </Button>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 毛玻璃背景 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
      />

      {/* 模态框容器 - 70% 大小 */}
      <div className="relative w-[70vw] h-[70vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              配置管理
            </h2>
            
            {/* 编辑模式切换 */}
            <div className="flex gap-2 border-l pl-4 border-gray-300 dark:border-gray-600">
              <Button
                variant={editMode === 'tree' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setEditMode('tree')
                  setHasChanges(false)
                }}
                title="树形编辑器"
              >
                <FileJson className="w-4 h-4 mr-2" />
                树形
              </Button>
              <Button
                variant={editMode === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setEditMode('text')
                  setHasChanges(rawText !== originalRawText)
                }}
                title="文本编辑器"
              >
                <FileCode className="w-4 h-4 mr-2" />
                文本
              </Button>
            </div>
            
            {/* 配置类型切换 */}
            <div className="flex gap-2 border-l pl-4 border-gray-300 dark:border-gray-600">
              <Button
                variant={activeConfig === 'bot' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveConfig('bot')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Bot Config
              </Button>
              <Button
                variant={activeConfig === 'model' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveConfig('model')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Model Config
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : editMode === 'text' ? (
            /* 文本编辑模式 */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <TomlEditor
                  value={rawText}
                  onChange={(value) => {
                    setRawText(value)
                    setHasChanges(value !== originalRawText)
                  }}
                  className="w-full h-full"
                />
              </div>
              
              {/* 保存按钮区域 */}
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <Button
                  variant="default"
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="flex-shrink-0"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存更改
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRawText(originalRawText)
                    setHasChanges(false)
                  }}
                  disabled={!hasChanges}
                >
                  重置
                </Button>
              </div>
            </div>
          ) : (
            /* 树形编辑模式 */
            <>
              {/* 左侧树形结构 */}
              <div className="w-2/5 border-r border-gray-200 dark:border-gray-700 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4 h-full">
                    <ConfigTreeView
                      data={treeData}
                      onSelect={handleNodeSelect}
                      selectedId={selectedPath}
                    />
                  </div>
                </ScrollArea>
              </div>

              {/* 右侧编辑器 */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  {renderEditor()}
                </ScrollArea>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
