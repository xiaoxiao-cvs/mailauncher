/**
 * 配置项的中文名称映射
 */
export const configLabels: Record<string, string> = {
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

export const getConfigHint = (path: string, comments: Record<string, string>): string => {
  if (configLabels[path]) return configLabels[path]
  const c = comments[path]
  if (!c) return ''
  const fl = c.split('\n')[0].replace(/^#\s*/, '')
  const simplified = fl.replace(/^建议[^，]*，?/, '')
  return simplified.length > 28 ? simplified.slice(0, 28) + '…' : simplified
}

export const getConfigLabel = (key: string, path: string): string => {
  if (configLabels[path]) {
    return configLabels[path]
  }
  return key
}
