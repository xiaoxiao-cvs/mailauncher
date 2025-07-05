<template>
    <transition name="bot-config-drawer" appear>
        <div v-if="isOpen" class="bot-config-drawer-backdrop" :data-no-sidebar="sidebarWidth === 0" @click="handleBackdropClick">
            <div class="bot-config-drawer-container" @click.stop>
                <!-- 头部 -->
                <div class="bot-config-header">
                    <div class="header-info">
                        <h2 class="bot-config-title">Bot 配置</h2>
                        <p class="instance-info">{{ instanceName }} ({{ instanceId }})</p>
                    </div>
                    <button class="btn btn-ghost btn-sm btn-circle" @click="closeDrawer" title="关闭">
                        <Icon icon="mdi:close" size="lg" />
                    </button>
                </div>

                <!-- 主体内容 -->
                <div class="bot-config-content">
                    <!-- 侧边栏导航 -->
                    <div class="bot-config-sidebar">
                        <nav class="bot-config-nav">
                            <button v-for="tab in configTabs" :key="tab.key" :class="[
                                'nav-item',
                                { active: activeTab === tab.key }
                            ]" @click="switchTab(tab.key)">
                                <Icon :icon="tab.icon" class="nav-icon" />
                                <span class="nav-label">{{ tab.title }}</span>
                            </button>
                        </nav>
                    </div>

                    <!-- 主内容区 -->
                    <div class="bot-config-main" @wheel.stop>
                        <!-- 配置面板切换动画容器 -->
                        <transition 
                            :name="panelTransitionName" 
                            mode="out-in" 
                            :duration="{ enter: 500, leave: 300 }"
                            appear
                        >
                            <!-- 动态组件包装器 -->
                            <div :key="activeTab" class="config-panel-wrapper">
                                <!-- Bot 配置面板 -->
                                <div v-if="activeTab === 'bot'" key="bot" class="config-panel">
                                    <div class="panel-header">
                                        <h3 class="panel-title">Bot 配置</h3>
                                        <p class="panel-description">配置机器人的基本设置和参数</p>
                                    </div>

                                    <div class="config-section" v-if="botConfig">
                                        <!-- 基本信息 -->
                                        <SettingGroup title="基本信息" icon="mdi:robot" icon-class="text-blue-500" v-if="botConfig.bot">
                                            <SettingInput
                                                label="QQ账号"
                                                description="机器人的QQ账号"
                                                type="number"
                                                v-model.number="botConfig.bot.qq_account"
                                                @change="markConfigChanged"
                                            />
                                            
                                            <SettingInput
                                                label="昵称"
                                                description="机器人的显示昵称"
                                                v-model="botConfig.bot.nickname"
                                                @change="markConfigChanged"
                                            />

                                            <div class="setting-item">
                                                <label class="setting-label">别名</label>
                                                <p class="setting-description">机器人的别名列表，用于识别呼叫</p>
                                                <div class="alias-list">
                                                    <div v-for="(alias, index) in botConfig.bot.alias_names" :key="index" class="alias-item">
                                                        <input 
                                                            type="text" 
                                                            v-model="botConfig.bot.alias_names[index]"
                                                            class="input input-bordered input-sm flex-1"
                                                            @change="markConfigChanged"
                                                        />
                                                        <button 
                                                            class="btn btn-ghost btn-xs text-error"
                                                            @click="removeAlias(index)"
                                                        >
                                                            <Icon icon="mdi:delete" class="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <button 
                                                        class="btn btn-outline btn-sm"
                                                        @click="addAlias"
                                                    >
                                                        <Icon icon="mdi:plus" class="w-4 h-4 mr-1" />
                                                        添加别名
                                                    </button>
                                                </div>
                                            </div>

                                            <SettingInput
                                                label="版本"
                                                description="机器人内核版本"
                                                v-model="botConfig.bot.version"
                                                @change="markConfigChanged"
                                                readonly
                                            />
                                        </SettingGroup>

                                        <!-- 人格设置 -->
                                        <SettingGroup title="人格设置" icon="mdi:account-heart" icon-class="text-pink-500" v-if="botConfig.personality">
                                            <SettingTextarea
                                                label="核心人格"
                                                description="描述机器人的核心人格特征"
                                                v-model="botConfig.personality.personality_core"
                                                @change="markConfigChanged"
                                                :rows="3"
                                            />

                                            <div class="setting-item">
                                                <label class="setting-label">人格侧面</label>
                                                <p class="setting-description">描述人格的不同侧面特征</p>
                                                <div class="personality-sides">
                                                    <div v-for="(side, index) in botConfig.personality.personality_sides" :key="index" class="personality-side-item">
                                                        <textarea 
                                                            v-model="botConfig.personality.personality_sides[index]"
                                                            class="textarea textarea-bordered textarea-sm flex-1"
                                                            @change="markConfigChanged"
                                                            rows="2"
                                                        ></textarea>
                                                        <button 
                                                            class="btn btn-ghost btn-xs text-error"
                                                            @click="removePersonalitySide(index)"
                                                        >
                                                            <Icon icon="mdi:delete" class="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <button 
                                                        class="btn btn-outline btn-sm"
                                                        @click="addPersonalitySide"
                                                    >
                                                        <Icon icon="mdi:plus" class="w-4 h-4 mr-1" />
                                                        添加人格侧面
                                                    </button>
                                                </div>
                                            </div>

                                            <SettingSwitch
                                                label="压缩人格"
                                                description="启用人格信息压缩处理"
                                                v-model="botConfig.personality.compress_personality"
                                                @change="markConfigChanged"
                                            />
                                        </SettingGroup>

                                        <!-- 身份设置 -->
                                        <SettingGroup title="身份设置" icon="mdi:account-details" icon-class="text-indigo-500" v-if="botConfig.identity">
                                            <div class="setting-item">
                                                <label class="setting-label">身份详情</label>
                                                <p class="setting-description">机器人的身份背景信息</p>
                                                <div class="identity-details">
                                                    <div v-for="(detail, index) in botConfig.identity.identity_detail" :key="index" class="identity-detail-item">
                                                        <input 
                                                            type="text" 
                                                            v-model="botConfig.identity.identity_detail[index]"
                                                            class="input input-bordered input-sm flex-1"
                                                            @change="markConfigChanged"
                                                        />
                                                        <button 
                                                            class="btn btn-ghost btn-xs text-error"
                                                            @click="removeIdentityDetail(index)"
                                                        >
                                                            <Icon icon="mdi:delete" class="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <button 
                                                        class="btn btn-outline btn-sm"
                                                        @click="addIdentityDetail"
                                                    >
                                                        <Icon icon="mdi:plus" class="w-4 h-4 mr-1" />
                                                        添加身份信息
                                                    </button>
                                                </div>
                                            </div>

                                            <SettingSwitch
                                                label="压缩身份"
                                                description="启用身份信息压缩处理"
                                                v-model="botConfig.identity.compress_indentity"
                                                @change="markConfigChanged"
                                            />
                                        </SettingGroup>

                                        <!-- 表达风格 -->
                                        <SettingGroup title="表达风格" icon="mdi:message-text" icon-class="text-green-500" v-if="botConfig.expression">
                                            <SettingSwitch
                                                label="启用表达风格"
                                                description="启用个性化的表达风格"
                                                v-model="botConfig.expression.enable_expression"
                                                @change="markConfigChanged"
                                            />

                                            <SettingTextarea
                                                label="表达风格"
                                                description="描述机器人的说话风格和表达习惯"
                                                v-model="botConfig.expression.expression_style"
                                                @change="markConfigChanged"
                                                :rows="4"
                                            />

                                            <SettingSwitch
                                                label="表达学习"
                                                description="启用表达风格学习功能"
                                                v-model="botConfig.expression.enable_expression_learning"
                                                @change="markConfigChanged"
                                            />

                                            <SettingInput
                                                label="学习间隔"
                                                description="表达学习的时间间隔（秒）"
                                                type="number"
                                                v-model.number="botConfig.expression.learning_interval"
                                                @change="markConfigChanged"
                                            />
                                        </SettingGroup>

                                        <!-- 关系管理 -->
                                        <SettingGroup title="关系管理" icon="mdi:account-group" icon-class="text-purple-500" v-if="botConfig.relationship">
                                            <SettingSwitch
                                                label="启用关系管理"
                                                description="启用用户关系管理功能"
                                                v-model="botConfig.relationship.enable_relationship"
                                                @change="markConfigChanged"
                                            />

                                            <SettingInput
                                                label="关系频率"
                                                description="关系更新的频率设置"
                                                type="number"
                                                :step="0.1"
                                                v-model.number="botConfig.relationship.relation_frequency"
                                                @change="markConfigChanged"
                                            />
                                        </SettingGroup>

                                        <!-- 聊天设置 -->
                                        <SettingGroup title="聊天设置" icon="mdi:chat" icon-class="text-orange-500" v-if="botConfig.chat">
                                            <SettingSelect
                                                label="聊天模式"
                                                description="选择聊天的工作模式"
                                                :options="chatModeOptions"
                                                v-model="botConfig.chat.chat_mode"
                                                @change="markConfigChanged"
                                            />

                                            <SettingInput
                                                label="最大上下文长度"
                                                description="聊天上下文的最大保留长度"
                                                type="number"
                                                v-model.number="botConfig.chat.max_context_size"
                                                @change="markConfigChanged"
                                            />

                                            <SettingInput
                                                label="回复随机概率"
                                                description="主动回复的随机概率（0-1）"
                                                type="number"
                                                :step="0.1"
                                                :min="0"
                                                :max="1"
                                                v-model.number="botConfig.chat.replyer_random_probability"
                                                @change="markConfigChanged"
                                            />

                                            <SettingInput
                                                label="聊天频率"
                                                description="基础聊天频率设置"
                                                type="number"
                                                :step="0.1"
                                                v-model.number="botConfig.chat.talk_frequency"
                                                @change="markConfigChanged"
                                            />

                                            <SettingInput
                                                label="自动聚焦阈值"
                                                description="触发自动聚焦的消息数量"
                                                type="number"
                                                v-model.number="botConfig.chat.auto_focus_threshold"
                                                @change="markConfigChanged"
                                            />

                                            <SettingInput
                                                label="退出聚焦阈值"
                                                description="退出聚焦模式的阈值"
                                                type="number"
                                                v-model.number="botConfig.chat.exit_focus_threshold"
                                                @change="markConfigChanged"
                                            />
                                        </SettingGroup>

                                        <!-- 内存管理 -->
                                        <SettingGroup title="内存管理" icon="mdi:memory" icon-class="text-cyan-500" v-if="botConfig.memory">
                                            <SettingSwitch
                                                label="启用内存管理"
                                                description="启用智能内存管理功能"
                                                v-model="botConfig.memory.enable_memory"
                                                @change="markConfigChanged"
                                            />

                                            <SettingInput
                                                label="内存容量"
                                                description="最大内存容量限制"
                                                type="number"
                                                v-model.number="botConfig.memory.memory_capacity"
                                                @change="markConfigChanged"
                                            />

                                            <SettingInput
                                                label="回忆阈值"
                                                description="触发回忆功能的阈值"
                                                type="number"
                                                v-model.number="botConfig.memory.recall_threshold"
                                                @change="markConfigChanged"
                                            />
                                        </SettingGroup>

                                        <!-- 心情管理 -->
                                        <SettingGroup title="心情管理" icon="mdi:emoticon-happy" icon-class="text-yellow-500" v-if="botConfig.mood">
                                            <SettingSwitch
                                                label="启用心情系统"
                                                description="启用动态心情变化系统"
                                                v-model="botConfig.mood.enable_mood"
                                                @change="markConfigChanged"
                                            />

                                            <SettingInput
                                                label="心情衰减率"
                                                description="心情值的自然衰减速率"
                                                type="number"
                                                :step="0.01"
                                                v-model.number="botConfig.mood.mood_decay_rate"
                                                @change="markConfigChanged"
                                            />

                                            <SettingInput
                                                label="心情影响权重"
                                                description="心情对回复的影响程度"
                                                type="number"
                                                :step="0.1"
                                                v-model.number="botConfig.mood.mood_influence_weight"
                                                @change="markConfigChanged"
                                            />
                                        </SettingGroup>

                                        <!-- LPMM 知识库 -->
                                        <SettingGroup title="LPMM 知识库" icon="mdi:book-open-page-variant" icon-class="text-teal-500" v-if="botConfig.lpmm_knowledge">
                                            <SettingSwitch
                                                label="启用知识库"
                                                description="启用 LPMM 知识库功能"
                                                v-model="botConfig.lpmm_knowledge.enable_lpmm_knowledge"
                                                @change="markConfigChanged"
                                            />

                                            <SettingInput
                                                label="知识库路径"
                                                description="知识库文件的存储路径"
                                                v-model="botConfig.lpmm_knowledge.knowledge_path"
                                                @change="markConfigChanged"
                                            />

                                            <SettingInput
                                                label="检索阈值"
                                                description="知识检索的相似度阈值"
                                                type="number"
                                                :step="0.01"
                                                :min="0"
                                                :max="1"
                                                v-model.number="botConfig.lpmm_knowledge.retrieval_threshold"
                                                @change="markConfigChanged"
                                            />
                                        </SettingGroup>

                                        <!-- 关键词反应 -->
                                        <SettingGroup title="关键词反应" icon="mdi:key-variant" icon-class="text-red-500" v-if="botConfig.keyword_reaction">
                                            <SettingSwitch
                                                label="启用关键词反应"
                                                description="启用关键词触发反应功能"
                                                v-model="botConfig.keyword_reaction.enable_keyword_reaction"
                                                @change="markConfigChanged"
                                            />

                                            <div class="setting-item" v-if="botConfig.keyword_reaction.keywords">
                                                <label class="setting-label">关键词列表</label>
                                                <div class="setting-description">配置触发反应的关键词</div>
                                                <div class="dynamic-list">
                                                    <div v-for="(keyword, index) in botConfig.keyword_reaction.keywords" :key="index" class="dynamic-item">
                                                        <input 
                                                            type="text" 
                                                            v-model="botConfig.keyword_reaction.keywords[index]"
                                                            class="input input-bordered input-sm flex-1"
                                                            @change="markConfigChanged"
                                                        />
                                                        <button 
                                                            class="btn btn-ghost btn-sm btn-square text-error"
                                                            @click="removeKeyword(index)"
                                                        >
                                                            <Icon icon="mdi:delete" class="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <button 
                                                        class="btn btn-ghost btn-sm w-full"
                                                        @click="addKeyword"
                                                    >
                                                        <Icon icon="mdi:plus" class="w-4 h-4 mr-2" />
                                                        添加关键词
                                                    </button>
                                                </div>
                                            </div>

                                            <SettingInput
                                                label="反应强度"
                                                description="关键词反应的强度等级"
                                                type="number"
                                                :step="0.1"
                                                v-model.number="botConfig.keyword_reaction.reaction_intensity"
                                                @change="markConfigChanged"
                                            />
                                        </SettingGroup>

                                        <!-- 学习与进化 -->
                                        <SettingGroup title="学习与进化" icon="mdi:brain" icon-class="text-pink-500" v-if="botConfig.learning">
                                            <SettingSwitch
                                                label="启用学习功能"
                                                description="启用机器人学习和进化功能"
                                                v-model="botConfig.learning.enable_learning"
                                                @change="markConfigChanged"
                                            />

                                            <SettingInput
                                                label="学习速率"
                                                description="学习算法的学习速率"
                                                type="number"
                                                :step="0.001"
                                                v-model.number="botConfig.learning.learning_rate"
                                                @change="markConfigChanged"
                                            />

                                            <SettingInput
                                                label="进化周期"
                                                description="进化更新的时间周期（小时）"
                                                type="number"
                                                v-model.number="botConfig.learning.evolution_cycle"
                                                @change="markConfigChanged"
                                            />
                                        </SettingGroup>

                                        <!-- 安全与过滤 -->
                                        <SettingGroup title="安全与过滤" icon="mdi:shield-check" icon-class="text-emerald-500" v-if="botConfig.safety">
                                            <SettingSwitch
                                                label="启用内容过滤"
                                                description="启用不当内容过滤功能"
                                                v-model="botConfig.safety.enable_content_filter"
                                                @change="markConfigChanged"
                                            />

                                            <SettingSelect
                                                label="过滤强度"
                                                description="内容过滤的严格程度"
                                                :options="filterStrengthOptions"
                                                v-model="botConfig.safety.filter_strength"
                                                @change="markConfigChanged"
                                            />

                                            <SettingSwitch
                                                label="启用反垃圾"
                                                description="启用垃圾信息检测和过滤"
                                                v-model="botConfig.safety.enable_anti_spam"
                                                @change="markConfigChanged"
                                            />
                                        </SettingGroup>
                                    </div>

                                    <!-- 加载状态 -->
                                    <div v-else-if="isLoading" class="loading-container">
                                        <div class="loading loading-spinner loading-lg text-primary"></div>
                                        <p class="mt-4 text-base-content/70">正在加载配置...</p>
                                    </div>

                                    <!-- 错误状态 -->
                                    <div v-else-if="error" class="error-container">
                                        <div class="alert alert-error">
                                            <Icon icon="mdi:alert-circle" class="w-6 h-6" />
                                            <div>
                                                <p class="font-medium">加载配置失败</p>
                                                <p class="text-sm">{{ error }}</p>
                                            </div>
                                        </div>
                                        <button class="btn btn-primary mt-4" @click="loadBotConfig">
                                            <Icon icon="mdi:refresh" class="w-4 h-4 mr-2" />
                                            重试
                                        </button>
                                    </div>
                                </div>

                                <!-- LPMM 配置面板 -->
                                <div v-else-if="activeTab === 'lpmm'" key="lpmm" class="config-panel">
                                    <div class="panel-header">
                                        <h3 class="panel-title">LPMM 配置</h3>
                                        <p class="panel-description">配置语言处理和模型管理设置</p>
                                    </div>

                                    <div class="coming-soon">
                                        <Icon icon="mdi:construction" class="coming-soon-icon" />
                                        <p>LPMM 配置功能正在开发中...</p>
                                    </div>
                                </div>

                                <!-- 环境变量面板 -->
                                <div v-else-if="activeTab === 'env'" key="env" class="config-panel">
                                    <div class="panel-header">
                                        <h3 class="panel-title">环境变量</h3>
                                        <p class="panel-description">管理实例的环境变量配置</p>
                                    </div>

                                    <div class="config-section" v-if="envConfig">
                                        <SettingGroup title="环境变量" icon="mdi:cog-outline" icon-class="text-orange-500">
                                            <div class="env-variables">
                                                <div v-for="(value, key) in envConfig" :key="key" class="env-item">
                                                    <div class="env-key">
                                                        <label class="env-label">{{ key }}</label>
                                                    </div>
                                                    <div class="env-value">
                                                        <input 
                                                            type="text" 
                                                            v-model="envConfig[key]" 
                                                            class="input input-bordered input-sm w-full"
                                                            @change="markEnvChanged"
                                                        />
                                                    </div>
                                                    <div class="env-actions">
                                                        <button 
                                                            class="btn btn-ghost btn-xs text-error"
                                                            @click="removeEnvVariable(key)"
                                                            title="删除环境变量"
                                                        >
                                                            <Icon icon="mdi:delete" class="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <!-- 添加新环境变量 -->
                                                <div class="add-env-item">
                                                    <div class="env-key">
                                                        <input 
                                                            type="text" 
                                                            v-model="newEnvKey"
                                                            placeholder="变量名"
                                                            class="input input-bordered input-sm w-full"
                                                            @keyup.enter="addEnvVariable"
                                                        />
                                                    </div>
                                                    <div class="env-value">
                                                        <input 
                                                            type="text" 
                                                            v-model="newEnvValue"
                                                            placeholder="变量值"
                                                            class="input input-bordered input-sm w-full"
                                                            @keyup.enter="addEnvVariable"
                                                        />
                                                    </div>
                                                    <div class="env-actions">
                                                        <button 
                                                            class="btn btn-primary btn-xs"
                                                            @click="addEnvVariable"
                                                            :disabled="!newEnvKey.trim() || !newEnvValue.trim()"
                                                        >
                                                            <Icon icon="mdi:plus" class="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </SettingGroup>
                                    </div>

                                    <!-- 加载状态 -->
                                    <div v-else-if="isLoadingEnv" class="loading-container">
                                        <div class="loading loading-spinner loading-lg text-primary"></div>
                                        <p class="mt-4 text-base-content/70">正在加载环境变量...</p>
                                    </div>

                                    <!-- 错误状态 -->
                                    <div v-else-if="envError" class="error-container">
                                        <div class="alert alert-error">
                                            <Icon icon="mdi:alert-circle" class="w-6 h-6" />
                                            <div>
                                                <p class="font-medium">加载环境变量失败</p>
                                                <p class="text-sm">{{ envError }}</p>
                                            </div>
                                        </div>
                                        <button class="btn btn-primary mt-4" @click="loadEnvConfig">
                                            <Icon icon="mdi:refresh" class="w-4 h-4 mr-2" />
                                            重试
                                        </button>
                                    </div>
                                </div>

                                <!-- 其他标签页 -->
                                <div v-else class="config-panel">
                                    <div class="panel-header">
                                        <h3 class="panel-title">{{ getCurrentTabTitle() }}</h3>
                                        <p class="panel-description">功能开发中...</p>
                                    </div>
                                    <div class="coming-soon">
                                        <Icon icon="mdi:construction" class="coming-soon-icon" />
                                        <p>此功能正在开发中，敬请期待</p>
                                    </div>
                                </div>
                            </div>
                        </transition>
                    </div>
                </div>

                <!-- 底部操作栏 -->
                <div class="bot-config-footer">
                    <div class="footer-info">
                        <span class="config-status" v-if="hasChanges">
                            <Icon icon="mdi:circle" class="w-2 h-2 text-warning animate-pulse" />
                            有未保存的更改
                        </span>
                        <span class="config-status" v-else>
                            <Icon icon="mdi:check-circle" class="w-4 h-4 text-success" />
                            配置已保存
                        </span>
                    </div>
                    <div class="footer-actions">
                        <button 
                            class="btn btn-ghost btn-sm" 
                            @click="resetConfig"
                            :disabled="isLoading || isSaving"
                        >
                            <Icon icon="mdi:refresh" class="w-4 h-4 mr-1" />
                            重置
                        </button>
                        <button 
                            class="btn btn-primary btn-sm" 
                            @click="saveConfig"
                            :disabled="!hasChanges || isLoading || isSaving"
                            :class="{ loading: isSaving }"
                        >
                            <Icon v-if="!isSaving" icon="mdi:content-save" class="w-4 h-4 mr-1" />
                            {{ isSaving ? '保存中...' : '保存配置' }}
                        </button>
                        <!-- 开发模式下显示调试信息 -->
                        <button 
                            v-if="isDev" 
                            class="btn btn-ghost btn-xs"
                            @click="console.log('侧边栏检测信息:', { sidebarWidth: sidebarWidth, debugInfo: debugInfo })"
                            title="查看侧边栏检测信息"
                        >
                            <Icon icon="mdi:bug" class="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, inject, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import toastService from '@/services/toastService'
