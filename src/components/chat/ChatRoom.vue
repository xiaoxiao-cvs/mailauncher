<template>
    <div class="chat-room-layout animated-page flex h-full">
        <!-- 侧边栏 -->
        <ChatSidebar class="animated-sidebar h-full" @session-selected="handleSessionSelected" @new-chat="handleNewChat"
            ref="sidebarRef" />
        <!-- 主聊天区 -->
        <div class="flex-1 flex flex-col h-full bg-base-100 animated-main-chat">
            <!-- 顶部栏 -->
            <div
                class="chat-top-bar animated-header flex items-center justify-between px-6 py-3 border-b border-base-200 bg-white/80 backdrop-blur">
                <div class="font-bold text-lg flex items-center gap-2">
                    <Icon icon="mdi:chat" class="text-primary animated-icon" width="22" height="22" />
                    <span class="animated-text">{{ currentSession?.title || '新会话' }}</span>
                </div>
                <div class="flex items-center gap-2">
                    <button class="btn btn-ghost btn-sm animated-button" @click="exportCurrentSession">
                        <Icon icon="mdi:download" width="18" height="18" /> 导出
                    </button>
                </div>
            </div>
            <!-- 消息区 -->
            <div class="flex-1 overflow-y-auto px-0 md:px-8 py-6 animated-scroll-area" ref="chatBody">
                <div v-if="messages.length === 0"
                    class="flex justify-center items-center h-full text-base-content/50 animated-empty-state">
                    暂无消息记录，发送一条消息开始聊天吧
                </div>
                <div v-else class="flex flex-col gap-4 max-w-2xl mx-auto">
                    <MessageItem v-for="msg in filteredMessages" :key="msg.id" :message="msg"
                        :instanceName="currentSession?.title" @edit="handleEditMessage" @delete="handleDeleteMessage"
                        @regenerate="handleRegenerateMessage" class="animated-message" />
                </div>
            </div>
            <!-- 输入区 -->
            <div
                class="chat-input-area animated-input-area px-6 py-4 border-t border-base-200 bg-white/80 backdrop-blur">
                <div class="flex gap-2 items-end max-w-2xl mx-auto">
                    <input ref="inputRef" v-model="input" @keydown.enter.exact.prevent="sendMessage"
                        @drop.prevent="handleDrop" @dragover.prevent type="text"
                        class="input input-bordered flex-1 animated-input" placeholder="输入消息，或拖拽图片发送..."
                        :disabled="sending" />
                    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileChange" />
                    <button class="btn btn-ghost btn-circle animated-button" @click="triggerFile" :disabled="sending">
                        <Icon icon="mdi:attachment" width="22" height="22" />
                    </button>
                    <button class="btn btn-primary btn-circle animated-button" @click="sendMessage"
                        :disabled="!input.trim() || sending">
                        <Icon :icon="sending ? 'mdi:loading' : 'mdi:send'" width="22" height="22"
                            :class="sending ? 'animate-spin' : ''" />
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { Icon } from '@iconify/vue';
import ChatSidebar from './ChatSidebar.vue';
import MessageItem from './MessageItem.vue';

const sidebarRef = ref(null);
const input = ref('');
const inputRef = ref(null);
const fileInput = ref(null);
const chatBody = ref(null);
const sending = ref(false);
const currentSession = ref(null);
const messages = ref([]);
const searchQuery = ref('');

// 过滤消息（支持搜索）
const filteredMessages = computed(() => {
    if (!searchQuery.value) return messages.value;
    const q = searchQuery.value.toLowerCase();
    return messages.value.filter(m => m.content?.toLowerCase().includes(q));
});

// 侧边栏选择会话
function handleSessionSelected(session) {
    currentSession.value = session;
    messages.value = session.messages || [];
    nextTick(scrollToBottom);
}

// 新建会话
function handleNewChat(session) {
    currentSession.value = session;
    messages.value = [];
    nextTick(scrollToBottom);
}

// 发送消息
async function sendMessage() {
    if (!input.value.trim() || sending.value) return;
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
    updateSessionMessages();
    nextTick(scrollToBottom);
    // 模拟AI流式回复
    await simulateStreamingReply(content);
    sending.value = false;
    nextTick(scrollToBottom);
}

// 流式输出AI回复
async function simulateStreamingReply(userContent) {
    const reply = '这是AI的流式回复，逐字显示效果。';
    let aiMsg = {
        id: Date.now() + 1,
        content: '',
        timestamp: new Date().toISOString(),
        sender: 'bot',
        avatar: '/assets/icon.ico',
        type: 'text',
        isNew: true
    };
    messages.value.push(aiMsg);
    updateSessionMessages();
    for (let i = 0; i < reply.length; i++) {
        aiMsg.content += reply[i];
        messages.value[messages.value.length - 1] = { ...aiMsg };
        await new Promise(r => setTimeout(r, 40));
    }
    aiMsg.isNew = false;
    messages.value[messages.value.length - 1] = { ...aiMsg };
    updateSessionMessages();
}

