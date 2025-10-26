<template>
    <div class="message-item group" :class="{ 'user-message': message.sender === 'user' }">
        <!-- 消息头部 -->
        <div class="message-header flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
                <img :src="message.avatar" class="w-6 h-6 rounded-full" />
                <span class="font-medium text-sm">
                    {{ message.sender === 'user' ? '你' : (instanceName || 'AI助手') }}
                </span>
                <span class="text-xs opacity-60">{{ formatTime(message.timestamp) }}</span>
            </div>

            <!-- 消息操作按钮 -->
            <div class="message-actions opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button v-if="!isEditing && message.sender === 'user'" @click="startEdit" class="btn btn-ghost btn-xs">
                    <Icon icon="mdi:pencil" width="14" height="14" />
                </button>

                <button v-if="message.sender === 'bot'" @click="regenerateMessage" class="btn btn-ghost btn-xs"
                    :disabled="regenerating">
                    <Icon :icon="regenerating ? 'mdi:loading' : 'mdi:refresh'"
                        :class="regenerating ? 'animate-spin' : ''" width="14" height="14" />
                </button>

                <button @click="copyMessage" class="btn btn-ghost btn-xs">
                    <Icon icon="mdi:content-copy" width="14" height="14" />
                </button>

                <button @click="deleteMessage" class="btn btn-ghost btn-xs text-error">
                    <Icon icon="mdi:delete" width="14" height="14" />
                </button>
            </div>
        </div>

        <!-- 消息内容 -->
        <div class="message-content" :class="{ 'user-content': message.sender === 'user' }">
            <!-- 编辑模式 -->
            <div v-if="isEditing" class="edit-mode">
                <textarea v-model="editContent" class="textarea textarea-bordered w-full resize-none" rows="3"
                    @keydown.ctrl.enter="saveEdit" @keydown.esc="cancelEdit"></textarea>
                <div class="flex gap-2 mt-2">
                    <button @click="saveEdit" class="btn btn-primary btn-xs">保存</button>
                    <button @click="cancelEdit" class="btn btn-ghost btn-xs">取消</button>
                </div>
            </div>

            <!-- 普通显示模式 -->
            <div v-else>
                <!-- 图片消息 -->
                <div v-if="message.type === 'image'" class="image-message">
                    <img :src="message.content" class="max-w-full max-h-80 rounded-lg cursor-pointer"
                        @click="previewImage" />
                </div>

                <!-- 文字消息 -->
                <div v-else class="text-message">
                    <!-- 支持markdown和代码高亮 -->
                    <div v-if="isMarkdown" v-html="renderedContent" class="markdown-content"></div>
                    <div v-else class="plain-text">{{ message.content }}</div>
                </div>

                <!-- 流式输出效果 -->
                <div v-if="isStreaming && message.sender === 'bot'" class="streaming-indicator">
                    <span class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </span>
                </div>
            </div>
        </div>

        <!-- 消息反馈 -->
        <div v-if="message.sender === 'bot' && !isEditing"
            class="message-feedback mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div class="flex gap-1">
                <button @click="thumbsUp" class="btn btn-ghost btn-xs" :class="{ 'text-success': feedback === 'up' }">
                    <Icon icon="mdi:thumb-up" width="14" height="14" />
                </button>
                <button @click="thumbsDown" class="btn btn-ghost btn-xs" :class="{ 'text-error': feedback === 'down' }">
                    <Icon icon="mdi:thumb-down" width="14" height="14" />
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue';
import { Icon } from '@iconify/vue';
import { marked } from 'marked';
import Prism from 'prismjs';

const props = defineProps({
    message: {
        type: Object,
        required: true
    },
    instanceName: {
        type: String,
        default: 'AI助手'
    }
});

const emit = defineEmits(['regenerate', 'edit', 'delete']);

// 响应式状态
const isEditing = ref(false);
const editContent = ref('');
const regenerating = ref(false);
const feedback = ref(null);
const isStreaming = ref(false);

// 注入服务
const toastService = inject('toast', null);

