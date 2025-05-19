<template>
    <div class="settings-tab-content">
        <div class="card bg-base-100 shadow">
            <div class="card-body">
                <h3 class="settings-section-title">聊天模式与回复设置</h3>

                <div class="setting-item">
                    <span class="setting-label">允许专注聊天状态</span>
                    <div class="setting-control">
                        <el-switch v-model="localConfig.chat.allow_focus_mode" />
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">普通聊天群数上限</span>
                    <div class="setting-control">
                        <el-input-number v-model="localConfig.chat.base_normal_chat_num" :min="1" :max="20" />
                        <span class="unit-label">个</span>
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">专注聊天群数上限</span>
                    <div class="setting-control">
                        <el-input-number v-model="localConfig.chat.base_focused_chat_num" :min="1" :max="10" />
                        <span class="unit-label">个</span>
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">观察上下文大小</span>
                    <div class="setting-control">
                        <el-input-number v-model="localConfig.chat.observation_context_size" :min="5" :max="50" />
                        <span class="unit-label">条消息</span>
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">启用消息缓冲器</span>
                    <div class="setting-control">
                        <el-switch v-model="localConfig.chat.message_buffer" />
                    </div>
                </div>
                <div class="setting-description">
                    <el-alert type="info" :closable="false">
                        <p>启用消息缓冲器可以解决消息拆分问题，但会使回复延迟</p>
                        <p>观察上下文建议值为15，太短太长都会导致脑袋尖尖</p>
                    </el-alert>
                </div>

                <div class="card-header">
                    <span>普通聊天参数</span>
                </div>
                <div class="setting-item">
                    <span class="setting-label">推理模型概率</span>
                    <div class="setting-control slider-control">
                        <el-slider v-model="localConfig.normal_chat.model_reasoning_probability" :min="0" :max="1"
                            :step="0.01" :format-tooltip="value => (value * 100).toFixed(0) + '%'" show-input />
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">常规模型概率</span>
                    <div class="setting-control slider-control">
                        <el-slider v-model="localConfig.normal_chat.model_normal_probability" :min="0" :max="1"
                            :step="0.01" :format-tooltip="value => (value * 100).toFixed(0) + '%'" show-input />
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">表情包使用概率</span>
                    <div class="setting-control slider-control">
                        <el-slider v-model="localConfig.normal_chat.emoji_chance" :min="0" :max="1" :step="0.01"
                            :format-tooltip="value => (value * 100).toFixed(0) + '%'" show-input />
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">最长思考时间</span>
                    <div class="setting-control">
                        <el-input-number v-model="localConfig.normal_chat.thinking_timeout" :min="30" :max="300"
                            :step="10" />
                        <span class="unit-label">秒</span>
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">回复意愿模式</span>
                    <div class="setting-control">
                        <el-select v-model="localConfig.normal_chat.willing_mode" style="width: 100%">
                            <el-option label="经典模式" value="classical" />
                            <el-option label="动态模式" value="dynamic" />
                            <el-option label="MXP模式" value="mxp" />
                            <el-option label="自定义模式" value="custom" />
                        </el-select>
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">@必然回复</span>
                    <div class="setting-control">
                        <el-switch v-model="localConfig.normal_chat.at_bot_inevitable_reply" />
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">提及必然回复</span>
                    <div class="setting-control">
                        <el-switch v-model="localConfig.normal_chat.mentioned_bot_inevitable_reply" />
                    </div>
                </div>

                <div class="card-header">
                    <span>专注聊天参数</span>
                </div>
                <div class="setting-item">
                    <span class="setting-label">专注聊天触发阈值</span>
                    <div class="setting-control slider-control">
                        <el-slider v-model="localConfig.focus_chat.reply_trigger_threshold" :min="1" :max="10"
                            :step="0.1" show-input />
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">默认衰减率</span>
                    <div class="setting-control slider-control">
                        <el-slider v-model="localConfig.focus_chat.default_decay_rate_per_second" :min="0.5" :max="0.99"
                            :step="0.01" :format-tooltip="value => value.toFixed(2)" show-input />
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">连续不回复阈值</span>
                    <div class="setting-control">
                        <el-input-number v-model="localConfig.focus_chat.consecutive_no_reply_threshold" :min="1"
                            :max="10" :step="1" />
                        <span class="unit-label">次</span>
                    </div>
                </div>
                <div class="setting-description">
                    <el-alert type="info" :closable="false">
                        <p>专注触发阈值越低越容易进入专注聊天，衰减率越大衰减越快，越难进入专注聊天</p>
                        <p>连续不回复阈值越低越容易结束专注聊天</p>
                    </el-alert>
                </div>

                <div class="card-header">
                    <span>回复处理设置</span>
                </div>
                <div class="setting-item">
                    <span class="setting-label">启用回复分割器</span>
                    <div class="setting-control">
                        <el-switch v-model="localConfig.response_splitter.enable_response_splitter" />
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">回复最大长度</span>
                    <div class="setting-control">
                        <el-input-number v-model="localConfig.response_splitter.response_max_length" :min="64"
                            :max="1024" :step="32" />
                        <span class="unit-label">字符</span>
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">回复最大句子数</span>
                    <div class="setting-control">
                        <el-input-number v-model="localConfig.response_splitter.response_max_sentence_num" :min="1"
                            :max="10" :step="1" />
                        <span class="unit-label">句</span>
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">启用颜文字保护</span>
                    <div class="setting-control">
                        <el-switch v-model="localConfig.response_splitter.enable_kaomoji_protection" />
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">模型最大输出长度</span>
                    <div class="setting-control">
                        <el-input-number v-model="localConfig.response_splitter.model_max_output_length" :min="128"
                            :max="2048" :step="128" />
                        <span class="unit-label">token</span>
                    </div>
                </div>

                <div class="card-header">
                    <span>错别字生成设置</span>
                </div>
                <div class="setting-item">
                    <span class="setting-label">启用中文错别字生成</span>
                    <div class="setting-control">
                        <el-switch v-model="localConfig.chinese_typo.enable" />
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">单字替换概率</span>
                    <div class="setting-control slider-control">
                        <el-slider v-model="localConfig.chinese_typo.error_rate" :min="0" :max="0.01" :step="0.0005"
                            :format-tooltip="value => (value * 100).toFixed(2) + '%'" show-input />
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">声调错误概率</span>
                    <div class="setting-control slider-control">
                        <el-slider v-model="localConfig.chinese_typo.tone_error_rate" :min="0" :max="0.5" :step="0.01"
                            :format-tooltip="value => (value * 100).toFixed(0) + '%'" show-input />
                    </div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">整词替换概率</span>
                    <div class="setting-control slider-control">
                        <el-slider v-model="localConfig.chinese_typo.word_replace_rate" :min="0" :max="0.05"
                            :step="0.001" :format-tooltip="value => (value * 100).toFixed(1) + '%'" show-input />
                    </div>
                </div>
            </div>
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
    chat: {
        allow_focus_mode: props.config.chat?.allow_focus_mode ?? true,
        base_normal_chat_num: props.config.chat?.base_normal_chat_num || 3,
        base_focused_chat_num: props.config.chat?.base_focused_chat_num || 2,
        observation_context_size: props.config.chat?.observation_context_size || 15,
        message_buffer: props.config.chat?.message_buffer ?? true,
    },
    normal_chat: {
        model_reasoning_probability: props.config.normal_chat?.model_reasoning_probability || 0.7,
        model_normal_probability: props.config.normal_chat?.model_normal_probability || 0.3,
        emoji_chance: props.config.normal_chat?.emoji_chance || 0.2,
        thinking_timeout: props.config.normal_chat?.thinking_timeout || 100,
        willing_mode: props.config.normal_chat?.willing_mode || "classical",
        at_bot_inevitable_reply: props.config.normal_chat?.at_bot_inevitable_reply ?? false,
        mentioned_bot_inevitable_reply: props.config.normal_chat?.mentioned_bot_inevitable_reply ?? false,
    },
    focus_chat: {
        reply_trigger_threshold: props.config.focus_chat?.reply_trigger_threshold || 3.6,
        default_decay_rate_per_second: props.config.focus_chat?.default_decay_rate_per_second || 0.95,
        consecutive_no_reply_threshold: props.config.focus_chat?.consecutive_no_reply_threshold || 3,
    },
    response_splitter: {
        enable_response_splitter: props.config.response_splitter?.enable_response_splitter ?? true,
        response_max_length: props.config.response_splitter?.response_max_length || 256,
        response_max_sentence_num: props.config.response_splitter?.response_max_sentence_num || 4,
        enable_kaomoji_protection: props.config.response_splitter?.enable_kaomoji_protection ?? false,
        model_max_output_length: props.config.response_splitter?.model_max_output_length || 256,
    },
    chinese_typo: {
        enable: props.config.chinese_typo?.enable ?? true,
        error_rate: props.config.chinese_typo?.error_rate || 0.001,
        min_freq: props.config.chinese_typo?.min_freq || 9,
        tone_error_rate: props.config.chinese_typo?.tone_error_rate || 0.1,
        word_replace_rate: props.config.chinese_typo?.word_replace_rate || 0.006,
    },
});

// 监听配置变化
watch(localConfig, () => {
    emit('update:config', {
        ...props.config,
        chat: {
            ...props.config.chat,
            ...localConfig.chat
        },
        normal_chat: {
            ...localConfig.normal_chat
        },
        focus_chat: {
            ...localConfig.focus_chat
        },
        response_splitter: {
            ...localConfig.response_splitter
        },
        chinese_typo: {
            ...localConfig.chinese_typo
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

.unit-label {
    margin-left: 10px;
    color: var(--el-text-color-secondary);
}

.slider-control {
    width: 100%;
}
</style>
