<template>
    <div class="modal-backdrop" v-if="isOpen" @click.self="handleClose">
        <div class="modal-container" @click.stop>
            <div class="modal-content">
                <!-- 标题栏 -->
                <div class="modal-header">
                    <h2 class="text-xl font-bold">实例配置设置</h2>
                    <button class="btn btn-sm btn-ghost btn-circle" @click="handleClose">
                        <Icon icon="mdi:close" />
                    </button>
                </div>

                <!-- 内容区域 - 分为侧边栏和配置内容 -->
                <div class="modal-body">
                    <!-- 侧边栏导航 -->
                    <div class="settings-sidebar">
                        <div class="menu menu-sm bg-base-200 rounded-lg">
                            <div v-for="(category, index) in categories" :key="index" class="menu-section">
                                <div class="menu-title px-4 py-2 text-sm font-medium text-base-content/70">
                                    {{ category.name }}
                                </div>
                                <ul class="menu-items">
                                    <li v-for="(item, idx) in category.items" :key="idx"
                                        :class="{ 'bordered': activeTab === item.key }">
                                        <a @click="switchTab(item.key)" :class="{ 'active': activeTab === item.key }">
                                            <Icon :icon="item.icon" class="mr-2" />
                                            {{ item.label }}
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- 配置内容 -->
                    <div class="settings-content">
                        <!-- 模型配置 -->
                        <div v-if="activeTab === 'models'" class="tab-content">
                            <h3 class="text-lg font-semibold mb-4">模型配置</h3>

                            <div class="grid grid-cols-1 gap-4">
                                <!-- 推理模型部分 -->
                                <div class="card bg-base-100 shadow-sm">
                                    <div class="card-body">
                                        <h4 class="card-title text-base">推理模型</h4>

                                        <div v-for="(model, idx) in getModelsByType('llm')" :key="idx"
                                            class="form-control mb-4">
                                            <div class="flex justify-between items-center mb-2">
                                                <label class="label">
                                                    <span class="label-text font-medium">{{
                                                        getModelDisplayName(model.key) }}</span>
                                                </label>
                                                <div class="badge badge-primary">{{ model.provider }}</div>
                                            </div>

                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <select v-model="config.models[model.key].name"
                                                    class="select select-bordered w-full">
                                                    <option disabled value="">选择模型</option>
                                                    <optgroup label="DeepSeek">
                                                        <option value="Pro/deepseek-ai/DeepSeek-R1">DeepSeek-R1</option>
                                                        <option value="Pro/deepseek-ai/DeepSeek-V3">DeepSeek-V3</option>
                                                    </optgroup>
                                                    <optgroup label="Qwen">
                                                        <option value="Pro/Qwen/Qwen2.5-7B-Instruct">Qwen2.5-7B-Instruct
                                                        </option>
                                                        <option value="Qwen/Qwen2.5-32B-Instruct">Qwen2.5-32B-Instruct
                                                        </option>
                                                    </optgroup>
                                                </select>

                                                <select v-model="config.models[model.key].provider"
                                                    class="select select-bordered w-full">
                                                    <option value="SILICONFLOW">SILICONFLOW</option>
                                                    <option value="DeepSeek">DeepSeek</option>
                                                    <option value="OpenAI">OpenAI</option>
                                                </select>
                                            </div>

                                            <div v-if="model.hasTemp" class="mt-2">
                                                <label class="label">
                                                    <span class="label-text">温度系数</span>
                                                    <span class="label-text-alt">{{ config.models[model.key].temp || 0.2
                                                        }}</span>
                                                </label>
                                                <input type="range" min="0" max="1" step="0.1"
                                                    v-model.number="config.models[model.key].temp"
                                                    class="range range-primary range-sm" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 嵌入模型部分 -->
                                <div class="card bg-base-100 shadow-sm">
                                    <div class="card-body">
                                        <h4 class="card-title text-base">嵌入模型</h4>

                                        <div v-for="(model, idx) in getModelsByType('embedding')" :key="idx"
                                            class="form-control mb-4">
                                            <div class="flex justify-between items-center mb-2">
                                                <label class="label">
                                                    <span class="label-text font-medium">{{
                                                        getModelDisplayName(model.key) }}</span>
                                                </label>
                                                <div class="badge badge-secondary">{{ model.provider }}</div>
                                            </div>

                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <select v-model="config.models[model.key].name"
                                                    class="select select-bordered w-full">
                                                    <option disabled value="">选择模型</option>
                                                    <option value="BAAI/bge-m3">BAAI/bge-m3</option>
                                                    <option value="BAAI/bge-large-zh-v1.5">BAAI/bge-large-zh-v1.5
                                                    </option>
                                                </select>

                                                <select v-model="config.models[model.key].provider"
                                                    class="select select-bordered w-full">
                                                    <option value="SILICONFLOW">SILICONFLOW</option>
                                                    <option value="DeepSeek">DeepSeek</option>
                                                    <option value="OpenAI">OpenAI</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 视觉模型部分 -->
                                <div class="card bg-base-100 shadow-sm">
                                    <div class="card-body">
                                        <h4 class="card-title text-base">视觉模型</h4>

                                        <div v-for="(model, idx) in getModelsByType('vlm')" :key="idx"
                                            class="form-control mb-4">
                                            <div class="flex justify-between items-center mb-2">
                                                <label class="label">
                                                    <span class="label-text font-medium">{{
                                                        getModelDisplayName(model.key) }}</span>
                                                </label>
                                                <div class="badge badge-accent">{{ model.provider }}</div>
                                            </div>

                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <select v-model="config.models[model.key].name"
                                                    class="select select-bordered w-full">
                                                    <option disabled value="">选择模型</option>
                                                    <option value="Pro/Qwen/Qwen2.5-VL-7B-Instruct">
                                                        Qwen2.5-VL-7B-Instruct</option>
                                                    <option value="Pro/Yi/Yi-VL-6B">Yi-VL-6B</option>
                                                </select>

                                                <select v-model="config.models[model.key].provider"
                                                    class="select select-bordered w-full">
                                                    <option value="SILICONFLOW">SILICONFLOW</option>
                                                    <option value="DeepSeek">DeepSeek</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 基本设置 -->
                        <div v-if="activeTab === 'basic'" class="tab-content">
                            <h3 class="text-lg font-semibold mb-4">基本设置</h3>

                            <div class="card bg-base-100 shadow-sm">
                                <div class="card-body">
                                    <div class="form-control mb-4">
                                        <label class="label">
                                            <span class="label-text font-medium">Bot QQ号</span>
                                        </label>
                                        <input v-model="config.bot.qq" type="text" class="input input-bordered"
                                            placeholder="请输入QQ号" />
                                    </div>

                                    <div class="form-control mb-4">
                                        <label class="label">
                                            <span class="label-text font-medium">Bot昵称</span>
                                        </label>
                                        <input v-model="config.bot.nickname" type="text" class="input input-bordered"
                                            placeholder="请输入昵称" />
                                    </div>

                                    <div class="form-control mb-4">
                                        <label class="label">
                                            <span class="label-text font-medium">别名</span>
                                            <span class="label-text-alt text-xs opacity-70">可以用逗号分隔多个别名</span>
                                        </label>
                                        <input v-model="aliasNames" type="text" class="input input-bordered"
                                            placeholder="输入别名，用逗号分隔" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 人格设置 -->
                        <div v-if="activeTab === 'personality'" class="tab-content">
                            <h3 class="text-lg font-semibold mb-4">人格设置</h3>

                            <div class="card bg-base-100 shadow-sm">
                                <div class="card-body">
                                    <div class="form-control mb-4">
                                        <label class="label">
                                            <span class="label-text font-medium">核心人格特点</span>
                                            <span class="label-text-alt text-xs opacity-70">建议20字以内</span>
                                        </label>
                                        <textarea v-model="config.personality.personality_core"
                                            class="textarea textarea-bordered h-20"
                                            placeholder="用一句话或几句话描述人格的核心特点"></textarea>
                                    </div>

                                    <div class="form-control mb-4">
                                        <label class="label">
                                            <span class="label-text font-medium">人格细节</span>
                                        </label>
                                        <div v-for="(side, index) in config.personality.personality_sides" :key="index"
                                            class="flex mb-2">
                                            <textarea v-model="config.personality.personality_sides[index]"
                                                class="textarea textarea-bordered flex-1"
                                                placeholder="用一句话或几句话描述人格的一些细节"></textarea>
                                            <button @click="removeSide(index)" class="btn btn-error btn-sm ml-2">
                                                <Icon icon="mdi:delete" />
                                            </button>
                                        </div>
                                        <button @click="addSide" class="btn btn-outline btn-sm mt-2">添加人格细节</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 外观设置 -->
                        <div v-if="activeTab === 'appearance'" class="tab-content">
                            <h3 class="text-lg font-semibold mb-4">外观设置</h3>

                            <div class="card bg-base-100 shadow-sm">
                                <div class="card-body">
                                    <div class="form-control mb-4">
                                        <label class="label">
                                            <span class="label-text font-medium">年龄</span>
                                        </label>
                                        <input v-model.number="config.identity.age" type="number"
                                            class="input input-bordered" placeholder="年龄" />
                                    </div>

                                    <div class="form-control mb-4">
                                        <label class="label">
                                            <span class="label-text font-medium">性别</span>
                                        </label>
                                        <select v-model="config.identity.gender" class="select select-bordered w-full">
                                            <option value="男">男</option>
                                            <option value="女">女</option>
                                            <option value="其他">其他</option>
                                        </select>
                                    </div>

                                    <div class="form-control mb-4">
                                        <label class="label">
                                            <span class="label-text font-medium">外貌描述</span>
                                        </label>
                                        <textarea v-model="config.identity.appearance"
                                            class="textarea textarea-bordered h-20" placeholder="用几句话描述外貌特征"></textarea>
                                    </div>

                                    <div class="form-control mb-4">
                                        <label class="label">
                                            <span class="label-text font-medium">身份细节</span>
                                        </label>
                                        <div v-for="(detail, index) in config.identity.identity_detail" :key="index"
                                            class="flex mb-2">
                                            <input v-model="config.identity.identity_detail[index]" type="text"
                                                class="input input-bordered flex-1" placeholder="身份特点" />
                                            <button @click="removeIdentityDetail(index)"
                                                class="btn btn-error btn-sm ml-2">
                                                <Icon icon="mdi:delete" />
                                            </button>
                                        </div>
                                        <button @click="addIdentityDetail"
                                            class="btn btn-outline btn-sm mt-2">添加身份细节</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 群组设置 -->
                        <div v-if="activeTab === 'groups'" class="tab-content">
                            <h3 class="text-lg font-semibold mb-4">群组设置</h3>

                            <div class="card bg-base-100 shadow-sm">
                                <div class="card-body">
                                    <div class="form-control mb-4">
                                        <label class="label">
                                            <span class="label-text font-medium">允许回复消息的群号</span>
                                            <span class="label-text-alt text-xs opacity-70">一行一个</span>
                                        </label>
                                        <textarea v-model="talkAllowedText" class="textarea textarea-bordered h-20"
                                            placeholder="输入群号，每行一个"></textarea>
                                    </div>

                                    <div class="form-control mb-4">
                                        <label class="label">
                                            <span class="label-text font-medium">降低回复频率的群号</span>
                                            <span class="label-text-alt text-xs opacity-70">一行一个</span>
                                        </label>
                                        <textarea v-model="talkFreqDownText" class="textarea textarea-bordered h-20"
                                            placeholder="输入群号，每行一个"></textarea>
                                    </div>

                                    <div class="form-control mb-4">
                                        <label class="label">
                                            <span class="label-text font-medium">禁止回复和读取消息的QQ号</span>
                                            <span class="label-text-alt text-xs opacity-70">一行一个</span>
                                        </label>
                                        <textarea v-model="banUserIdText" class="textarea textarea-bordered h-20"
                                            placeholder="输入QQ号，每行一个"></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 聊天设置 -->
                        <div v-if="activeTab === 'chat'" class="tab-content">
                            <h3 class="text-lg font-semibold mb-4">聊天设置</h3>

                            <div class="card bg-base-100 shadow-sm mb-4">
                                <div class="card-body">
                                    <h4 class="text-base font-medium mb-2">基础聊天设置</h4>

                                    <div class="form-control mb-4">
                                        <label class="label cursor-pointer">
                                            <span class="label-text">允许专注水群状态</span>
                                            <input type="checkbox" v-model="config.chat.allow_focus_mode"
                                                class="toggle toggle-primary" />
                                        </label>
                                    </div>

                                    <div class="form-control mb-4">
                                        <label class="label">
                                            <span class="label-text">观察最长上下文大小</span>
                                            <span class="label-text-alt">{{ config.chat.observation_context_size
                                                }}</span>
                                        </label>
                                        <input type="range" min="5" max="30"
                                            v-model.number="config.chat.observation_context_size"
                                            class="range range-primary" step="1" />
                                    </div>

                                    <div class="form-control mb-4">
                                        <label class="label cursor-pointer">
                                            <span class="label-text">启用消息缓冲器</span>
                                            <input type="checkbox" v-model="config.chat.message_buffer"
                                                class="toggle toggle-primary" />
                                        </label>
                                        <p class="text-xs text-base-content/70 mt-1">解决消息拆分问题，但会使回复延迟</p>
                                    </div>
                                </div>
                            </div>

                            <!-- 消息过滤设置 -->
                            <div class="card bg-base-100 shadow-sm">
                                <div class="card-body">
                                    <h4 class="text-base font-medium mb-2">消息过滤</h4>

                                    <div class="form-control mb-4">
                                        <label class="label">
                                            <span class="label-text font-medium">禁用词汇</span>
                                            <span class="label-text-alt text-xs opacity-70">将不会读取包含这些词的消息</span>
                                        </label>
                                        <div v-for="(word, index) in config.chat.ban_words" :key="index"
                                            class="flex mb-2">
                                            <input v-model="config.chat.ban_words[index]" type="text"
                                                class="input input-bordered flex-1" placeholder="禁用词" />
                                            <button @click="removeBanWord(index)" class="btn btn-error btn-sm ml-2">
                                                <Icon icon="mdi:delete" />
                                            </button>
                                        </div>
                                        <button @click="addBanWord" class="btn btn-outline btn-sm mt-2">添加禁用词</button>
                                    </div>

                                    <div class="form-control mb-4">
                                        <label class="label">
                                            <span class="label-text font-medium">禁用消息正则表达式</span>
                                        </label>
                                        <div v-for="(regex, index) in config.chat.ban_msgs_regex" :key="index"
                                            class="flex mb-2">
                                            <input v-model="config.chat.ban_msgs_regex[index]" type="text"
                                                class="input input-bordered flex-1" placeholder="正则表达式" />
                                            <button @click="removeBanRegex(index)" class="btn btn-error btn-sm ml-2">
                                                <Icon icon="mdi:delete" />
                                            </button>
                                        </div>
                                        <button @click="addBanRegex"
                                            class="btn btn-outline btn-sm mt-2">添加正则表达式</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 更多配置标签页 -->
                        <div v-if="activeTab === 'more'" class="tab-content">
                            <h3 class="text-lg font-semibold mb-4">其他配置</h3>

                            <div class="card bg-base-100 shadow-sm mb-4">
                                <div class="card-body">
                                    <div class="alert alert-info">
                                        <Icon icon="mdi:information" />
                                        <span>在这里可以直接编辑原始配置文件</span>
                                    </div>

                                    <div class="form-control mt-4">
                                        <textarea v-model="rawConfig"
                                            class="textarea textarea-bordered font-mono text-xs h-96"
                                            spellcheck="false"></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 底部按钮 -->
                <div class="modal-footer">
                    <button class="btn" @click="handleClose">取消</button>
                    <button class="btn btn-primary" @click="saveConfig">保存配置</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue';
