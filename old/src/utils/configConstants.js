// 字段显示名称映射
export const FIELD_LABELS = {
  // Bot 基本信息
  'qq_account': 'QQ账号',
  'nickname': '昵称',
  'alias_names': '别名',
  'version': '版本',
  
  // 人格设置
  'personality_core': '核心人格',
  'personality_sides': '人格侧面',
  'compress_personality': '压缩人格',
  
  // 身份设置
  'identity_detail': '身份详情',
  'compress_indentity': '压缩身份',
  
  // 表达风格
  'enable_expression': '启用表达风格',
  'expression_style': '表达风格',
  'enable_expression_learning': '启用表达学习',
  'learning_interval': '学习间隔',
  'expression_groups': '表达分组',
  
  // 关系管理
  'enable_relationship': '启用关系管理',
  'relation_frequency': '关系频率',
  
  // 聊天设置
  'chat_mode': '聊天模式',
  'max_context_size': '上下文长度',
  'replyer_random_probability': '首要回复模型概率',
  'talk_frequency': '回复频率',
  'time_based_talk_frequency': '基于时段的回复频率',
  'talk_frequency_adjust': '个性化时段频率',
  'auto_focus_threshold': '自动聚焦阈值',
  'exit_focus_threshold': '退出聚焦阈值',
  
  // 消息接收过滤
  'ban_words': '禁用词列表',
  'ban_msgs_regex': '禁用消息正则',
  
  // 普通聊天
  'emoji_chance': '表情包使用概率',
  'thinking_timeout': '思考超时时间',
  'willing_mode': '回复意愿模式',
  'response_interested_rate_amplifier': '兴趣度放大系数',
  'mentioned_bot_inevitable_reply': '提及必然回复',
  'at_bot_inevitable_reply': '@必然回复',
  'enable_planner': '启用动作规划器',
  
  // 专注聊天
  'think_interval': '思考间隔',
  'consecutive_replies': '连续回复能力',
  'compressed_length': '心流压缩长度',
  'compress_length_limit': '最多压缩份数',
  'working_memory_processor': '工作记忆处理器',
  
  // 工具设置
  'enable_in_normal_chat': '普通聊天启用工具',
  'enable_in_focus_chat': '专注聊天启用工具',
  
  // 表情包设置
  'max_reg_num': '最大注册数量',
  'do_replace': '达到上限时替换',
  'check_interval': '检查间隔',
  'steal_emoji': '偷取表情包',
  'content_filtration': '内容过滤',
  'filtration_prompt': '过滤要求',
  
  // 内存管理
  'enable_memory': '启用记忆系统',
  'memory_build_interval': '记忆构建间隔',
  'memory_build_distribution': '记忆构建分布',
  'memory_build_sample_num': '采样数量',
  'memory_build_sample_length': '采样长度',
  'memory_compress_rate': '记忆压缩率',
  'forget_memory_interval': '记忆遗忘间隔',
  'memory_forget_time': '遗忘时间',
  'memory_forget_percentage': '遗忘比例',
  'consolidate_memory_interval': '记忆整合间隔',
  'consolidation_similarity_threshold': '相似度阈值',
  'consolidation_check_percentage': '检查节点比例',
  'memory_ban_words': '记忆禁用词',
  
  // 心情管理
  'enable_mood': '启用情绪系统',
  'mood_update_interval': '情绪更新间隔',
  'mood_decay_rate': '情绪衰减率',
  'mood_intensity_factor': '情绪强度因子',
  
  // LPMM 知识库
  'enable': '启用功能',
  'rag_synonym_search_top_k': '同义词搜索TopK',
  'rag_synonym_threshold': '同义词阈值',
  'info_extraction_workers': '实体提取线程数',
  'qa_relation_search_top_k': '关系搜索TopK',
  'qa_relation_threshold': '关系阈值',
  'qa_paragraph_search_top_k': '段落搜索TopK',
  'qa_paragraph_node_weight': '段落节点权重',
  'qa_ent_filter_top_k': '实体过滤TopK',
  'qa_ppr_damping': 'PPR阻尼系数',
  'qa_res_top_k': '最终结果TopK',
  
  // 关键词反应
  'keyword_rules': '关键词规则',
  'regex_rules': '正则规则',
  'keywords': '关键词',
  'reaction': '反应内容',
  'regex': '正则表达式',
  
  // 响应后处理
  'enable_response_post_process': '启用响应后处理',
  
  // 中文错别字
  'error_rate': '单字替换概率',
  'min_freq': '最小字频阈值',
  'tone_error_rate': '声调错误概率',
  'word_replace_rate': '整词替换概率',
  
  // 响应分割器
  'max_length': '最大长度',
  'max_sentence_num': '最大句子数',
  'enable_kaomoji_protection': '颜文字保护',
  
  // 日志设置
  'date_style': '日期格式',
  'log_level_style': '日志级别样式',
  'color_text': '彩色文本',
  'log_level': '全局日志级别',
  'console_log_level': '控制台日志级别',
  'file_log_level': '文件日志级别',
  'suppress_libraries': '屏蔽的库',
  'library_log_levels': '库日志级别',
  
  // 模型配置
  'model_max_output_length': '最大输出长度',
  'name': '模型名称',
  'provider': '提供商',
  'pri_in': '输入价格',
  'pri_out': '输出价格',
  'temp': '温度参数',
  'enable_thinking': '启用思考',
  'thinking_budget': '思考最长长度',
  'stream': '流式输出',
  
  // MaiM消息服务
  'auth_token': '认证令牌',
  'use_custom': '自定义服务器',
  'host': '主机地址',
  'port': '端口',
  'mode': '连接模式',
  'use_wss': 'WSS安全连接',
  'cert_file': 'SSL证书文件',
  'key_file': 'SSL密钥文件',
  
  // 遥测数据
  'enable': '启用功能',
  
  // 实验性功能
  'debug_show_chat_mode': '显示聊天模式',
  'enable_friend_chat': '启用好友聊天',
  
  // 新增字段标签
  'willing_mode': '回复意愿模式',
  'thinking_budget': '思考预算',
  'stream': '流式输出',
  'suppress_libraries': '屏蔽的库',
  'library_log_levels': '库日志级别',
  'model_max_output_length': '最大输出长度',
  'forget_memory_interval': '记忆遗忘间隔',
  'memory_forget_time': '遗忘时间',
  'memory_forget_percentage': '遗忘比例',
  'consolidate_memory_interval': '记忆整合间隔',
  'consolidation_similarity_threshold': '相似度阈值',
  'consolidation_check_percentage': '检查节点比例'
}

