<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">记忆管理</h3>

        <el-card class="settings-card">
            <div class="card-header">
                <span>记忆构建参数</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">记忆构建间隔</span>
                <div class="setting-control">
                    <el-input-number v-model="localConfig.memory.build_memory_interval" :min="300" :max="6000"
                        :step="300" />
                    <span class="unit-label">秒</span>
                </div>
            </div>
            <div class="setting-item vertical-item">
                <span class="setting-label">记忆构建分布</span>
                <div class="setting-control full-width">
                    <div class="distribution-inputs">
                        <div class="distribution-group">
                            <div class="dist-item">
                                <span class="dist-label">分布1均值</span>
                                <el-input-number v-model="distributionValues[0]" :min="0" :max="20" :step="0.1" />
                            </div>
                            <div class="dist-item">
                                <span class="dist-label">标准差</span>
                                <el-input-number v-model="distributionValues[1]" :min="0.1" :max="10" :step="0.1" />
                            </div>
                            <div class="dist-item">
                                <span class="dist-label">权重</span>
                                <el-input-number v-model="distributionValues[2]" :min="0" :max="5" :step="0.1" />
                            </div>
                        </div>
                        <div class="distribution-group">
                            <div class="dist-item">
                                <span class="dist-label">分布2均值</span>
                                <el-input-number v-model="distributionValues[3]" :min="0" :max="50" :step="0.5" />
                            </div>
                            <div class="dist-item">
                                <span class="dist-label">标准差</span>
                                <el-input-number v-model="distributionValues[4]" :min="0.1" :max="20" :step="0.1" />
                            </div>
                            <div class="dist-item">
                                <span class="dist-label">权重</span>
                                <el-input-number v-model="distributionValues[5]" :min="0" :max="5" :step="0.1" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">采样数量</span>
                <div class="setting-control">
                    <el-input-number v-model="localConfig.memory.build_memory_sample_num" :min="1" :max="20"
                        :step="1" />
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">采样长度</span>
                <div class="setting-control">
                    <el-input-number v-model="localConfig.memory.build_memory_sample_length" :min="10" :max="100"
                        :step="5" />
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">记忆压缩率</span>
                <div class="setting-control slider-control">
                    <el-slider v-model="localConfig.memory.memory_compress_rate" :min="0.01" :max="0.5" :step="0.01"
                        :format-tooltip="value => (value * 100).toFixed(0) + '%'" show-input />
                </div>
            </div>
            <div class="setting-description">
                <el-alert type="info" :closable="false">
                    <p>记忆构建间隔越低，机器人学习越多，但冗余信息也会增多</p>
                    <p>记忆压缩率调高可以获得更多信息，但冗余信息也会增多</p>
                </el-alert>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="card-header">
                <span>记忆遗忘与整合</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">记忆遗忘间隔</span>
                <div class="setting-control">
                    <el-input-number v-model="localConfig.memory.forget_memory_interval" :min="300" :max="3600"
                        :step="100" />
                    <span class="unit-label">秒</span>
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">遗忘时间阈值</span>
                <div class="setting-control">
                    <el-input-number v-model="localConfig.memory.memory_forget_time" :min="1" :max="168" :step="1" />
                    <span class="unit-label">小时</span>
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">记忆遗忘比例</span>
                <div class="setting-control slider-control">
                    <el-slider v-model="localConfig.memory.memory_forget_percentage" :min="0.001" :max="0.1"
                        :step="0.001" :format-tooltip="value => (value * 100).toFixed(1) + '%'" show-input />
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">记忆整合间隔</span>
                <div class="setting-control">
                    <el-input-number v-model="localConfig.memory.consolidate_memory_interval" :min="300" :max="3600"
                        :step="100" />
                    <span class="unit-label">秒</span>
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">相似度阈值</span>
                <div class="setting-control slider-control">
                    <el-slider v-model="localConfig.memory.consolidation_similarity_threshold" :min="0.5" :max="0.95"
                        :step="0.01" :format-tooltip="value => value.toFixed(2)" show-input />
                </div>
            </div>
            <div class="setting-item">
                <span class="setting-label">检查节点比例</span>
                <div class="setting-control slider-control">
                    <el-slider v-model="localConfig.memory.consolidation_check_percentage" :min="0.001" :max="0.1"
                        :step="0.001" :format-tooltip="value => (value * 100).toFixed(1) + '%'" show-input />
                </div>
            </div>
            <div class="setting-description">
                <el-alert type="info" :closable="false">
                    <p>记忆遗忘间隔越低，遗忘越频繁，记忆更精简，但也更难学习</p>
                    <p>记忆整合间隔越低，整合越频繁，记忆更精简</p>
                </el-alert>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="card-header">
                <span>记忆屏蔽词</span>
            </div>
            <div class="setting-item vertical-item">
                <span class="setting-label">不希望记忆的词</span>
                <div class="setting-control full-width">
                    <el-tag v-for="(word, index) in localConfig.memory.memory_ban_words" :key="index" closable
                        class="memory-ban-tag" @close="removeBanWord(index)">
                        {{ word }}
                    </el-tag>
                    <el-input v-if="banWordInputVisible" ref="banWordInputRef" v-model="banWordInputValue"
                        class="tag-input" size="small" @keyup.enter="handleBanWordInputConfirm"
                        @blur="handleBanWordInputConfirm" />
                    <el-button v-else class="button-new-tag" size="small" @click="showBanWordInput">
                        + 添加屏蔽词
                    </el-button>
                </div>
                <p class="setting-description">已经记忆的内容不会受到影响</p>
            </div>
        </el-card>
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

