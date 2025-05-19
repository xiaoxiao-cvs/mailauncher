<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">模型配置</h3>

        <div class="card bg-base-100 shadow mb-4">
            <div class="card-body">
                <h3 class="card-title">推理模型设置</h3>
                <div class="setting-item">
                    <span class="setting-label">推理模型</span>
                    <div class="setting-control">
                        <select class="select select-bordered w-full max-w-xs" v-model="localConfig.llm_reasoning.name">
                            <option v-for="model in reasoningModels" :key="model.value" :value="model.value">{{
                                model.label }}</option>
                        </select>
                    </div>
                </div>

                <div class="setting-item">
                    <span class="setting-label">服务提供商</span>
                    <div class="setting-control">
                        <select class="select select-bordered w-full max-w-xs"
                            v-model="localConfig.llm_reasoning.provider">
                            <option v-for="provider in providers" :key="provider.value" :value="provider.value">{{
                                provider.label }}</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div class="card bg-base-100 shadow mb-4">
            <div class="card-body">
                <h3 class="card-title">常规模型设置</h3>
                <div class="setting-item">
                    <span class="setting-label">常规模型</span>
                    <div class="setting-control">
                        <select class="select select-bordered w-full max-w-xs" v-model="localConfig.llm_normal.name">
                            <option v-for="model in normalModels" :key="model.value" :value="model.value">{{ model.label
                                }}</option>
                        </select>
                    </div>
                </div>

                <div class="setting-item">
                    <span class="setting-label">服务提供商</span>
                    <div class="setting-control">
                        <select class="select select-bordered w-full max-w-xs"
                            v-model="localConfig.llm_normal.provider">
                            <option v-for="provider in providers" :key="provider.value" :value="provider.value">{{
                                provider.label }}</option>
                        </select>
                    </div>
                </div>

                <div class="setting-item vertical-item">
                    <span class="setting-label">温度系数</span>
                    <div class="setting-control slider-control">
                        <input type="range" min="0" max="1" step="0.05" class="range range-primary w-full"
                            v-model.number="localConfig.llm_normal.temp" />
                        <div class="flex justify-between w-full px-2">
                            <span>{{ localConfig.llm_normal.temp.toFixed(2) }}</span>
                            <span>0.5</span>
                            <span>1.0</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card bg-base-100 shadow mb-4">
            <div class="card-body">
                <h3 class="card-title">情感流模型设置</h3>
                <div class="setting-item">
                    <span class="setting-label">情感流模型</span>
                    <div class="setting-control">
                        <select class="select select-bordered w-full max-w-xs" v-model="localConfig.llm_heartflow.name">
                            <option v-for="model in heartflowModels" :key="model.value" :value="model.value">{{
                                model.label }}</option>
                        </select>
                    </div>
                </div>

                <div class="setting-item">
                    <span class="setting-label">服务提供商</span>
                    <div class="setting-control">
                        <select class="select select-bordered w-full max-w-xs"
                            v-model="localConfig.llm_heartflow.provider">
                            <option v-for="provider in providers" :key="provider.value" :value="provider.value">{{
                                provider.label }}</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div class="alert alert-info mt-4">
            <div>
                <i class="i-mdi-information-outline"></i>
                <div>
                    <p>推理模型用于需要深度思考的场景，常规模型用于日常对话，情感流模型用于增强情感表达。</p>
                    <p>温度系数越高，回复越多样化但可能偏离主题；越低则回复更加确定和严谨。</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';

const props = defineProps({
    config: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['update:config']);

// 可用的模型列表
const reasoningModels = ref([
    { label: 'DeepSeek-R1', value: 'Pro/deepseek-ai/DeepSeek-R1' },
    { label: 'GPT-4 Turbo', value: 'OpenAI/gpt-4-turbo' },
    { label: 'GPT-3.5 Turbo', value: 'OpenAI/gpt-3.5-turbo' },
    { label: 'Claude 3 Opus', value: 'Anthropic/claude-3-opus' },
    { label: 'Claude 3 Sonnet', value: 'Anthropic/claude-3-sonnet' },
    { label: 'Gemini Pro', value: 'Google/gemini-pro' }
]);

const normalModels = ref([
    { label: 'DeepSeek-V3', value: 'Pro/deepseek-ai/DeepSeek-V3' },
    { label: 'Qwen2.5-1.5B', value: 'Qwen/Qwen2.5-1.5B-Chat' },
    { label: 'Qwen2.5-7B', value: 'Qwen/Qwen2.5-7B-Chat' },
    { label: 'Qwen2.5-14B', value: 'Qwen/Qwen2.5-14B-Chat' },
    { label: 'Baichuan3-7B', value: 'Baichuan/Baichuan3-7B-Chat' },
    { label: 'ChatGLM4', value: 'THUDM/chatglm4' }
]);

const heartflowModels = ref([
    { label: 'Qwen2.5-32B', value: 'Qwen/Qwen2.5-32B-Instruct' },
    { label: 'Qwen2.5-72B', value: 'Qwen/Qwen2.5-72B-Instruct' },
    { label: 'GPT-4o', value: 'OpenAI/gpt-4o' },
    { label: 'Claude 3 Haiku', value: 'Anthropic/claude-3-haiku' }
]);

// 提供商列表
const providers = ref([
    { label: 'SILICONFLOW', value: 'SILICONFLOW' },
    { label: '本地部署', value: 'LOCAL' },
    { label: 'API代理', value: 'API_PROXY' },
    { label: 'OpenAI', value: 'OPENAI' },
    { label: '智谱AI', value: 'ZHIPU' }
]);

// 创建本地配置副本
const localConfig = reactive({
    llm_reasoning: {
        name: props.config.model?.llm_reasoning?.name || 'Pro/deepseek-ai/DeepSeek-R1',
        provider: props.config.model?.llm_reasoning?.provider || 'SILICONFLOW'
    },
    llm_normal: {
        name: props.config.model?.llm_normal?.name || 'Pro/deepseek-ai/DeepSeek-V3',
        provider: props.config.model?.llm_normal?.provider || 'SILICONFLOW',
        temp: props.config.model?.llm_normal?.temp || 0.2
    },
    llm_heartflow: {
        name: props.config.model?.llm_heartflow?.name || 'Qwen/Qwen2.5-32B-Instruct',
        provider: props.config.model?.llm_heartflow?.provider || 'SILICONFLOW'
    }
});

// 监听配置变化
watch(localConfig, () => {
    emit('update:config', {
        ...props.config,
        model: {
            ...props.config.model,
            llm_reasoning: { ...localConfig.llm_reasoning },
            llm_normal: { ...localConfig.llm_normal },
            llm_heartflow: { ...localConfig.llm_heartflow }
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

.setting-control {
    display: flex;
    align-items: center;
}

.slider-control {
    width: 100%;
    max-width: 16rem;
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
