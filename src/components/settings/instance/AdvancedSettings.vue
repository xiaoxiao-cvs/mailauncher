<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">高级功能与实验性设置</h3>

        <div class="card bg-base-100 shadow-xl mb-6">
            <div class="card-header">
                <span>关键词反应设置</span>
            </div>
            <div class="card-body">
                <div class="setting-item">
                    <span class="setting-label">启用关键词反应</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle" v-model="localConfig.keywords_reaction.enable" />
                    </div>
                </div>

                <div class="divider">关键词规则</div>

                <div v-for="(rule, index) in localConfig.keywords_reaction.rules" :key="index"
                    class="keyword-rule-card">
                    <div class="rule-header">
                        <div class="rule-title">规则 #{{ index + 1 }}</div>
                        <div class="rule-actions">
                            <input type="checkbox" class="toggle" v-model="rule.enable" />
                            <button class="btn btn-circle btn-xs btn-error" @click="removeKeywordRule(index)">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>

                    <div class="rule-content">
                        <div class="rule-item" v-if="!rule.regex">
                            <div class="rule-label">关键词列表</div>
                            <div class="flex flex-wrap gap-2">
                                <div v-for="(keyword, kidx) in rule.keywords" :key="kidx"
                                    class="badge badge-primary gap-1">
                                    {{ keyword }}
                                    <button class="btn-close" @click="removeKeyword(rule, kidx)">&times;</button>
                                </div>

                                <div v-if="keywordInputVisible[index]">
                                    <input ref="keywordInputRefs" v-model="keywordInputValue[index]"
                                        class="input input-sm" @keyup.enter="confirmKeywordInput(rule, index)"
                                        @blur="confirmKeywordInput(rule, index)" />
                                </div>
                                <button v-else class="btn btn-sm btn-outline" @click="showKeywordInput(index)">+
                                    添加关键词</button>
                            </div>
                        </div>

                        <div class="rule-item" v-else>
                            <div class="rule-label">正则表达式</div>
                            <div class="regex-list">
                                <div v-for="(regex, ridx) in rule.regex" :key="ridx" class="regex-item">
                                    <div class="join">
                                        <input v-model="rule.regex[ridx]" class="input input-bordered join-item"
                                            placeholder="正则表达式" />
                                        <button class="btn join-item" @click="removeRegex(rule, ridx)">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                <button class="btn btn-primary btn-sm" @click="addRegex(rule)">
                                    <i class="fas fa-plus"></i> 添加正则
                                </button>
                            </div>
                            <div class="rule-description">
                                <p>将匹配到的词汇命名为n，反应中对应的[n]会被替换为匹配到的内容，若不了解正则表达式请勿编写</p>
                            </div>
                        </div>

                        <div class="rule-item">
                            <div class="rule-label">触发反应</div>
                            <textarea v-model="rule.reaction" class="textarea textarea-bordered" rows="3"
                                placeholder="触发时添加的提示词" maxlength="500"></textarea>
                        </div>
                    </div>
                </div>

                <div class="rule-actions-container">
                    <button class="btn btn-primary" @click="addKeywordRule">添加关键词规则</button>
                    <button class="btn btn-primary" @click="addRegexRule">添加正则规则</button>
                </div>
            </div>
        </div>

        <div class="card bg-base-100 shadow-xl mb-6">
            <div class="card-header">
                <span>实验性功能</span>
            </div>
            <div class="card-body">
                <div class="setting-item">
                    <span class="setting-label">启用好友聊天</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle" v-model="localConfig.experimental.enable_friend_chat" />
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">启用PFC聊天</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle" v-model="localConfig.experimental.pfc_chatting" />
                    </div>
                </div>
                <div class="setting-description">
                    <div class="alert alert-info">
                        <p>PFC聊天功能仅作用于私聊，与回复模式独立</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="card bg-base-100 shadow-xl">
            <div class="card-header">
                <span>远程统计</span>
            </div>
            <div class="card-body">
                <div class="setting-item">
                    <span class="setting-label">发送统计信息</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle" v-model="localConfig.remote.enable" />
                    </div>
                </div>
                <div class="setting-description">
                    <div class="alert alert-info">
                        <p>开启后会发送匿名统计信息，主要用于了解全球有多少只麦麦</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { reactive, ref, computed, watch, nextTick } from 'vue';