// 记忆构建分布值
const distributionValues = ref([
    props.config.memory?.build_memory_distribution?.[0] || 6.0,
    props.config.memory?.build_memory_distribution?.[1] || 3.0,
    props.config.memory?.build_memory_distribution?.[2] || 0.6,
    props.config.memory?.build_memory_distribution?.[3] || 32.0,
    props.config.memory?.build_memory_distribution?.[4] || 12.0,
    props.config.memory?.build_memory_distribution?.[5] || 0.4
]);

// 创建本地配置副本
const localConfig = reactive({
    memory: {
        build_memory_interval: props.config.memory?.build_memory_interval || 2000,
        build_memory_distribution: [...distributionValues.value],
        build_memory_sample_num: props.config.memory?.build_memory_sample_num || 8,
        build_memory_sample_length: props.config.memory?.build_memory_sample_length || 40,
        memory_compress_rate: props.config.memory?.memory_compress_rate || 0.1,
        forget_memory_interval: props.config.memory?.forget_memory_interval || 1000,
        memory_forget_time: props.config.memory?.memory_forget_time || 24,
        memory_forget_percentage: props.config.memory?.memory_forget_percentage || 0.01,
        consolidate_memory_interval: props.config.memory?.consolidate_memory_interval || 1000,
        consolidation_similarity_threshold: props.config.memory?.consolidation_similarity_threshold || 0.7,
        consolidation_check_percentage: props.config.memory?.consolidation_check_percentage || 0.01,
        memory_ban_words: [...(props.config.memory?.memory_ban_words || [])]
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
        localConfig.memory.memory_ban_words.push(banWordInputValue.value);
    }
    banWordInputVisible.value = false;
    banWordInputValue.value = '';
};

// 移除屏蔽词
const removeBanWord = (index) => {
    localConfig.memory.memory_ban_words.splice(index, 1);
};

// 监听分布值变化
watch(distributionValues, (newValues) => {
    localConfig.memory.build_memory_distribution = [...newValues];
}, { deep: true });

// 监听配置变化
watch(localConfig, () => {
    emit('update:config', {
        ...props.config,
        memory: {
            ...localConfig.memory,
            build_memory_distribution: [...distributionValues.value]
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
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 4px;
}

.unit-label {
    margin-left: 10px;
    color: var(--el-text-color-secondary);
}

.slider-control {
    width: 100%;
}

.full-width {
    width: 100%;
}

.memory-ban-tag {
    margin-right: 6px;
    margin-bottom: 6px;
}

.tag-input {
    width: 150px;
    margin-right: 8px;
    vertical-align: bottom;
}

.distribution-inputs {
    display: flex;
    flex-direction: column;
    gap: 15px;
    width: 100%;
}

.distribution-group {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    width: 100%;
    align-items: center;
    padding: 10px;
    border: 1px dashed var(--el-border-color);
    border-radius: 8px;
}

.dist-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
    min-width: 120px;
}

.dist-label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
    .distribution-group {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>