import { maibotConfigApi } from '@/services/maibotConfigApi'

// 导入设置组件库
import {
    SettingGroup,
    SettingSwitch,
    SettingSelect,
    SettingInput,
    SettingTextarea,
    PortConfig
} from '../settings'

// 注入依赖
const emitter = inject('emitter', null)

// 属性定义
const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true
    },
    instanceId: {
        type: String,
        required: true
    },
    instanceName: {
        type: String,
        required: true
    }
})

// 事件定义
const emit = defineEmits(['close'])

// 配置标签页
const activeTab = ref('bot')

// 配置标签页定义
const configTabs = [
    { key: 'bot', title: 'Bot 配置', icon: 'mdi:robot' },
    { key: 'lpmm', title: 'LPMM 配置', icon: 'mdi:brain' },
    { key: 'env', title: '环境变量', icon: 'mdi:cog-outline' }
]

// 前一个标签页（用于动画方向判断）
const previousTab = ref('bot')

// 计算动画方向的transition名称
const panelTransitionName = computed(() => {
    const currentIndex = configTabs.findIndex(tab => tab.key === activeTab.value)
    const previousIndex = configTabs.findIndex(tab => tab.key === previousTab.value)

    if (currentIndex === -1 || previousIndex === -1) {
        return 'config-panel-fade'
    }

    if (currentIndex > previousIndex) {
        return 'config-panel-slide-right'
    } else if (currentIndex < previousIndex) {
        return 'config-panel-slide-left'
    } else {
        return 'config-panel-fade'
    }
})

