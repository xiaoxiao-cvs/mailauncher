<template>
    <div class="instance-detail-container animate-slide-in">
        <!-- 顶部应用标题栏 -->
        <div class="app-header shadow-sm">
            <div class="flex items-center">
                <div class="app-logo bg-primary text-white rounded-md flex items-center justify-center w-8 h-8 mr-3">
                    <Icon icon="mdi:robot-outline" />
                </div>
                <div>
                    <h2 class="text-lg font-bold">MaiBot</h2>
                    <div class="app-status-badge" :class="{ 'bg-success': isRunning, 'bg-neutral': !isRunning }">
                        {{ isRunning ? '运行中' : '未运行' }}
                    </div>
                </div>
            </div>

            <!-- 美化后的操作按钮区域 -->
            <div class="action-buttons flex items-center gap-4">
                <button class="action-button" title="返回列表" @click="$emit('back')">
                    <Icon icon="mdi:arrow-left" />
                </button>
                <button class="action-button bg-primary text-white" title="开始运行">
                    <Icon icon="mdi:play" />
                </button>
                <button class="action-button" title="重启实例">
                    <Icon icon="mdi:refresh" />
                </button>
            </div>
        </div>

        <div class="main-content">
            <!-- 左侧信息区域 -->
            <div class="basic-info">
                <!-- 基本信息卡片 -->
                <div class="info-card">
                    <h3 class="card-title">基本信息</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">名称:</div>
                            <div class="info-value">{{ instance.name }}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">最后启动:</div>
                            <div class="info-value">2025-05-19 11:40:20</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">创建时间:</div>
                            <div class="info-value">{{ instance.createdAt || instance.installedAt }}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">状态:</div>
                            <div class="info-value">
                                <span class="font-medium"
                                    :class="{ 'text-success': isRunning, 'text-neutral': !isRunning }">
                                    {{ isRunning ? '运行中' : '未运行' }}
                                </span>
                            </div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">启动次数:</div>
                            <div class="info-value">0</div>
                        </div>
                    </div>
                </div>

                <!-- 功能模块 -->
                <div class="feature-modules">
                    <h3 class="section-title">功能组</h3>
                    <div class="modules-grid">
                        <!-- 文件管理模块 -->
                        <div class="module-card" @click="openModule('file')">
                            <div class="module-icon bg-blue-50">
                                <Icon icon="mdi:folder-outline" class="text-blue-500" />
                            </div>
                            <div class="module-name">文件管理</div>
                            <div class="module-action">
                                <Icon icon="mdi:chevron-right" />
                            </div>
                        </div>

                        <!-- 自动任务模块 -->
                        <div class="module-card" @click="openModule('tasks')">
                            <div class="module-icon bg-purple-50">
                                <Icon icon="mdi:calendar-clock" class="text-purple-500" />
                            </div>
                            <div class="module-name">自动任务</div>
                            <div class="module-action">
                                <Icon icon="mdi:chevron-right" />
                            </div>
                        </div>

                        <!-- Bot配置模块 -->
                        <div class="module-card" @click="openModule('bot')">
                            <div class="module-icon bg-amber-50">
                                <Icon icon="mdi:robot" class="text-amber-500" />
                            </div>
                            <div class="module-name">Bot配置</div>
                            <div class="module-action">
                                <Icon icon="mdi:chevron-right" />
                            </div>
                        </div>

                        <!-- 适配器配置模块 -->
                        <div class="module-card" @click="openModule('adapter')">
                            <div class="module-icon bg-cyan-50">
                                <Icon icon="mdi:connection" class="text-cyan-500" />
                            </div>
                            <div class="module-name">适配器配置</div>
                            <div class="module-action">
                                <Icon icon="mdi:chevron-right" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 右侧终端区域 -->
            <div class="terminal-container shadow-md">
                <!-- 终端标题栏 - 移除重启按钮 -->
                <div class="terminal-header">
                    <div class="flex items-center">
                        <span class="text-primary font-bold">MaiBot</span>
                        <span class="mx-2 text-gray-300">|</span>
                        <span class="status-text">{{ isRunning ? '运行中' : '未运行' }}</span>
                    </div>
                    <!-- 移除了重启按钮 -->
                </div>

                <div class="terminal-tabs">
                    <div class="tab active">
                        MaiBot v0.6.3
                    </div>
                </div>

                <div class="terminal-content" ref="terminalContent">
                    <div v-for="(line, index) in terminalLines" :key="index" class="terminal-line">
                        <span class="terminal-timestamp">{{ line.timestamp }}</span>
                        <span class="terminal-text" :class="{
                            'text-green-500': line.type === 'success',
                            'text-yellow-500': line.type === 'warning',
                            'text-red-500': line.type === 'error',
                            'font-bold': line.type === 'command'
                        }">
                            {{ line.text }}
                        </span>
                    </div>
                </div>

                <div class="terminal-input-area">
                    <div class="terminal-prompt">$</div>
                    <input type="text" ref="commandInputRef" v-model="commandInput" @keyup.enter="sendCommand"
                        placeholder="输入命令..." :disabled="!isRunning" class="terminal-input-field" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps({
    instance: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['back']);

// 实例运行状态
const isRunning = computed(() => props.instance.status === 'running');

// 终端相关状态
const terminalContent = ref(null);
const commandInputRef = ref(null);
const commandInput = ref('');
const terminalLines = ref([
    { timestamp: '10:15:23', text: 'Starting MaiBot v0.6.3...', type: 'info' },
    { timestamp: '10:15:24', text: 'Loading configuration from /etc/maibot/config.json', type: 'info' },
    { timestamp: '10:15:25', text: 'NapCat adapter initialized', type: 'success' },
    { timestamp: '10:15:26', text: 'Warning: Some plugins may require updates', type: 'warning' },
    { timestamp: '10:15:27', text: 'Connected to database', type: 'info' },
    { timestamp: '10:15:28', text: 'Ready to receive commands', type: 'success' }
]);

// 发送命令
const sendCommand = () => {
    if (!commandInput.value || !isRunning.value) return;

    const command = commandInput.value;

    // 添加命令到终端
    terminalLines.value.push({
        timestamp: getCurrentTimestamp(),
        text: `$ ${command}`,
        type: 'command'
    });

    // 根据命令生成响应
    setTimeout(() => {
        let response = '';
        let type = 'info';

        switch (command.toLowerCase()) {
            case 'help':
                response = '可用命令:\nhelp - 显示帮助\nstatus - 显示状态\nversion - 显示版本\nclear - 清除屏幕';
                break;
            case 'status':
                response = `MaiBot 运行状态: ${isRunning.value ? '正常' : '已停止'}\nCPU: 32% | 内存: 128MB`;
                break;
            case 'version':
                response = 'MaiBot v0.6.3\nNapCat v1.2.0\nNoneBot v2.0.0';
                break;
            case 'clear':
                terminalLines.value = [];
                commandInput.value = '';
                return;
            default:
                response = `未知命令: ${command}`;
                type = 'error';
        }

        terminalLines.value.push({
            timestamp: getCurrentTimestamp(),
            text: response,
            type: type
        });

        scrollToBottom();
    }, 300);

    commandInput.value = '';
};

// 重启终端
const restartTerminal = () => {
    terminalLines.value.push({
        timestamp: getCurrentTimestamp(),
        text: '正在重启 MaiBot 服务...',
        type: 'info'
    });

    setTimeout(() => {
        terminalLines.value.push({
            timestamp: getCurrentTimestamp(),
            text: 'MaiBot 服务已重启',
            type: 'success'
        });
    }, 1000);

    scrollToBottom();
};

// 打开功能模块
const openModule = (moduleName) => {
    console.log(`打开模块: ${moduleName}`);
    // 根据不同的模块名称执行不同的操作
    switch (moduleName) {
        case 'file':
            console.log('打开文件管理');
            break;
        case 'tasks':
            console.log('打开自动任务');
            break;
        case 'bot':
            console.log('打开Bot配置');
            break;
        case 'adapter':
            console.log('打开适配器配置');
            break;
    }
};

// 获取当前时间戳
const getCurrentTimestamp = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

// 滚动到终端底部
const scrollToBottom = () => {
    nextTick(() => {
        if (terminalContent.value) {
            terminalContent.value.scrollTop = terminalContent.value.scrollHeight;
        }
    });
};

// 监听终端行变化，自动滚动
watch(() => terminalLines.value.length, () => {
    scrollToBottom();
});

// 组件挂载后的初始化
onMounted(() => {
    scrollToBottom();
});
</script>

<style scoped>
/* 整体容器样式 */
.instance-detail-container {
    @apply bg-gray-50 min-h-screen flex flex-col;
    animation: slideInFromRight 0.4s ease-out forwards;
}

@keyframes slideInFromRight {
    from {
        opacity: 0;
        transform: translateX(40px);
    }

    to {
        opacity: 1;
        transform: translateX(0);
    }
}

/* 顶部应用标题栏 */
.app-header {
    @apply bg-white p-4 flex justify-between items-center mb-5;
}

.app-status-badge {
    @apply text-white text-xs rounded px-2 py-0.5 inline-block mt-1;
}

/* 美化操作按钮 */
.action-button {
    @apply w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 bg-base-200 text-base-content;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.action-button:hover {
    @apply shadow-md transform scale-105;
}

.action-button:active {
    @apply transform scale-95;
}

/* 展示按钮功能提示 */
.action-button::after {
    content: attr(title);
    position: absolute;
    bottom: -25px;
    left: 50%;
    transform: translateX(-50%) scale(0);
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    opacity: 0;
    transition: all 0.2s ease;
    pointer-events: none;
}

.action-button:hover::after {
    transform: translateX(-50%) scale(1);
    opacity: 1;
}

/* 主体内容区域 */
.main-content {
    @apply flex flex-1 gap-6 p-4;
}

/* 左侧信息区域 */
.basic-info {
    @apply w-2/5 flex flex-col gap-6;
}

/* 基本信息卡片 */
.info-card {
    @apply bg-white rounded-lg shadow-sm p-6;
}

.card-title {
    @apply text-lg font-medium mb-4 pb-2 border-b;
}

.info-grid {
    @apply grid grid-cols-2 gap-4;
}

.info-item {
    @apply flex gap-2;
}

.info-label {
    @apply text-gray-500;
}

.info-value {
    @apply font-medium;
}

/* 功能模块区域 */
.feature-modules {
    @apply bg-white rounded-lg shadow-sm p-6;
}

.section-title {
    @apply text-lg font-medium mb-4 pb-2 border-b;
}

.modules-grid {
    @apply grid grid-cols-2 gap-4;
}

.module-card {
    @apply bg-gray-50 rounded-md p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors;
}

.module-icon {
    @apply w-10 h-10 rounded-md flex items-center justify-center;
}

.module-name {
    @apply flex-1 font-medium;
}

.module-action {
    @apply text-gray-400;
}

/* 右侧终端区域 */
.terminal-container {
    @apply w-3/5 bg-white rounded-lg flex flex-col overflow-hidden;
    height: calc(100vh - 15rem);
}

.terminal-header {
    @apply bg-gray-100 px-4 py-3 flex justify-between items-center;
}

.terminal-tabs {
    @apply bg-gray-50 px-2 pt-1 border-b border-gray-200;
}

.tab {
    @apply px-4 py-2 text-sm inline-block;
}

.tab.active {
    @apply bg-white border-t border-l border-r border-gray-200 rounded-t-md relative -mb-px;
}

.terminal-content {
    @apply flex-1 p-4 overflow-y-auto font-mono text-sm bg-white;
    min-height: 300px;
}

.terminal-line {
    @apply mb-2;
}

.terminal-timestamp {
    @apply text-gray-400 mr-2;
}

.terminal-input-area {
    @apply p-3 border-t border-gray-200 flex items-center gap-2 bg-gray-50;
}

.terminal-prompt {
    @apply text-primary font-bold;
}

.terminal-input-field {
    @apply bg-transparent border-none outline-none flex-1;
}

/* 确保响应式布局 */
@media (max-width: 1200px) {
    .main-content {
        @apply flex-col;
    }

    .basic-info,
    .terminal-container {
        @apply w-full;
    }

    .terminal-container {
        height: 500px;
    }
}
</style>
