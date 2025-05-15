<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">情绪与互动设置</h3>

        <el-card class="settings-card">
            <div class="card-header">
                <span>情绪系统设置</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">情绪更新间隔</span>
                <div class="setting-control">
                    <el-input-number v-model="localConfig.mood_update_interval" :min="0.1" :max="10" :step="0.1" />
                    <span class="unit-label">分钟</span>
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">情绪衰减率</span>
                <div class="setting-control slider-control">
                    <el-slider v-model="localConfig.mood_decay_rate" :min="0.5" :max="0.99" :step="0.01"
                        :format-tooltip="value => value.toFixed(2)" show-input />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">情绪强度因子</span>
                <div class="setting-control slider-control">
                    <el-slider v-model="localConfig.mood_intensity_factor" :min="0.5" :max="2.0" :step="0.1"
                        :format-tooltip="value => value.toFixed(1)" show-input />
                </div>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="card-header">
                <span>情绪与性格互动</span>
            </div>
            <div class="setting-item vertical-item">
                <div class="setting-description">
                    <el-alert type="info" :closable="false">
                        <p>情绪系统会影响回复内容的语气和表达方式，使机器人表现出更自然的情感变化</p>
                    </el-alert>
                </div>
            </div>
        </el-card>
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
    mood_update_interval: props.config.mood?.mood_update_interval || 1.0,
    mood_decay_rate: props.config.mood?.mood_decay_rate || 0.95,
    mood_intensity_factor: props.config.mood?.mood_intensity_factor || 1.0
});

// 监听配置变化
watch(localConfig, () => {
    emit('update:config', {
        ...props.config,
        mood: {
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

.slider-control {
    width: 100%;
    max-width: 300px;
}

.unit-label {
    margin-left: 10px;
    color: var(--el-text-color-secondary);
}

.vertical-item {
    flex-direction: column;
    align-items: flex-start;
}

.setting-description {
    width: 100%;
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