// 数据状态
const botConfig = ref(null)
const envConfig = ref(null)
const originalBotConfig = ref(null)
const originalEnvConfig = ref(null)

// 加载状态
const isLoading = ref(false)
const isLoadingEnv = ref(false)
const isSaving = ref(false)
const error = ref('')
const envError = ref('')

// 变更追踪
const hasConfigChanges = ref(false)
const hasEnvChanges = ref(false)

// 环境变量编辑
const newEnvKey = ref('')
const newEnvValue = ref('')

// 侧边栏宽度检测
const sidebarWidth = ref(0)

// 调试信息（开发环境可用）
const debugInfo = ref({
    detectedSelectors: [],
    cssVariables: [],
    finalWidth: 0
})

// 开发模式检查
const isDev = import.meta.env.DEV

// 日志级别选项
const logLevelOptions = [
    { value: 'DEBUG', label: 'DEBUG - 详细调试信息' },
    { value: 'INFO', label: 'INFO - 一般信息' },
    { value: 'WARNING', label: 'WARNING - 警告信息' },
    { value: 'ERROR', label: 'ERROR - 错误信息' },
    { value: 'CRITICAL', label: 'CRITICAL - 严重错误' }
]

// 聊天模式选项
const chatModeOptions = [
    { value: 'auto', label: '自动模式' },
    { value: 'manual', label: '手动模式' },
    { value: 'hybrid', label: '混合模式' },
    { value: 'silent', label: '静默模式' }
]