// 字段描述映射
export const FIELD_DESCRIPTIONS = {
  'qq_account': '机器人的QQ账号',
  'nickname': '机器人的显示昵称',
  'alias_names': '机器人的别名列表，用于识别呼叫',
  'version': '机器人内核版本',
  'personality_core': '描述机器人的核心人格特征',
  'personality_sides': '描述人格的不同侧面特征',
  'compress_personality': '启用人格信息压缩处理',
  'identity_detail': '机器人的身份背景信息',
  'compress_indentity': '启用身份信息压缩处理',
  'enable_expression': '启用个性化的表达风格',
  'expression_style': '描述机器人的说话风格和表达习惯',
  'enable_expression_learning': '启用表达风格学习功能',
  'learning_interval': '表达学习的时间间隔（秒）',
  'expression_groups': '设置互通组，相同组的chat_id会共享学习到的表达方式',
  'enable_relationship': '启用用户关系管理功能',
  'relation_frequency': '关系更新的频率设置',
  'chat_mode': '选择聊天的工作模式',
  'max_context_size': '聊天上下文的最大保留长度',
  'replyer_random_probability': '主动回复的随机概率（0-1）',
  'talk_frequency': '基础聊天频率设置',
  'time_based_talk_frequency': '基于时段的回复频率配置',
  'talk_frequency_adjust': '基于聊天流的个性化时段频率配置',
  'auto_focus_threshold': '触发自动聚焦的消息数量',
  'exit_focus_threshold': '退出聚焦模式的阈值',
  'enable_memory': '启用智能内存管理功能',
  'enable_mood': '启用动态心情变化系统',
  'mood_decay_rate': '心情值的自然衰减速率',
  'willing_mode': '回复意愿模式选择',
  'thinking_timeout': '最长思考规划时间（秒）',
  'thinking_budget': '模型思考最长长度限制',
  'stream': '是否使用流式输出',
  'auth_token': '用于API验证的认证令牌',
  'use_custom': '是否启用自定义的MaiM消息服务器',
  'mode': '连接模式，支持ws和tcp',
  'use_wss': '是否使用WSS安全连接'
}

