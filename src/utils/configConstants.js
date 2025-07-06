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
  'enable_expression_learning': '表达学习',
  'learning_interval': '学习间隔',
  'expression_groups': '表达分组',
  
  // 关系管理
  'enable_relationship': '启用关系管理',
  'relation_frequency': '关系频率',
  
  // 聊天设置
  'chat_mode': '聊天模式',
  'max_context_size': '最大上下文长度',
  'replyer_random_probability': '回复随机概率',
  'talk_frequency': '聊天频率',
  'time_based_talk_frequency': '时间聊天频率',
  'talk_frequency_adjust': '聊天频率调整',
  'auto_focus_threshold': '自动聚焦阈值',
  'exit_focus_threshold': '退出聚焦阈值',
  
  // 内存管理
  'enable_memory': '启用内存管理',
  'memory_build_interval': '内存构建间隔',
  'memory_build_distribution': '内存构建分布',
  'memory_build_sample_num': '内存采样数量',
  'memory_build_sample_length': '内存采样长度',
  'memory_compress_rate': '内存压缩率',
  'forget_memory_interval': '遗忘间隔',
  'memory_forget_time': '遗忘时间',
  'memory_forget_percentage': '遗忘百分比',
  'consolidate_memory_interval': '整合间隔',
  'consolidation_similarity_threshold': '整合相似度阈值',
  'consolidation_check_percentage': '整合检查百分比',
  'memory_ban_words': '内存禁用词',
  
  // 心情管理
  'enable_mood': '启用心情系统',
  'mood_update_interval': '心情更新间隔',
  'mood_decay_rate': '心情衰减率',
  'mood_intensity_factor': '心情强度因子',
  
  // LPMM 知识库
  'enable': '启用知识库',
  'rag_synonym_search_top_k': 'RAG同义词搜索Top K',
  'rag_synonym_threshold': 'RAG同义词阈值',
  'info_extraction_workers': '信息提取工作者数',
  'qa_relation_search_top_k': 'QA关系搜索Top K',
  'qa_relation_threshold': 'QA关系阈值',
  'qa_paragraph_search_top_k': 'QA段落搜索Top K',
  'qa_paragraph_node_weight': 'QA段落节点权重',
  'qa_ent_filter_top_k': 'QA实体过滤Top K',
  'qa_ppr_damping': 'QA PPR阻尼',
  'qa_res_top_k': 'QA结果Top K',
  
  // 日志设置
  'date_style': '日期格式',
  'log_level_style': '日志级别样式',
  'color_text': '彩色文本',
  'log_level': '日志级别',
  'console_log_level': '控制台日志级别',
  'file_log_level': '文件日志级别',
  'suppress_libraries': '抑制库日志',
  'library_log_levels': '库日志级别'
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
  'enable_relationship': '启用用户关系管理功能',
  'relation_frequency': '关系更新的频率设置',
  'chat_mode': '选择聊天的工作模式',
  'max_context_size': '聊天上下文的最大保留长度',
  'replyer_random_probability': '主动回复的随机概率（0-1）',
  'talk_frequency': '基础聊天频率设置',
  'auto_focus_threshold': '触发自动聚焦的消息数量',
  'exit_focus_threshold': '退出聚焦模式的阈值',
  'enable_memory': '启用智能内存管理功能',
  'enable_mood': '启用动态心情变化系统',
  'mood_decay_rate': '心情值的自然衰减速率'
}

// 动态选项配置
export const DYNAMIC_OPTIONS = {
  'chat.chat_mode': [
    { value: 'normal', label: '普通模式' },
    { value: 'auto', label: '自动模式' },
    { value: 'manual', label: '手动模式' },
    { value: 'hybrid', label: '混合模式' },
    { value: 'silent', label: '静默模式' }
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
  'message_receive': { title: '消息接收', icon: 'mdi:message-reply', iconClass: 'text-teal-400' },
  'learning': { title: '学习与进化', icon: 'mdi:brain', iconClass: 'text-pink-500' },
  'safety': { title: '安全与过滤', icon: 'mdi:shield-check', iconClass: 'text-emerald-500' }
}

// 模型名称映射
export const MODEL_DISPLAY_NAMES = {
  'utils': '工具模型',
  'utils_small': '小型工具模型',
  'replyer_1': '回复模型 1',
  'replyer_2': '回复模型 2',
  'memory_summary': '记忆摘要模型',
  'vlm': '视觉语言模型',
  'planner': '规划模型',
  'relation': '关系模型',
  'tool_use': '工具使用模型',
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
  if (key === 'enable' && parentSection === 'lpmm_knowledge') {
    return '启用 LPMM 知识库功能'
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
    } else {
      return { type: 'number', path: fullPath }
    }
  } else if (typeof value === 'string') {
    // 特殊字符串字段处理
    if (key.includes('style') || key.includes('prompt') || key === 'personality_core') {
      return { type: 'textarea', rows: 3, path: fullPath }
    } else if (getDynamicOptions(fullPath).length > 0) {
      return { type: 'select', options: getDynamicOptions(fullPath), path: fullPath }
    } else {
      return { type: 'input', path: fullPath }
    }
  } else if (Array.isArray(value)) {
    // 数组类型处理
    if (value.length === 0 || typeof value[0] === 'string') {
      return { type: 'string-array', path: fullPath }
    } else if (typeof value[0] === 'number') {
      return { type: 'number-array', path: fullPath }
    } else {
      return { type: 'array', path: fullPath }
    }
  } else if (typeof value === 'object' && value !== null) {
    return { type: 'object', path: fullPath }
  }
  
  return { type: 'input', path: fullPath }
}

export const generateConfigSections = (config) => {
  if (!config) return []
  
  const sections = []
  const skipSections = ['inner']
  
  Object.keys(config).forEach(sectionKey => {
    if (skipSections.includes(sectionKey)) return
    
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
