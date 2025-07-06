<template>
    <transition name="bot-config-drawer" appear>
        <div v-if="isOpen" class="bot-config-drawer-backdrop" @click.self="handleBackdropClick">
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
                                        <!-- 调试信息 -->
                                        <div v-if="isDevMode && isDev" class="debug-panel mb-2 p-2 bg-base-200 rounded-lg">
                                            <h4 class="text-xs font-semibold mb-1">调试信息</h4>
                                            <div class="text-xs space-y-0.5">
                                                <div>配置节数量: {{ configSections.length }}</div>
                                                <div>配置对象: {{ Object.keys(botConfig || {}).join(', ') }}</div>
                                                <div v-for="section in configSections.slice(0, 3)" :key="section.key">
                                                    {{ section.key }}: {{ Object.keys(section.data || {}).length }} 字段
                                                </div>
                                            </div>
                                        </div>

                                        <!-- 动态生成配置节 -->
                                        <template v-for="section in configSections" :key="section.key">
                                            <SettingGroup 
                                                :title="section.title" 
                                                :icon="section.icon" 
                                                :icon-class="section.iconClass"
                                            >
                                                <!-- 渲染每个配置项 -->
                                                <template v-for="(value, key) in section.data" :key="key">
                                                    <!-- 字符串数组类型 - 标签式布局 -->
                                                    <div 
                                                        v-if="Array.isArray(value) && (value.length === 0 || typeof value[0] === 'string')"
                                                        class="setting-item"
                                                    >
                                                        <div class="setting-info">
                                                            <label class="setting-label">{{ getFieldLabel(key) }}</label>
                                                            <p class="setting-description">{{ getFieldDescription(key, section.key) }}</p>
                                                        </div>
                                                        <div class="setting-control">
                                                            <!-- 标签式显示和编辑 -->
                                                            <div class="tag-list-container">
                                                                <!-- 已有的标签 -->
                                                                <div class="tag-list">
                                                                    <div 
                                                                        v-for="(item, index) in value" 
                                                                        :key="index" 
                                                                        class="tag-item"
                                                                    >
                                                                        <span class="tag-text">{{ item }}</span>
                                                                        <button 
                                                                            class="tag-remove"
                                                                            @click="removeArrayItem(`${section.key}.${key}`, index)"
                                                                            title="删除"
                                                                        >
                                                                            <Icon icon="mdi:close" class="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <!-- 添加新标签 -->
                                                                <div class="tag-input-container">
                                                                    <input 
                                                                        type="text" 
                                                                        v-model="newItemValues[`${section.key}.${key}`]"
                                                                        class="tag-input"
                                                                        :placeholder="`输入${getFieldLabel(key)}`"
                                                                        @keyup.enter="addArrayItem(`${section.key}.${key}`, newItemValues[`${section.key}.${key}`] || '')"
                                                                        @blur="addArrayItem(`${section.key}.${key}`, newItemValues[`${section.key}.${key}`] || '')"
                                                                    />
                                                                    <button 
                                                                        class="tag-add-btn"
                                                                        @click="addArrayItem(`${section.key}.${key}`, newItemValues[`${section.key}.${key}`] || '')"
                                                                        :title="`添加${getFieldLabel(key)}`"
                                                                    >
                                                                        <Icon icon="mdi:plus" class="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <!-- 布尔类型 -->
                                                    <SettingSwitch
                                                        v-else-if="typeof value === 'boolean'"
                                                        :label="getFieldLabel(key)"
                                                        :description="getFieldDescription(key, section.key)"
                                                        :model-value="getNestedValue(botConfig, `${section.key}.${key}`)"
                                                        @update:model-value="setNestedValue(botConfig, `${section.key}.${key}`, $event); markConfigChanged()"
                                                    />
                                                    
                                                    <!-- 选择类型 -->
                                                    <SettingSelect
                                                        v-else-if="getDynamicOptions(`${section.key}.${key}`).length > 0"
                                                        :label="getFieldLabel(key)"
                                                        :description="getFieldDescription(key, section.key)"
                                                        :options="getDynamicOptions(`${section.key}.${key}`)"
                                                        :model-value="getNestedValue(botConfig, `${section.key}.${key}`)"
                                                        @update:model-value="setNestedValue(botConfig, `${section.key}.${key}`, $event); markConfigChanged()"
                                                    />
                                                    
                                                    <!-- 文本域类型 -->
                                                    <SettingTextarea
                                                        v-else-if="typeof value === 'string' && (key.includes('style') || key.includes('prompt') || key === 'personality_core')"
                                                        :label="getFieldLabel(key)"
                                                        :description="getFieldDescription(key, section.key)"
                                                        :rows="3"
                                                        :model-value="getNestedValue(botConfig, `${section.key}.${key}`)"
                                                        @update:model-value="setNestedValue(botConfig, `${section.key}.${key}`, $event); markConfigChanged()"
                                                    />
                                                    
                                                    <!-- 数字类型 -->
                                                    <SettingInput
                                                        v-else-if="typeof value === 'number'"
                                                        :label="getFieldLabel(key)"
                                                        :description="getFieldDescription(key, section.key)"
                                                        type="number"
                                                        :step="key.includes('rate') || key.includes('probability') || key.includes('threshold') ? 0.01 : 1"
                                                        :min="key.includes('rate') || key.includes('probability') || key.includes('threshold') ? 0 : undefined"
                                                        :max="key.includes('rate') || key.includes('probability') || key.includes('threshold') ? 1 : undefined"
                                                        :model-value="getNestedValue(botConfig, `${section.key}.${key}`)"
                                                        @update:model-value="setNestedValue(botConfig, `${section.key}.${key}`, $event); markConfigChanged()"
                                                        :readonly="key === 'version'"
                                                    />
                                                    
                                                    <!-- 字符串类型 -->
                                                    <SettingInput
                                                        v-else-if="typeof value === 'string'"
                                                        :label="getFieldLabel(key)"
                                                        :description="getFieldDescription(key, section.key)"
                                                        :model-value="getNestedValue(botConfig, `${section.key}.${key}`)"
                                                        @update:model-value="setNestedValue(botConfig, `${section.key}.${key}`, $event); markConfigChanged()"
                                                        :readonly="key === 'version'"
                                                    />
                                                    
                                                    <!-- 跳过复杂对象和其他数组类型 -->
                                                </template>
                                            </SettingGroup>
                                        </template>
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

                                    <!-- 加载状态 -->
                                    <div v-if="isLoadingLpmm" class="loading-container">
                                        <div class="loading-spinner">
                                            <span class="loading loading-spinner loading-lg"></span>
                                        </div>
                                        <p>正在加载LPMM配置...</p>
                                    </div>

                                    <!-- 错误状态 -->
                                    <div v-else-if="lpmmError" class="error-container">
                                        <div class="error-content">
                                            <Icon icon="mdi:alert-circle" class="w-6 h-6" />
                                            <div>
                                                <p class="font-medium">加载LPMM配置失败</p>
                                                <p class="text-sm">{{ lpmmError }}</p>
                                            </div>
                                        </div>
                                        <button class="btn btn-primary mt-4" @click="loadLpmmConfig">
                                            <Icon icon="mdi:refresh" class="w-4 h-4 mr-2" />
                                            重试
                                        </button>
                                    </div>

                                    <!-- LPMM 配置内容 -->
                                    <div v-else-if="lpmmConfig" class="config-section">
                                        <!-- 基本信息 -->
                                        <SettingGroup title="基本信息" icon="mdi:information-outline">
                                            <div class="setting-item">
                                                <div class="setting-info">
                                                    <label class="setting-label">版本</label>
                                                    <p class="setting-description">LPMM 组件版本号</p>
                                                </div>
                                                <div class="setting-control">
                                                    <input 
                                                        type="text" 
                                                        class="input input-bordered input-sm" 
                                                        v-model="lpmmConfig.lpmm.version"
                                                        readonly
                                                    />
                                                </div>
                                            </div>
                                        </SettingGroup>

                                        <!-- LLM 提供商配置 -->
                                        <SettingGroup title="LLM 提供商" icon="mdi:server-network" icon-class="text-blue-500">
                                            <div class="model-config-container">
                                                <div 
                                                    v-for="(provider, index) in lpmmConfig.llm_providers" 
                                                    :key="index"
                                                    class="model-item"
                                                >
                                                    <div class="model-header">
                                                        <div class="model-title-section">
                                                            <div class="model-name">{{ provider.name || `提供商 ${index + 1}` }}</div>
                                                            <div class="model-key">provider-{{ index }}</div>
                                                        </div>
                                                        <div class="model-provider-badge">
                                                            <Icon icon="mdi:server-network" class="w-3 h-3" />
                                                            LLM 提供商
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="model-settings">
                                                        <!-- 提供商名称 -->
                                                        <div class="model-setting">
                                                            <label class="model-setting-label">提供商名称</label>
                                                            <input 
                                                                type="text" 
                                                                class="input input-bordered input-sm flex-1" 
                                                                v-model="provider.name"
                                                                @input="markLpmmChanged"
                                                                placeholder="输入提供商名称"
                                                            />
                                                        </div>

                                                        <!-- 基础URL -->
                                                        <div class="model-setting">
                                                            <label class="model-setting-label">基础URL</label>
                                                            <input 
                                                                type="text" 
                                                                class="input input-bordered input-sm flex-1" 
                                                                v-model="provider.base_url"
                                                                placeholder="http://127.0.0.1:8888/v1/"
                                                                @input="markLpmmChanged"
                                                            />
                                                        </div>

                                                        <!-- API密钥 -->
                                                        <div class="model-setting">
                                                            <label class="model-setting-label">API密钥</label>
                                                            <input 
                                                                type="password" 
                                                                class="input input-bordered input-sm flex-1" 
                                                                v-model="provider.api_key"
                                                                placeholder="输入API密钥"
                                                                @input="markLpmmChanged"
                                                            />
                                                        </div>

                                                        <!-- 删除按钮 -->
                                                        <div class="model-setting" v-if="lpmmConfig.llm_providers.length > 1">
                                                            <div class="model-switch-container">
                                                                <label class="model-setting-label">删除提供商</label>
                                                                <button 
                                                                    class="btn btn-error btn-sm"
                                                                    @click="removeLlmProvider(index)"
                                                                >
                                                                    <Icon icon="mdi:delete" class="w-4 h-4 mr-2" />
                                                                    删除
                                                                </button>
                                                            </div>
                                                            <p class="model-setting-description">删除此LLM提供商配置</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- 添加新提供商按钮 -->
                                                <div class="mt-4">
                                                    <button 
                                                        class="btn btn-outline btn-sm"
                                                        @click="addLlmProvider"
                                                    >
                                                        <Icon icon="mdi:plus" class="w-4 h-4 mr-2" />
                                                        添加提供商
                                                    </button>
                                                </div>
                                            </div>
                                        </SettingGroup>

                                        <!-- 实体提取配置 -->
                                        <SettingGroup title="实体提取" icon="mdi:text-recognition" icon-class="text-green-500">
                                            <div class="model-config-container">
                                                <div class="model-item">
                                                    <div class="model-header">
                                                        <div class="model-title-section">
                                                            <div class="model-name">实体提取模型</div>
                                                            <div class="model-key">entity-extract</div>
                                                        </div>
                                                        <div class="model-provider-badge">
                                                            <Icon icon="mdi:text-recognition" class="w-3 h-3" />
                                                            {{ lpmmConfig.entity_extract.llm.provider }}
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="model-settings">
                                                        <!-- 提供商选择 -->
                                                        <div class="model-setting">
                                                            <label class="model-setting-label">LLM 提供商</label>
                                                            <select 
                                                                class="select select-bordered select-sm flex-1" 
                                                                v-model="lpmmConfig.entity_extract.llm.provider"
                                                                @change="markLpmmChanged"
                                                            >
                                                                <option v-for="provider in lpmmConfig.llm_providers" :key="provider.name" :value="provider.name">
                                                                    {{ provider.name }}
                                                                </option>
                                                            </select>
                                                        </div>

                                                        <!-- 模型名称 -->
                                                        <div class="model-setting">
                                                            <label class="model-setting-label">模型名称</label>
                                                            <input 
                                                                type="text" 
                                                                class="input input-bordered input-sm flex-1" 
                                                                v-model="lpmmConfig.entity_extract.llm.model"
                                                                placeholder="deepseek-ai/DeepSeek-V3"
                                                                @input="markLpmmChanged"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </SettingGroup>

                                        <!-- RDF构建配置 -->
                                        <SettingGroup title="RDF构建" icon="mdi:graph-outline" icon-class="text-orange-500">
                                            <div class="model-config-container">
                                                <div class="model-item">
                                                    <div class="model-header">
                                                        <div class="model-title-section">
                                                            <div class="model-name">RDF构建模型</div>
                                                            <div class="model-key">rdf-build</div>
                                                        </div>
                                                        <div class="model-provider-badge">
                                                            <Icon icon="mdi:graph-outline" class="w-3 h-3" />
                                                            {{ lpmmConfig.rdf_build.llm.provider }}
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="model-settings">
                                                        <!-- 提供商选择 -->
                                                        <div class="model-setting">
                                                            <label class="model-setting-label">LLM 提供商</label>
                                                            <select 
                                                                class="select select-bordered select-sm flex-1" 
                                                                v-model="lpmmConfig.rdf_build.llm.provider"
                                                                @change="markLpmmChanged"
                                                            >
                                                                <option v-for="provider in lpmmConfig.llm_providers" :key="provider.name" :value="provider.name">
                                                                    {{ provider.name }}
                                                                </option>
                                                            </select>
                                                        </div>

                                                        <!-- 模型名称 -->
                                                        <div class="model-setting">
                                                            <label class="model-setting-label">模型名称</label>
                                                            <input 
                                                                type="text" 
                                                                class="input input-bordered input-sm flex-1" 
                                                                v-model="lpmmConfig.rdf_build.llm.model"
                                                                placeholder="deepseek-ai/DeepSeek-V3"
                                                                @input="markLpmmChanged"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </SettingGroup>

                                        <!-- 嵌入配置 -->
                                        <SettingGroup title="嵌入配置" icon="mdi:vector-triangle" icon-class="text-purple-500">
                                            <div class="model-config-container">
                                                <div class="model-item">
                                                    <div class="model-header">
                                                        <div class="model-title-section">
                                                            <div class="model-name">嵌入模型</div>
                                                            <div class="model-key">embedding</div>
                                                        </div>
                                                        <div class="model-provider-badge">
                                                            <Icon icon="mdi:vector-triangle" class="w-3 h-3" />
                                                            {{ lpmmConfig.embedding.provider }}
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="model-settings">
                                                        <!-- 提供商选择 -->
                                                        <div class="model-setting">
                                                            <label class="model-setting-label">提供商</label>
                                                            <select 
                                                                class="select select-bordered select-sm flex-1" 
                                                                v-model="lpmmConfig.embedding.provider"
                                                                @change="markLpmmChanged"
                                                            >
                                                                <option v-for="provider in lpmmConfig.llm_providers" :key="provider.name" :value="provider.name">
                                                                    {{ provider.name }}
                                                                </option>
                                                            </select>
                                                        </div>

                                                        <!-- 模型名称 -->
                                                        <div class="model-setting">
                                                            <label class="model-setting-label">模型名称</label>
                                                            <input 
                                                                type="text" 
                                                                class="input input-bordered input-sm flex-1" 
                                                                v-model="lpmmConfig.embedding.model"
                                                                placeholder="Pro/BAAI/bge-m3"
                                                                @input="markLpmmChanged"
                                                            />
                                                        </div>

                                                        <!-- 嵌入维度 -->
                                                        <div class="model-setting">
                                                            <label class="model-setting-label">嵌入维度</label>
                                                            <input 
                                                                type="number" 
                                                                class="input input-bordered input-sm flex-1" 
                                                                v-model.number="lpmmConfig.embedding.dimension"
                                                                placeholder="1024"
                                                                min="1"
                                                                @input="markLpmmChanged"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </SettingGroup>

                                        <!-- RAG配置 -->
                                        <SettingGroup title="RAG参数" icon="mdi:magnify">
                                            <div class="setting-item">
                                                <div class="setting-info">
                                                    <label class="setting-label">同义词搜索Top K</label>
                                                    <p class="setting-description">同义词搜索返回的最大结果数</p>
                                                </div>
                                                <div class="setting-control">
                                                    <input 
                                                        type="number" 
                                                        class="input input-bordered input-sm" 
                                                        v-model.number="lpmmConfig.rag.params.synonym_search_top_k"
                                                        min="1"
                                                        @input="markLpmmChanged"
                                                    />
                                                </div>
                                            </div>
                                            <div class="setting-item">
                                                <div class="setting-info">
                                                    <label class="setting-label">同义词阈值</label>
                                                    <p class="setting-description">同义词匹配的相似度阈值</p>
                                                </div>
                                                <div class="setting-control">
                                                    <input 
                                                        type="number" 
                                                        class="input input-bordered input-sm" 
                                                        v-model.number="lpmmConfig.rag.params.synonym_threshold"
                                                        min="0"
                                                        max="1"
                                                        step="0.1"
                                                        @input="markLpmmChanged"
                                                    />
                                                </div>
                                            </div>
                                        </SettingGroup>

                                        <!-- 问答配置 -->
                                        <SettingGroup title="问答配置" icon="mdi:comment-question-outline" icon-class="text-indigo-500">
                                            <div class="model-config-container">
                                                <div class="model-item">
                                                    <div class="model-header">
                                                        <div class="model-title-section">
                                                            <div class="model-name">问答模型</div>
                                                            <div class="model-key">qa-llm</div>
                                                        </div>
                                                        <div class="model-provider-badge">
                                                            <Icon icon="mdi:comment-question-outline" class="w-3 h-3" />
                                                            {{ lpmmConfig.qa.llm.provider }}
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="model-settings">
                                                        <!-- 提供商选择 -->
                                                        <div class="model-setting">
                                                            <label class="model-setting-label">LLM 提供商</label>
                                                            <select 
                                                                class="select select-bordered select-sm flex-1" 
                                                                v-model="lpmmConfig.qa.llm.provider"
                                                                @change="markLpmmChanged"
                                                            >
                                                                <option v-for="provider in lpmmConfig.llm_providers" :key="provider.name" :value="provider.name">
                                                                    {{ provider.name }}
                                                                </option>
                                                            </select>
                                                        </div>

                                                        <!-- 模型名称 -->
                                                        <div class="model-setting">
                                                            <label class="model-setting-label">模型名称</label>
                                                            <input 
                                                                type="text" 
                                                                class="input input-bordered input-sm flex-1" 
                                                                v-model="lpmmConfig.qa.llm.model"
                                                                placeholder="deepseek-ai/DeepSeek-R1-Distill-Qwen-32B"
                                                                @input="markLpmmChanged"
                                                            />
                                                        </div>

                                                        <!-- QA参数网格 -->
                                                        <div class="model-setting-grid">
                                                            <div class="model-setting">
                                                                <label class="model-setting-label">关系搜索Top K</label>
                                                                <input 
                                                                    type="number" 
                                                                    class="input input-bordered input-sm flex-1" 
                                                                    v-model.number="lpmmConfig.qa.params.relation_search_top_k"
                                                                    min="1"
                                                                    @input="markLpmmChanged"
                                                                />
                                                            </div>
                                                            <div class="model-setting">
                                                                <label class="model-setting-label">关系阈值</label>
                                                                <input 
                                                                    type="number" 
                                                                    class="input input-bordered input-sm flex-1" 
                                                                    v-model.number="lpmmConfig.qa.params.relation_threshold"
                                                                    min="0"
                                                                    max="1"
                                                                    step="0.1"
                                                                    @input="markLpmmChanged"
                                                                />
                                                            </div>
                                                            <div class="model-setting">
                                                                <label class="model-setting-label">段落搜索Top K</label>
                                                                <input 
                                                                    type="number" 
                                                                    class="input input-bordered input-sm flex-1" 
                                                                    v-model.number="lpmmConfig.qa.params.paragraph_search_top_k"
                                                                    min="1"
                                                                    @input="markLpmmChanged"
                                                                />
                                                            </div>
                                                            <div class="model-setting">
                                                                <label class="model-setting-label">段落节点权重</label>
                                                                <input 
                                                                    type="number" 
                                                                    class="input input-bordered input-sm flex-1" 
                                                                    v-model.number="lpmmConfig.qa.params.paragraph_node_weight"
                                                                    min="0"
                                                                    max="1"
                                                                    step="0.01"
                                                                    @input="markLpmmChanged"
                                                                />
                                                            </div>
                                                            <div class="model-setting">
                                                                <label class="model-setting-label">实体过滤Top K</label>
                                                                <input 
                                                                    type="number" 
                                                                    class="input input-bordered input-sm flex-1" 
                                                                    v-model.number="lpmmConfig.qa.params.ent_filter_top_k"
                                                                    min="1"
                                                                    @input="markLpmmChanged"
                                                                />
                                                            </div>
                                                            <div class="model-setting">
                                                                <label class="model-setting-label">PPR阻尼</label>
                                                                <input 
                                                                    type="number" 
                                                                    class="input input-bordered input-sm flex-1" 
                                                                    v-model.number="lpmmConfig.qa.params.ppr_damping"
                                                                    min="0"
                                                                    max="1"
                                                                    step="0.1"
                                                                    @input="markLpmmChanged"
                                                                />
                                                            </div>
                                                            <div class="model-setting">
                                                                <label class="model-setting-label">结果Top K</label>
                                                                <input 
                                                                    type="number" 
                                                                    class="input input-bordered input-sm flex-1" 
                                                                    v-model.number="lpmmConfig.qa.params.res_top_k"
                                                                    min="1"
                                                                    @input="markLpmmChanged"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </SettingGroup>

                                        <!-- 信息提取配置 -->
                                        <SettingGroup title="信息提取" icon="mdi:file-document-multiple">
                                            <div class="setting-item">
                                                <div class="setting-info">
                                                    <label class="setting-label">工作线程数</label>
                                                    <p class="setting-description">并行处理的工作线程数量</p>
                                                </div>
                                                <div class="setting-control">
                                                    <input 
                                                        type="number" 
                                                        class="input input-bordered input-sm" 
                                                        v-model.number="lpmmConfig.info_extraction.workers"
                                                        min="1"
                                                        max="10"
                                                        @input="markLpmmChanged"
                                                    />
                                                </div>
                                            </div>
                                        </SettingGroup>

                                        <!-- 持久化配置 -->
                                        <SettingGroup title="持久化配置" icon="mdi:database">
                                            <div class="persistence-grid">
                                                <div class="setting-item">
                                                    <label class="setting-label">数据根路径</label>
                                                    <input 
                                                        type="text" 
                                                        class="input input-bordered input-sm" 
                                                        v-model="lpmmConfig.persistence.data_root_path"
                                                        placeholder="data"
                                                        @input="markLpmmChanged"
                                                    />
                                                </div>
                                                <div class="setting-item">
                                                    <label class="setting-label">导入数据路径</label>
                                                    <input 
                                                        type="text" 
                                                        class="input input-bordered input-sm" 
                                                        v-model="lpmmConfig.persistence.imported_data_path"
                                                        placeholder="data/imported_lpmm_data"
                                                        @input="markLpmmChanged"
                                                    />
                                                </div>
                                                <div class="setting-item">
                                                    <label class="setting-label">OpenIE数据路径</label>
                                                    <input 
                                                        type="text" 
                                                        class="input input-bordered input-sm" 
                                                        v-model="lpmmConfig.persistence.openie_data_path"
                                                        placeholder="data/openie"
                                                        @input="markLpmmChanged"
                                                    />
                                                </div>
                                                <div class="setting-item">
                                                    <label class="setting-label">嵌入数据目录</label>
                                                    <input 
                                                        type="text" 
                                                        class="input input-bordered input-sm" 
                                                        v-model="lpmmConfig.persistence.embedding_data_dir"
                                                        placeholder="data/embedding"
                                                        @input="markLpmmChanged"
                                                    />
                                                </div>
                                                <div class="setting-item">
                                                    <label class="setting-label">RAG数据目录</label>
                                                    <input 
                                                        type="text" 
                                                        class="input input-bordered input-sm" 
                                                        v-model="lpmmConfig.persistence.rag_data_dir"
                                                        placeholder="data/rag"
                                                        @input="markLpmmChanged"
                                                    />
                                                </div>
                                            </div>
                                        </SettingGroup>
                                    </div>

                                    <!-- 空状态 -->
                                    <div v-else class="empty-state">
                                        <Icon icon="mdi:cog-outline" class="empty-icon" />
                                        <h3 class="empty-title">尚未配置</h3>
                                        <p class="empty-description">LPMM 配置文件尚未创建或为空</p>
                                        <button class="btn btn-primary btn-sm" @click="loadLpmmConfig">
                                            <Icon icon="mdi:refresh" class="w-4 h-4 mr-2" />
                                            重新加载
                                        </button>
                                    </div>
                                </div>

                                <!-- 模型配置面板 -->
                                <div v-else-if="activeTab === 'model'" key="model" class="config-panel">
                                    <div class="panel-header">
                                        <h3 class="panel-title">模型配置</h3>
                                        <p class="panel-description">管理实例的AI模型配置和参数</p>
                                    </div>

                                    <div class="config-section" v-if="modelConfig">
                                        <!-- 输出长度限制 -->
                                        <SettingGroup title="全局配置" icon="mdi:settings" icon-class="text-blue-500">
                                            <div class="setting-item">
                                                <div class="setting-info">
                                                    <label class="setting-label">最大输出长度</label>
                                                    <p class="setting-description">所有模型的最大输出token数量限制</p>
                                                </div>
                                                <div class="setting-control">
                                                    <input 
                                                        type="number" 
                                                        class="input input-bordered input-sm w-32" 
                                                        v-model.number="modelConfig.model_max_output_length"
                                                        min="100"
                                                        max="10000"
                                                        step="100"
                                                        @input="markModelChanged"
                                                    />
                                                </div>
                                            </div>
                                        </SettingGroup>

                                        <!-- 模型配置列表 -->
                                        <SettingGroup title="模型配置" icon="mdi:brain" icon-class="text-purple-500">
                                            <div class="model-config-container">
                                                <!-- 使用计算属性缓存和分页渲染来优化性能 -->
                                                <div 
                                                    v-for="(model, modelKey) in paginatedModelConfigs" 
                                                    :key="modelKey"
                                                    class="model-item"
                                                >
                                                    <div class="model-header">
                                                        <div class="model-title-section">
                                                            <div class="model-name">{{ getModelDisplayName(modelKey) }}</div>
                                                            <div class="model-key">{{ modelKey }}</div>
                                                        </div>
                                                        <div class="model-provider-badge">
                                                            <Icon icon="mdi:server" class="w-3 h-3" />
                                                            {{ model.provider }}
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="model-settings">
                                                        <!-- 模型名称 -->
                                                        <div class="model-setting">
                                                            <label class="model-setting-label">模型名称</label>
                                                            <input 
                                                                type="text" 
                                                                class="input input-bordered input-sm flex-1" 
                                                                v-model="model.name"
                                                                @input="markModelChanged"
                                                                placeholder="输入模型名称"
                                                            />
                                                        </div>

                                                        <!-- 提供商 -->
                                                        <div class="model-setting">
                                                            <label class="model-setting-label">提供商</label>
                                                            <select 
                                                                class="select select-bordered select-sm flex-1" 
                                                                v-model="model.provider"
                                                                @change="markModelChanged"
                                                            >
                                                                <option value="SILICONFLOW">SiliconFlow</option>
                                                                <option value="OPENAI">OpenAI</option>
                                                                <option value="ANTHROPIC">Anthropic</option>
                                                                <option value="GOOGLE">Google</option>
                                                                <option value="AZURE">Azure</option>
                                                                <option value="LOCAL">Local</option>
                                                                <option value="OTHER">其他</option>
                                                            </select>
                                                        </div>

                                                        <!-- 价格配置 -->
                                                        <div class="model-setting-grid">
                                                            <div class="model-setting">
                                                                <label class="model-setting-label">输入价格</label>
                                                                <div class="input-group">
                                                                    <input 
                                                                        type="number" 
                                                                        class="input input-bordered input-sm flex-1" 
                                                                        v-model.number="model.pri_in"
                                                                        min="0"
                                                                        step="0.01"
                                                                        @input="markModelChanged"
                                                                    />
                                                                    <span class="input-group-text">¥/1M tokens</span>
                                                                </div>
                                                            </div>
                                                            <div class="model-setting">
                                                                <label class="model-setting-label">输出价格</label>
                                                                <div class="input-group">
                                                                    <input 
                                                                        type="number" 
                                                                        class="input input-bordered input-sm flex-1" 
                                                                        v-model.number="model.pri_out"
                                                                        min="0"
                                                                        step="0.01"
                                                                        @input="markModelChanged"
                                                                    />
                                                                    <span class="input-group-text">¥/1M tokens</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <!-- 温度参数 -->
                                                        <div class="model-setting" v-if="model.temp !== undefined">
                                                            <label class="model-setting-label">
                                                                温度参数
                                                                <span class="model-param-value">{{ model.temp }}</span>
                                                            </label>
                                                            <div class="range-container">
                                                                <input 
                                                                    type="range" 
                                                                    class="range range-primary range-sm" 
                                                                    v-model.number="model.temp"
                                                                    min="0"
                                                                    max="1"
                                                                    step="0.1"
                                                                    @input="markModelChanged"
                                                                />
                                                                <div class="range-labels">
                                                                    <span>保守 (0)</span>
                                                                    <span>平衡 (0.5)</span>
                                                                    <span>创造 (1)</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <!-- 思维链开关 -->
                                                        <div class="model-setting" v-if="model.enable_thinking !== undefined">
                                                            <div class="model-switch-container">
                                                                <label class="model-setting-label">启用思维链</label>
                                                                <input 
                                                                    type="checkbox" 
                                                                    class="toggle toggle-primary toggle-sm" 
                                                                    v-model="model.enable_thinking"
                                                                    @change="markModelChanged"
                                                                />
                                                            </div>
                                                            <p class="model-setting-description">启用后模型会显示推理过程</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <!-- 分页控制 -->
                                            <div v-if="needsPagination" class="model-pagination">
                                                <div class="pagination-info">
                                                    显示 {{ currentModelPage * modelPageSize + 1 }}-{{ Math.min((currentModelPage + 1) * modelPageSize, totalModelConfigs) }} 
                                                    / 共 {{ totalModelConfigs }} 个模型配置
                                                </div>
                                                <div class="pagination-controls">
                                                    <button 
                                                        class="btn btn-sm btn-outline"
                                                        :disabled="currentModelPage === 0"
                                                        @click="currentModelPage--"
                                                    >
                                                        <Icon icon="mdi:chevron-left" class="w-4 h-4" />
                                                        上一页
                                                    </button>
                                                    <span class="pagination-current">
                                                        {{ currentModelPage + 1 }} / {{ totalModelPages }}
                                                    </span>
                                                    <button 
                                                        class="btn btn-sm btn-outline"
                                                        :disabled="currentModelPage >= totalModelPages - 1"
                                                        @click="currentModelPage++"
                                                    >
                                                        下一页
                                                        <Icon icon="mdi:chevron-right" class="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </SettingGroup>
                                    </div>

                                    <!-- 加载状态 -->
                                    <div v-else-if="isLoadingModel" class="loading-container">
                                        <div class="loading loading-spinner loading-lg text-primary"></div>
                                        <p class="mt-4 text-base-content/70">正在加载模型配置...</p>
                                    </div>

                                    <!-- 错误状态 -->
                                    <div v-else-if="modelError" class="error-container">
                                        <div class="alert alert-error">
                                            <Icon icon="mdi:alert-circle" class="w-6 h-6" />
                                            <div>
                                                <p class="font-medium">加载模型配置失败</p>
                                                <p class="text-sm">{{ modelError }}</p>
                                            </div>
                                        </div>
                                        <button class="btn btn-primary mt-4" @click="loadModelConfig">
                                            <Icon icon="mdi:refresh" class="w-4 h-4 mr-2" />
                                            重试
                                        </button>
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
                                                <div 
                                                    v-for="(value, key) in envConfig" 
                                                    :key="key" 
                                                    class="env-item"
                                                    @mouseenter="onEnvItemHover(key, true)"
                                                    @mouseleave="onEnvItemHover(key, false)"
                                                >
                                                    <div class="env-key">
                                                        <!-- 编辑模式下显示输入框，否则显示标签 -->
                                                        <input 
                                                            v-if="editingEnvKey === key"
                                                            type="text" 
                                                            v-model="tempEnvKey"
                                                            class="input input-bordered input-sm w-full"
                                                            @blur="saveEnvKeyEdit(key)"
                                                            @keyup.enter="saveEnvKeyEdit(key)"
                                                            @keyup.esc="cancelEnvKeyEdit"
                                                            @vue:mounted="($el) => { $el.focus(); $el.select() }"
                                                        />
                                                        <label 
                                                            v-else
                                                            class="env-label"
                                                            @dblclick="startEditEnvKey(key)"
                                                            :title="isEnvItemHovered(key) ? '双击编辑变量名' : ''"
                                                        >
                                                            {{ key }}
                                                        </label>
                                                    </div>
                                                    <div class="env-value">
                                                        <!-- 编辑模式下显示输入框，否则显示只读输入框 -->
                                                        <input 
                                                            v-if="editingEnvValue === key"
                                                            type="text" 
                                                            v-model="tempEnvValue"
                                                            class="input input-bordered input-sm w-full"
                                                            @blur="saveEnvValueEdit(key)"
                                                            @keyup.enter="saveEnvValueEdit(key)"
                                                            @keyup.esc="cancelEnvValueEdit"
                                                            @vue:mounted="($el) => { $el.focus(); $el.select() }"
                                                        />
                                                        <input 
                                                            v-else
                                                            type="text" 
                                                            :value="envConfig[key]"
                                                            class="input input-bordered input-sm w-full env-value-display"
                                                            :class="{ 'env-value-hover': isEnvItemHovered(key) }"
                                                            @click="startEditEnvValue(key)"
                                                            :title="isEnvItemHovered(key) ? '点击编辑变量值' : ''"
                                                            readonly
                                                        />
                                                    </div>
                                                    <div class="env-actions">
                                                        <!-- 编辑时显示确认和取消按钮 -->
                                                        <template v-if="editingEnvKey === key || editingEnvValue === key">
                                                            <button 
                                                                class="btn btn-ghost btn-xs text-success"
                                                                @click="editingEnvKey === key ? saveEnvKeyEdit(key) : saveEnvValueEdit(key)"
                                                                title="保存"
                                                            >
                                                                <Icon icon="mdi:check" class="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                class="btn btn-ghost btn-xs text-warning"
                                                                @click="editingEnvKey === key ? cancelEnvKeyEdit() : cancelEnvValueEdit()"
                                                                title="取消"
                                                            >
                                                                <Icon icon="mdi:close" class="w-4 h-4" />
                                                            </button>
                                                        </template>
                                                        <!-- 正常状态显示删除按钮 -->
                                                        <template v-else>
                                                            <button 
                                                                class="btn btn-ghost btn-xs"
                                                                :class="{ 
                                                                    'text-error': isEnvItemHovered(key),
                                                                    'text-base-content/50': !isEnvItemHovered(key)
                                                                }"
                                                                @click="removeEnvVariable(key)"
                                                                :title="isEnvItemHovered(key) ? '删除环境变量' : ''"
                                                            >
                                                                <Icon icon="mdi:delete" class="w-4 h-4" />
                                                            </button>
                                                        </template>
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
                        <!-- 调试信息开关 -->
                        <button 
                            v-if="isDevMode" 
                            class="btn btn-ghost btn-xs ml-4"
                            @click="isDev = !isDev"
                            :title="isDev ? '关闭调试信息' : '开启调试信息'"
                        >
                            <Icon :icon="isDev ? 'mdi:bug' : 'mdi:bug-outline'" class="w-3 h-3" />
                            <span class="ml-1 text-xs">{{ isDev ? '调试开' : '调试关' }}</span>
                        </button>
                    </div>
                    <div class="footer-actions">
                        <button 
                            class="btn btn-outline btn-sm reset-btn" 
                            @click="confirmResetConfig"
                            :disabled="isLoading || isSaving || !hasChanges"
                        >
                            重置
                        </button>
                        <button 
                            class="btn btn-primary btn-sm save-btn" 
                            @click="saveConfig"
                            :disabled="!hasChanges || isLoading || isSaving"
                            :class="{ loading: isSaving }"
                        >
                            {{ isSaving ? '保存中...' : '保存✓' }}
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
    { key: 'model', title: '模型配置', icon: 'mdi:chip' },
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
const lpmmConfig = ref(null)
const modelConfig = ref(null)
const originalBotConfig = ref(null)
const originalEnvConfig = ref(null)
const originalLpmmConfig = ref(null)
const originalModelConfig = ref(null)

