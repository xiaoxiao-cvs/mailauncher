<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">表情包管理</h3>

        <el-card class="settings-card">
            <div class="card-header">
                <span>表情包基本设置</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">最大表情包数量</span>
                <div class="setting-control">
                    <el-input-number v-model="localConfig.max_emoji_num" :min="10" :max="200" />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">启用表情检查</span>
                <div class="setting-control">
                    <el-switch v-model="localConfig.enable_check" />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">保存收到的表情</span>
                <div class="setting-control">
                    <el-switch v-model="localConfig.save_emoji" />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">保存收到的图片</span>
                <div class="setting-control">
                    <el-switch v-model="localConfig.save_pic" />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">允许学习表情</span>
                <div class="setting-control">
                    <el-switch v-model="localConfig.steal_emoji" />
                </div>
            </div>

            <div class="setting-item vertical-item" v-if="localConfig.enable_check">
                <span class="setting-label">检查提示词</span>
                <div class="setting-control full-width">
                    <el-input v-model="localConfig.check_prompt" type="textarea" :rows="2" placeholder="用于检查表情是否合适的提示词"
                        maxlength="100" show-word-limit />
                </div>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="card-header">
                <span>高级设置</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">表情检查间隔</span>
                <div class="setting-control">
                    <el-input-number v-model="localConfig.check_interval" :min="1" :max="60" :step="1" />
                    <span class="unit-label">分钟</span>
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">达到上限时自动删除旧表情</span>
                <div class="setting-control">
                    <el-switch v-model="localConfig.max_reach_deletion" />
                </div>
            </div>
        </el-card>

        <div class="setting-description">
            <el-alert type="info" :closable="false">
                <p>表情包是机器人交互的重要组成部分，适当的表情使用可以增加交流的趣味性</p>
                <p>设置表情检查可以过滤不合适的内容，但会降低表情学习的速度</p>
            </el-alert>
        </div>
    </div>
</template>

<script setup>
import { reactive, watch } from 'vue';

const props = defineProps({
    config: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['update:config']);

// 创建本地配置副本
const localConfig = reactive({
    max_emoji_num: props.config.emoji?.max_emoji_num || 40,
    max_reach_deletion: props.config.emoji?.max_reach_deletion ?? true,
    check_interval: props.config.emoji?.check_interval || 10,
    save_pic: props.config.emoji?.save_pic ?? false,
    save_emoji: props.config.emoji?.save_emoji ?? false,
    steal_emoji: props.config.emoji?.steal_emoji ?? true,
    enable_check: props.config.emoji?.enable_check ?? false,
    check_prompt: props.config.emoji?.check_prompt || "符合公序良俗"
});

// 监听配置变化
watch(localConfig, () => {
    emit('update:config', {
        ...props.config,
        emoji: {
            ...localConfig
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

.settings-card {
    margin-bottom: 20px;
    border-radius: 8px;
    overflow: hidden;
}

.card-header {
    font-weight: 500;
    margin-bottom: 15px;
    color: var(--el-text-color-primary);
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.setting-item:last-child {
    border-bottom: none;
}

.setting-label {
    font-size: 14px;
    color: var(--el-text-color-primary);
}

.setting-control {
    display: flex;
    align-items: center;
    gap: 10px;
}

.unit-label {
    margin-left: 10px;
    color: var(--el-text-color-secondary);
}

.vertical-item {
    flex-direction: column;
    align-items: flex-start;
}

.vertical-item .setting-control {
    margin-top: 10px;
}

.full-width {
    width: 100%;
}

.setting-description {
    margin-top: 20px;
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
