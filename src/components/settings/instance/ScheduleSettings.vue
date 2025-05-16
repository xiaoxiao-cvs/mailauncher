<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">日程与行为控制</h3>

        <el-card class="settings-card">
            <div class="card-header">
                <span>日程生成设置</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">启用日程表生成</span>
                <div class="setting-control">
                    <el-switch v-model="localConfig.schedule.enable_schedule_gen" />
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">日程影响回复模式</span>
                <div class="setting-control">
                    <el-switch v-model="localConfig.schedule.enable_schedule_interaction" />
                </div>
            </div>
            <div class="setting-item vertical-item">
                <span class="setting-label">日程生成提示词</span>
                <div class="setting-control full-width">
                    <el-input v-model="localConfig.schedule.prompt_schedule_gen" type="textarea" :rows="3"
                        placeholder="用几句话描述性格特点或行动规律，这个特征会用来生成日程表" maxlength="200" show-word-limit />
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">时区设置</span>
                <div class="setting-control">
                    <el-select v-model="localConfig.schedule.time_zone" placeholder="选择时区" style="width: 100%">
                        <el-option label="上海 (Asia/Shanghai)" value="Asia/Shanghai" />
                        <el-option label="东京 (Asia/Tokyo)" value="Asia/Tokyo" />
                        <el-option label="纽约 (America/New_York)" value="America/New_York" />
                        <el-option label="洛杉矶 (America/Los_Angeles)" value="America/Los_Angeles" />
                        <el-option label="伦敦 (Europe/London)" value="Europe/London" />
                    </el-select>
                </div>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="card-header">
                <span>行为控制参数</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">日程更新间隔</span>
                <div class="setting-control">
                    <el-input-number v-model="localConfig.schedule.schedule_doing_update_interval" :min="60" :max="3600"
                        :step="30" />
                    <span class="unit-label">秒</span>
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">日程温度</span>
                <div class="setting-control slider-control">
                    <el-slider v-model="localConfig.schedule.schedule_temperature" :min="0" :max="1" :step="0.01"
                        :format-tooltip="value => value.toFixed(2)" show-input />
                </div>
            </div>
            <div class="setting-description">
                <el-alert type="info" :closable="false">
                    <p>日程温度参数建议值：0.1-0.5，值越高日程越多样化但可能不够稳定</p>
                    <p>时区设置可以解决运行电脑时区和国内时区不同的情况，或者模拟国外留学生日程</p>
                </el-alert>
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
    schedule: {
        enable_schedule_gen: props.config.schedule?.enable_schedule_gen ?? true,
        enable_schedule_interaction: props.config.schedule?.enable_schedule_interaction ?? true,
        prompt_schedule_gen: props.config.schedule?.prompt_schedule_gen || "活泼外向，喜欢社交和探索新事物",
        schedule_doing_update_interval: props.config.schedule?.schedule_doing_update_interval || 900,
        schedule_temperature: props.config.schedule?.schedule_temperature || 0.1,
        time_zone: props.config.schedule?.time_zone || "Asia/Shanghai"
    }
});

// 监听配置变化
watch(localConfig, () => {
    emit('update:config', {
        ...props.config,
        schedule: {
            ...localConfig.schedule
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

.setting-description {
    margin-top: 15px;
}

.full-width {
    width: 100%;
}

.unit-label {
    margin-left: 10px;
    color: var(--el-text-color-secondary);
}

.slider-control {
    width: 100%;
}
</style>