// 加载状态
const isLoading = ref(false)
const isLoadingEnv = ref(false)
const isLoadingLpmm = ref(false)
const isLoadingModel = ref(false)
const isSaving = ref(false)
const error = ref('')
const envError = ref('')
const lpmmError = ref('')
const modelError = ref('')

// 变更追踪
const hasConfigChanges = ref(false)
const hasEnvChanges = ref(false)
const hasLpmmChanges = ref(false)
const hasModelChanges = ref(false)

// 防抖定时器
const lpmmChangeTimeout = ref(null)
const modelChangeTimeout = ref(null)

// 环境变量编辑
const newEnvKey = ref('')
const newEnvValue = ref('')

// 环境变量编辑状态
const editingEnvKey = ref('')
const editingEnvValue = ref('')
const tempEnvKey = ref('')
const tempEnvValue = ref('')
const hoveredEnvItems = ref(new Set())

// 动态列表新项目值管理
const newItemValues = ref({})

// 开发模式和调试信息
const isDev = ref(false)
const isDevMode = ref(import.meta.env.DEV || import.meta.env.MODE === 'development')
const sidebarWidth = ref(0)
const debugInfo = ref({
    detectedSelectors: [],
    cssVariables: [],
    finalWidth: 0
})

// 动态选项配置
const getDynamicOptions = (fieldPath) => {
    // 根据字段路径返回对应的选项
    switch (fieldPath) {
        case 'chat.chat_mode':
            return [
                { value: 'normal', label: '普通模式' },
                { value: 'auto', label: '自动模式' },
                { value: 'manual', label: '手动模式' },
                { value: 'hybrid', label: '混合模式' },
                { value: 'silent', label: '静默模式' }
            ]
        case 'safety.filter_strength':
            return [
                { value: 'low', label: '低 - 基础过滤' },
                { value: 'medium', label: '中 - 标准过滤' },
                { value: 'high', label: '高 - 严格过滤' },
                { value: 'strict', label: '极严格 - 最高级过滤' }
            ]
        case 'log.log_level':
        case 'log.console_log_level':
        case 'log.file_log_level':
            return [
                { value: 'DEBUG', label: 'DEBUG - 详细调试信息' },
                { value: 'INFO', label: 'INFO - 一般信息' },
                { value: 'WARNING', label: 'WARNING - 警告信息' },
                { value: 'ERROR', label: 'ERROR - 错误信息' },
                { value: 'CRITICAL', label: 'CRITICAL - 严重错误' }
            ]
        default:
            return []
    }
}

