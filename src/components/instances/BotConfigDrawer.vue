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
                    
                    <!-- 搜索框 -->
                    <div class="header-search" v-if="activeTab === 'bot'">
                        <div class="search-container">
                            <Icon icon="mdi:magnify" class="search-icon" />
                            <input 
                                type="text" 
                                class="search-input" 
                                placeholder="搜索配置项..."
                                v-model="searchQuery"
                                @input="handleSearch(configSections, getFieldLabel, getFieldDescription)"
                                @keydown.esc="clearSearch"
                            />
                            <button 
                                v-if="searchQuery" 
                                class="search-clear" 
                                @click="clearSearch"
                                title="清除搜索"
                            >
                                <Icon icon="mdi:close" class="w-4 h-4" />
                            </button>
                        </div>
                        <div v-if="searchResults.length > 0 && searchQuery" class="search-stats">
                            找到 {{ searchResults.length }} 个匹配项
                        </div>
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
                                        <!-- 搜索提示 -->
                                        <div v-if="searchQuery && !hasSearchResults" class="search-no-results">
                                            <Icon icon="mdi:magnify-close" class="search-no-results-icon" />
                                            <p class="search-no-results-text">没有找到匹配的配置项</p>
                                            <p class="search-no-results-hint">尝试使用其他关键词搜索</p>
                                        </div>
                                        
                                        <!-- 搜索结果提示 -->
                                        <div v-if="searchQuery && hasSearchResults" class="search-results-info">
                                            <Icon icon="mdi:filter-variant" class="search-filter-icon" />
                                            <span>已过滤显示 {{ displaySections(configSections).length }} 个配置组，共 {{ searchResults.length }} 个匹配项</span>
                                            <button class="search-clear-btn" @click="clearSearch">
                                                <Icon icon="mdi:close" class="w-4 h-4" />
                                                清除过滤
                                            </button>
                                        </div>

                                        <!-- 动态生成配置节 -->
                                        <template v-for="section in displaySections(configSections)" :key="section.key">
                                            <SettingGroup 
                                                :title="section.title" 
                                                :icon="section.icon" 
                                                :iconClass="section.iconClass"
                                                :gradient-border="true"
                                                :class="{ 'search-matched-section': section.titleMatched }"
                                            >
                                                <!-- 渲染匹配的配置项（搜索模式）或所有配置项（正常模式） -->
                                                <template v-for="field in (searchQuery ? section.matchedFields : Object.entries(section.data || {}).map(([key, value]) => ({ key, value, label: getFieldLabel(key), description: getFieldDescription(key, section.key) })))" :key="field.key">
                                                    <FieldRenderer
                                                        :field-key="field.key"
                                                        :label="field.label || getFieldLabel(field.key)"
                                                        :description="field.description || getFieldDescription(field.key, section.key)"
                                                        :value="getNestedValue(botConfig, `${section.key}.${field.key}`)"
                                                        :config="getFieldConfig(field.key, field.value, section.key)"
                                                        :search-query="searchQuery"
                                                        :match-type="searchQuery && field.matchType"
                                                        :readonly="field.key === 'version'"
                                                        @update:value="setNestedValue(botConfig, `${section.key}.${field.key}`, $event); markConfigChanged()"
                                                        @add-array-item="addArrayItem(`${section.key}.${field.key}`, $event)"
                                                        @remove-array-item="removeArrayItem(`${section.key}.${field.key}`, $event)"
                                                    />
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
                                        <button class="btn btn-primary mt-4" @click="loadBotConfig(props.instanceId)">
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
                                        <SettingGroup title="基本信息" icon="mdi:information-outline" :gradient-border="true">
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
                                        <SettingGroup title="LLM 提供商" icon="mdi:server-network" :iconClass="'text-blue-500'" :gradient-border="true">
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
                                        <SettingGroup title="实体提取" icon="mdi:text-recognition" :iconClass="'text-green-500'" :gradient-border="true">
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
                                        <SettingGroup title="RDF构建" icon="mdi:graph-outline" :iconClass="'text-orange-500'" :gradient-border="true">
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
                                        <SettingGroup title="嵌入配置" icon="mdi:vector-triangle" :iconClass="'text-purple-500'" :gradient-border="true">
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
                                        <SettingGroup title="RAG参数" icon="mdi:magnify" :gradient-border="true">
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
                                        <SettingGroup title="问答配置" icon="mdi:comment-question-outline" :iconClass="'text-indigo-500'" :gradient-border="true">
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
                                        <SettingGroup title="信息提取" icon="mdi:file-document-multiple" :gradient-border="true">
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
                                        <SettingGroup title="持久化配置" icon="mdi:database" :gradient-border="true">
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
                                        <SettingGroup title="全局配置" icon="mdi:settings" :iconClass="'text-blue-500'" :gradient-border="true">
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
                                        <SettingGroup title="模型配置" icon="mdi:brain" :iconClass="'text-purple-500'" :gradient-border="true">
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
                                                                <input 
                                                                    type="number" 
                                                                    class="input input-bordered input-sm flex-1" 
                                                                    v-model.number="model.pri_in"
                                                                    min="0"
                                                                    step="0.01"
                                                                    placeholder="¥/1M tokens"
                                                                    @input="markModelChanged"
                                                                />
                                                            </div>
                                                            <div class="model-setting">
                                                                <label class="model-setting-label">输出价格</label>
                                                                <input 
                                                                    type="number" 
                                                                    class="input input-bordered input-sm flex-1" 
                                                                    v-model.number="model.pri_out"
                                                                    min="0"
                                                                    step="0.01"
                                                                    placeholder="¥/1M tokens"
                                                                    @input="markModelChanged"
                                                                />
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
                                                                <CustomToggle 
                                                                    v-model="model.enable_thinking"
                                                                    @change="markModelChanged"
                                                                    class="toggle-sm"
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
                                        <SettingGroup title="环境变量" icon="mdi:cog-outline" :iconClass="'text-orange-500'" :gradient-border="true">
                                            <EnvVariableEditor 
                                                :env-config="envConfig"
                                                @update:env-config="envConfig = $event"
                                                @mark-changed="markEnvChanged"
                                            />
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
                                        <button class="btn btn-primary mt-4" @click="loadEnvConfig(props.instanceId)">
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