// 动态选项配置
export const DYNAMIC_OPTIONS = {
  'chat.chat_mode': [
    { value: 'normal', label: '普通模式 - 针对感兴趣的消息进行回复' },
    { value: 'focus', label: '专注模式 - 主动观察和回复' },
    { value: 'auto', label: '自动模式 - 在普通和专注模式间自动切换' }
  ],
  'normal_chat.willing_mode': [
    { value: 'classical', label: '经典模式' },
    { value: 'mxp', label: 'MXP模式' },
    { value: 'custom', label: '自定义模式' }
  ],
  'maim_message.mode': [
    { value: 'ws', label: 'WebSocket' },
    { value: 'tcp', label: 'TCP' }
  ],
  'log.log_level_style': [
    { value: 'FULL', label: '完整样式' },
    { value: 'compact', label: '紧凑样式' },
    { value: 'lite', label: '精简样式' }
  ],
  'log.color_text': [
    { value: 'none', label: '无颜色' },
    { value: 'title', label: '仅标题有颜色' },
    { value: 'full', label: '全彩色' }
  ],
  'safety.filter_strength': [
    { value: 'low', label: '低 - 基础过滤' },
    { value: 'medium', label: '中 - 标准过滤' },
    { value: 'high', label: '高 - 严格过滤' },
    { value: 'strict', label: '极严格 - 最高级过滤' }
  ],
  'log.log_level': [
    { value: 'DEBUG', label: 'DEBUG - 详细调试信息' },
    { value: 'INFO', label: 'INFO - 一般信息' },
    { value: 'WARNING', label: 'WARNING - 警告信息' },
    { value: 'ERROR', label: 'ERROR - 错误信息' },
    { value: 'CRITICAL', label: 'CRITICAL - 严重错误' }
  ],
  'log.console_log_level': [
    { value: 'DEBUG', label: 'DEBUG - 详细调试信息' },
    { value: 'INFO', label: 'INFO - 一般信息' },
    { value: 'WARNING', label: 'WARNING - 警告信息' },
    { value: 'ERROR', label: 'ERROR - 错误信息' },
    { value: 'CRITICAL', label: 'CRITICAL - 严重错误' }
  ],
  'log.file_log_level': [
    { value: 'DEBUG', label: 'DEBUG - 详细调试信息' },
    { value: 'INFO', label: 'INFO - 一般信息' },
    { value: 'WARNING', label: 'WARNING - 警告信息' },
    { value: 'ERROR', label: 'ERROR - 错误信息' },
    { value: 'CRITICAL', label: 'CRITICAL - 严重错误' }
  ]
}