// 过滤强度选项
const filterStrengthOptions = [
    { value: 'low', label: '低 - 基础过滤' },
    { value: 'medium', label: '中 - 标准过滤' },
    { value: 'high', label: '高 - 严格过滤' },
    { value: 'strict', label: '极严格 - 最高级过滤' }
]

// 计算属性
const hasChanges = computed(() => hasConfigChanges.value || hasEnvChanges.value)

// 方法
const switchTab = (tabKey) => {
    previousTab.value = activeTab.value
    activeTab.value = tabKey
    
    // 根据标签页加载对应数据
    if (tabKey === 'bot' && !botConfig.value) {
        loadBotConfig()
    } else if (tabKey === 'env' && !envConfig.value) {
        loadEnvConfig()
    }
}

const getCurrentTabTitle = () => {
    const tab = configTabs.find(t => t.key === activeTab.value)
    return tab ? tab.title : 'Bot 配置'
}

const markConfigChanged = () => {
    hasConfigChanges.value = true
}

const markEnvChanged = () => {
    hasEnvChanges.value = true
}

const addEnvVariable = () => {
    if (!newEnvKey.value.trim() || !newEnvValue.value.trim()) return
    
    if (!envConfig.value) {
        envConfig.value = {}
    }
    
    envConfig.value[newEnvKey.value.trim()] = newEnvValue.value.trim()
    newEnvKey.value = ''
    newEnvValue.value = ''
    markEnvChanged()
}