// 导入组件
import { SettingGroup } from '../settings'
import FieldRenderer from './FieldRenderer.vue'
import EnvVariableEditor from './EnvVariableEditor.vue'
import CustomToggle from '../common/CustomToggle.vue'

// 导入工具函数和常量
import { useConfigLoader } from '@/composables/useConfigLoader'
import { useConfigSearch } from '@/composables/useConfigSearch'
import { 
  getFieldLabel, 
  getFieldDescription, 
  getFieldConfig, 
  generateConfigSections,
  MODEL_DISPLAY_NAMES
} from '@/utils/configConstants'

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

// 标签页管理
const activeTab = ref('bot')
const previousTab = ref('bot')

// 配置标签页定义
const configTabs = [
    { key: 'bot', title: 'Bot 配置', icon: 'mdi:robot' },
    { key: 'model', title: '模型配置', icon: 'mdi:chip' },
    { key: 'lpmm', title: 'LPMM 配置', icon: 'mdi:brain' },
    { key: 'env', title: '环境变量', icon: 'mdi:cog-outline' }
]

// 计算当前标签页信息
const currentTabInfo = computed(() => {
    const tab = configTabs.find(t => t.key === activeTab.value)
    return {
        title: tab?.title || 'Bot 配置',
        config: getTabConfig(activeTab.value),
        hasData: getTabHasData(activeTab.value),
        isLoading: getTabIsLoading(activeTab.value),
        error: getTabError(activeTab.value)
    }
})

// 获取标签页配置的辅助函数
const getTabConfig = (tabKey) => {
    switch(tabKey) {
        case 'bot': return botConfig.value
        case 'model': return modelConfig.value  
        case 'env': return envConfig.value
        case 'lpmm': return lpmmConfig.value
        default: return null
    }
}

const getTabHasData = (tabKey) => {
    return !!getTabConfig(tabKey)
}

const getTabIsLoading = (tabKey) => {
    switch(tabKey) {
        case 'bot': return isLoading.value
        case 'model': return isLoadingModel.value
        case 'env': return isLoadingEnv.value  
        case 'lpmm': return isLoadingLpmm.value
        default: return false
    }
}

const getTabError = (tabKey) => {
    switch(tabKey) {
        case 'bot': return error.value
        case 'model': return modelError.value
        case 'env': return envError.value
        case 'lpmm': return lpmmError.value
        default: ''
    }
}

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