// 配置节信息
export const SECTION_CONFIG = {
  'bot': { title: '基本信息', icon: 'mdi:robot', iconClass: 'text-blue-500' },
  'personality': { title: '人格设置', icon: 'mdi:account-heart', iconClass: 'text-pink-500' },
  'identity': { title: '身份设置', icon: 'mdi:account-details', iconClass: 'text-indigo-500' },
  'expression': { title: '表达风格', icon: 'mdi:message-text', iconClass: 'text-green-500' },
  'relationship': { title: '关系管理', icon: 'mdi:account-group', iconClass: 'text-purple-500' },
  'chat': { title: '聊天设置', icon: 'mdi:chat', iconClass: 'text-orange-500' },
  'message_receive': { title: '消息接收', icon: 'mdi:message-reply', iconClass: 'text-teal-400' },
  'normal_chat': { title: '普通聊天', icon: 'mdi:chat-outline', iconClass: 'text-blue-400' },
  'focus_chat': { title: '聚焦聊天', icon: 'mdi:target', iconClass: 'text-red-500' },
  'tool': { title: '工具设置', icon: 'mdi:tools', iconClass: 'text-gray-500' },
  'emoji': { title: '表情设置', icon: 'mdi:emoticon', iconClass: 'text-yellow-500' },
  'memory': { title: '内存管理', icon: 'mdi:memory', iconClass: 'text-cyan-500' },
  'mood': { title: '心情管理', icon: 'mdi:emoticon-happy', iconClass: 'text-yellow-500' },
  'lpmm_knowledge': { title: 'LPMM 知识库', icon: 'mdi:book-open-page-variant', iconClass: 'text-teal-500' },
  'keyword_reaction': { title: '关键词反应', icon: 'mdi:key-variant', iconClass: 'text-red-500' },
  'response_post_process': { title: '响应后处理', icon: 'mdi:cog-refresh', iconClass: 'text-indigo-400' },
  'chinese_typo': { title: '中文错字', icon: 'mdi:spell-check', iconClass: 'text-orange-400' },
  'response_splitter': { title: '响应分割', icon: 'mdi:content-cut', iconClass: 'text-purple-400' },
  'log': { title: '日志设置', icon: 'mdi:file-document-outline', iconClass: 'text-gray-600' },
  'model': { title: '模型配置', icon: 'mdi:brain', iconClass: 'text-pink-600' },
  'maim_message': { title: '消息服务', icon: 'mdi:message-processing', iconClass: 'text-blue-600' },
  'telemetry': { title: '遥测数据', icon: 'mdi:chart-line', iconClass: 'text-green-600' },
  'experimental': { title: '实验功能', icon: 'mdi:flask', iconClass: 'text-yellow-600' },
  'learning': { title: '学习与进化', icon: 'mdi:brain', iconClass: 'text-pink-500' },
  'safety': { title: '安全与过滤', icon: 'mdi:shield-check', iconClass: 'text-emerald-500' }
}

// 模型名称映射
export const MODEL_DISPLAY_NAMES = {
  'utils': '工具模型 - 表情包模块、取名模块等',
  'utils_small': '小型工具模型 - 建议使用免费小模型',
  'replyer_1': '首要回复模型 - 用于表达器和表达方式学习',
  'replyer_2': '次要回复模型',
  'memory_summary': '记忆摘要模型',
  'vlm': '视觉语言模型 - 图像识别',
  'planner': '规划模型 - 决策麦麦该做什么',
  'relation': '关系模型 - 处理麦麦和其他人的关系',
  'tool_use': '工具使用模型 - 需要支持工具调用',
  'embedding': '嵌入模型',
  'focus_working_memory': '专注工作记忆模型',
  'lpmm_entity_extract': 'LPMM实体提取模型',
  'lpmm_rdf_build': 'LPMM RDF构建模型',
  'lpmm_qa': 'LPMM问答模型'
}

