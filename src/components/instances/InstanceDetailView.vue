<template>
    <div class="instance-detail-container animate-slide-in">
        <!-- 顶部应用标题栏 -->
        <div class="app-header shadow-sm">
            <div class="flex items-center">
                <span class="text-primary font-bold">MaiBot</span>
                <span class="mx-2 text-gray-300">|</span>
                <span class="status-text">{{ isRunning ? '运行中' : '未运行' }}</span>
                <span class="mx-2 text-gray-300">|</span>
                <span class="terminal-connection-status" :class="{
                    'text-green-500': isTerminalConnected,
                    'text-yellow-500': isTerminalConnecting,
                    'text-red-500': !isTerminalConnected && !isTerminalConnecting
                }">
                    {{ isTerminalConnecting ? '连接中...' : (isTerminalConnected ? '已连接' : '未连接') }}
                </span>
            </div>
            <button class="btn btn-xs btn-ghost" @click="restartTerminal" title="重启终端">
                <Icon icon="mdi:refresh" class="mr-1" width="14" height="14" />
                重启终端
            </button>
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
                    <!-- 空终端提示 -->
                    <div v-if="terminalLines.length === 0"
                        class="terminal-empty flex flex-col items-center justify-center h-full">
                        <Icon icon="mdi:console" width="48" height="48" class="opacity-20 mb-4" />
                        <p class="opacity-50">
                            {{ isTerminalConnecting ? '正在连接终端...' :
                                isTerminalConnected ? '终端已就绪，等待输出' :
                                    '终端未连接，请检查实例状态' }}
                        </p>
                    </div>

                    <!-- 终端输出行 -->
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
                        placeholder="输入命令..." :disabled="!isTerminalConnected" class="terminal-input-field" />
                    <button @click="sendCommand" class="btn btn-xs btn-primary ml-2"
                        :disabled="!isTerminalConnected || !commandInput.trim()">
                        <Icon icon="mdi:send" />
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick, inject } from 'vue';
import { Icon } from '@iconify/vue';
import toastService from '@/services/toastService';
import { getInstanceLogWebSocketService, closeInstanceLogWebSocket } from '@/services/websocket';
import { isMockModeActive } from '@/services/apiService';

const props = defineProps({
    instance: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['back']);
const emitter = inject('emitter', null);

// 实例运行状态
const isRunning = computed(() => props.instance.status === 'running');

// 终端相关状态
const terminalContent = ref(null);
const commandInputRef = ref(null);
const commandInput = ref('');
const terminalLines = ref([]);
const isTerminalConnected = ref(false);
const isTerminalConnecting = ref(false);

// WebSocket 实例日志实例
let instanceLogWS = null;

// 添加终端输出行
const addTerminalLine = (text, type = 'info') => {
    terminalLines.value.push({
        timestamp: getCurrentTimestamp(),
        text: text,
        type: type
    });
    scrollToBottom();
};

// 初始化实例日志WebSocket连接
const initTerminalWebSocket = () => {
    if (!props.instance?.id) {
        console.warn('实例ID缺失，无法建立WebSocket连接');
        addTerminalLine('错误: 无法建立终端连接 - 实例ID缺失', 'error');
        return;
    }

    // 检查是否为模拟模式
    const useMockMode = isMockModeActive();
    if (useMockMode) {
        console.log('使用模拟模式，生成模拟终端数据');
        addTerminalLine('=== 模拟终端模式 ===', 'warning');
        addTerminalLine('Starting MaiBot v0.6.3...', 'info');
        addTerminalLine('Loading configuration...', 'info');
        addTerminalLine('NapCat adapter initialized', 'success');
        addTerminalLine('Ready to receive commands', 'success');
        isTerminalConnected.value = true;
        return;
    }

    // 使用实例ID而不是session_id
    const instanceId = props.instance.id;

    console.log(`初始化实例日志WebSocket连接，实例ID: ${instanceId}`);
    isTerminalConnecting.value = true;

    try {
        // 使用新的实例日志WebSocket服务
        instanceLogWS = getInstanceLogWebSocketService(instanceId);

        // 连接打开事件
        instanceLogWS.on('open', () => {
            console.log('实例日志WebSocket连接已建立');
            isTerminalConnected.value = true;
            isTerminalConnecting.value = false;
            addTerminalLine('实例日志连接已建立', 'success');
        });

        // 接收消息事件
        instanceLogWS.on('message', (data) => {
            console.log('收到实例日志消息:', data);

            if (data.isMock) {
                // 处理模拟数据
                addTerminalLine(data.message || '模拟日志输出', 'info');
                return;
            }

            // 处理真实WebSocket消息（日志格式）
            if (data.time && data.level && data.message) {
                // 日志消息格式
                const levelColor = {
                    'INFO': 'info',
                    'WARNING': 'warning', 
                    'ERROR': 'error',
                    'DEBUG': 'info'
                }[data.level] || 'info';
                
                addTerminalLine(`[${data.level}] ${data.message}`, levelColor);
            } else if (data.type === 'output') {
                // 终端输出格式
                addTerminalLine(data.data || data.message, 'info');
            } else if (data.type === 'status') {
                // 状态消息
                addTerminalLine(data.message, 'warning');
            } else if (data.type === 'error') {
                // 错误消息
                addTerminalLine(data.message || '实例日志错误', 'error');
            } else {
                // 其他格式的消息
                addTerminalLine(data.message || JSON.stringify(data), 'info');
            }
        });

        // 连接关闭事件
        instanceLogWS.on('close', (event) => {
            console.log('实例日志WebSocket连接已关闭:', event);
            isTerminalConnected.value = false;
            isTerminalConnecting.value = false;

            if (!event.isMock) {
                addTerminalLine('实例日志连接已断开', 'warning');
            }
        });

        // 连接错误事件
        instanceLogWS.on('error', (error) => {
            console.error('实例日志WebSocket连接错误:', error);
            isTerminalConnected.value = false;
            isTerminalConnecting.value = false;
            addTerminalLine('实例日志连接出错，回退到模拟模式', 'error');

            // 回退到模拟模式
            setTimeout(() => {
                addTerminalLine('=== 回退到模拟模式 ===', 'warning');
                addTerminalLine('Starting MaiBot v0.6.3...', 'info');
                addTerminalLine('Ready to receive commands', 'success');
                isTerminalConnected.value = true;
            }, 1000);
        });

        // 建立连接
        instanceLogWS.connect();

    } catch (error) {
        console.error('创建实例日志WebSocket连接失败:', error);
        isTerminalConnecting.value = false;
        addTerminalLine('实例日志连接失败，使用模拟模式', 'error');

        // 回退到模拟模式
        setTimeout(() => {
            addTerminalLine('=== 回退到模拟模式 ===', 'warning');
            addTerminalLine('Starting MaiBot v0.6.3...', 'info');
            addTerminalLine('Ready to receive commands', 'success');
            isTerminalConnected.value = true;
        }, 1000);
    }
};

// 关闭实例日志WebSocket连接
const closeTerminalConnection = () => {
    if (props.instance?.id) {
        const instanceId = props.instance.id;
        closeInstanceLogWebSocket(instanceId);
    }
    instanceLogWS = null;
    isTerminalConnected.value = false;
    isTerminalConnecting.value = false;
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

// 发送命令
const sendCommand = () => {
    if (!commandInput.value || !isTerminalConnected.value) return;

    const command = commandInput.value;

    // 添加命令到终端显示
    addTerminalLine(`$ ${command}`, 'command');

    // 检查是否为模拟模式
    const useMockMode = isMockModeActive();

    if (useMockMode || !terminalWS) {
        // 模拟模式处理
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
                    response = `[模拟] 执行命令: ${command}`;
                    type = 'info';
            }

            addTerminalLine(response, type);
        }, 300);    } else {
        // 真实WebSocket模式，但实例日志WebSocket主要用于接收日志，不支持发送命令
        // 这里我们显示一个提示信息
        addTerminalLine(`> ${command}`, 'command');
        addTerminalLine('注意: 当前为实例日志查看模式，不支持命令执行', 'warning');
    }

    commandInput.value = '';
};