// 创建所有配置加载器
const { loadBotConfig, loadEnvConfig, loadLpmmConfig } = (() => {
    const { createConfigLoader } = useConfigLoader()
    return {
        loadBotConfig: createConfigLoader('Bot', maibotConfigApi.getBotConfig, botConfig, originalBotConfig, error, isLoading, hasConfigChanges),
        loadEnvConfig: createConfigLoader('环境变量', maibotConfigApi.getEnvConfig, envConfig, originalEnvConfig, envError, isLoadingEnv, hasEnvChanges),
        loadLpmmConfig: createConfigLoader('LPMM', maibotConfigApi.getLpmmConfig, lpmmConfig, originalLpmmConfig, lpmmError, isLoadingLpmm, hasLpmmChanges)
    }
})()

// 使用搜索功能
const { 
    searchQuery, 
    searchResults, 
    filteredSections, 
    hasSearchResults, 
    displaySections, 
    clearSearch, 
    highlightText, 
    getMatchTypeName, 
    handleSearch 
} = useConfigSearch()

// 动态生成配置节
const configSections = computed(() => generateConfigSections(botConfig.value))

// 分页渲染模型配置
const modelPageSize = ref(6)
const currentModelPage = ref(0)
const paginatedModelConfigs = computed(() => {
    const allConfigs = getModelConfigs()
    const configEntries = Object.entries(allConfigs)
    if (configEntries.length <= modelPageSize.value) return allConfigs
    
    const start = currentModelPage.value * modelPageSize.value
    const end = start + modelPageSize.value
    return Object.fromEntries(configEntries.slice(start, end))
})

const totalModelConfigs = computed(() => Object.keys(getModelConfigs()).length)
const totalModelPages = computed(() => Math.ceil(totalModelConfigs.value / modelPageSize.value))
const needsPagination = computed(() => totalModelConfigs.value > modelPageSize.value)

// 方法
// 简化的方法
const switchTab = (tabKey) => {
    previousTab.value = activeTab.value
    activeTab.value = tabKey
    
    if (searchQuery.value) clearSearch()
    
    // 加载对应数据
    const loaders = { bot: loadBotConfig, model: loadModelConfig, env: loadEnvConfig, lpmm: loadLpmmConfig }
    const hasData = { bot: botConfig.value, model: modelConfig.value, env: envConfig.value, lpmm: lpmmConfig.value }
    
    if (!hasData[tabKey] && loaders[tabKey]) {
        loaders[tabKey](props.instanceId)
    }
}

const getCurrentTabTitle = () => currentTabInfo.value.title

// 统一的变更标记函数
const markChanged = (type = 'config') => {
    const changeMap = {
        config: () => hasConfigChanges.value = true,
        env: () => hasEnvChanges.value = true, 
        lpmm: () => hasLpmmChanges.value = true,
        model: () => hasModelChanges.value = true
    }
    changeMap[type]?.()
}

// 向后兼容的别名
const markConfigChanged = () => markChanged('config')
const markEnvChanged = () => markChanged('env')
const markLpmmChanged = () => markChanged('lpmm')
const markModelChanged = () => markChanged('model')

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

// 简化的数组操作方法
const addArrayItem = (path, value = '') => {
    if (!value.trim()) return
    const current = getNestedValue(botConfig.value, path) || []
    current.push(value)
    setNestedValue(botConfig.value, path, current)
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

// 创建模型配置加载器
const loadModelConfig = async (instanceId) => {
    if (!instanceId) return
    
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
        console.log('开始加载模型配置:', instanceId)
        const response = await maibotConfigApi.getBotConfig(instanceId)
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
    return MODEL_DISPLAY_NAMES[modelKey] || modelKey
}

const closeDrawer = () => {
    // 清除搜索状态
    if (searchQuery.value) {
        clearSearch()
    }
    
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

// 统一的实例变化处理
const resetAllConfig = () => {
    const configs = [
        { config: botConfig, original: originalBotConfig, hasChanges: hasConfigChanges },
        { config: envConfig, original: originalEnvConfig, hasChanges: hasEnvChanges },
        { config: lpmmConfig, original: originalLpmmConfig, hasChanges: hasLpmmChanges },
        { config: modelConfig, original: originalModelConfig, hasChanges: hasModelChanges }
    ]
    
    configs.forEach(({ config, original, hasChanges }) => {
        config.value = null
        original.value = null  
        hasChanges.value = false
    })
    
    const errors = [error, envError, lpmmError, modelError]
    errors.forEach(err => err.value = '')
}

// 监听器优化
watch(() => props.instanceId, (newId, oldId) => {
    if (newId && newId !== oldId && props.isOpen) {
        resetAllConfig()
        console.log('实例ID变化，重新加载配置', { newId, oldId, activeTab: activeTab.value })
        
        const loaders = { bot: loadBotConfig, model: loadModelConfig, env: loadEnvConfig, lpmm: loadLpmmConfig }
        loaders[activeTab.value]?.(newId)
    }
})

watch(() => props.isOpen, (isOpen, wasOpen) => {
    if (isOpen && !wasOpen && props.instanceId) {
        console.log('抽屉打开，开始加载配置', { instanceId: props.instanceId, activeTab: activeTab.value })
        
        const hasData = { bot: botConfig.value, model: modelConfig.value, env: envConfig.value, lpmm: lpmmConfig.value }
        const loaders = { bot: loadBotConfig, model: loadModelConfig, env: loadEnvConfig, lpmm: loadLpmmConfig }
        
        if (!hasData[activeTab.value] && loaders[activeTab.value]) {
            loaders[activeTab.value](props.instanceId)
        }
    }
})

// 监听配置变化 - 使用统一的防抖逻辑
const createDebounceWatcher = (config, originalConfig, hasChanges) => {
    let timeout = null
    return watch(config, (newConfig, oldConfig) => {
        if (newConfig && oldConfig && originalConfig.value) {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                hasChanges.value = JSON.stringify(newConfig) !== JSON.stringify(originalConfig.value)
            }, 300)
        }
    }, { deep: true, flush: 'post' })
}