// 工具函数
export const getFieldLabel = (key) => {
  return FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export const getFieldDescription = (key, parentSection = '') => {
  if (FIELD_DESCRIPTIONS[key]) {
    return FIELD_DESCRIPTIONS[key]
  }
  
  // 特殊情况处理
  if (key === 'enable') {
    if (parentSection === 'lpmm_knowledge') {
      return '启用 LPMM 知识库功能'
    } else if (parentSection === 'telemetry') {
      return '启用遥测数据发送，主要用于统计全球麦麦数量'
    } else if (parentSection === 'chinese_typo') {
      return '启用中文错别字生成器'
    } else if (parentSection === 'response_splitter') {
      return '启用回复分割器'
    } else {
      return '启用该功能模块'
    }
  }
  
  if (key === 'keywords' && parentSection === 'keyword_reaction') {
    return '触发该反应的关键词列表'
  }
  
  if (key === 'reaction' && parentSection === 'keyword_reaction') {
    return '检测到关键词时的回复内容'
  }
  
  if (key === 'regex' && parentSection === 'keyword_reaction') {
    return '正则表达式匹配模式'
  }
  
  return `配置${getFieldLabel(key)}的相关设置`
}

export const getDynamicOptions = (fieldPath) => {
  return DYNAMIC_OPTIONS[fieldPath] || []
}

export const getFieldConfig = (key, value, parentPath = '') => {
  const fullPath = parentPath ? `${parentPath}.${key}` : key
  
  // 基础类型判断
  if (typeof value === 'boolean') {
    return { type: 'switch', path: fullPath }
  } else if (typeof value === 'number') {
    // 特殊数字字段处理
    if (key.includes('rate') || key.includes('probability') || key.includes('threshold')) {
      return { type: 'number', step: 0.01, min: 0, max: 1, path: fullPath }
    } else if (key.includes('interval') || key.includes('timeout')) {
      return { type: 'number', step: 1, min: 0, path: fullPath }
    } else if (key === 'port') {
      return { type: 'number', step: 1, min: 1, max: 65535, path: fullPath }
    } else if (key === 'qq_account') {
      return { type: 'number', step: 1, min: 10000, path: fullPath }
    } else {
      return { type: 'number', path: fullPath }
    }
  } else if (typeof value === 'string') {
    // 特殊字符串字段处理
    if (key.includes('style') || key.includes('prompt') || key === 'personality_core' || key === 'expression_style') {
      return { type: 'textarea', rows: 3, path: fullPath }
    } else if (key === 'reaction') {
      return { type: 'textarea', rows: 2, path: fullPath }
    } else if (getDynamicOptions(fullPath).length > 0) {
      return { type: 'select', options: getDynamicOptions(fullPath), path: fullPath }
    } else {
      return { type: 'input', path: fullPath }
    }
  } else if (Array.isArray(value)) {
    // 数组类型处理
    if (value.length === 0 || typeof value[0] === 'string') {
      // 特殊的复杂数组类型
      if (key === 'expression_groups' || key === 'talk_frequency_adjust') {
        return { type: 'complex-array', path: fullPath }
      } else if (key === 'time_based_talk_frequency') {
        return { type: 'time-frequency-array', path: fullPath }
      } else if (key === 'keyword_rules' || key === 'regex_rules') {
        return { type: 'rule-array', path: fullPath }
      } else {
        return { type: 'string-array', path: fullPath }
      }
    } else if (typeof value[0] === 'number') {
      return { type: 'number-array', path: fullPath }
    } else if (typeof value[0] === 'object') {
      return { type: 'object-array', path: fullPath }
    } else {
      return { type: 'array', path: fullPath }
    }
  } else if (typeof value === 'object' && value !== null) {
    // 对象类型处理
    if (key === 'library_log_levels') {
      return { type: 'key-value-object', path: fullPath }
    } else {
      return { type: 'object', path: fullPath }
    }
  }
  
  return { type: 'input', path: fullPath }
}

export const generateConfigSections = (config) => {
  if (!config) return []
  
  const sections = []
  const skipSections = ['inner'] // 跳过内部版本信息
  
  // 定义节的显示顺序
  const sectionOrder = [
    'bot',
    'personality', 
    'identity',
    'expression',
    'relationship',
    'chat',
    'message_receive',
    'normal_chat',
    'focus_chat',
    'tool',
    'emoji',
    'memory',
    'mood',
    'lpmm_knowledge',
    'keyword_reaction',
    'response_post_process',
    'chinese_typo',
    'response_splitter',
    'log',
    'model',
    'maim_message',
    'telemetry',
    'experimental'
  ]
  
  // 按顺序添加已定义的节
  sectionOrder.forEach(sectionKey => {
    if (config[sectionKey] && !skipSections.includes(sectionKey)) {
      const sectionData = config[sectionKey]
      if (typeof sectionData === 'object' && sectionData !== null) {
        const sectionInfo = SECTION_CONFIG[sectionKey] || {
          title: getFieldLabel(sectionKey),
          icon: 'mdi:cog',
          iconClass: 'text-gray-500'
        }
        
        sections.push({
          key: sectionKey,
          ...sectionInfo,
          data: sectionData
        })
      }
    }
  })
  
  // 添加未预定义的其他节
  Object.keys(config).forEach(sectionKey => {
    if (skipSections.includes(sectionKey) || sectionOrder.includes(sectionKey)) return
    
    const sectionData = config[sectionKey]
    if (typeof sectionData !== 'object' || sectionData === null) return
    
    const sectionInfo = SECTION_CONFIG[sectionKey] || {
      title: getFieldLabel(sectionKey),
      icon: 'mdi:cog',
      iconClass: 'text-gray-500'
    }
    
    sections.push({
      key: sectionKey,
      ...sectionInfo,
      data: sectionData
    })
  })
  
  return sections
}

// 工具函数用于处理复杂配置项

// 验证时间频率格式 "HH:MM,frequency"
export const validateTimeFrequency = (value) => {
  const timeFreqRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9],\d+(\.\d+)?$/
  return timeFreqRegex.test(value)
}