// 字段类型映射和配置
const getFieldConfig = (key, value, parentPath = '') => {
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
        if (value.length > 0 && typeof value[0] === 'string') {
            return { type: 'string-array', path: fullPath }
        } else if (value.length > 0 && typeof value[0] === 'number') {
            return { type: 'number-array', path: fullPath }
        } else {
            return { type: 'array', path: fullPath }
        }
    } else if (typeof value === 'object' && value !== null) {
        return { type: 'object', path: fullPath }
    }
    
    return { type: 'input', path: fullPath }
}

// 字段显示名称映射
const getFieldLabel = (key) => {
    const labelMap = {
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
    
    return labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// 字段描述映射
const getFieldDescription = (key, parentSection = '') => {
    const descriptionMap = {
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
        'mood_decay_rate': '心情值的自然衰减速率',
        'enable': parentSection === 'lpmm_knowledge' ? '启用 LPMM 知识库功能' : '启用功能'
    }
    
    return descriptionMap[key] || `配置${getFieldLabel(key)}的相关设置`
}

// 动态生成配置节
const generateConfigSections = (config) => {
    if (!config) return []
    
    const sections = []
    const sectionConfig = {
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
    
    // 跳过的内部字段
    const skipSections = ['inner']
    
    Object.keys(config).forEach(sectionKey => {
        if (skipSections.includes(sectionKey)) return
        
        const sectionData = config[sectionKey]
        if (typeof sectionData !== 'object' || sectionData === null) return
        
        const sectionInfo = sectionConfig[sectionKey] || {
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

// 渲染动态字段组件
const renderField = (key, value, parentPath = '', parentSection = '') => {
    const config = getFieldConfig(key, value, parentPath)
    const fullPath = config.path
    
    return {
        key,
        label: getFieldLabel(key),
        description: getFieldDescription(key, parentSection),
        config,
        value,
        fullPath
    }
}

// 获取嵌套对象的值
const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj)
}

// 设置嵌套对象的值
const setNestedValue = (obj, path, value) => {
    const keys = path.split('.')
    const lastKey = keys.pop()
    const target = keys.reduce((current, key) => {
        if (!current[key]) current[key] = {}
        return current[key]
    }, obj)
    target[lastKey] = value
}

// 动态数组操作方法
const addArrayItem = (path, defaultValue = '') => {
    if (!defaultValue.trim()) return // 不添加空值
    
    const current = getNestedValue(botConfig.value, path) || []
    current.push(defaultValue)
    setNestedValue(botConfig.value, path, current)
    
    // 清空对应的输入框
    newItemValues.value[path] = ''
    
    markConfigChanged()
}

const removeArrayItem = (path, index) => {
    const current = getNestedValue(botConfig.value, path)
    if (current && index >= 0 && index < current.length) {
        current.splice(index, 1)
        markConfigChanged()
    }
}

// 计算属性
const hasChanges = computed(() => hasConfigChanges.value || hasEnvChanges.value || hasLpmmChanges.value || hasModelChanges.value)

// 性能优化：分页渲染模型配置
const modelPageSize = ref(6) // 每页显示6个模型配置
const currentModelPage = ref(0)

const paginatedModelConfigs = computed(() => {
    const allConfigs = getModelConfigs()
    const configEntries = Object.entries(allConfigs)
    
    // 如果配置数量较少，直接返回全部
    if (configEntries.length <= modelPageSize.value) {
        return allConfigs
    }
    
    // 分页处理
    const start = currentModelPage.value * modelPageSize.value
    const end = start + modelPageSize.value
    const paginatedEntries = configEntries.slice(start, end)
    
    return Object.fromEntries(paginatedEntries)
})

// 分页相关计算属性
const totalModelConfigs = computed(() => Object.keys(getModelConfigs()).length)
const totalModelPages = computed(() => Math.ceil(totalModelConfigs.value / modelPageSize.value))
const needsPagination = computed(() => totalModelConfigs.value > modelPageSize.value)

// 动态配置节列表
const configSections = computed(() => {
    return generateConfigSections(botConfig.value)
})

// 方法
const switchTab = (tabKey) => {
    previousTab.value = activeTab.value
    activeTab.value = tabKey
    
    // 根据标签页加载对应数据
    if (tabKey === 'bot' && !botConfig.value) {
        loadBotConfig()
    } else if (tabKey === 'model' && !modelConfig.value) {
        loadModelConfig()
    } else if (tabKey === 'env' && !envConfig.value) {
        loadEnvConfig()
    } else if (tabKey === 'lpmm' && !lpmmConfig.value) {
        loadLpmmConfig()
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

const markLpmmChanged = () => {
    hasLpmmChanges.value = true
}

const markModelChanged = () => {
    hasModelChanges.value = true
}

// LPMM 配置相关方法
const addLlmProvider = () => {
    if (!lpmmConfig.value.llm_providers) {
        lpmmConfig.value.llm_providers = []
    }
    
    lpmmConfig.value.llm_providers.push({
        name: '新提供商',
        base_url: '',
        api_key: ''
    })
    
    markLpmmChanged()
}

const removeLlmProvider = (index) => {
    if (lpmmConfig.value.llm_providers && lpmmConfig.value.llm_providers.length > 1) {
        lpmmConfig.value.llm_providers.splice(index, 1)
        markLpmmChanged()
    }
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

// 环境变量悬停状态管理
const onEnvItemHover = (key, isHovered) => {
    if (isHovered) {
        hoveredEnvItems.value.add(key)
    } else {
        hoveredEnvItems.value.delete(key)
    }
}

const isEnvItemHovered = (key) => {
    return hoveredEnvItems.value.has(key)
}

// 环境变量编辑功能
const startEditEnvKey = (key) => {
    editingEnvKey.value = key
    tempEnvKey.value = key
    // 使用nextTick确保DOM已更新，然后聚焦
    nextTick(() => {
        // 由于使用了动态ref，输入框会自动聚焦
    })
}

const startEditEnvValue = (key) => {
    editingEnvValue.value = key
    tempEnvValue.value = envConfig.value[key] || ''
    // 使用nextTick确保DOM已更新，然后聚焦
    nextTick(() => {
        // 由于使用了动态ref，输入框会自动聚焦
    })
}

const saveEnvKeyEdit = (oldKey) => {
    if (!tempEnvKey.value.trim()) {
        cancelEnvKeyEdit()
        return
    }
    
    const newKey = tempEnvKey.value.trim()
    if (newKey !== oldKey) {
        // 检查新键名是否已存在
        if (envConfig.value[newKey] !== undefined) {
            toastService.error('环境变量名已存在')
            cancelEnvKeyEdit()
            return
        }
        
        // 更新键名
        const value = envConfig.value[oldKey]
        delete envConfig.value[oldKey]
        envConfig.value[newKey] = value
        markEnvChanged()
    }
    
    editingEnvKey.value = ''
    tempEnvKey.value = ''
}

const saveEnvValueEdit = (key) => {
    if (envConfig.value[key] !== tempEnvValue.value) {
        envConfig.value[key] = tempEnvValue.value
        markEnvChanged()
    }
    
    editingEnvValue.value = ''
    tempEnvValue.value = ''
}

const cancelEnvKeyEdit = () => {
    editingEnvKey.value = ''
    tempEnvKey.value = ''
}

const cancelEnvValueEdit = () => {
    editingEnvValue.value = ''
    tempEnvValue.value = ''
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
        console.log('Bot配置加载成功', {
            data: response.data,
            sections: generateConfigSections(response.data),
            configSections: configSections.value
        })
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

const loadLpmmConfig = async () => {
    if (!props.instanceId) return
    
    // 防止重复请求
    if (isLoadingLpmm.value) {
        console.log('LPMM配置正在加载中，跳过重复请求')
        return
    }
    
    // 如果已经有配置数据，不重复加载
    if (lpmmConfig.value) {
        console.log('LPMM配置已存在，跳过重复加载')
        return
    }
    
    isLoadingLpmm.value = true
    lpmmError.value = ''
    
    try {
        console.log('开始加载LPMM配置:', props.instanceId)
        const response = await maibotConfigApi.getLpmmConfig(props.instanceId)
        lpmmConfig.value = response.data
        originalLpmmConfig.value = JSON.parse(JSON.stringify(response.data))
        hasLpmmChanges.value = false
        console.log('LPMM配置加载成功')
    } catch (err) {
        console.error('加载LPMM配置失败:', err)
        lpmmError.value = err.message || '加载LPMM配置失败'
        toastService.error('加载LPMM配置失败: ' + lpmmError.value)
    } finally {
        isLoadingLpmm.value = false
    }
}

const loadModelConfig = async () => {
    if (!props.instanceId) return
    
    // 防止重复请求
    if (isLoadingModel.value) {
        console.log('模型配置正在加载中，跳过重复请求')
        return
    }
    
    // 如果已经有配置数据，不重复加载
    if (modelConfig.value) {
        console.log('模型配置已存在，跳过重复加载')
        return
    }
    
    isLoadingModel.value = true
    modelError.value = ''
    
    try {
        console.log('开始加载模型配置:', props.instanceId)
        const response = await maibotConfigApi.getBotConfig(props.instanceId)
        // 从bot配置中提取模型配置
        if (response.data && response.data.model) {
            modelConfig.value = response.data.model
            originalModelConfig.value = JSON.parse(JSON.stringify(response.data.model))
            hasModelChanges.value = false
            console.log('模型配置加载成功')
        } else {
            throw new Error('未找到模型配置数据')
        }
    } catch (err) {
        console.error('加载模型配置失败:', err)
        modelError.value = err.message || '加载模型配置失败'
        toastService.error('加载模型配置失败: ' + modelError.value)
    } finally {
        isLoadingModel.value = false
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
        
        // 保存LPMM配置
        if (hasLpmmChanges.value && lpmmConfig.value) {
            await maibotConfigApi.updateLpmmConfig(props.instanceId, lpmmConfig.value)
            originalLpmmConfig.value = JSON.parse(JSON.stringify(lpmmConfig.value))
            hasLpmmChanges.value = false
        }
        
        // 保存模型配置（作为bot配置的一部分）
        if (hasModelChanges.value && modelConfig.value && botConfig.value) {
            botConfig.value.model = modelConfig.value
            await maibotConfigApi.updateBotConfig(props.instanceId, botConfig.value)
            originalModelConfig.value = JSON.parse(JSON.stringify(modelConfig.value))
            hasModelChanges.value = false
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
    
    if (hasLpmmChanges.value && originalLpmmConfig.value) {
        lpmmConfig.value = JSON.parse(JSON.stringify(originalLpmmConfig.value))
        hasLpmmChanges.value = false
    }
    
    if (hasModelChanges.value && originalModelConfig.value) {
        modelConfig.value = JSON.parse(JSON.stringify(originalModelConfig.value))
        hasModelChanges.value = false
    }
    
    toastService.info('配置已重置')
}

const confirmResetConfig = async () => {
    if (hasChanges.value) {
        if (confirm('确定要重置配置吗？所有未保存的更改都会丢失。')) {
            await resetConfig()
        }
    } else {
        toastService.info('没有需要重置的更改')
    }
}

// 模型配置相关辅助函数
const getModelConfigs = () => {
    if (!modelConfig.value) return {}
    
    // 排除非模型配置项
    const { model_max_output_length, ...modelConfigs } = modelConfig.value
    return modelConfigs
}

const getModelDisplayName = (modelKey) => {
    const nameMap = {
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
    return nameMap[modelKey] || modelKey
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
    
    // 使用 RAF 优化 CSS 变量更新，避免强制重排
    requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--sidebar-width', `${detectedWidth}px`)
    })
    
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
        lpmmConfig.value = null
        modelConfig.value = null
        originalBotConfig.value = null
        originalEnvConfig.value = null
        originalLpmmConfig.value = null
        originalModelConfig.value = null
        hasConfigChanges.value = false
        hasEnvChanges.value = false
        hasLpmmChanges.value = false
        hasModelChanges.value = false
        error.value = ''
        envError.value = ''
        lpmmError.value = ''
        modelError.value = ''
        
        console.log('实例ID变化，重新加载配置', { newId, oldId, activeTab: activeTab.value })
        
        // 加载当前标签页的数据
        if (activeTab.value === 'bot') {
            loadBotConfig()
        } else if (activeTab.value === 'model') {
            loadModelConfig()
        } else if (activeTab.value === 'env') {
            loadEnvConfig()
        } else if (activeTab.value === 'lpmm') {
            loadLpmmConfig()
        }
    }
})

// 监听打开状态
watch(() => props.isOpen, (isOpen, wasOpen) => {
    if (isOpen && !wasOpen && props.instanceId) {
        console.log('抽屉打开，开始加载配置', { instanceId: props.instanceId, activeTab: activeTab.value })
        
        // 只有当抽屉从关闭变为打开时才加载数据
        if (activeTab.value === 'bot' && !botConfig.value) {
            loadBotConfig()
        } else if (activeTab.value === 'model' && !modelConfig.value) {
            loadModelConfig()
        } else if (activeTab.value === 'env' && !envConfig.value) {
            loadEnvConfig()
        } else if (activeTab.value === 'lpmm' && !lpmmConfig.value) {
            loadLpmmConfig()
        }
    }
})

// 监听LPMM配置变化 - 优化性能
watch(lpmmConfig, (newConfig, oldConfig) => {
    if (newConfig && oldConfig && originalLpmmConfig.value) {
        // 使用防抖来减少频繁检查
        clearTimeout(lpmmChangeTimeout.value)
        lpmmChangeTimeout.value = setTimeout(() => {
            const hasChanges = JSON.stringify(newConfig) !== JSON.stringify(originalLpmmConfig.value)
            hasLpmmChanges.value = hasChanges
        }, 300)
    }
}, { deep: true, flush: 'post' })

// 监听模型配置变化 - 优化性能
watch(modelConfig, (newConfig, oldConfig) => {
    if (newConfig && oldConfig && originalModelConfig.value) {
        // 使用防抖来减少频繁检查
        clearTimeout(modelChangeTimeout.value)
        modelChangeTimeout.value = setTimeout(() => {
            const hasChanges = JSON.stringify(newConfig) !== JSON.stringify(originalModelConfig.value)
            hasModelChanges.value = hasChanges
        }, 300)
    }
}, { deep: true, flush: 'post' })

// 组件挂载时的初始化
onMounted(() => {
    // 检查开发模式
    isDev.value = import.meta.env.DEV || import.meta.env.MODE === 'development' || false
    
    console.log('BotConfigDrawer mounted', {
        isOpen: props.isOpen,
        instanceId: props.instanceId,
        isDev: isDev.value
    })
    
    // 如果抽屉已经打开，立即加载配置
    if (props.isOpen && props.instanceId && activeTab.value === 'bot') {
        loadBotConfig()
    }
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
/* Bot配置抽屉样式 - 与设置抽屉保持一致 */

/* 背景遮罩 - 不覆盖侧边栏 */
.bot-config-drawer-backdrop {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: var(--sidebar-width, 64px); /* 从侧边栏右侧开始 */
    background: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 40; /* 确保在侧边栏下方 */
    pointer-events: auto;
}

/* 主题相关的背景遮罩调整 */
:root[data-theme="dark"] .bot-config-drawer-backdrop {
    background: rgba(0, 0, 0, 0.35);
}

:root[data-theme="light"] .bot-config-drawer-backdrop,
:root[data-theme="cupcake"] .bot-config-drawer-backdrop,
:root[data-theme="bumblebee"] .bot-config-drawer-backdrop {
    background: rgba(255, 255, 255, 0.1);
}

/* 主容器 */
.bot-config-drawer-container {
    width: 80%;
    max-width: 900px;
    height: 80%;
    max-height: 650px;
    background-color: #ffffff;
    border-radius: 16px;
    box-shadow: 0 32px 64px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    border: 1px solid rgba(0, 0, 0, 0.1);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 深色模式优化 */
:root[data-theme="dark"] .bot-config-drawer-container {
    background-color: rgba(22, 25, 30, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 32px 64px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

/* 头部 */
.bot-config-header {
    background: #ffffff;
    padding: 1.25rem 1.75rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    position: relative;
}

:root[data-theme="dark"] .bot-config-header {
    background: rgba(22, 25, 30, 0.98);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
}

.bot-config-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.9);
    margin: 0;
}

.instance-info {
    font-size: 0.875rem;
    color: rgba(0, 0, 0, 0.7);
    margin: 0.25rem 0 0 0;
}

.bot-config-header .btn {
    color: rgba(0, 0, 0, 0.7);
}

.bot-config-header .btn:hover {
    background: rgba(0, 0, 0, 0.05);
    color: rgba(0, 0, 0, 0.9);
}

/* 主体内容 */
.bot-config-content {
    display: flex;
    flex: 1;
    overflow: hidden;
}

/* 侧边栏 */
.bot-config-sidebar {
    width: 220px;
    background: #ffffff;
    border-right: 1px solid rgba(0, 0, 0, 0.1);
    padding: 1.25rem 0;
    overflow-y: auto;
    flex-shrink: 0;
}

:root[data-theme="dark"] .bot-config-sidebar {
    background: rgba(18, 20, 24, 0.95);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
}

/* 导航项 */
.nav-item {
    display: flex;
    align-items: center;
    padding: 0.75rem 1.25rem;
    margin: 0 0.75rem 0.375rem 0.75rem;
    border-radius: 10px;
    color: rgba(0, 0, 0, 0.7);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-decoration: none;
    border: none;
    background: none;
    width: calc(100% - 1.5rem);
    text-align: left;
    font-weight: 500;
    position: relative;
}

.nav-item:hover {
    background: rgba(0, 0, 0, 0.05);
    color: rgba(0, 0, 0, 0.9);
    transform: translateX(4px);
}

.nav-item.active {
    background: rgba(59, 130, 246, 0.1);
    color: rgb(59, 130, 246);
    border-left: 3px solid rgb(59, 130, 246);
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.nav-icon {
    margin-right: 0.75rem;
    font-size: 1.1rem;
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
}

/* 主内容区 */
.bot-config-main {
    flex: 1;
    overflow: hidden;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.config-panel-wrapper {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
}

/* 面板内容 */
.config-panel {
    flex: 1;
    padding: 2.5rem;
    overflow-y: auto;
    overflow-x: hidden;
    background: #ffffff;
    position: relative;
    height: 100%;
    scroll-behavior: smooth;
}

:root[data-theme="dark"] .config-panel {
    background: rgba(22, 25, 30, 0.95);
    color: rgba(255, 255, 255, 0.9);
}

.panel-header {
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

:root[data-theme="dark"] .panel-header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.9);
    margin-bottom: 0.375rem;
}

.panel-description {
    color: rgba(0, 0, 0, 0.7);
    font-size: 0.875rem;
    line-height: 1.4;
}

.config-section {
    flex: 1;
    width: 100%;
    max-width: 100%;
}

/* 设置组件样式 */
.config-section > * {
    width: 100%;
    box-sizing: border-box;
}

/* 统一的字段排版样式 */
.setting-item {
    margin-bottom: 0.75rem;
    width: 100%;
    box-sizing: border-box;
    position: relative;
}

.setting-label {
    font-weight: 500;
    color: rgba(0, 0, 0, 0.9);
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.8rem;
    line-height: 1.3;
}

.setting-description {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.7);
    margin-bottom: 0.5rem;
    line-height: 1.3;
}

:root[data-theme="dark"] .setting-label {
    color: rgba(255, 255, 255, 0.9);
}

:root[data-theme="dark"] .setting-description {
    color: rgba(255, 255, 255, 0.7);
}

/* 确保所有设置组件都有统一的间距 */
.setting-group .setting-item:last-child {
    margin-bottom: 0;
}

/* 动态列表样式优化 */
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
    background-color: rgba(0, 0, 0, 0.03);
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    width: 100%;
    box-sizing: border-box;
    transition: all 0.2s ease;
}

.dynamic-item:hover {
    background-color: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.15);
}

:root[data-theme="dark"] .dynamic-item {
    background-color: rgba(26, 29, 35, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

:root[data-theme="dark"] .dynamic-item:hover {
    background-color: rgba(26, 29, 35, 0.95);
    border-color: rgba(255, 255, 255, 0.15);
}

.dynamic-item input,
.dynamic-item textarea {
    flex: 1;
    min-width: 0;
    border: 1px solid rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
}

.dynamic-item input:focus,
.dynamic-item textarea:focus {
    border-color: hsl(var(--p));
    box-shadow: 0 0 0 2px hsl(var(--p) / 0.2);
    outline: none;
}

.dynamic-item .btn-square {
    flex-shrink: 0;
    width: 2.25rem;
    height: 2.25rem;
}

/* 添加按钮样式 */
.dynamic-list .btn-outline {
    border: 1px dashed rgba(0, 0, 0, 0.2);
    background-color: rgba(0, 0, 0, 0.02);
    color: rgba(0, 0, 0, 0.7);
    transition: all 0.2s ease;
}

.dynamic-list .btn-outline:hover {
    border-style: solid;
    border-color: hsl(var(--p));
    background-color: hsl(var(--p) / 0.1);
    color: hsl(var(--p));
}

:root[data-theme="dark"] .dynamic-list .btn-outline {
    border-color: rgba(255, 255, 255, 0.2);
    background-color: rgba(255, 255, 255, 0.02);
    color: rgba(255, 255, 255, 0.7);
}

:root[data-theme="dark"] .dynamic-list .btn-outline:hover {
    border-color: hsl(var(--p));
    background-color: hsl(var(--p) / 0.1);
    color: hsl(var(--p));
}

/* 标签式数组字段布局样式 */
.tag-list-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
}

.tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    min-height: 1.5rem;
    align-items: flex-start;
}

.tag-item {
    display: inline-flex;
    align-items: center;
    background-color: hsl(var(--p) / 0.1);
    border: 1px solid hsl(var(--p) / 0.2);
    border-radius: 0.75rem;
    padding: 0.125rem 0.5rem;
    font-size: 0.8rem;
    color: hsl(var(--p));
    transition: all 0.2s ease;
    max-width: 180px;
}

.tag-item:hover {
    background-color: hsl(var(--p) / 0.15);
    border-color: hsl(var(--p) / 0.3);
}

.tag-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
}

.tag-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 0.25rem;
    padding: 0.1rem;
    border: none;
    background: none;
    color: hsl(var(--p) / 0.7);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
}

.tag-remove:hover {
    background-color: hsl(var(--er) / 0.1);
    color: hsl(var(--er));
}

.tag-input-container {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.tag-input {
    flex: 1;
    min-width: 0;
    padding: 0.375rem 0.5rem;
    border: 1px solid hsl(var(--b2));
    border-radius: 0.375rem;
    font-size: 0.8rem;
    background-color: hsl(var(--b1));
    color: hsl(var(--bc));
    transition: all 0.2s ease;
    height: 2rem;
}

.tag-input:focus {
    outline: none;
    border-color: hsl(var(--p));
    box-shadow: 0 0 0 2px hsl(var(--p) / 0.2);
}

.tag-input::placeholder {
    color: hsl(var(--bc) / 0.5);
}

.tag-add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: 1px solid hsl(var(--p) / 0.3);
    background-color: hsl(var(--p) / 0.1);
    color: hsl(var(--p));
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.tag-add-btn:hover {
    border-color: hsl(var(--p));
    background-color: hsl(var(--p) / 0.15);
}

.tag-add-btn:active {
    transform: scale(0.95);
}

/* 深色主题适配 */
:root[data-theme="dark"] .tag-item {
    background-color: hsl(var(--p) / 0.15);
    border-color: hsl(var(--p) / 0.25);
}

:root[data-theme="dark"] .tag-item:hover {
    background-color: hsl(var(--p) / 0.2);
    border-color: hsl(var(--p) / 0.35);
}

:root[data-theme="dark"] .tag-input {
    background-color: hsl(var(--b1));
    border-color: hsl(var(--b3));
}

:root[data-theme="dark"] .tag-input:focus {
    border-color: hsl(var(--p));
}

:root[data-theme="dark"] .tag-add-btn {
    background-color: hsl(var(--p) / 0.15);
    border-color: hsl(var(--p) / 0.3);
}

:root[data-theme="dark"] .tag-add-btn:hover {
    background-color: hsl(var(--p) / 0.25);
}

/* 确保与其他设置项的布局和字重一致 */
.setting-item .setting-info {
    flex: 0 0 35%;
    padding-right: 1rem;
}

.setting-item .setting-control {
    flex: 1;
    min-width: 0;
}

/* 统一字重和对齐 */
.setting-label {
    font-weight: 600 !important;
    font-size: 0.8rem !important;
    color: hsl(var(--bc)) !important;
    margin-bottom: 0.2rem !important;
    display: block !important;
}

.setting-description {
    font-size: 0.7rem !important;
    color: hsl(var(--bc) / 0.7) !important;
    line-height: 1.3 !important;
    margin: 0 !important;
}

/* 加载和错误状态 */
.loading-container, .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 20rem;
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
    height: 20rem;
    text-align: center;
    padding: 2rem;
    width: 100%;
    box-sizing: border-box;
}

.coming-soon-icon {
    width: 4rem;
    height: 4rem;
    color: rgba(0, 0, 0, 0.3);
    margin-bottom: 1rem;
}

/* 底部操作栏 */
.bot-config-footer {
    background: rgba(0, 0, 0, 0.03);
    padding: 1rem 1.5rem;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

:root[data-theme="dark"] .bot-config-footer {
    background: rgba(18, 20, 24, 0.95);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-info .config-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: rgba(0, 0, 0, 0.7);
}

.footer-actions {
    display: flex;
    gap: 0.75rem;
}

/* 增强的输入框样式 */
.enhanced-input {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
}

.enhanced-input:focus {
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15), 
                0 0 0 2px rgba(59, 130, 246, 0.2);
    transform: translateY(-1px);
}

.enhanced-input:hover:not(:focus) {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* 深色主题样式 */
:root[data-theme="dark"] .enhanced-input {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    background: hsl(var(--b2));
    border-color: hsl(var(--b3));
}

:root[data-theme="dark"] .enhanced-input:focus {
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25), 
                0 0 0 2px rgba(59, 130, 246, 0.3);
}

:root[data-theme="dark"] .enhanced-input:hover:not(:focus) {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

/* 重置按钮优化 */
.reset-btn {
    border: 1px solid #e5e7eb;
    transition: all 0.2s ease;
}

.reset-btn:hover:not(:disabled) {
    border-color: #ef4444;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
}

/* 深色主题样式 */
:root[data-theme="dark"] .reset-btn {
    border-color: hsl(var(--b3));
}

:root[data-theme="dark"] .reset-btn:hover:not(:disabled) {
    border-color: #ef4444;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
}

/* 添加别名组件优化 */
.add-alias-container {
    margin-top: 0.5rem;
}

.add-alias-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: transparent;
    border: 2px dashed #d1d5db;
    border-radius: 0.5rem;
    color: #6b7280;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    cursor: pointer;
    width: 100%;
    justify-content: center;
}

.add-alias-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
}

.add-alias-btn:active {
    transform: scale(0.98);
}

.alias-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.alias-item:last-child {
    margin-bottom: 0;
}

/* 深色主题样式 */
:root[data-theme="dark"] .alias-item {
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

:root[data-theme="dark"] .add-alias-btn {
    border-color: hsl(var(--b3));
    color: hsl(var(--bc) / 0.6);
}

:root[data-theme="dark"] .add-alias-btn:hover {
    border-color: #3b82f6;
    color: #60a5fa;
    background: rgba(59, 130, 246, 0.1);
}

/* 添加人格侧面组件优化 */
.add-personality-container {
    margin-top: 0.5rem;
}

.add-personality-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: transparent;
    border: 2px dashed #d1d5db;
    border-radius: 0.5rem;
    color: #6b7280;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    cursor: pointer;
    width: 100%;
    justify-content: center;
}

.add-personality-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
}

.add-personality-btn:active {
    transform: scale(0.98);
}

.personality-side-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.personality-side-item:last-child {
    margin-bottom: 0;
}

/* 添加身份信息组件优化 */
.add-identity-container {
    margin-top: 0.5rem;
}

.add-identity-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: transparent;
    border: 2px dashed #d1d5db;
    border-radius: 0.5rem;
    color: #6b7280;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    cursor: pointer;
    width: 100%;
    justify-content: center;
}

.add-identity-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
}

.add-identity-btn:active {
    transform: scale(0.98);
}

.identity-detail-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.identity-detail-item:last-child {
    margin-bottom: 0;
}

/* 环境变量编辑样式 */
.env-variables {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.env-item {
    display: grid;
    grid-template-columns: 1fr 2fr auto;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
    background: rgba(0, 0, 0, 0.02);
}

.env-item:hover {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(59, 130, 246, 0.3);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.env-key {
    display: flex;
    align-items: center;
    min-width: 0;
}

.env-label {
    font-weight: 500;
    color: rgba(0, 0, 0, 0.8);
    cursor: pointer;
    padding: 0.375rem 0.5rem;
    border-radius: 4px;
    transition: all 0.2s ease;
    word-break: break-word;
    user-select: none;
}

.env-label:hover {
    background: rgba(59, 130, 246, 0.1);
    color: rgb(59, 130, 246);
}

.env-value {
    display: flex;
    align-items: center;
    min-width: 0;
}

.env-value-display {
    cursor: pointer;
    transition: all 0.2s ease;
}

.env-value-display:hover {
    background: rgba(59, 130, 246, 0.05);
    border-color: rgba(59, 130, 246, 0.3);
}

.env-value-hover {
    background: rgba(59, 130, 246, 0.05) !important;
    border-color: rgba(59, 130, 246, 0.3) !important;
}

.env-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.add-env-item {
    display: grid;
    grid-template-columns: 1fr 2fr auto;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    border: 2px dashed rgba(0, 0, 0, 0.2);
    background: rgba(0, 0, 0, 0.01);
    transition: all 0.2s ease;
}

.add-env-item:hover {
    border-color: rgba(59, 130, 246, 0.4);
    background: rgba(59, 130, 246, 0.02);
}

/* 深色主题样式 */
:root[data-theme="dark"] .env-item {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.1);
}

:root[data-theme="dark"] .env-item:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(59, 130, 246, 0.4);
}

:root[data-theme="dark"] .env-label {
    color: rgba(255, 255, 255, 0.8);
}

:root[data-theme="dark"] .env-label:hover {
    background: rgba(59, 130, 246, 0.2);
    color: rgb(96, 165, 250);
}

:root[data-theme="dark"] .env-value-display:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.4);
}

:root[data-theme="dark"] .env-value-hover {
    background: rgba(59, 130, 246, 0.1) !important;
    border-color: rgba(59, 130, 246, 0.4) !important;
}

:root[data-theme="dark"] .add-env-item {
    background: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.2);
}