createDebounceWatcher(lpmmConfig, originalLpmmConfig, hasLpmmChanges)
createDebounceWatcher(modelConfig, originalModelConfig, hasModelChanges)

// 组件挂载优化
onMounted(() => {
    console.log('BotConfigDrawer mounted', { isOpen: props.isOpen, instanceId: props.instanceId })
    
    // 如果抽屉已经打开，立即加载配置
    if (props.isOpen && props.instanceId && activeTab.value === 'bot') {
        loadBotConfig(props.instanceId)
    }
    
    // ESC键监听
    const handleEscape = (e) => {
        if (e.key === 'Escape' && props.isOpen) closeDrawer()
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
    /* 动态计算宽度：可用宽度的85%，确保两侧有留白 */
    width: calc((100vw - var(--sidebar-width, 64px)) * 0.85);
    min-width: 600px; /* 最小宽度确保可用性 */
    max-width: 1200px; /* 最大宽度避免过大 */
    height: 85vh; /* 使用视口高度的85% */
    min-height: 500px; /* 最小高度 */
    max-height: 800px; /* 最大高度 */
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

/* 响应式调整：当可用宽度较小时，调整最小宽度 */
@media (max-width: 1024px) {
    .bot-config-drawer-container {
        width: calc((100vw - var(--sidebar-width, 64px)) * 0.9);
        min-width: 500px;
    }
}

@media (max-width: 768px) {
    .bot-config-drawer-container {
        width: calc((100vw - var(--sidebar-width, 64px)) * 0.95);
        min-width: 400px;
        height: 90vh;
    }
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
    gap: 1rem;
}

:root[data-theme="dark"] .bot-config-header {
    background: rgba(22, 25, 30, 0.98);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
}

.header-info {
    flex-shrink: 0;
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

/* 搜索框样式 */
.header-search {
    flex: 1;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}

.search-container {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
}

.search-input {
    width: 100%;
    padding: 0.5rem 0.75rem 0.5rem 2.5rem;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.9);
    font-size: 0.875rem;
    transition: all 0.2s ease;
    outline: none;
}

.search-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    background: #ffffff;
}

.search-input::placeholder {
    color: rgba(0, 0, 0, 0.5);
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    color: rgba(0, 0, 0, 0.5);
    z-index: 1;
}

.search-clear {
    position: absolute;
    right: 0.5rem;
    background: none;
    border: none;
    color: rgba(0, 0, 0, 0.5);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
}

.search-clear:hover {
    color: rgba(0, 0, 0, 0.8);
    background: rgba(0, 0, 0, 0.05);
}

.search-stats {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.6);
    font-weight: 500;
}

/* 深色模式搜索框 */
:root[data-theme="dark"] .search-input {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
}

:root[data-theme="dark"] .search-input:focus {
    background: rgba(255, 255, 255, 0.15);
    border-color: #60a5fa;
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
}

:root[data-theme="dark"] .search-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
}

:root[data-theme="dark"] .search-icon {
    color: rgba(255, 255, 255, 0.5);
}