// 验证表达分组格式 ["platform:id:type", ...]
export const validateExpressionGroup = (group) => {
  if (!Array.isArray(group) || group.length === 0) return false
  const chatIdRegex = /^[a-zA-Z_]+:\d+:(private|group)$/
  return group.every(item => typeof item === 'string' && chatIdRegex.test(item))
}

// 验证聊天频率调整格式 [["platform:id:type", "HH:MM,frequency", ...], ...]
export const validateTalkFrequencyAdjust = (adjust) => {
  if (!Array.isArray(adjust)) return false
  return adjust.every(item => {
    if (!Array.isArray(item) || item.length < 2) return false
    const [chatId, ...timeFreqs] = item
    const chatIdRegex = /^[a-zA-Z_]+:\d+:(private|group)$/
    return chatIdRegex.test(chatId) && timeFreqs.every(validateTimeFrequency)
  })
}

// 验证关键词规则格式
export const validateKeywordRule = (rule) => {
  return (
    typeof rule === 'object' &&
    Array.isArray(rule.keywords) &&
    rule.keywords.length > 0 &&
    rule.keywords.every(k => typeof k === 'string') &&
    typeof rule.reaction === 'string' &&
    rule.reaction.trim().length > 0
  )
}

// 验证正则规则格式
export const validateRegexRule = (rule) => {
  return (
    typeof rule === 'object' &&
    Array.isArray(rule.regex) &&
    rule.regex.length > 0 &&
    rule.regex.every(r => typeof r === 'string') &&
    typeof rule.reaction === 'string' &&
    rule.reaction.trim().length > 0
  )
}

// 获取配置项的验证函数
export const getFieldValidator = (key, parentPath = '') => {
  const fullPath = parentPath ? `${parentPath}.${key}` : key
  
  switch (key) {
    case 'time_based_talk_frequency':
      return (value) => Array.isArray(value) && value.every(validateTimeFrequency)
    case 'expression_groups':
      return (value) => Array.isArray(value) && value.every(validateExpressionGroup)
    case 'talk_frequency_adjust':
      return (value) => validateTalkFrequencyAdjust(value)
    case 'keyword_rules':
      return (value) => Array.isArray(value) && value.every(validateKeywordRule)
    case 'regex_rules':
      return (value) => Array.isArray(value) && value.every(validateRegexRule)
    case 'qq_account':
      return (value) => typeof value === 'number' && value >= 10000
    case 'port':
      return (value) => typeof value === 'number' && value >= 1 && value <= 65535
    default:
      return null
  }
}

// 获取字段的默认值
export const getFieldDefaultValue = (key, type) => {
  switch (type) {
    case 'boolean':
      return false
    case 'number':
      if (key.includes('rate') || key.includes('probability') || key.includes('threshold')) {
        return 0.5
      } else if (key === 'port') {
        return 8080
      } else if (key === 'qq_account') {
        return 1000000
      } else {
        return 0
      }
    case 'string':
      return ''
    case 'array':
    case 'string-array':
    case 'number-array':
    case 'object-array':
      return []
    case 'object':
      return {}
    default:
      return null
  }
}

// 格式化配置值用于显示
export const formatConfigValue = (value, key) => {
  if (value === null || value === undefined) {
    return '未设置'
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '空数组'
    } else if (value.length <= 3) {
      return value.join(', ')
    } else {
      return `${value.slice(0, 3).join(', ')}... (共${value.length}项)`
    }
  }
  
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) {
      return '空对象'
    } else if (keys.length <= 3) {
      return keys.join(', ')
    } else {
      return `${keys.slice(0, 3).join(', ')}... (共${keys.length}项)`
    }
  }
  
  if (typeof value === 'string' && value.length > 50) {
    return value.substring(0, 50) + '...'
  }
  
  return String(value)
}
