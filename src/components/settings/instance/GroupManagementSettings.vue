<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">群组与用户管理</h3>

        <el-card class="settings-card">
            <div class="card-header">
                <span>群组权限设置</span>
            </div>

            <div class="setting-item">
                <span class="setting-label">允许回复的群组</span>
                <div class="setting-control">
                    <el-select v-model="localConfig.groups.talk_allowed" multiple filterable allow-create
                        default-first-option placeholder="请输入群号，回车添加" style="width: 100%">
                        <el-option v-for="group in localConfig.groups.talk_allowed" :key="group"
                            :label="group.toString()" :value="group" />
                    </el-select>
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">降低回复频率的群组</span>
                <div class="setting-control">
                    <el-select v-model="localConfig.groups.talk_frequency_down" multiple filterable allow-create
                        default-first-option placeholder="请输入群号，回车添加" style="width: 100%">
                        <el-option v-for="group in localConfig.groups.talk_frequency_down" :key="group"
                            :label="group.toString()" :value="group" />
                    </el-select>
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">禁止回复的用户</span>
                <div class="setting-control">
                    <el-select v-model="localConfig.groups.ban_user_id" multiple filterable allow-create
                        default-first-option placeholder="请输入QQ号，回车添加" style="width: 100%">
                        <el-option v-for="user in localConfig.groups.ban_user_id" :key="user" :label="user.toString()"
                            :value="user" />
                    </el-select>
                </div>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="card-header">
                <span>消息过滤设置</span>
            </div>

            <div class="setting-item">
                <span class="setting-label">全局屏蔽词</span>
                <div class="setting-control">
                    <el-tag v-for="(word, index) in localConfig.chat.ban_words" :key="index" closable
                        @close="removeBanWord(index)">
                        {{ word }}
                    </el-tag>
                    <el-input v-if="banWordInputVisible" ref="banWordInputRef" v-model="banWordInputValue"
                        class="tag-input" size="small" @keyup.enter="handleBanWordInputConfirm"
                        @blur="handleBanWordInputConfirm" />
                    <el-button v-else class="button-new-tag" size="small" @click="showBanWordInput">
                        + 添加屏蔽词
                    </el-button>
                </div>
            </div>

            <div class="setting-item vertical-item">
                <div class="setting-label-full">正则过滤规则</div>
                <div class="setting-control-full">
                    <el-table :data="regexTableData" style="width: 100%" border>
                        <el-table-column label="正则表达式" prop="regex">
                            <template #default="scope">
                                <el-input v-model="scope.row.regex" placeholder="请输入正则表达式" />
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="120">
                            <template #default="scope">
                                <el-button type="danger" size="small" @click="removeRegexRule(scope.$index)"
                                    :icon="Delete" circle />
                            </template>
                        </el-table-column>
                    </el-table>
                    <div class="table-actions">
                        <el-button type="primary" @click="addRegexRule" size="small">添加正则规则</el-button>
                    </div>
                    <div class="setting-description">
                        <p>注意：正则表达式规则可以过滤特定格式的消息，如链接、日期等。如不了解正则表达式请谨慎修改。</p>
                    </div>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue';
import { Delete } from '@element-plus/icons-vue';

const props = defineProps({
    config: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['update:config']);

// 创建本地配置副本
const localConfig = reactive({
    groups: {
        talk_allowed: [...(props.config.groups?.talk_allowed || [])],
        talk_frequency_down: [...(props.config.groups?.talk_frequency_down || [])],
        ban_user_id: [...(props.config.groups?.ban_user_id || [])]
    },
    chat: {
        ban_words: [...(props.config.chat?.ban_words || [])],
        ban_msgs_regex: [...(props.config.chat?.ban_msgs_regex || [])]
    }
});

// 处理屏蔽词输入
const banWordInputValue = ref('');
const banWordInputVisible = ref(false);
const banWordInputRef = ref(null);

// 显示屏蔽词输入框
const showBanWordInput = () => {
    banWordInputVisible.value = true;
    nextTick(() => {
        banWordInputRef.value.focus();
    });
};

// 处理屏蔽词输入确认
const handleBanWordInputConfirm = () => {
    if (banWordInputValue.value) {
        localConfig.chat.ban_words.push(banWordInputValue.value);
    }
    banWordInputVisible.value = false;
    banWordInputValue.value = '';
};

// 移除屏蔽词
const removeBanWord = (index) => {
    localConfig.chat.ban_words.splice(index, 1);
};

// 正则表达式表格数据
const regexTableData = reactive(
    (props.config.chat?.ban_msgs_regex || []).map(regex => ({ regex }))
);

// 添加正则规则
const addRegexRule = () => {
    regexTableData.push({ regex: '' });
};

// 移除正则规则
const removeRegexRule = (index) => {
    regexTableData.splice(index, 1);
};

// 监听配置变化并同步到父组件
watch([localConfig, regexTableData], () => {
    // 更新正则表达式数组
    localConfig.chat.ban_msgs_regex = regexTableData.map(item => item.regex).filter(regex => regex.trim() !== '');

    emit('update:config', {
        ...props.config,
        groups: {
            talk_allowed: localConfig.groups.talk_allowed,
            talk_frequency_down: localConfig.groups.talk_frequency_down,
            ban_user_id: localConfig.groups.ban_user_id
        },
        chat: {
            ...props.config.chat,
            ban_words: localConfig.chat.ban_words,
            ban_msgs_regex: localConfig.chat.ban_msgs_regex
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

.vertical-item {
    flex-direction: column;
    align-items: flex-start;
}

.setting-label-full {
    font-size: 14px;
    color: var(--el-text-color-primary);
    margin-bottom: 12px;
}

.setting-control-full {
    width: 100%;
}

.tag-input {
    width: 120px;
    margin-left: 8px;
    vertical-align: bottom;
}

.button-new-tag {
    margin-left: 8px;
}

.table-actions {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
}

.setting-description {
    margin-top: 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.5;
}
</style>
