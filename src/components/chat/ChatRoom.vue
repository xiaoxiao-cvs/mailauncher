<template>
    <div class="chat-room-container">
        <!-- 顶部区域 -->
        <div class="chat-top-bar"> <!-- 实例选择按钮(中央) -->
            <div class="instance-selector">
                <div class="dropdown dropdown-bottom">
                    <label tabindex="0" class="btn btn-ghost btn-sm normal-case flex items-center gap-2 px-4">
                        <div class="w-3 h-3 rounded-full"
                            :class="selectedInstance && selectedInstance.status === 'running' ? 'bg-success' : 'bg-warning'">
                        </div>
                        <span>{{ selectedInstance ? selectedInstance.name : '选择实例' }}</span>
                        <Icon icon="mdi:chevron-down" width="18" height="18" />
                    </label>
                    <div tabindex="0" class="dropdown-content z-[1] shadow bg-base-100 rounded-box w-64">
                        <!-- 搜索框 -->
                        <div class="p-2 border-b border-base-200">
                            <div class="relative">
                                <input v-model="instanceSearchQuery" type="text"
                                    class="input input-sm input-bordered w-full pl-8" placeholder="搜索实例..."
                                    @click.stop />
                                <Icon icon="mdi:magnify" class="absolute left-2 top-1/2 transform -translate-y-1/2"
                                    width="18" height="18" />
                            </div>
                        </div>
                        <!-- 实例列表 -->
                        <ul class="menu p-2 max-h-60 overflow-y-auto">
                            <li v-for="instance in filteredInstances" :key="instance.id">
                                <a @click="selectedInstance = instance"
                                    :class="{ 'active': selectedInstance && selectedInstance.id === instance.id }">
                                    <div class="flex items-center gap-2 w-full">
                                        <div class="w-3 h-3 rounded-full"
                                            :class="instance.status === 'running' ? 'bg-success' : 'bg-warning'"></div>
                                        <span>{{ instance.name }}</span>
                                    </div>
                                </a>
                            </li>
                            <div v-if="filteredInstances.length === 0" class="px-4 py-2 text-sm text-base-content/70">
                                {{ instances.length === 0 ? '无可用实例' : '未找到匹配的实例' }}
                            </div>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- 右侧操作区 -->
            <div class="top-actions"> <button class="btn btn-ghost btn-sm" @click="refreshInstances"
                    :disabled="loading">
                    <Icon :icon="loading ? 'mdi:loading' : 'mdi:refresh'" :class="loading ? 'animate-spin' : ''"
                        width="20" height="20" />
                </button>
            </div>
        </div>

        <!-- 主聊天区域 -->
        <div class="chat-main-area">
            <!-- 显示加载中状态 -->
            <div v-if="loading" class="chat-placeholder">
                <div class="placeholder-content">
                    <span class="loading loading-dots loading-lg text-primary"></span>
                    <p class="mt-4 text-base-content/70">正在加载实例列表...</p>
                </div>
            </div>

            <!-- 无实例状态 -->
            <div v-else-if="instances.length === 0" class="chat-placeholder">
                <div class="placeholder-content">
                    <Icon icon="mdi:server-off" class="w-20 h-20 text-base-300" />
                    <p class="mt-4 text-base-content/70">未找到可用实例</p>
                    <button class="btn btn-primary mt-4" @click="goToInstancesPanel">
                        <Icon icon="mdi:plus" class="mr-2" width="18" height="18" />创建实例
                    </button>
                </div>
            </div>

            <!-- 未选择实例状态 -->
            <div v-else-if="!selectedInstance" class="chat-placeholder">
                <div class="placeholder-content">
                    <Icon icon="mdi:chat-outline" class="w-20 h-20 text-base-300" />
                    <p class="mt-4 text-base-content/70">请从顶部选择一个实例进行聊天</p>
                </div>
            </div>

            <!-- 聊天界面 -->
            <div v-else class="chat-interface">
                <!-- 聊天消息区 -->
                <div ref="chatBody" class="chat-messages-container">
                    <div v-if="chatLoading" class="flex justify-center items-center h-full">
                        <span class="loading loading-dots loading-md text-primary"></span>
                    </div>

                    <template v-else>
                        <!-- 每条消息 -->
                        <div v-for="msg in messages" :key="msg.id" class="message-wrapper"
                            :class="{ 'user-message': msg.sender === 'user' }">
                            <div class="message-header">
                                <span class="sender-name">{{ msg.sender === 'user' ? '你' : selectedInstance.name
                                }}</span>
                            </div>
                            <div class="message-content" :class="{ 'user-content': msg.sender === 'user' }">
                                <div v-if="msg.type === 'image'" class="image-message">
                                    <img :src="msg.content" class="max-w-full rounded-md" />
                                </div>
                                <div v-else>{{ msg.content }}</div>
                            </div>
                            <div class="message-footer text-xs opacity-60">
                                {{ formatTime(msg.timestamp) }}
                            </div>
                        </div>

                        <div v-if="messages.length === 0"
                            class="flex justify-center items-center h-full text-base-content/50">
                            暂无消息记录，发送一条消息开始聊天吧
                        </div>
                    </template>
                </div> <!-- 聊天输入区 -->
                <div class="chat-input-area">
                    <div class="input-container">
                        <div class="input-wrapper">
                            <input ref="inputRef" v-model="input" @keydown.enter.exact.prevent="sendMessage"
                                @drop.prevent="handleDrop" @dragover.prevent type="text"
                                class="input input-bordered w-full" placeholder="输入消息按 Enter 发送..."
                                :disabled="!selectedInstance || selectedInstance.status !== 'running' || sending" />

                            <div class="input-actions">
                                <input ref="fileInput" type="file" accept="image/*" class="hidden"
                                    @change="handleFileChange" />
                                <button class="action-button" @click="triggerFile"
                                    :disabled="!selectedInstance || selectedInstance.status !== 'running' || sending">
                                    <Icon icon="mdi:image-outline" width="20" height="20" />
                                </button>
                                <button class="action-button" @click="sendMessage"
                                    :disabled="!selectedInstance || selectedInstance.status !== 'running' || !input.trim() || sending">
                                    <Icon :icon="sending ? 'mdi:loading' : 'mdi:send'"
                                        :class="sending ? 'animate-spin' : ''" width="20" height="20" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, inject, watch, nextTick, computed } from 'vue';
