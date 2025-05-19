<template>
    <div class="settings-tab-content">
        <div class="card bg-base-100 shadow">
            <div class="card-body">
                <h3 class="settings-section-title">基础信息</h3>

                <el-card class="settings-card">
                    <div class="card-header">
                        <span>版本信息</span>
                    </div>
                    <div class="setting-item">
                        <span class="setting-label">版本号</span>
                        <div class="setting-control">
                            <el-input v-model="localConfig.inner.version" placeholder="版本号" :disabled="true" />
                        </div>
                    </div>
                    <div class="setting-item description-item">
                        <div class="version-description">
                            <p class="version-notes">版本格式：主版本号.次版本号.修订号</p>
                            <p class="version-rules">主版本号：当你做了不兼容的API修改，</p>
                            <p class="version-rules">次版本号：当你做了向下兼容的功能性新增，</p>
                            <p class="version-rules">修订号：当你做了向下兼容的问题修正。</p>
                        </div>
                    </div>
                </el-card>

                <el-card class="settings-card">
                    <div class="card-header">
                        <span>机器人核心信息</span>
                    </div>
                    <div class="setting-item">
                        <span class="setting-label">QQ号</span>
                        <div class="setting-control">
                            <el-input v-model.number="localConfig.bot.qq" placeholder="请输入QQ号" type="number" />
                        </div>
                    </div>
                    <div class="setting-item">
                        <span class="setting-label">昵称</span>
                        <div class="setting-control">
                            <el-input v-model="localConfig.bot.nickname" placeholder="请输入昵称" />
                        </div>
                    </div>
                    <div class="setting-item">
                        <span class="setting-label">别名</span>
                        <div class="setting-control alias-control">
                            <el-tag v-for="(alias, index) in localConfig.bot.alias_names" :key="index" class="alias-tag"
                                closable @close="removeAlias(index)">
                                {{ alias }}
                            </el-tag>
                            <el-input v-if="inputVisible" ref="aliasInputRef" v-model="inputValue" class="alias-input"
                                size="small" @keyup.enter="handleInputConfirm" @blur="handleInputConfirm" />
                            <el-button v-else class="button-new-tag" size="small" @click="showInput">
                                + 添加别名
                            </el-button>
                        </div>
                    </div>
                    <div class="setting-info">注意：别名功能仍在调试中，可能暂时未生效</div>
                </el-card>

                <el-card class="settings-card">
                    <div class="card-header">
                        <span>平台适配器设置</span>
                    </div>
                    <template v-for="(url, platform) in platforms" :key="platform">
                        <div class="setting-item">
                            <span class="setting-label">{{ platform }}</span>
                            <div class="setting-control">
                                <el-input v-model="platforms[platform]" placeholder="请输入链接地址" />
                            </div>
                        </div>
                    </template>
                    <div class="setting-item">
                        <span class="setting-label">添加新平台</span>
                        <div class="setting-control platform-add">
                            <el-input v-model="newPlatform.name" placeholder="平台名称" class="platform-name" />
                            <el-input v-model="newPlatform.url" placeholder="链接地址" class="platform-url" />
                            <el-button type="primary" @click="addPlatform" :disabled="!canAddPlatform">添加</el-button>
                        </div>
                    </div>
                </el-card>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, reactive, watch, nextTick } from 'vue';

const props = defineProps({
    config: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['update:config']);

// 创建本地配置副本
const localConfig = reactive({
    inner: { ...props.config.inner || { version: '1.0.0' } },
    bot: { ...props.config.bot || { qq: 0, nickname: '', alias_names: [] } }
});

// 平台适配器
const platforms = reactive({ ...props.config.platforms || { 'nonebot-qq': 'http://127.0.0.1:18002/api/message' } });

// 处理别名输入
const inputValue = ref('');
const inputVisible = ref(false);
const aliasInputRef = ref(null);

// 新平台添加
const newPlatform = reactive({
    name: '',
    url: ''
});

// 是否可以添加新平台
const canAddPlatform = computed(() => {
    return newPlatform.name.trim() !== '' && newPlatform.url.trim() !== '';
});

// 显示别名输入框
const showInput = () => {
    inputVisible.value = true;
    nextTick(() => {
        aliasInputRef.value.focus();
    });
};

// 处理别名输入确认
const handleInputConfirm = () => {
    if (inputValue.value) {
        if (!localConfig.bot.alias_names) {
            localConfig.bot.alias_names = [];
        }
        localConfig.bot.alias_names.push(inputValue.value);
    }
    inputVisible.value = false;
    inputValue.value = '';
};

// 移除别名
const removeAlias = (index) => {
    localConfig.bot.alias_names.splice(index, 1);
};

// 添加平台
const addPlatform = () => {
    if (canAddPlatform.value) {
        platforms[newPlatform.name] = newPlatform.url;
        newPlatform.name = '';
        newPlatform.url = '';
    }
};

// 监听配置变化，同步到父组件
watch([localConfig, platforms], () => {
    emit('update:config', {
        ...props.config,
        inner: localConfig.inner,
        bot: localConfig.bot,
        platforms: platforms
    });
}, { deep: true });
</script>

<style scoped>
.settings-tab-content {
    animation: fadeIn 0.5s ease;
}

/* 将El-样式替换为DaisyUI样式 */
.card {
    @apply bg-base-100 shadow-lg rounded-lg p-4 my-4;
}

.input-tip {
    @apply text-sm text-base-content/70 mt-1;
}

.platform-add {
    @apply flex flex-wrap gap-2;
}

.platform-name {
    @apply w-36;
}

.platform-url {
    @apply flex-1;
}

@media (max-width: 768px) {
    .platform-add {
        @apply flex-col;
    }

    .platform-name,
    .platform-url {
        @apply w-full;
    }
}
</style>
