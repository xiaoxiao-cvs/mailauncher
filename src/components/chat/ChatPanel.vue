<template>
    <div class="chat-panel rounded-2xl bg-base-100 shadow-lg flex flex-col h-full">
        <!-- 聊天头部 -->
        <div class="chat-header flex items-center px-4 py-3 border-b border-base-200">
            <Icon icon="mdi:chat" class="text-primary mr-2" width="22" height="22" />
            <span class="font-bold text-lg">{{ instance ? instance.name : '聊天室' }}</span>
            <div class="ml-auto flex items-center gap-2">
                <div v-if="instance" class="badge"
                    :class="instance.status === 'running' ? 'badge-success' : 'badge-warning'">
                    {{ instance.status === 'running' ? '运行中' : '已停止' }}
                </div>
            </div>
        </div>

        <!-- 聊天内容区 -->
        <div ref="chatBody" class="chat-body flex-1 overflow-y-auto px-4 py-3 space-y-3">
            <div v-if="loading" class="flex justify-center items-center h-full">
                <span class="loading loading-dots loading-md text-primary"></span>
            </div>

            <template v-else>
                <div v-for="msg in messages" :key="msg.id"
                    :class="['chat-message', msg.sender === 'user' ? 'self' : '']">
                    <div class="flex items-end gap-2" :class="msg.sender === 'user' ? 'justify-end' : 'justify-start'">
                        <img v-if="msg.avatar && msg.sender !== 'user'" :src="msg.avatar"
                            class="w-8 h-8 rounded-full shadow" />
                        <div class="bubble px-4 py-2 rounded-xl"
                            :class="msg.sender === 'user' ? 'bg-primary text-white' : 'bg-base-200 text-base-content'">
                            <div v-if="msg.type === 'image'">
                                <img :src="msg.content" class="max-w-[180px] max-h-[180px] rounded-lg" />
                            </div>
                            <div v-else>{{ msg.content }}</div>
                            <div class="text-xs opacity-70 mt-1 text-right">
                                {{ formatTime(msg.timestamp) }}
                            </div>
                        </div>
                        <img v-if="msg.avatar && msg.sender === 'user'" :src="msg.avatar"
                            class="w-8 h-8 rounded-full shadow" />
                    </div>
                </div>

                <div v-if="messages.length === 0" class="flex justify-center items-center h-full text-base-content/50">
                    暂无消息记录，发送一条消息开始聊天吧
                </div>
            </template>
        </div>

        <!-- 聊天输入区 -->
        <div class="chat-input border-t border-base-200 px-4 py-3 bg-base-100">
            <div class="flex items-end gap-2">
                <input ref="inputRef" v-model="input" @keydown.enter.exact.prevent="sendMessage"
                    @drop.prevent="handleDrop" @dragover.prevent type="text"
                    class="input input-bordered flex-1 rounded-xl" placeholder="输入消息，或拖拽图片发送..."
                    :disabled="!instance || instance.status !== 'running' || sending" />
                <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileChange" />
                <button class="btn btn-ghost btn-circle" @click="triggerFile"
                    :disabled="!instance || instance.status !== 'running' || sending">
                    <Icon icon="mdi:attachment" width="22" height="22" />
                </button>
                <button class="btn btn-primary btn-circle" @click="sendMessage"
                    :disabled="!instance || instance.status !== 'running' || !input.trim() || sending">
                    <Icon :icon="sending ? 'mdi:loading' : 'mdi:send'" width="22" height="22"
                        :class="sending ? 'animate-spin' : ''" />
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, nextTick, onMounted, watch, inject } from 'vue';
import { Icon } from '@iconify/vue';
import { chatApi } from '@/services/api';

const props = defineProps({
    instance: {
        type: Object,
        default: null
    }
});

const messages = ref([]);
const input = ref('');
const inputRef = ref(null);
const fileInput = ref(null);
const chatBody = ref(null);
const loading = ref(false);
const sending = ref(false);

// 注入toastService
const toastService = inject('toast', null);
// 注入useMockData
const useMockData = inject('useMockData', ref(false));

// 监听实例变化，加载聊天历史
watch(() => props.instance, async (newInstance) => {
    if (newInstance) {
        await loadChatHistory();
        nextTick(() => {
            // 聊天框自动获取焦点
            inputRef.value?.focus();
        });
    } else {
        // 清空消息
        messages.value = [];
    }
}, { immediate: true });