:root[data-theme="dark"] .add-env-item:hover {
    border-color: rgba(59, 130, 246, 0.5);
    background: rgba(59, 130, 246, 0.05);
}

/* LPMM 配置样式 */
.llm-providers-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.provider-item {
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.02);
}

.provider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
}

.provider-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--color-text-primary);
}

.provider-settings {
    display: grid;
    gap: 0.75rem;
}

.qa-params-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
    margin-top: 0.5rem;
}

.persistence-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 0.75rem;
}

.qa-params-grid .setting-item,
.persistence-grid .setting-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.qa-params-grid .setting-label,
.persistence-grid .setting-label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-text-secondary);
}

:root[data-theme="dark"] .provider-item {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
}

:root[data-theme="dark"] .provider-name {
    color: var(--color-text-primary);
}

/* 模型配置样式 */
.model-config-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.model-item {
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.02);
    transition: all 0.2s ease;
}

.model-item:hover {
    border-color: rgba(59, 130, 246, 0.3);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.model-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    background: rgba(0, 0, 0, 0.03);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.model-title-section {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.model-name {
    font-weight: 600;
    font-size: 1rem;
    color: var(--color-text-primary);
}

.model-key {
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    background: rgba(59, 130, 246, 0.1);
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    width: fit-content;
}

.model-provider-badge {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.025em;
}

.model-settings {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.model-setting {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.model-setting-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.model-setting-label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.model-param-value {
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.75rem;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-weight: 600;
}

.input-group {
    display: flex;
    align-items: center;
    gap: 0;
}

.input-group .input {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: none;
}

.input-group-text {
    display: flex;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid #d1d5db;
    border-left: none;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
}

.range-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.range-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    color: var(--color-text-secondary);
    margin-top: 0.25rem;
}

.model-switch-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.25rem;
}

.model-setting-description {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    margin: 0;
}

/* 暗色主题适配 */
:root[data-theme="dark"] .model-item {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
}

:root[data-theme="dark"] .model-item:hover {
    border-color: rgba(59, 130, 246, 0.4);
}

:root[data-theme="dark"] .model-header {
    background: rgba(255, 255, 255, 0.03);
    border-bottom-color: rgba(255, 255, 255, 0.05);
}

:root[data-theme="dark"] .input-group-text {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);
    color: var(--color-text-secondary);
}

/* 移动端优化 */
@media (max-width: 768px) {
    .model-setting-grid {
        grid-template-columns: 1fr;
    }
    
    .model-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
    }
    
    .model-provider-badge {
        align-self: flex-start;
    }
}

/* 模型配置分页样式 */
.model-pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1.5rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
}

.pagination-info {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
}

.pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.pagination-current {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-primary);
    min-width: 4rem;
    text-align: center;
}

/* 暗色主题适配 - 分页 */
:root[data-theme="dark"] .model-pagination {
    background: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.1);
}

/* 响应式分页 */
@media (max-width: 640px) {
    .model-pagination {
        flex-direction: column;
        gap: 0.75rem;
        text-align: center;
    }
    
    .pagination-info {
        order: 2;
    }
    
    .pagination-controls {
        order: 1;
    }
}
</style>