const removeEnvVariable = (key) => {
    if (envConfig.value && envConfig.value[key] !== undefined) {
        delete envConfig.value[key]
        markEnvChanged()
    }
}

// Bot配置数组操作方法
const addAlias = () => {
    if (!botConfig.value?.bot?.alias_names) {
        if (!botConfig.value) botConfig.value = {}
        if (!botConfig.value.bot) botConfig.value.bot = {}
        botConfig.value.bot.alias_names = []
    }
    botConfig.value.bot.alias_names.push('')
    markConfigChanged()
}

const removeAlias = (index) => {
    if (botConfig.value?.bot?.alias_names && index >= 0 && index < botConfig.value.bot.alias_names.length) {
        botConfig.value.bot.alias_names.splice(index, 1)
        markConfigChanged()
    }
}

const addPersonalitySide = () => {
    if (!botConfig.value?.personality?.personality_sides) {
        if (!botConfig.value) botConfig.value = {}
        if (!botConfig.value.personality) botConfig.value.personality = {}
        botConfig.value.personality.personality_sides = []
    }
    botConfig.value.personality.personality_sides.push('')
    markConfigChanged()
}

const removePersonalitySide = (index) => {
    if (botConfig.value?.personality?.personality_sides && index >= 0 && index < botConfig.value.personality.personality_sides.length) {
        botConfig.value.personality.personality_sides.splice(index, 1)
        markConfigChanged()
    }
}

const addIdentityDetail = () => {
    if (!botConfig.value?.identity?.identity_detail) {
        if (!botConfig.value) botConfig.value = {}
        if (!botConfig.value.identity) botConfig.value.identity = {}
        botConfig.value.identity.identity_detail = []
    }
    botConfig.value.identity.identity_detail.push('')
    markConfigChanged()
}

const removeIdentityDetail = (index) => {
    if (botConfig.value?.identity?.identity_detail && index >= 0 && index < botConfig.value.identity.identity_detail.length) {
        botConfig.value.identity.identity_detail.splice(index, 1)
        markConfigChanged()
    }
}

const addKeyword = () => {
    if (!botConfig.value?.keyword_reaction?.keywords) {
        if (!botConfig.value) botConfig.value = {}
        if (!botConfig.value.keyword_reaction) botConfig.value.keyword_reaction = {}
        botConfig.value.keyword_reaction.keywords = []
    }
    botConfig.value.keyword_reaction.keywords.push('')
    markConfigChanged()
}

const removeKeyword = (index) => {
    if (botConfig.value?.keyword_reaction?.keywords && index >= 0 && index < botConfig.value.keyword_reaction.keywords.length) {
        botConfig.value.keyword_reaction.keywords.splice(index, 1)
        markConfigChanged()
    }
}

const loadBotConfig = async () => {
    if (!props.instanceId) return
    
    // 防止重复请求
    if (isLoading.value) {
        console.log('Bot配置正在加载中，跳过重复请求')
        return
    }
    
    // 如果已经有配置数据，不重复加载
    if (botConfig.value) {
        console.log('Bot配置已存在，跳过重复加载')
        return
    }
    
    isLoading.value = true
    error.value = ''
    
    try {
        console.log('开始加载Bot配置:', props.instanceId)
        const response = await maibotConfigApi.getBotConfig(props.instanceId)
        botConfig.value = response.data
        originalBotConfig.value = JSON.parse(JSON.stringify(response.data))
        hasConfigChanges.value = false
        console.log('Bot配置加载成功')
    } catch (err) {
        console.error('加载Bot配置失败:', err)
        error.value = err.message || '加载配置失败'
        toastService.error('加载Bot配置失败: ' + error.value)
    } finally {
        isLoading.value = false
    }
}

const loadEnvConfig = async () => {
    if (!props.instanceId) return
    
    // 防止重复请求
    if (isLoadingEnv.value) {
        console.log('环境变量正在加载中，跳过重复请求')
        return
    }
    
    // 如果已经有配置数据，不重复加载
    if (envConfig.value) {
        console.log('环境变量已存在，跳过重复加载')
        return
    }
    
    isLoadingEnv.value = true
    envError.value = ''
    
    try {
        console.log('开始加载环境变量:', props.instanceId)
        const response = await maibotConfigApi.getEnvConfig(props.instanceId)
        envConfig.value = response.data
        originalEnvConfig.value = JSON.parse(JSON.stringify(response.data))
        hasEnvChanges.value = false
        console.log('环境变量加载成功')
    } catch (err) {
        console.error('加载环境变量失败:', err)
        envError.value = err.message || '加载环境变量失败'
        toastService.error('加载环境变量失败: ' + envError.value)
    } finally {
        isLoadingEnv.value = false
    }
}

const saveConfig = async () => {
    if (!hasChanges.value) return
    
    isSaving.value = true
    
    try {
        // 保存Bot配置
        if (hasConfigChanges.value && botConfig.value) {
            await maibotConfigApi.updateBotConfig(props.instanceId, botConfig.value)
            originalBotConfig.value = JSON.parse(JSON.stringify(botConfig.value))
            hasConfigChanges.value = false
        }
        
        // 保存环境变量
        if (hasEnvChanges.value && envConfig.value) {
            await maibotConfigApi.updateEnvConfig(props.instanceId, envConfig.value)
            originalEnvConfig.value = JSON.parse(JSON.stringify(envConfig.value))
            hasEnvChanges.value = false
        }
        
        toastService.success('配置保存成功')
    } catch (err) {
        console.error('保存配置失败:', err)
        toastService.error('保存配置失败: ' + (err.message || '未知错误'))
    } finally {
        isSaving.value = false
    }
}

const resetConfig = async () => {
    if (hasConfigChanges.value && originalBotConfig.value) {
        botConfig.value = JSON.parse(JSON.stringify(originalBotConfig.value))
        hasConfigChanges.value = false
    }
    
    if (hasEnvChanges.value && originalEnvConfig.value) {
        envConfig.value = JSON.parse(JSON.stringify(originalEnvConfig.value))
        hasEnvChanges.value = false
    }
    
    toastService.info('配置已重置')
}

const closeDrawer = () => {
    if (hasChanges.value) {
        if (confirm('有未保存的更改，确定要关闭吗？')) {
            emit('close')
        }
    } else {
        emit('close')
    }
}

const handleBackdropClick = () => {
    closeDrawer()
}