:root[data-theme="dark"] .search-clear {
    color: rgba(255, 255, 255, 0.5);
}

:root[data-theme="dark"] .search-clear:hover {
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.1);
}

:root[data-theme="dark"] .search-stats {
    color: rgba(255, 255, 255, 0.6);
}

/* 搜索高亮样式 */
.search-highlight {
    background: #fbbf24;
    color: #000;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-weight: 500;
}

:root[data-theme="dark"] .search-highlight {
    background: #f59e0b;
    color: #000;
}

/* 搜索结果样式 */
.search-no-results {
    text-align: center;
    padding: 3rem 1rem;
    color: rgba(0, 0, 0, 0.6);
}

.search-no-results-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: rgba(0, 0, 0, 0.4);
}

.search-no-results-text {
    font-size: 1.125rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
}

.search-no-results-hint {
    font-size: 0.875rem;
    color: rgba(0, 0, 0, 0.5);
}

.search-results-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
    color: #1e40af;
}

.search-filter-icon {
    color: #3b82f6;
    flex-shrink: 0;
}

.search-clear-btn {
    background: none;
    border: none;
    color: #3b82f6;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    margin-left: auto;
}

.search-clear-btn:hover {
    background: rgba(59, 130, 246, 0.1);
    color: #1e40af;
}

.search-matched-section {
    border-left: 3px solid #3b82f6;
    background: rgba(59, 130, 246, 0.02);
}

.search-matched-item {
    background: rgba(59, 130, 246, 0.05);
    border-radius: 0.5rem;
    padding: 0.25rem;
    margin: 0.25rem 0;
    position: relative;
}

.search-match-badge {
    display: inline-block;
    background: #3b82f6;
    color: white;
    font-size: 0.6875rem;
    padding: 0.125rem 0.375rem;
    border-radius: 0.75rem;
    margin-left: 0.5rem;
    font-weight: 500;
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.field-key-hint {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.5);
    font-weight: 400;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    margin-top: 0.25rem;
    padding: 0.125rem 0.5rem;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 0.25rem;
    border-left: 2px solid #e5e7eb;
    transition: opacity 0.2s ease, transform 0.2s ease, max-height 0.2s ease;
}

.label-text {
    display: block;
    margin-bottom: 0.125rem;
}

.setting-label-wrapper {
    display: block;
}

.label-content {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.25rem;
}

.label-content .label-text {
    display: inline-block;
    margin-bottom: 0;
    margin-right: 0;
}

.label-content .search-match-badge {
    margin-left: 0;
    margin-right: 0;
    vertical-align: middle;
}

.setting-label-wrapper .field-key-hint {
    margin-top: 0.375rem;
}

/* 深色模式搜索结果样式 */
:root[data-theme="dark"] .search-no-results {
    color: rgba(255, 255, 255, 0.6);
}

:root[data-theme="dark"] .search-no-results-icon {
    color: rgba(255, 255, 255, 0.4);
}

:root[data-theme="dark"] .search-no-results-hint {
    color: rgba(255, 255, 255, 0.5);
}

:root[data-theme="dark"] .search-results-info {
    background: rgba(96, 165, 250, 0.1);
    border-color: rgba(96, 165, 250, 0.2);
    color: #93c5fd;
}

:root[data-theme="dark"] .search-filter-icon {
    color: #60a5fa;
}

:root[data-theme="dark"] .search-clear-btn {
    color: #60a5fa;
}

:root[data-theme="dark"] .search-clear-btn:hover {
    background: rgba(96, 165, 250, 0.1);
    color: #93c5fd;
}

:root[data-theme="dark"] .search-matched-section {
    border-left-color: #60a5fa;
    background: rgba(96, 165, 250, 0.02);
}

:root[data-theme="dark"] .search-matched-item {
    background: rgba(96, 165, 250, 0.05);
}

:root[data-theme="dark"] .search-match-badge {
    background: #60a5fa;
    color: #1e293b;
    transition: opacity 0.2s ease, transform 0.2s ease;
}

:root[data-theme="dark"] .field-key-hint {
    color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.05);
    border-left-color: #374151;
    transition: opacity 0.2s ease, transform 0.2s ease, max-height 0.2s ease;
}

.bot-config-header .btn {
    color: rgba(0, 0, 0, 0.7);
    flex-shrink: 0;
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

/* 动态列表样式优化 - 已移除未使用样式 */

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

/* 响应式分页 暂时弃用 */
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

