<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">群组与用户管理</h3>

        <div class="card bg-base-100 shadow mb-4">
            <div class="card-body">
                <h3 class="card-title">群组权限设置</h3>

                <div class="setting-item vertical-item">
                    <span class="setting-label">允许回复的群组</span>
                    <div class="setting-control full-width">
                        <div class="tags-input">
                            <div class="flex flex-wrap gap-2 mb-2">
                                <div v-for="group in localConfig.groups.talk_allowed" :key="group"
                                    class="badge badge-primary badge-lg gap-1">
                                    {{ group }}
                                    <button @click="removeGroup('talk_allowed', group)"
                                        class="btn btn-xs btn-circle btn-ghost">
                                        <i class="i-mdi-close"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="flex">
                                <input type="text" placeholder="请输入群号，回车添加" class="input input-bordered flex-1"
                                    v-model="newGroupInput.talk_allowed" @keydown.enter="addGroup('talk_allowed')" />
                                <button class="btn" @click="addGroup('talk_allowed')">添加</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="setting-item vertical-item">
                    <span class="setting-label">降低回复频率的群组</span>
                    <div class="setting-control full-width">
                        <div class="tags-input">
                            <div class="flex flex-wrap gap-2 mb-2">
                                <div v-for="group in localConfig.groups.talk_frequency_down" :key="group"
                                    class="badge badge-secondary badge-lg gap-1">
                                    {{ group }}
                                    <button @click="removeGroup('talk_frequency_down', group)"
                                        class="btn btn-xs btn-circle btn-ghost">
                                        <i class="i-mdi-close"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="flex">
                                <input type="text" placeholder="请输入群号，回车添加" class="input input-bordered flex-1"
                                    v-model="newGroupInput.talk_frequency_down"
                                    @keydown.enter="addGroup('talk_frequency_down')" />
                                <button class="btn" @click="addGroup('talk_frequency_down')">添加</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="setting-item vertical-item">
                    <span class="setting-label">禁止回复的用户</span>
                    <div class="setting-control full-width">
                        <div class="tags-input">
                            <div class="flex flex-wrap gap-2 mb-2">
                                <div v-for="user in localConfig.groups.ban_user_id" :key="user"
                                    class="badge badge-error badge-lg gap-1">
                                    {{ user }}
                                    <button @click="removeUser(user)" class="btn btn-xs btn-circle btn-ghost">
                                        <i class="i-mdi-close"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="flex">
                                <input type="text" placeholder="请输入QQ号，回车添加" class="input input-bordered flex-1"
                                    v-model="newUserInput" @keydown.enter="addUser" />
                                <button class="btn" @click="addUser">添加</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card bg-base-100 shadow mb-4">
            <div class="card-body">
                <h3 class="card-title">消息过滤设置</h3>

                <div class="setting-item vertical-item">
                    <span class="setting-label">全局屏蔽词</span>
                    <div class="setting-control full-width">
                        <div class="tags-input">
                            <div class="flex flex-wrap gap-2 mb-2">
                                <div v-for="(word, index) in localConfig.chat.ban_words" :key="index"
                                    class="badge badge-info badge-lg gap-1">
                                    {{ word }}
                                    <button @click="removeBanWord(index)" class="btn btn-xs btn-circle btn-ghost">
                                        <i class="i-mdi-close"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="flex">
                                <input type="text" placeholder="请输入屏蔽词，回车添加" class="input input-bordered flex-1"
                                    v-model="newBanWordInput" @keydown.enter="addBanWord" />
                                <button class="btn" @click="addBanWord">添加</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="setting-item vertical-item">
                    <div class="setting-label-full">正则过滤规则</div>
                    <div class="setting-control-full">
                        <div class="overflow-x-auto">
                            <table class="table w-full">
                                <thead>
                                    <tr>
                                        <th>正则表达式</th>
                                        <th class="w-24">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(rule, index) in regexTableData" :key="index">
                                        <td>
                                            <input type="text" class="input input-bordered w-full" v-model="rule.regex"
                                                placeholder="请输入正则表达式" />
                                        </td>
                                        <td>
                                            <button class="btn btn-circle btn-error btn-sm"
                                                @click="removeRegexRule(index)">
                                                <i class="i-mdi-delete"></i>
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="table-actions mt-2">
                            <button class="btn btn-primary btn-sm" @click="addRegexRule">添加正则规则</button>
                        </div>
                        <div class="setting-description mt-2">
                            <p>注意：正则表达式规则可以过滤特定格式的消息，如链接、日期等。如不了解正则表达式请谨慎修改。</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';

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

// 输入状态
const newGroupInput = reactive({
    talk_allowed: '',
    talk_frequency_down: ''
});
const newUserInput = ref('');
const newBanWordInput = ref('');

// 正则表格数据
const regexTableData = reactive(
    (props.config.chat?.ban_msgs_regex || []).map(regex => ({ regex }))
);

// 添加群组
const addGroup = (type) => {
    const value = newGroupInput[type].trim();
    if (value && !isNaN(value)) {
        // 确保数字格式
        const numValue = parseInt(value);
        if (!localConfig.groups[type].includes(numValue)) {
            localConfig.groups[type].push(numValue);
        }
        newGroupInput[type] = '';
    }
};

// 移除群组
const removeGroup = (type, group) => {
    const index = localConfig.groups[type].indexOf(group);
    if (index !== -1) {
        localConfig.groups[type].splice(index, 1);
    }
};

// 添加用户
const addUser = () => {
    const value = newUserInput.trim();
    if (value && !isNaN(value)) {
        const numValue = parseInt(value);
        if (!localConfig.groups.ban_user_id.includes(numValue)) {
            localConfig.groups.ban_user_id.push(numValue);
        }
        newUserInput.value = '';
    }
};

// 移除用户
const removeUser = (user) => {
    const index = localConfig.groups.ban_user_id.indexOf(user);
    if (index !== -1) {
        localConfig.groups.ban_user_id.splice(index, 1);
    }
};

// 添加屏蔽词
const addBanWord = () => {
    const word = newBanWordInput.value.trim();
    if (word && !localConfig.chat.ban_words.includes(word)) {
        localConfig.chat.ban_words.push(word);
    }
    newBanWordInput.value = '';
};

// 移除屏蔽词
const removeBanWord = (index) => {
    localConfig.chat.ban_words.splice(index, 1);
};

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
    padding: 1rem;
}

.settings-section-title {
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
    font-weight: 500;
}

.vertical-item {
    flex-direction: column;
    align-items: flex-start;
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid rgba(var(--b3, var(--fallback-b3, 0, 0, 0)), 0.1);
}

.setting-item:last-child {
    border-bottom: none;
}

.setting-label {
    font-size: 0.95rem;
}

.setting-label-full {
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
    width: 100%;
}

.setting-control {
    display: flex;
    align-items: center;
}

.setting-control-full {
    width: 100%;
}

.full-width {
    width: 100%;
}

.setting-description {
    font-size: 0.75rem;
    opacity: 0.7;
    margin-top: 0.25rem;
}

.table-actions {
    display: flex;
    justify-content: flex-end;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