// 检测侧边栏宽度
const detectSidebarWidth = () => {
    // 重置调试信息
    debugInfo.value = {
        detectedSelectors: [],
        cssVariables: [],
        finalWidth: 0
    }
    
    // 尝试多种方式检测侧边栏宽度
    const sidebarSelectors = [
        '.sidebar',
        '.main-sidebar', 
        '.app-sidebar',
        '.navigation-sidebar',
        '.side-navigation',
        '.nav-sidebar',
        '[data-sidebar]',
        '.drawer-side',
        '.layout-sidebar',
        '.primary-sidebar',
        '.left-sidebar',
        '.menu-sidebar',
        '.side-menu',
        '.sidebar-nav',
        // Tauri 应用常见的选择器
        '.titlebar-sidebar',
        '.app-navigation'
    ]
    
    let detectedWidth = 0
    
    // 遍历所有可能的侧边栏选择器
    for (const selector of sidebarSelectors) {
        const sidebar = document.querySelector(selector)
        if (sidebar) {
            const rect = sidebar.getBoundingClientRect()
            const computedStyle = getComputedStyle(sidebar)
            
            // 检查元素是否可见
            if (computedStyle.display !== 'none' && 
                computedStyle.visibility !== 'hidden' && 
                rect.width > 0) {
                detectedWidth = Math.max(detectedWidth, rect.width)
                debugInfo.value.detectedSelectors.push({
                    selector,
                    width: rect.width,
                    display: computedStyle.display,
                    visibility: computedStyle.visibility
                })
                console.log(`检测到侧边栏: ${selector}, 宽度: ${rect.width}px`)
            }
        }
    }
    
    // 如果没有检测到侧边栏元素，尝试从 CSS 变量获取
    if (detectedWidth === 0) {
        const computedStyle = getComputedStyle(document.documentElement)
        const cssVars = [
            '--sidebar-width',
            '--drawer-width',
            '--nav-width',
            '--navigation-width',
            '--menu-width',
            '--side-panel-width',
            '--left-panel-width'
        ]
        
        for (const varName of cssVars) {
            const cssVar = computedStyle.getPropertyValue(varName)
            if (cssVar) {
                const parsedWidth = parseInt(cssVar) || 0
                debugInfo.value.cssVariables.push({
                    variable: varName,
                    value: cssVar,
                    parsedWidth
                })
                if (parsedWidth > 0) {
                    detectedWidth = Math.max(detectedWidth, parsedWidth)
                    console.log(`从 CSS 变量检测到侧边栏宽度: ${varName}=${parsedWidth}px`)
                    break
                }
            }
        }
    }
    
    // 如果仍然没有检测到，尝试检查是否有折叠状态的侧边栏
    if (detectedWidth === 0) {
        // 检查是否有 body 或 html 的 class 表明侧边栏状态
        const bodyClasses = document.body.className
        const htmlClasses = document.documentElement.className
        
        if (bodyClasses.includes('sidebar-expanded') || htmlClasses.includes('sidebar-expanded')) {
            detectedWidth = 250 // 默认展开宽度
        } else if (bodyClasses.includes('sidebar-collapsed') || htmlClasses.includes('sidebar-collapsed')) {
            detectedWidth = 60 // 默认折叠宽度
        }
    }
    
    sidebarWidth.value = detectedWidth
    debugInfo.value.finalWidth = detectedWidth
    
    // 更新 CSS 变量
    document.documentElement.style.setProperty('--sidebar-width', `${detectedWidth}px`)
    
    console.log(`最终检测到的侧边栏宽度: ${detectedWidth}px`, debugInfo.value)
}

// 监听侧边栏变化
const observeSidebarChanges = () => {
    // 创建 MutationObserver 监听 DOM 变化
    const mutationObserver = new MutationObserver(() => {
        // 延迟检测，确保 DOM 更新完成
        setTimeout(detectSidebarWidth, 100)
    })
    
    // 监听 body 和 html 的 class 变化（可能影响侧边栏状态）
    mutationObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'style']
    })
    
    mutationObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'style']
    })
    
    // 创建 ResizeObserver 监听侧边栏大小变化
    if (typeof ResizeObserver !== 'undefined') {
        const sidebarSelectors = [
            '.sidebar', '.main-sidebar', '.app-sidebar', '.navigation-sidebar',
            '.side-navigation', '.nav-sidebar', '[data-sidebar]', '.drawer-side',
            '.layout-sidebar', '.primary-sidebar', '.left-sidebar'
        ]
        
        const resizeObserver = new ResizeObserver(() => {
            detectSidebarWidth()
        })
        
        // 为找到的侧边栏元素添加观察
        sidebarSelectors.forEach(selector => {
            const sidebar = document.querySelector(selector)
            if (sidebar) {
                resizeObserver.observe(sidebar)
            }
        })
        
        // 组件卸载时清理
        onBeforeUnmount(() => {
            resizeObserver.disconnect()
            mutationObserver.disconnect()
        })
    }
    
    // 监听窗口大小变化
    const handleResize = () => {
        setTimeout(detectSidebarWidth, 50)
    }
    window.addEventListener('resize', handleResize)
    
    // 监听可能的侧边栏切换事件
    const handleSidebarToggle = () => {
        setTimeout(detectSidebarWidth, 150)
    }
    
    // 监听常见的侧边栏事件
    document.addEventListener('sidebar-toggle', handleSidebarToggle)
    document.addEventListener('drawer-toggle', handleSidebarToggle)
    document.addEventListener('menu-toggle', handleSidebarToggle)
    
    onBeforeUnmount(() => {
        window.removeEventListener('resize', handleResize)
        document.removeEventListener('sidebar-toggle', handleSidebarToggle)
        document.removeEventListener('drawer-toggle', handleSidebarToggle)
        document.removeEventListener('menu-toggle', handleSidebarToggle)
        mutationObserver.disconnect()
    })
}

// 监听实例变化
watch(() => props.instanceId, (newId, oldId) => {
    if (newId && newId !== oldId && props.isOpen) {
        // 重置状态
        botConfig.value = null
        envConfig.value = null
        originalBotConfig.value = null
        originalEnvConfig.value = null
        hasConfigChanges.value = false
        hasEnvChanges.value = false
        error.value = ''
        envError.value = ''
        
        // 加载当前标签页的数据
        if (activeTab.value === 'bot') {
            loadBotConfig()
        } else if (activeTab.value === 'env') {
            loadEnvConfig()
        }
    }
})

// 监听打开状态
watch(() => props.isOpen, (isOpen, wasOpen) => {
    if (isOpen && !wasOpen && props.instanceId) {
        // 检测侧边栏宽度
        detectSidebarWidth()
        
        // 只有当抽屉从关闭变为打开时才加载数据
        if (activeTab.value === 'bot' && !botConfig.value) {
            loadBotConfig()
        } else if (activeTab.value === 'env' && !envConfig.value) {
            loadEnvConfig()
        }
    }
})

// 组件挂载时的初始化
onMounted(() => {
    // 初始化侧边栏宽度检测
    detectSidebarWidth()
    observeSidebarChanges()
    
    // 移除挂载时的自动加载，由watch监听器处理
    // if (props.isOpen && props.instanceId) {
    //     loadBotConfig() // 默认加载Bot配置
    // }
})

// 监听ESC键关闭
onMounted(() => {
    const handleEscape = (e) => {
        if (e.key === 'Escape' && props.isOpen) {
            closeDrawer()
        }
    }
    document.addEventListener('keydown', handleEscape)
    
    onBeforeUnmount(() => {
        document.removeEventListener('keydown', handleEscape)
    })
})
</script>

