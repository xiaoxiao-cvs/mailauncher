<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">高级功能与实验性设置</h3>

        <el-card class="settings-card">
            <div class="card-header">
                <span>关键词反应设置</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">启用关键词反应</span>
                <div class="setting-control">
                    <el-switch v-model="localConfig.keywords_reaction.enable" />
                </div>
            </div>

            <el-divider content-position="left">关键词规则</el-divider>

            <div v-for="(rule, index) in localConfig.keywords_reaction.rules" :key="index" class="keyword-rule-card">
                <div class="rule-header">
                    <div class="rule-title">规则 #{{ index + 1 }}</div>
                    <div class="rule-actions">
                        <el-switch v-model="rule.enable" />
                        <el-button type="danger" :icon="Delete" circle size="small" @click="removeKeywordRule(index)" />
                    </div>
                </div>

                <div class="rule-content">
                    <div class="rule-item" v-if="!rule.regex">
                        <div class="rule-label">关键词列表</div>
                        <el-tag v-for="(keyword, kidx) in rule.keywords" :key="kidx" closable
                            @close="removeKeyword(rule, kidx)" class="keyword-tag">
                            {{ keyword }}
                        </el-tag>
                        <el-input v-if="keywordInputVisible[index]" ref="keywordInputRefs"
                            v-model="keywordInputValue[index]" class="keyword-input" size="small"
                            @keyup.enter="confirmKeywordInput(rule, index)" @blur="confirmKeywordInput(rule, index)" />
                        <el-button v-else class="button-new-keyword" size="small" @click="showKeywordInput(index)">
                            + 添加关键词
                        </el-button>
                    </div>

                    <div class="rule-item" v-else>
                        <div class="rule-label">正则表达式</div>
                        <div class="regex-list">
                            <div v-for="(regex, ridx) in rule.regex" :key="ridx" class="regex-item">
                                <el-input v-model="rule.regex[ridx]" placeholder="正则表达式">
                                    <template #append>
                                        <el-button @click="removeRegex(rule, ridx)" :icon="Delete" />
                                    </template>
                                </el-input>
                            </div>
                            <el-button type="primary" size="small" @click="addRegex(rule)" :icon="Plus">添加正则</el-button>
                        </div>
                        <div class="rule-description">
                            <p>将匹配到的词汇命名为n，反应中对应的[n]会被替换为匹配到的内容，若不了解正则表达式请勿编写</p>
                        </div>
                    </div>

                    <div class="rule-item">
                        <div class="rule-label">触发反应</div>
                        <el-input v-model="rule.reaction" type="textarea" :rows="3" placeholder="触发时添加的提示词"
                            maxlength="500" show-word-limit />
                    </div>
                </div>
            </div>

            <div class="rule-actions-container">
                <el-button type="primary" @click="addKeywordRule">添加关键词规则</el-button>
                <el-button type="primary" @click="addRegexRule">添加正则规则</el-button>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="card-header">
                <span>实验性功能</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">启用好友聊天</span>
                <div class="setting-control">
                    <el-switch v-model="localConfig.experimental.enable_friend_chat" />
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">启用PFC聊天</span>
                <div class="setting-control">
                    <el-switch v-model="localConfig.experimental.pfc_chatting" />
                </div>
            </div>
            <div class="setting-description">
                <el-alert type="info" :closable="false">
                    <p>PFC聊天功能仅作用于私聊，与回复模式独立</p>
                </el-alert>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="card-header">
                <span>远程统计</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">发送统计信息</span>
                <div class="setting-control">
                    <el-switch v-model="localConfig.remote.enable" />
                </div>
            </div>
            <div class="setting-description">
                <el-alert type="info" :closable="false">
                    <p>开启后会发送匿名统计信息，主要用于了解全球有多少只麦麦</p>
                </el-alert>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { reactive, ref, computed, watch, nextTick } from 'vue';
import { Delete, Plus } from '@element-plus/icons-vue';

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
    color: var(--el-text-color-primary);
    font-weight: 500;
}

.setting-description {
    margin-top: 15px;
}

.keyword-rule-card {
    border: 1px solid var(--el-border-color);
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
    color: var(--el-text-color-primary);
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
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
}

.keyword-tag {
    margin-right: 6px;
    margin-bottom: 6px;
}

.keyword-input {
    width: 150px;
    margin-right: 8px;
    vertical-align: bottom;
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
}

.rule-actions-container {
    display: flex;
    gap: 10px;
    margin-top: 15px;
    justify-content: flex-start;
}

.rule-description {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 5px;
}
</style>