import { Icon } from '@iconify/vue';
import { instancesApi, chatApi } from '@/services/api';

const instances = ref([]);
const selectedInstance = ref(null);
const loading = ref(true);
const chatLoading = ref(false);
const messages = ref([]);
const input = ref('');
const sending = ref(false);
const chatBody = ref(null);
const inputRef = ref(null);
const fileInput = ref(null);
const instanceSearchQuery = ref('');

// 注入事件总线
const emitter = inject('emitter', null);
// 注入toast服务
const toastService = inject('toast', null);
// 注入是否使用模拟数据
const useMockData = inject('useMockData', ref(false));

// 组件挂载时加载实例列表
onMounted(() => {
    loadInstances();
});

// 计算过滤后的实例列表
const filteredInstances = computed(() => {
    if (!instanceSearchQuery.value) return instances.value;

    const query = instanceSearchQuery.value.toLowerCase();
    return instances.value.filter(instance =>
        instance.name.toLowerCase().includes(query) ||
        (instance.description && instance.description.toLowerCase().includes(query))
    );
});

// 监听实例变化，加载聊天历史
watch(() => selectedInstance.value, async (newInstance) => {
    if (newInstance) {
        await loadChatHistory();
        nextTick(() => {
            // 聊天框自动获取焦点
            inputRef.value?.focus();
            // 滚动到底部
            scrollToBottom();
        });
    } else {
        // 清空消息
        messages.value = [];
    }
});

// 加载实例列表
async function loadInstances() {
    loading.value = true; try {
        // 根据是否使用模拟数据选择API调用
        const response = useMockData.value
            ? await instancesApi.getMockInstances()
            : await instancesApi.getInstances();

        // 正确处理apiService返回的响应结构
        const responseData = response.data || response;

        if (responseData?.success && responseData.instances) {
            instances.value = responseData.instances;
        } else {
            throw new Error('加载实例失败');
        }
    } catch (error) {
        console.error('加载实例列表失败:', error);
        if (toastService) {
            toastService.error('加载实例列表失败');
        }
        instances.value = [];
    } finally {
        loading.value = false;
    }
}

// 重新加载实例列表
function refreshInstances() {
    loadInstances();
}