import { Icon } from '@iconify/vue';
import toastService from '@/services/toastService';
import { parse, stringify } from '@iarna/toml';

const props = defineProps({
    isOpen: {
        type: Boolean,
        default: false
    },
    instanceName: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['close', 'save']);

// 定义侧边栏分类和项目
const categories = [
    {
        name: '基本设置',
        items: [
            { key: 'basic', label: '基本信息', icon: 'mdi:account-outline' },
            { key: 'personality', label: '人格设置', icon: 'mdi:brain' },
            { key: 'appearance', label: '外观设置', icon: 'mdi:human' }
        ]
    },
    {
        name: '聊天配置',
        items: [
            { key: 'groups', label: '群组设置', icon: 'mdi:account-group' },
            { key: 'chat', label: '聊天设置', icon: 'mdi:chat' }
        ]
    },
    {
        name: '高级配置',
        items: [
            { key: 'models', label: '模型配置', icon: 'mdi:robot' },
            { key: 'more', label: '更多配置', icon: 'mdi:dots-horizontal' }
        ]
    }
];

// 当前激活的标签
const activeTab = ref('basic');

// 配置数据
const config = ref({
    inner: { version: '1.6.2' },
    bot: {
        qq: 1145141919810,
        nickname: '麦麦',
        alias_names: ['麦叠', '牢麦']
    },
    groups: {
        talk_allowed: [123, 123],
        talk_frequency_down: [],
        ban_user_id: []
    },
    personality: {
        personality_core: '用一句话或几句话描述人格的核心特点',
        personality_sides: [
            '用一句话或几句话描述人格的一些细节',
            '用一句话或几句话描述人格的一些细节'
        ]
    },
    identity: {
        age: 20,
        gender: '男',
        appearance: '用几句话描述外貌特征',
        identity_detail: ['身份特点', '身份特点']
    },
    chat: {
        allow_focus_mode: false,
        observation_context_size: 15,
        message_buffer: false,
        ban_words: [],
        ban_msgs_regex: []
    },
    models: {
        llm_reasoning: {
            name: 'Pro/deepseek-ai/DeepSeek-R1',
            provider: 'SILICONFLOW',
            pri_in: 1.0,
            pri_out: 4.0
        },
        llm_normal: {
            name: 'Pro/deepseek-ai/DeepSeek-V3',
            provider: 'SILICONFLOW',
            pri_in: 2,
            pri_out: 8,
            temp: 0.2
        },
        embedding: {
            name: 'BAAI/bge-m3',
            provider: 'SILICONFLOW',
            pri_in: 0,
            pri_out: 0
        },
        vlm: {
            name: 'Pro/Qwen/Qwen2.5-VL-7B-Instruct',
            provider: 'SILICONFLOW',
            pri_in: 0.35,
            pri_out: 0.35
        }
    }
});

// 原始配置文本
const rawConfig = ref('');

// 格式化用的计算属性
const aliasNames = computed({
    get: () => config.value.bot.alias_names.join(', '),
    set: (val) => {
        config.value.bot.alias_names = val.split(',').map(item => item.trim()).filter(item => item);
    }
});

const talkAllowedText = computed({
    get: () => config.value.groups.talk_allowed.join('\n'),
    set: (val) => {
        config.value.groups.talk_allowed = val.split('\n')
            .map(item => parseInt(item.trim()))
            .filter(item => !isNaN(item));
    }
});

const talkFreqDownText = computed({
    get: () => config.value.groups.talk_frequency_down.join('\n'),
    set: (val) => {
        config.value.groups.talk_frequency_down = val.split('\n')
            .map(item => parseInt(item.trim()))
            .filter(item => !isNaN(item));
    }
});

const banUserIdText = computed({
    get: () => config.value.groups.ban_user_id.join('\n'),
    set: (val) => {
        config.value.groups.ban_user_id = val.split('\n')
            .map(item => parseInt(item.trim()))
            .filter(item => !isNaN(item));
    }
});

// 模型筛选函数
const getModelsByType = (type) => {
    const models = [];

    for (const [key, value] of Object.entries(config.value.models)) {
        let modelType = '';
        if (key.includes('llm_')) modelType = 'llm';
        else if (key.includes('embedding')) modelType = 'embedding';
        else if (key.includes('vlm')) modelType = 'vlm';

        if (modelType === type) {
            models.push({
                key,
                ...value,
                provider: value.provider,
                hasTemp: key.includes('llm_') && !['llm_observation', 'llm_topic_judge'].includes(key)
            });
        }
    }

    return models;
};

// 模型显示名称函数
const getModelDisplayName = (key) => {
    const displayNames = {
        'llm_reasoning': '推理回复模型',
        'llm_normal': '常规回复模型',
        'llm_topic_judge': '主题判断模型',
        'llm_summary': '概括模型',
        'llm_heartflow': '心流控制模型',
        'llm_observation': '观察模型',
        'llm_sub_heartflow': '心流生成模型',
        'llm_plan': '决策模型',
        'embedding': '嵌入模型',
        'vlm': '视觉模型'
    };

    return displayNames[key] || key;
};

// 增删条目的方法
const addSide = () => {
    config.value.personality.personality_sides.push('用一句话或几句话描述人格的一些细节');
};

const removeSide = (index) => {
    config.value.personality.personality_sides.splice(index, 1);
};

const addIdentityDetail = () => {
    config.value.identity.identity_detail.push('身份特点');
};

const removeIdentityDetail = (index) => {
    config.value.identity.identity_detail.splice(index, 1);
};

const addBanWord = () => {
    config.value.chat.ban_words.push('');
};

const removeBanWord = (index) => {
    config.value.chat.ban_words.splice(index, 1);
};

const addBanRegex = () => {
    config.value.chat.ban_msgs_regex.push('');
};

const removeBanRegex = (index) => {
    config.value.chat.ban_msgs_regex.splice(index, 1);
};

// 切换标签页
const switchTab = (tab) => {
    activeTab.value = tab;
};

// 关闭弹窗
const handleClose = () => {
    emit('close');
};

// 加载配置
const loadConfig = async () => {
    try {
        // 这里模拟从文件加载配置
        const configContent = await fetch('/bot_config_template.toml').then(res => res.text());

        if (configContent) {
            const parsedConfig = parse(configContent);
            config.value = parsedConfig;
            rawConfig.value = configContent;
        }
    } catch (error) {
        console.error('加载配置失败:', error);
        toastService.error('加载配置失败');
    }
};

// 保存配置
const saveConfig = () => {
    try {
        if (activeTab.value === 'more') {
            // 如果在原始编辑模式下，解析原始文本
            try {
                const parsedConfig = parse(rawConfig.value);
                config.value = parsedConfig;
            } catch (error) {
                toastService.error('配置文件格式错误，请检查后重试');
                return;
            }
        } else {
            // 更新rawConfig
            rawConfig.value = stringify(config.value);
        }

        // 执行保存逻辑
        toastService.success('配置已保存');
        emit('save', config.value);
        emit('close');
    } catch (error) {
        console.error('保存配置失败:', error);
        toastService.error('保存配置失败: ' + error.message);
    }
};

// 组件挂载时加载配置
onMounted(() => {
    if (props.isOpen) {
        loadConfig();

        // 给modal-content添加焦点以确保它在顶层
        nextTick(() => {
            const modalContent = document.querySelector('.modal-content');
            if (modalContent) {
                modalContent.focus();
            }

            // 添加ESC键关闭功能
            document.addEventListener('keydown', handleEscKey);
        });
    }
});

// 处理ESC键关闭
const handleEscKey = (e) => {
    if (e.key === 'Escape') {
        handleClose();
    }
};

// 组件卸载时清理事件监听器
onUnmounted(() => {
    document.removeEventListener('keydown', handleEscKey);
});

// 监听isOpen变化，确保在打开时加载配置
watch(() => props.isOpen, (newVal) => {
    if (newVal) {
        loadConfig();
        activeTab.value = 'basic'; // 重置为第一个标签

        // 添加ESC键关闭功能
        document.addEventListener('keydown', handleEscKey);
    } else {
        document.removeEventListener('keydown', handleEscKey);
    }
});
</script>

<style scoped>
.modal-backdrop {
    @apply fixed inset-0 flex items-center justify-center bg-gray-50;
    animation: fadeIn 0.3s ease-out;
    /* 提高z-index确保在所有元素上方 */
    z-index: 999;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.modal-container {
    @apply w-11/12 max-w-5xl h-5/6 flex flex-col mx-auto bg-white rounded-xl shadow-lg;
    animation: scaleIn 0.3s ease-out;
    /* 向右偏移，避免被侧边栏遮挡 */
    margin-left: calc(var(--sidebar-width, 64px) + 20px);
    border: 1px solid #e5e7eb;
}

@keyframes scaleIn {
    from {
        transform: scale(0.95);
        opacity: 0;
    }

    to {
        transform: scale(1);
        opacity: 1;
    }
}

.modal-content {
    @apply bg-base-100 rounded-xl shadow-xl flex flex-col h-full;
    /* 添加边框，增强视觉区分 */
    border: 1px solid hsl(var(--b3));
}

/* 响应式调整，在小屏幕上居中而不偏移 */
@media (max-width: 768px) {
    .modal-container {
        margin-left: auto;
        margin-right: auto;
    }
}

.modal-header {
    @apply flex justify-between items-center p-4 border-b border-base-300;
}

.modal-body {
    @apply flex flex-1 overflow-hidden;
}

.settings-sidebar {
    @apply w-48 flex-shrink-0 p-3 border-r border-base-300 overflow-y-auto;
}

.settings-content {
    @apply flex-1 p-4 overflow-y-auto;
}

.menu-section:not(:last-child) {
    @apply mb-4;
}

.menu-title {
    @apply text-xs uppercase tracking-wider;
}

.menu-items {
    @apply menu font-medium;
}

.menu-items li>a {
    @apply py-2;
}

.menu-items li>a.active {
    @apply bg-primary/10 text-primary font-semibold;
}

.bordered {
    @apply border-l-4 border-primary;
}

.tab-content {
    animation: tabFade 0.3s ease-out;
}

@keyframes tabFade {
    from {
        opacity: 0;
        transform: translateX(10px);
    }

    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.modal-footer {
    @apply flex justify-end gap-2 p-4 border-t border-base-300;
}

.card {
    @apply transition-all duration-300;
}

.card:hover {
    @apply shadow-md;
}
</style>