// 重启终端
const restartTerminal = () => {
    addTerminalLine('正在重启终端连接...', 'info');

    // 关闭现有连接
    closeTerminalConnection();

    // 清空终端内容
    terminalLines.value = [];

    // 重新初始化连接
    setTimeout(() => {
        initTerminalWebSocket();
    }, 1000);
};

// 打开模块
const openModule = (moduleName) => {
    console.log('打开模块:', moduleName);

    // 根据不同模块进行处理
    if (moduleName === 'bot') {
        // 发送打开Bot配置的事件，带上实例信息、tab标识和来源标识
        if (emitter) {
            emitter.emit('open-bot-config', props.instance);
        }
    } else {
        // 其他模块的处理
        switch (moduleName) {
            case 'file':
                console.log('打开文件管理');
                // 显示文件管理功能开发中的提示
                toastService.info('文件管理功能开发中');
                break;
            case 'tasks':
                console.log('打开自动任务');
                // 显示自动任务功能开发中的提示
                toastService.info('自动任务功能开发中');
                break;
            case 'adapter':
                console.log('打开适配器配置');
                // 使用事件总线打开实例设置并指定适配器配置标签页
                if (emitter) {
                    emitter.emit('open-instance-settings', {
                        name: props.instance.name,
                        path: props.instance.path || '',
                        tab: 'adapter', // 指定打开适配器配置标签页
                        fromDetailView: true // 标记是从详情页面打开的
                    });
                } else {
                    toastService.error('无法打开适配器配置');
                }
                break;
        }
    }
};

// 监听终端行变化，自动滚动
watch(() => terminalLines.value.length, () => {
    scrollToBottom();
});

// 组件挂载后的初始化
onMounted(() => {
    console.log('InstanceDetailView 组件已挂载，实例:', props.instance);
    scrollToBottom();    // 初始化实例日志连接
    initTerminalWebSocket();
});

// 组件卸载时清理
onUnmounted(() => {
    console.log('InstanceDetailView 组件即将卸载，清理WebSocket连接');
    closeTerminalConnection();
});

// 监听实例变化，重新初始化终端
watch(() => props.instance, (newInstance, oldInstance) => {
    if (newInstance?.id !== oldInstance?.id) {
        console.log('实例变化，重新初始化实例日志连接');
        closeTerminalConnection();
        terminalLines.value = [];

        setTimeout(() => {
            initTerminalWebSocket();
        }, 500);
    }
}, { deep: true });
</script>

<style scoped lang="postcss">
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

.terminal-connection-status {
    @apply text-xs font-medium;
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
    @apply flex-1 p-4 overflow-y-auto font-mono text-sm bg-gray-900 text-gray-100;
    min-height: 300px;
}

.terminal-empty {
    @apply text-gray-400;
}

.terminal-line {
    @apply mb-1 leading-relaxed;
}

.terminal-timestamp {
    @apply text-gray-500 mr-2;
}

.terminal-input-area {
    @apply p-3 border-t border-gray-200 flex items-center gap-2 bg-gray-100;
}

.terminal-prompt {
    @apply text-primary font-bold;
}

.terminal-input-field {
    @apply bg-white border border-gray-300 rounded px-2 py-1 outline-none flex-1 text-sm;
}

.terminal-input-field:disabled {
    @apply bg-gray-200 text-gray-500 cursor-not-allowed;
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