// 编辑消息
function handleEditMessage({ messageId, newContent }) {
    const msg = messages.value.find(m => m.id === messageId);
    if (msg) {
        msg.content = newContent;
        updateSessionMessages();
    }
}
// 删除消息
function handleDeleteMessage(messageId) {
    const idx = messages.value.findIndex(m => m.id === messageId);
    if (idx > -1) {
        messages.value.splice(idx, 1);
        updateSessionMessages();
    }
}
// 重新生成
function handleRegenerateMessage(messageId) {
    const msg = messages.value.find(m => m.id === messageId);
    if (msg) {
        msg.content = '重新生成的AI回复内容（流式效果）';
        msg.isNew = true;
        updateSessionMessages();
        // 触发流式动画
        simulateStreamingReply(msg.content);
    }
}
// 导出当前会话
function exportCurrentSession() {
    if (!currentSession.value) return;
    const data = JSON.stringify(messages.value, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (currentSession.value.title || 'chat') + '.json';
    a.click();
    URL.revokeObjectURL(url);
}
// 文件相关
function triggerFile() {
    fileInput.value && fileInput.value.click();
}
function handleFileChange(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageUpload(file);
    }
    fileInput.value.value = '';
}
function handleDrop(e) {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageUpload(file);
    }
}
function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        messages.value.push({
            id: Date.now(),
            content: ev.target.result,
            timestamp: new Date().toISOString(),
            sender: 'user',
            avatar: '/assets/default.png',
            type: 'image',
        });
        updateSessionMessages();
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
// 会话消息同步到侧边栏
function updateSessionMessages() {
    if (sidebarRef.value && currentSession.value) {
        currentSession.value.messages = [...messages.value];
        sidebarRef.value.updateSession(currentSession.value.id, { messages: currentSession.value.messages, messageCount: messages.value.length, updatedAt: new Date().toISOString() });
    }
}
</script>

<style scoped>
.chat-room-layout {
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, hsl(var(--p)/0.05) 0%, hsl(var(--p)/0.1) 100%);
}

/* 侧边栏动画 */
.animated-sidebar {
    animation: slideInLeft 0.4s ease-out;
}

/* 主聊天区动画 */
.animated-main-chat {
    animation: fadeInRight 0.25s ease-out;
}

/* 顶部栏动画 */
.chat-top-bar {
    transition: all 0.15s ease;
    backdrop-filter: blur(10px);
}

.animated-icon {
    transition: all 0.15s ease;
}

.animated-icon:hover {
    transform: scale(1.1) rotate(5deg);
    color: hsl(var(--p));
}

.animated-text {
    transition: all 0.15s ease;
}

/* 滚动区域动画 */
.animated-scroll-area {
    transition: all 0.15s ease;
}

.animated-scroll-area:hover {
    background: rgba(255, 255, 255, 0.02);
}

/* 空状态动画 */
.animated-empty-state {
    animation: fadeInUp 0.25s ease-out;
    transition: all 0.15s ease;
}

.animated-empty-state:hover {
    color: hsl(var(--bc) / 0.7);
}

/* 消息项动画 */
.animated-message {
    animation: messageSlideIn 0.2s ease-out;
    transition: all 0.15s ease;
}

@keyframes messageSlideIn {
    from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* 输入区域动画 */
.animated-input-area {
    transition: all 0.15s ease;
    backdrop-filter: blur(10px);
}

.animated-input-area:hover {
    background: rgba(255, 255, 255, 0.9);
}

.animated-input {
    transition: all 0.15s ease;
    position: relative;
    overflow: hidden;
}

.animated-input:focus {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.2);
    border-color: hsl(var(--p));
}

.animated-input:focus::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
    animation: inputShimmer 2s ease-in-out infinite;
}

@keyframes inputShimmer {
    0% {
        left: -100%;
    }

    100% {
        left: 100%;
    }
}

/* 按钮动画增强 */
.animated-button {
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
}

.animated-button::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    transition: all 0.15s ease;
    transform: translate(-50%, -50%);
}

.animated-button:hover::before {
    width: 100px;
    height: 100px;
}

.animated-button:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.animated-button:active {
    transform: translateY(0) scale(0.98);
}

/* 动画关键帧 */
@keyframes slideInLeft {
    from {
        opacity: 0;
        transform: translateX(-30px);
    }

    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes fadeInRight {
    from {
        opacity: 0;
        transform: translateX(30px);
    }

    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 响应式动画优化 */
@media (prefers-reduced-motion: reduce) {

    .animated-sidebar,
    .animated-main-chat,
    .animated-empty-state,
    .animated-message {
        animation: none;
    }

    .animated-icon,
    .animated-text,
    .animated-input,
    .animated-button {
        transition: none;
    }

    .animated-button:hover {
        transform: none;
    }

    .animated-input:focus {
        transform: none;
    }
}

/* 移动端优化 */
@media (max-width: 768px) {
    .animated-button:hover {
        transform: none;
        box-shadow: none;
    }

    .animated-input:focus {
        transform: none;
    }

    .chat-top-bar,
    .animated-input-area {
        backdrop-filter: blur(5px);
    }
}
</style>