// 加载聊天历史
async function loadChatHistory() {
    if (!props.instance) return;

    loading.value = true;
    messages.value = [];

    try {
        // 根据是否使用模拟数据选择API
        const response = useMockData.value
            ? await chatApi.getMockChatHistory()
            : await chatApi.getChatHistory(props.instance.id);

        if (response?.success && response.messages) {
            messages.value = response.messages;
        }
    } catch (error) {
        console.error('加载聊天历史失败:', error);
        if (toastService) {
            toastService.error('加载聊天历史失败');
        }
    } finally {
        loading.value = false;
        nextTick(scrollToBottom);
    }
}

// 发送消息
async function sendMessage() {
    if (!input.value.trim() || !props.instance || sending.value) return;

    const content = input.value.trim();
    input.value = '';
    sending.value = true;

    // 添加用户消息
    const userMessage = {
        id: Date.now(),
        content,
        timestamp: new Date().toISOString(),
        sender: 'user',
        avatar: '/assets/default.png',
        type: 'text',
    };

    messages.value.push(userMessage);
    nextTick(scrollToBottom);

    try {
        // 发送消息到API
        const response = useMockData.value
            ? await chatApi.sendMockMessage({ content, instanceId: props.instance.id })
            : await chatApi.sendMessage(props.instance.id, { content });

        if (response?.success && response.message) {
            // 添加机器人回复
            messages.value.push({
                ...response.message,
                avatar: '/assets/icon.ico'
            });
        } else {
            throw new Error('发送消息失败');
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        if (toastService) {
            toastService.error('发送消息失败');
        }
    } finally {
        sending.value = false;
        nextTick(scrollToBottom);
    }
}

// 触发文件选择
function triggerFile() {
    if (!props.instance || props.instance.status !== 'running') return;
    fileInput.value && fileInput.value.click();
}

// 处理文件变化
function handleFileChange(e) {
    if (!props.instance || props.instance.status !== 'running') return;

    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageUpload(file);
    }
    fileInput.value.value = '';
}

// 处理拖拽
function handleDrop(e) {
    if (!props.instance || props.instance.status !== 'running') return;

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageUpload(file);
    }
}

// 处理图片上传
function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        // 这里实现图片发送逻辑
        // 在实际项目中，应该先上传图片到服务器，然后发送图片链接
        messages.value.push({
            id: Date.now(),
            content: ev.target.result,
            timestamp: new Date().toISOString(),
            sender: 'user',
            avatar: '/assets/default.png',
            type: 'image',
        });

        // 模拟回复
        setTimeout(() => {
            messages.value.push({
                id: Date.now() + 1,
                content: '我收到了你发送的图片',
                timestamp: new Date().toISOString(),
                sender: 'bot',
                avatar: '/assets/icon.ico',
                type: 'text',
            });
            nextTick(scrollToBottom);
        }, 1000);

        nextTick(scrollToBottom);
    };
    reader.readAsDataURL(file);
}

// 滚动到底部
function scrollToBottom() {
    if (chatBody.value) {
        chatBody.value.scrollTop = chatBody.value.scrollHeight;
    }
}

// 格式化时间
function formatTime(timestamp) {
    if (!timestamp) return '';

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

// 组件挂载后自动滚动到底部
onMounted(() => {
    nextTick(scrollToBottom);
});
</script>

<style scoped>
.chat-panel {
    min-width: 320px;
    max-width: 420px;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, hsl(var(--p)/0.12) 0%, hsl(var(--p)/0.18) 100%);
    border-radius: 1.25rem;
}

.chat-header {
    border-top-left-radius: 1.25rem;
    border-top-right-radius: 1.25rem;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(8px);
}

.chat-body {
    flex: 1;
    overflow-y: auto;
    background: transparent;
    padding-bottom: 1rem;
}

.chat-message.self .bubble {
    background: linear-gradient(135deg, hsl(var(--p)) 0%, hsl(var(--s)) 100%);
    color: #fff;
}

.bubble {
    border-radius: 1.25rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    word-break: break-all;
    max-width: 70%;
}

.chat-message {
    display: flex;
    flex-direction: column;
    margin-bottom: 1rem;
}

.chat-message.self {
    align-items: flex-end;
}

.chat-input {
    border-bottom-left-radius: 1.25rem;
    border-bottom-right-radius: 1.25rem;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
}
</style>