<style scoped>
/* 导入设置抽屉的基础样式并适配 */
@import '../settings/SettingsDrawer.css';

/* Bot配置抽屉特定样式 */
.bot-config-drawer-backdrop {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: var(--sidebar-width, 0px); /* 从侧边栏右侧开始 */
    background-color: rgba(0, 0, 0, 0.5); /* 半透明遮罩背景 */
    backdrop-filter: blur(4px); /* 背景模糊 */
    display: flex;
    align-items: center; /* 垂直居中 */
    justify-content: center; /* 水平居中 */
    z-index: 50;
    padding: 2rem; /* 添加内边距，确保窗口不会贴边 */
}

/* 当检测不到侧边栏或侧边栏宽度为0时，使用全屏 */
.bot-config-drawer-backdrop[data-no-sidebar="true"] {
    left: 0;
}

.bot-config-drawer-container {
    width: min(90%, calc(100vw - var(--sidebar-width, 0px) - 4rem)); /* 动态宽度，考虑侧边栏 */
    max-width: 1200px; /* 最大宽度 */
    height: 85vh; /* 占据85%高度 */
    min-height: 600px; /* 最小高度 */
    min-width: 600px; /* 最小宽度 */
    background-color: hsl(var(--b1));
    border-radius: 1rem; /* 圆角 */
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); /* 居中阴影 */
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid hsl(var(--b3)); /* 全边框 */
    position: relative;
}

.bot-config-header {
    background-color: hsl(var(--b1));
    padding: 1.5rem;
    border-bottom: 1px solid hsl(var(--b3));
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.header-info .bot-config-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: hsl(var(--bc));
    margin-bottom: 0.25rem;
}

.header-info .instance-info {
    font-size: 0.875rem;
    color: hsl(var(--bc) / 0.7);
}

.bot-config-content {
    display: flex;
    flex: 1;
    overflow: hidden;
    min-height: 0; /* 确保 flex 子元素正确计算高度 */
}

.bot-config-sidebar {
    width: 12rem;
    min-width: 12rem;
    max-width: 12rem;
    background-color: hsl(var(--b1));
    border-right: 1px solid hsl(var(--b3));
    padding: 1rem;
    overflow-y: auto;
    flex-shrink: 0;
    height: 100%; /* 占据完整高度 */
}

.bot-config-nav .nav-item {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    border-radius: 0.5rem;
    color: hsl(var(--bc) / 0.7);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap; /* 防止文本换行 */
}

.bot-config-nav .nav-item:hover {
    background-color: hsl(var(--b2));
    color: hsl(var(--bc));
}

.bot-config-nav .nav-item.active {
    background-color: hsl(var(--p) / 0.1);
    color: hsl(var(--p));
    border-left: 4px solid hsl(var(--p));
    font-weight: 500;
}

.bot-config-nav .nav-icon {
    margin-right: 0.75rem;
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0; /* 防止图标被压缩 */
}

.bot-config-main {
    flex: 1;
    overflow: hidden;
    min-width: 0; /* 确保能够正确收缩 */
    display: flex;
    flex-direction: column;
}

.config-panel-wrapper {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
}

.config-panel {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    padding: 1.5rem 2rem; /* 稍微减少左右边距以给内容更多空间 */
    overflow-y: auto;
    box-sizing: border-box; /* 确保 padding 不会影响宽度计算 */
}

.panel-header {
    margin-bottom: 1.5rem; /* 稍微减少底部边距 */
    padding-bottom: 1rem; /* 稍微减少底部 padding */
    border-bottom: 1px solid hsl(var(--b3));
    flex-shrink: 0; /* 防止头部被压缩 */
}

.panel-title {
    font-size: 1.375rem; /* 稍微减小标题字体 */
    font-weight: 600;
    color: hsl(var(--bc));
    margin-bottom: 0.5rem;
}

.panel-description {
    color: hsl(var(--bc) / 0.7);
    font-size: 0.9rem; /* 稍微减小描述字体 */
}

.config-section {
    flex: 1;
    width: 100%;
    max-width: 100%; /* 确保不会溢出 */
}

/* 确保设置组件正确渲染的样式 */
.config-section > * {
    width: 100%;
    box-sizing: border-box;
}

/* SettingGroup 组件的容器样式 */
.config-section .setting-group {
    width: 100%;
    margin-bottom: 2rem;
}

/* 环境变量样式 */
.env-variables {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
}

.env-item, .add-env-item {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 1rem;
    align-items: center;
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid hsl(var(--b3));
    width: 100%;
    box-sizing: border-box;
}

.env-key {
    grid-column: span 4 / span 4;
}

.env-value {
    grid-column: span 7 / span 7;
}

.env-actions {
    grid-column: span 1 / span 1;
    display: flex;
    justify-content: center;
}

.env-label {
    font-weight: 500;
    color: hsl(var(--bc));
    display: block;
    margin-bottom: 0.25rem;
}

.add-env-item {
    border-style: dashed;
    border-color: hsl(var(--p) / 0.3);
    background-color: hsl(var(--p) / 0.05);
}

/* 确保输入框和文本区域适应容器 */
.env-item input,
.env-item textarea,
.add-env-item input,
.add-env-item textarea {
    width: 100%;
    box-sizing: border-box;
}

/* 动态列表样式 */
.dynamic-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
}

.dynamic-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background-color: hsl(var(--b2));
    border-radius: 0.375rem;
    border: 1px solid hsl(var(--b3));
    width: 100%;
    box-sizing: border-box;
}

.dynamic-item input,
.dynamic-item textarea {
    flex: 1;
    min-width: 0; /* 确保输入框能够正确收缩 */
}

.dynamic-item .btn-square {
    flex-shrink: 0;
}

.setting-item {
    margin-bottom: 1.5rem;
    width: 100%;
    box-sizing: border-box;
}

.setting-label {
    font-weight: 500;
    color: hsl(var(--bc));
    display: block;
    margin-bottom: 0.25rem;
}

.setting-description {
    font-size: 0.875rem;
    color: hsl(var(--bc) / 0.7);
    margin-bottom: 0.75rem;
    line-height: 1.4;
}

/* 别名列表样式 */
.alias-list, .personality-sides, .identity-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
}

.alias-item, .personality-side-item, .identity-detail-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.5rem;
    background-color: hsl(var(--b2));
    border-radius: 0.375rem;
    border: 1px solid hsl(var(--b3));
    width: 100%;
    box-sizing: border-box;
}

.alias-item input,
.personality-side-item textarea,
.identity-detail-item input {
    flex: 1;
    min-width: 0;
}

.alias-item button,
.personality-side-item button,
.identity-detail-item button {
    flex-shrink: 0;
    margin-left: auto;
}

/* 加载和错误状态 */
.loading-container, .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 20rem; /* 增加高度 */
    text-align: center;
    padding: 2rem;
    width: 100%;
    box-sizing: border-box;
}