// 加载聊天历史
async function loadChatHistory() {
    if (!selectedInstance.value) return;

    chatLoading.value = true;
    messages.value = []; try {
        // 根据是否使用模拟数据选择API
        const response = useMockData.value
            ? await chatApi.getMockChatHistory()
            : await chatApi.getChatHistory(selectedInstance.value.id);

        // 正确处理apiService返回的响应结构
        const responseData = response.data || response;

        if (responseData?.success && responseData.messages) {
            messages.value = responseData.messages;
        }
    } catch (error) {
        console.error('加载聊天历史失败:', error);
        if (toastService) {
            toastService.error('加载聊天历史失败');
        }
    } finally {
        chatLoading.value = false;
        nextTick(scrollToBottom);
    }
}

// 发送消息
async function sendMessage() {
    if (!input.value.trim() || !selectedInstance.value || sending.value) return;

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
    nextTick(scrollToBottom); try {
        // 发送消息到API
        const response = useMockData.value
            ? await chatApi.sendMockMessage({ content, instanceId: selectedInstance.value.id })
            : await chatApi.sendMessage(selectedInstance.value.id, { content });

        // 正确处理apiService返回的响应结构
        const responseData = response.data || response;

        if (responseData?.success && responseData.message) {
            // 添加机器人回复
            messages.value.push({
                ...responseData.message,
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
    if (!selectedInstance.value || selectedInstance.value.status !== 'running') return;
    fileInput.value && fileInput.value.click();
}

// 处理文件变化
function handleFileChange(e) {
    if (!selectedInstance.value || selectedInstance.value.status !== 'running') return;

    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageUpload(file);
    }
    fileInput.value.value = '';
}

// 处理拖拽
function handleDrop(e) {
    if (!selectedInstance.value || selectedInstance.value.status !== 'running') return;

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

// 跳转到实例管理面板
function goToInstancesPanel() {
    if (emitter) {
        emitter.emit('navigate-to-tab', 'instances');
    } else {
        window.dispatchEvent(new CustomEvent('force-navigate', {
            detail: { tab: 'instances' }
        }));
    }
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
</script>

<style scoped>
.chat-room-container {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-image: linear-gradient(135deg,
            hsl(var(--p) / 0.05) 0%,
            hsl(var(--p) / 0.1) 100%);
}

.chat-top-bar {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    background-color: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
}

.instance-selector {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
}

/* 自定义下拉菜单滚动条 */
.dropdown-content .menu::-webkit-scrollbar {
    width: 6px;
}

.dropdown-content .menu::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 3px;
}

.dropdown-content .menu::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
}

.dropdown-content .menu::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
}

.top-actions {
    position: absolute;
    right: 20px;
}

.chat-main-area {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.chat-placeholder {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
}

.placeholder-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.chat-interface {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.chat-messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
}

.message-wrapper {
    max-width: 85%;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.user-message {
    align-self: flex-end;
}

.message-header {
    padding-left: 0.75rem;
    font-weight: 600;
    color: rgba(var(--text-base), 0.8);
    font-size: 0.9rem;
    margin-bottom: 0.2rem;
}

.message-content {
    padding: 1rem 1.25rem;
    border-radius: 1rem;
    background-color: rgba(var(--card), 0.7);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    font-size: 0.95rem;
    line-height: 1.5;
}

.user-content {
    background-color: hsl(var(--p) / 0.9);
    color: white;
}

.message-footer {
    padding-left: 0.5rem;
    font-size: 0.75rem;
    margin-top: 0.25rem;
}

.chat-input-area {
    padding: 1rem 2rem 1.5rem;
    background-color: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.input-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
}

.input-wrapper {
    position: relative;
    width: 100%;
    max-width: 700px;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.input-wrapper .input {
    background-color: transparent;
    border: none;
    height: 48px;
    padding-right: 90px;
    padding-left: 1.25rem;
    font-size: 0.95rem;
}

.input-wrapper .input:focus {
    box-shadow: none;
    outline: none;
    border-color: hsl(var(--p));
}

.input-actions {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    gap: 8px;
    padding-right: 6px;
}

.action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: transparent;
    color: rgba(0, 0, 0, 0.5);
    cursor: pointer;
    transition: all 0.2s ease;
}

.action-button:hover:not(:disabled) {
    background-color: rgba(0, 0, 0, 0.05);
    color: hsl(var(--p));
}

.action-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.image-message img {
    max-height: 300px;
    object-fit: contain;
}
</style>
