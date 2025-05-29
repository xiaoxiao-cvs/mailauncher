<template>
    <div class="chat-sidebar h-full bg-base-100 border-r border-base-200 flex flex-col">
        <!-- 侧边栏头部 -->
        <div class="sidebar-header p-4 border-b border-base-200">
            <button @click="createNewChat" class="btn btn-primary btn-sm w-full">
                <Icon icon="mdi:plus" width="16" height="16" />
                新建会话
            </button>
        </div>

        <!-- 会话列表 -->
        <div class="chat-sessions flex-1 overflow-y-auto p-2">
            <div class="space-y-1">
                <div v-for="session in chatSessions" :key="session.id" @click="selectSession(session)"
                    class="session-item p-3 rounded-lg cursor-pointer transition-colors hover:bg-base-200"
                    :class="{ 'bg-primary text-primary-content': session.id === currentSessionId }">
                    <div class="flex items-center justify-between">
                        <div class="flex-1 min-w-0">
                            <div class="font-medium text-sm truncate">
                                {{ session.title || '新会话' }}
                            </div>
                            <div class="text-xs opacity-70 mt-1">
                                {{ formatSessionTime(session.updatedAt) }}
                            </div>
                            <div class="text-xs opacity-60 mt-1 truncate">
                                {{ session.messageCount }} 条消息
                            </div>
                        </div>
                        <div class="dropdown dropdown-end">
                            <label tabindex="0" class="btn btn-ghost btn-xs">
                                <Icon icon="mdi:dots-vertical" width="14" height="14" />
                            </label>
                            <ul tabindex="0"
                                class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40">
                                <li><a @click="renameSession(session)">
                                        <Icon icon="mdi:pencil" width="16" height="16" />
                                        重命名
                                    </a></li>
                                <li><a @click="exportSession(session)">
                                        <Icon icon="mdi:download" width="16" height="16" />
                                        导出
                                    </a></li>
                                <li><a @click="deleteSession(session)" class="text-error">
                                        <Icon icon="mdi:delete" width="16" height="16" />
                                        删除
                                    </a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 搜索框 -->
        <div class="search-section p-3 border-t border-base-200">
            <div class="relative">
                <input v-model="searchQuery" type="text" placeholder="搜索聊天记录..."
                    class="input input-sm input-bordered w-full pl-8" />
                <Icon icon="mdi:magnify" class="absolute left-2 top-1/2 transform -translate-y-1/2" width="16"
                    height="16" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue';
import { Icon } from '@iconify/vue';

const emit = defineEmits(['session-selected', 'new-chat']);

const chatSessions = ref([]);
const currentSessionId = ref(null);
const searchQuery = ref('');

// 注入服务
const toastService = inject('toast', null);

// 计算过滤后的会话列表
const filteredSessions = computed(() => {
    if (!searchQuery.value) return chatSessions.value;
    const query = searchQuery.value.toLowerCase();
    return chatSessions.value.filter(session =>
        session.title?.toLowerCase().includes(query) ||
        (session.messages && session.messages.some(m => m.content?.toLowerCase().includes(query)))
    );
});

// 创建新会话
function createNewChat() {
    const newSession = {
        id: Date.now(),
        title: '新会话',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        systemPrompt: '',
        settings: {
            temperature: 0.7,
            maxTokens: 2048,
            topP: 0.9
        }
    };

    chatSessions.value.unshift(newSession);
    selectSession(newSession);
    emit('new-chat', newSession);
}

// 选择会话
function selectSession(session) {
    currentSessionId.value = session.id;
    emit('session-selected', session);
}

// 重命名会话
function renameSession(session) {
    const newTitle = prompt('请输入新的会话名称:', session.title);
    if (newTitle && newTitle.trim()) {
        session.title = newTitle.trim();
        saveSessionsToStorage();
        toastService?.success('会话已重命名');
    }
}

// 删除会话
function deleteSession(session) {
    if (confirm('确定要删除这个会话吗？')) {
        const index = chatSessions.value.findIndex(s => s.id === session.id);
        if (index > -1) {
            chatSessions.value.splice(index, 1);
            saveSessionsToStorage();

            // 如果删除的是当前会话，选择第一个会话
            if (currentSessionId.value === session.id) {
                if (chatSessions.value.length > 0) {
                    selectSession(chatSessions.value[0]);
                } else {
                    createNewChat();
                }
            }

            toastService?.success('会话已删除');
        }
    }
}

// 导出会话
function exportSession(session) {
    if (!session) return;
    const data = JSON.stringify(session.messages || [], null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (session.title || 'chat') + '.json';
    a.click();
    URL.revokeObjectURL(url);
    toastService?.success('会话已导出');
}

// 格式化会话时间
function formatSessionTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return '刚刚';
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    return date.toLocaleDateString('zh-CN');
}

// 保存会话到本地存储
function saveSessionsToStorage() {
    localStorage.setItem('mai-chat-sessions', JSON.stringify(chatSessions.value));
}

// 从本地存储加载会话
function loadSessionsFromStorage() {
    const saved = localStorage.getItem('mai-chat-sessions');
    if (saved) {
        try {
            chatSessions.value = JSON.parse(saved);
        } catch (error) {
            console.error('加载会话失败:', error);
        }
    }

    // 如果没有会话，创建一个默认会话
    if (chatSessions.value.length === 0) {
        createNewChat();
    } else {
        selectSession(chatSessions.value[0]);
    }
}

// 更新会话信息
function updateSession(sessionId, updates) {
    const session = chatSessions.value.find(s => s.id === sessionId);
    if (session) {
        Object.assign(session, updates);
        session.updatedAt = new Date().toISOString();
        saveSessionsToStorage();
    }
}

// 暴露方法给父组件
defineExpose({
    updateSession,
    getCurrentSession: () => chatSessions.value.find(s => s.id === currentSessionId.value)
});

// 组件挂载时加载会话
onMounted(() => {
    loadSessionsFromStorage();
});
</script>

<style scoped>
.chat-sidebar {
    width: 280px;
    min-width: 280px;
}

.session-item {
    border: 1px solid transparent;
}

.session-item:hover {
    border-color: rgba(0, 0, 0, 0.1);
}

.session-item.active {
    background-color: hsl(var(--p));
    color: hsl(var(--pc));
}

/* 自定义滚动条 */
.chat-sessions::-webkit-scrollbar {
    width: 6px;
}

.chat-sessions::-webkit-scrollbar-track {
    background: transparent;
}

.chat-sessions::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
}

.chat-sessions::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.2);
}
</style>