.coming-soon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 20rem; /* 增加高度 */
    text-align: center;
    padding: 2rem;
    width: 100%;
    box-sizing: border-box;
}

.coming-soon-icon {
    width: 4rem;
    height: 4rem;
    color: hsl(var(--bc) / 0.3);
    margin-bottom: 1rem;
}

/* 确保所有表单元素都有合适的样式 */
.config-panel input,
.config-panel textarea,
.config-panel select {
    width: 100%;
    box-sizing: border-box;
}

.config-panel .btn {
    flex-shrink: 0;
}

/* 修复可能的 z-index 问题 */
.bot-config-drawer-backdrop {
    z-index: 1000;
}

.bot-config-drawer-container {
    z-index: 1001;
}

/* 过渡动画 */
.config-panel-fade-enter-active,
.config-panel-fade-leave-active {
    transition: all 0.3s ease;
}

.config-panel-fade-enter-from,
.config-panel-fade-leave-to {
    opacity: 0;
    transform: translateY(20px);
}

.config-panel-slide-right-enter-active,
.config-panel-slide-right-leave-active,
.config-panel-slide-left-enter-active,
.config-panel-slide-left-leave-active {
    transition: all 0.3s ease;
}

.config-panel-slide-right-enter-from {
    opacity: 0;
    transform: translateX(30px);
}

.config-panel-slide-right-leave-to {
    opacity: 0;
    transform: translateX(-30px);
}

.config-panel-slide-left-enter-from {
    opacity: 0;
    transform: translateX(-30px);
}

.config-panel-slide-left-leave-to {
    opacity: 0;
    transform: translateX(30px);
}

/* 抽屉动画 - 从中心缩放淡入 */
.bot-config-drawer-enter-active,
.bot-config-drawer-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bot-config-drawer-enter-from,
.bot-config-drawer-leave-to {
    opacity: 0;
    backdrop-filter: blur(0px);
}

.bot-config-drawer-enter-from .bot-config-drawer-container,
.bot-config-drawer-leave-to .bot-config-drawer-container {
    transform: scale(0.95) translateY(-20px); /* 从稍小尺寸和上方位置淡入 */
    opacity: 0;
}

.bot-config-drawer-enter-to .bot-config-drawer-container,
.bot-config-drawer-leave-from .bot-config-drawer-container {
    transform: scale(1) translateY(0);
    opacity: 1;
}

/* 底部操作栏 */
.bot-config-footer {
    background-color: hsl(var(--b2));
    padding: 1rem 1.5rem;
    border-top: 1px solid hsl(var(--b3));
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.footer-info .config-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: hsl(var(--bc) / 0.7);
}

.footer-actions {
    display: flex;
    gap: 0.75rem;
}

/* 响应式适配 */
@media (max-width: 1400px) {
    .bot-config-drawer-container {
        width: min(95%, calc(100vw - var(--sidebar-width, 0px) - 3rem)); /* 在中等屏幕上调整 */
        max-width: 1100px;
    }
}

@media (max-width: 1200px) {
    .bot-config-drawer-container {
        width: min(95%, calc(100vw - var(--sidebar-width, 0px) - 2rem)); /* 在较小屏幕上调整 */
        max-width: 1000px;
        min-width: 500px; /* 减少最小宽度 */
        height: 90vh; /* 增加高度占比 */
    }
    
    .bot-config-sidebar {
        width: 10rem;
        min-width: 10rem;
        max-width: 10rem;
    }
    
    .config-panel {
        padding: 1.25rem 1.5rem;
    }
    
    .panel-title {
        font-size: 1.25rem;
    }
    
    .panel-description {
        font-size: 0.875rem;
    }
}

@media (max-width: 1024px) {
    .bot-config-drawer-backdrop {
        padding: 1rem; /* 减少内边距 */
        left: 0; /* 在小屏幕上忽略侧边栏，使用全屏 */
    }
    
    .bot-config-drawer-container {
        width: 98%; /* 在小屏幕上几乎全宽 */
        height: 95vh; /* 增加高度占比 */
        min-width: 400px; /* 进一步减少最小宽度 */
    }
    
    .bot-config-sidebar {
        width: 9rem;
        min-width: 9rem;
        max-width: 9rem;
        padding: 0.75rem;
    }
    
    .bot-config-nav .nav-item {
        padding: 0.625rem 0.5rem;
        font-size: 0.875rem;
    }
    
    .bot-config-nav .nav-icon {
        width: 1rem;
        height: 1rem;
        margin-right: 0.5rem;
    }
    
    .config-panel {
        padding: 1rem 1.25rem;
    }
}

@media (max-width: 768px) {
    .bot-config-drawer-backdrop {
        padding: 0.5rem; /* 进一步减少内边距 */
        left: 0; /* 在手机屏幕上使用全屏 */
    }
    
    .bot-config-drawer-container {
        width: 100%; /* 在手机屏幕上占据全宽 */
        height: 100vh; /* 占据全高 */
        border-radius: 0; /* 移除圆角 */
        min-width: 320px; /* 手机最小宽度 */
    }
    
    .bot-config-content {
        flex-direction: column;
    }
    
    .bot-config-sidebar {
        width: 100%;
        max-width: 100%;
        height: auto;
        border-right: none;
        border-bottom: 1px solid hsl(var(--b3));
        padding: 1rem;
        overflow-x: auto;
        overflow-y: visible;
    }
    
    .bot-config-nav {
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        white-space: nowrap;
        padding-bottom: 0.5rem;
    }
    
    .bot-config-nav .nav-item {
        flex-shrink: 0;
        border-left: none;
        border-bottom: 3px solid transparent;
        white-space: nowrap;
        min-width: max-content;
    }
    
    .bot-config-nav .nav-item.active {
        border-bottom: 3px solid hsl(var(--p));
        border-left: none;
    }
    
    .bot-config-main {
        flex: 1;
        min-height: 0;
    }
    
    .config-panel {
        padding: 1rem;
        height: calc(100% - 2rem);
    }
    
    .env-item, .add-env-item {
        grid-template-columns: 1fr;
        gap: 0.5rem;
    }
    
    .env-key, .env-value, .env-actions {
        grid-column: span 1 / span 1;
    }
}

@media (max-width: 480px) {
    .bot-config-drawer-backdrop {
        left: 0; /* 在超小屏幕上使用全屏 */
    }
    
    .bot-config-drawer-container {
        width: 100%;
        height: 100vh;
        border-radius: 0;
        min-width: 280px; /* 超小屏幕最小宽度 */
    }
    
    .bot-config-header {
        padding: 1rem;
    }
    
    .header-info .bot-config-title {
        font-size: 1.25rem;
    }
    
    .header-info .instance-info {
        font-size: 0.75rem;
    }
    
    .config-panel {
        padding: 0.75rem;
    }
    
    .panel-title {
        font-size: 1.125rem;
    }
    
    .panel-description {
        font-size: 0.8rem;
    }
    
    .bot-config-footer {
        padding: 0.75rem 1rem;
    }
}
</style>