// 计算属性
const isMarkdown = computed(() => {
    // 检测是否包含markdown语法
    const content = props.message.content;
    return /[`*_#\[\]()>]/.test(content) || content.includes('```');
});

const renderedContent = computed(() => {
    if (!isMarkdown.value) return props.message.content;

    try {
        // 配置marked选项
        marked.setOptions({
            highlight: function (code, lang) {
                if (lang && Prism.languages[lang]) {
                    return Prism.highlight(code, Prism.languages[lang], lang);
                }
                return code;
            },
            breaks: true,
            gfm: true
        });

        return marked.parse(props.message.content);
    } catch (error) {
        console.error('Markdown渲染失败:', error);
        return props.message.content;
    }
});

// 开始编辑
function startEdit() {
    isEditing.value = true;
    editContent.value = props.message.content;
}

// 保存编辑
function saveEdit() {
    if (editContent.value.trim()) {
        emit('edit', {
            messageId: props.message.id,
            newContent: editContent.value.trim()
        });
        isEditing.value = false;
        toastService?.success('消息已更新');
    }
}

// 取消编辑
function cancelEdit() {
    isEditing.value = false;
    editContent.value = '';
}

// 重新生成消息
function regenerateMessage() {
    regenerating.value = true;
    emit('regenerate', props.message.id);

    // 模拟重新生成完成
    setTimeout(() => {
        regenerating.value = false;
    }, 2000);
}

// 复制消息
async function copyMessage() {
    try {
        await navigator.clipboard.writeText(props.message.content);
        toastService?.success('已复制到剪贴板');
    } catch (error) {
        console.error('复制失败:', error);
        toastService?.error('复制失败');
    }
}

// 删除消息
function deleteMessage() {
    if (confirm('确定要删除这条消息吗？')) {
        emit('delete', props.message.id);
    }
}

// 预览图片
function previewImage() {
    // 这里可以实现图片预览功能
    window.open(props.message.content, '_blank');
}

// 反馈按钮
function thumbsUp() {
    feedback.value = feedback.value === 'up' ? null : 'up';
    toastService?.success('感谢您的反馈');
}

function thumbsDown() {
    feedback.value = feedback.value === 'down' ? null : 'down';
    toastService?.info('我们会继续改进');
}

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    if (isToday) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 模拟流式输出
function simulateStreaming() {
    if (props.message.sender === 'bot' && props.message.isNew) {
        isStreaming.value = true;
        setTimeout(() => {
            isStreaming.value = false;
        }, 1000);
    }
}

// 组件挂载时检查是否需要流式效果
simulateStreaming();
</script>

<style scoped>
.message-item {
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 0.75rem;
    background-color: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;
}

.message-item:hover {
    background-color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-message {
    background-color: rgba(var(--p), 0.1);
    border-color: rgba(var(--p), 0.2);
}

.user-content {
    background-color: hsl(var(--p));
    color: hsl(var(--pc));
    padding: 0.75rem;
    border-radius: 0.5rem;
}

.message-content {
    line-height: 1.6;
}

.edit-mode .textarea {
    min-height: 80px;
}

.image-message img {
    transition: transform 0.2s ease;
}

.image-message img:hover {
    transform: scale(1.02);
}

/* Markdown样式 */
.markdown-content {
    line-height: 1.7;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3 {
    margin: 1rem 0 0.5rem;
    font-weight: 600;
}

.markdown-content p {
    margin: 0.5rem 0;
}

.markdown-content code {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
}

.markdown-content pre {
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1rem 0;
}

.markdown-content pre code {
    background: none;
    padding: 0;
}

.markdown-content blockquote {
    border-left: 4px solid hsl(var(--p));
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
    opacity: 0.8;
}

.markdown-content ul,
.markdown-content ol {
    padding-left: 2rem;
    margin: 0.5rem 0;
}

.markdown-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
}

.markdown-content th,
.markdown-content td {
    border: 1px solid rgba(0, 0, 0, 0.1);
    padding: 0.5rem;
    text-align: left;
}

.markdown-content th {
    background-color: rgba(0, 0, 0, 0.05);
    font-weight: 600;
}

/* 流式输出动画 */
.streaming-indicator {
    display: inline-flex;
    align-items: center;
    margin-left: 0.5rem;
}

.typing-dots {
    display: inline-flex;
    gap: 0.25rem;
}

.typing-dots span {
    width: 0.375rem;
    height: 0.375rem;
    background-color: hsl(var(--p));
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
    animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
    animation-delay: -0.16s;
}

@keyframes typing {

    0%,
    80%,
    100% {
        transform: scale(0.8);
        opacity: 0.5;
    }

    40% {
        transform: scale(1);
        opacity: 1;
    }
}

/* 响应式 */
@media (max-width: 768px) {
    .message-item {
        padding: 0.75rem;
        margin-bottom: 0.75rem;
    }

    .message-actions {
        opacity: 1;
        /* 在移动设备上始终显示操作按钮 */
    }
}
</style>