const props = defineProps({
    config: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['update:config']);

// 初始化默认规则
const initRules = () => {
    if (props.config.keywords_reaction?.rules && props.config.keywords_reaction.rules.length > 0) {
        return [...props.config.keywords_reaction.rules];
    }
    return [
        {
            enable: true,
            keywords: ["人机", "bot", "机器", "入机", "robot", "机器人", "ai", "AI"],
            reaction: "有人说你是人机或者机器人，否定这一事实，攻击或反问他。注意，只有认为你是机器人才回复，否则不要否认"
        }
    ];
};

// 创建本地配置副本
const localConfig = reactive({
    keywords_reaction: {
        enable: props.config.keywords_reaction?.enable ?? true,
        rules: initRules()
    },
    experimental: {
        enable_friend_chat: props.config.experimental?.enable_friend_chat ?? false,
        pfc_chatting: props.config.experimental?.pfc_chatting ?? false
    },
    remote: {
        enable: props.config.remote?.enable ?? true
    }
});

// 关键词输入状态
const keywordInputVisible = ref([]);
const keywordInputValue = ref([]);
const keywordInputRefs = ref([]);

// 显示关键词输入框
const showKeywordInput = (index) => {
    keywordInputVisible.value[index] = true;
    keywordInputValue.value[index] = '';
    nextTick(() => {
        if (keywordInputRefs.value && keywordInputRefs.value[0]) {
            keywordInputRefs.value[0].focus();
        }
    });
};

// 确认关键词输入
const confirmKeywordInput = (rule, index) => {
    if (keywordInputValue.value[index]) {
        if (!rule.keywords) {
            rule.keywords = [];
        }
        rule.keywords.push(keywordInputValue.value[index]);
    }
    keywordInputVisible.value[index] = false;
};

// 移除关键词
const removeKeyword = (rule, keywordIndex) => {
    rule.keywords.splice(keywordIndex, 1);
};

// 添加正则表达式
const addRegex = (rule) => {
    if (!rule.regex) {
        rule.regex = [];
    }
    rule.regex.push('');
};

// 移除正则表达式
const removeRegex = (rule, regexIndex) => {
    rule.regex.splice(regexIndex, 1);
};

// 添加关键词规则
const addKeywordRule = () => {
    localConfig.keywords_reaction.rules.push({
        enable: true,
        keywords: [],
        reaction: ""
    });
    keywordInputVisible.value.push(false);
    keywordInputValue.value.push('');
};

// 添加正则规则
const addRegexRule = () => {
    localConfig.keywords_reaction.rules.push({
        enable: false,
        regex: [""],
        reaction: ""
    });
};

// 移除关键词规则
const removeKeywordRule = (index) => {
    localConfig.keywords_reaction.rules.splice(index, 1);
    keywordInputVisible.value.splice(index, 1);
    keywordInputValue.value.splice(index, 1);
};

// 初始化输入状态数组
localConfig.keywords_reaction.rules.forEach(() => {
    keywordInputVisible.value.push(false);
    keywordInputValue.value.push('');
});

// 监听配置变化
watch(localConfig, () => {
    emit('update:config', {
        ...props.config,
        keywords_reaction: {
            ...localConfig.keywords_reaction
        },
        experimental: {
            ...localConfig.experimental
        },
        remote: {
            ...localConfig.remote
        }
    });
}, { deep: true });
</script>

<style scoped>
.settings-tab-content {
    animation: fadeIn 0.5s ease;
}

.settings-section-title {
    margin-bottom: 20px;
    color: var(--color-text-primary);
    font-weight: 500;
}

.setting-description {
    margin-top: 15px;
}

.card-header {
    font-weight: 600;
    padding: 1rem 1rem 0 1rem;
}

.keyword-rule-card {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
}

.rule-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.rule-title {
    font-weight: 500;
    font-size: 16px;
}

.rule-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.rule-content {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.rule-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.rule-label {
    font-size: 14px;
    margin-bottom: 4px;
}

.btn-close {
    background: none;
    border: none;
    cursor: pointer;
}

.regex-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.regex-item {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}

.rule-actions-container {
    display: flex;
    gap: 10px;
    margin-top: 15px;
    justify-content: flex-start;
}

.rule-description {
    font-size: 12px;
    color: var(--color-text-secondary);
    margin-top: 5px;
}
</style>
