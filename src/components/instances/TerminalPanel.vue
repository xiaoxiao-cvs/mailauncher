<template>
    <div class="terminal-panel card bg-base-100 shadow-lg h-full">
        <div class="card-body p-0 flex flex-col h-full">
            <!-- 终端标题栏 -->
            <div class="terminal-header bg-neutral text-neutral-content px-4 py-3 flex justify-between items-center">
                <div class="flex items-center">
                    <div class="terminal-controls flex gap-2 mr-4">
                        <span class="control close"></span>
                        <span class="control minimize"></span>
                        <span class="control maximize"></span>
                    </div>
                    <div class="terminal-title font-medium">
                        <span class="text-primary font-bold">MaiBot</span>
                        <span class="mx-2 text-base-content/50">|</span>
                        <span class="terminal-status">{{ active ? '运行中' : '未运行' }}</span>
                    </div>
                </div>
                <!-- 修改按钮名称，从"重装"改为"重启" -->
                <button class="btn btn-xs btn-ghost" @click="restartProcess">
                    <Icon icon="mdi:refresh" class="mr-1" width="14" height="14" />
                    重启
                </button>
            </div>

            <!-- 终端标签栏 -->
            <div class="terminal-tabs bg-base-300 flex px-2 pt-1">
                <div class="tab tab-active">
                    <!-- 修改为指定版本 -->
                    MaiBot v0.6.3
                </div>
            </div>

            <!-- 终端内容区 -->
            <div class="terminal-content flex-grow overflow-auto bg-neutral text-neutral-content p-3 font-mono text-sm"
                ref="terminalContent">
                <div v-for="(line, index) in terminalLines" :key="index" class="terminal-line"
                    :class="getLineClass(line)">
                    <span class="terminal-timestamp" v-if="line.timestamp">{{ line.timestamp }}</span>
                    <span class="terminal-text">{{ line.text }}</span>
                </div>

                <!-- 空终端提示 -->
                <div v-if="terminalLines.length === 0"
                    class="terminal-empty flex flex-col items-center justify-center h-full">
                    <Icon icon="mdi:console" width="48" height="48" class="opacity-20 mb-4" />
                    <p class="opacity-50">{{ active ? '终端已就绪，等待输出' : '实例未运行，请先启动实例' }}</p>
                </div>
            </div>

            <!-- 终端输入区 -->
            <div class="terminal-input bg-base-300 p-3">
                <div class="join w-full">
                    <div class="join-item flex items-center bg-neutral px-3 text-neutral-content">
                        <span class="terminal-prompt">$</span>
                    </div>
                    <input type="text" v-model="commandInput" @keyup.enter="sendCommand" placeholder="输入命令..."
                        class="join-item input input-sm flex-grow bg-neutral text-neutral-content focus:outline-none border-none"
                        :disabled="!active" />
                    <button @click="sendCommand" class="join-item btn btn-sm btn-neutral" :disabled="!active">
                        <Icon icon="mdi:send" />
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps({
    instance: {
        type: Object,
        required: true
    },
    active: {
        type: Boolean,
        default: false
    }
});

const commandInput = ref('');
const terminalContent = ref(null);

// 终端输出行
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
    if (!commandInput.value.trim() || !props.active) return;

    // 添加命令到终端
    terminalLines.value.push({
        timestamp: getCurrentTimestamp(),
        text: `$ ${commandInput.value}`,
        type: 'command'
    });

    // 模拟命令响应
    setTimeout(() => {
        let response = '';
        let type = 'info';

        // 根据命令生成响应
        switch (commandInput.value.toLowerCase()) {
            case 'help':
                response = '可用命令:\nhelp - 显示帮助\nstatus - 显示状态\nversion - 显示版本\nclear - 清除屏幕';
                break;
            case 'status':
                response = `MaiBot 运行状态: ${props.active ? '正常' : '已停止'}\nCPU: 32% | 内存: 128MB\n服务: NapCat (${props.instance.services?.napcat || '停止'})`;
                break;
            case 'version':
                response = 'MaiBot v0.6.3\nNapCat v1.2.0\nNoneBot v2.0.0';
                break;
            case 'clear':
                terminalLines.value = [];
                commandInput.value = '';
                return;
            default:
                response = `未知命令: ${commandInput.value}`;
                type = 'error';
        }

        // 添加响应
        terminalLines.value.push({
            timestamp: getCurrentTimestamp(),
            text: response,
            type: type
        });

        // 滚动到底部
        scrollToBottom();
    }, 300);

    // 清空输入
    commandInput.value = '';
};

// 重启进程
const restartProcess = () => {
    // 模拟重启过程
    terminalLines.value.push({
        timestamp: getCurrentTimestamp(),
        text: '正在重启 MaiBot 服务...',
        type: 'info'
    });

    setTimeout(() => {
        terminalLines.value.push({
            timestamp: getCurrentTimestamp(),
            text: 'MaiBot 服务已停止',
            type: 'warning'
        });
    }, 500);

    setTimeout(() => {
        terminalLines.value.push({
            timestamp: getCurrentTimestamp(),
            text: '正在启动 MaiBot 服务...',
            type: 'info'
        });
    }, 1000);

    setTimeout(() => {
        terminalLines.value.push({
            timestamp: getCurrentTimestamp(),
            text: 'MaiBot 服务启动成功',
            type: 'success'
        });
    }, 2000);

    // 滚动到底部
    scrollToBottom();
};

// 获取行样式类
const getLineClass = (line) => {
    return {
        'text-info': line.type === 'info',
        'text-success': line.type === 'success',
        'text-warning': line.type === 'warning',
        'text-error': line.type === 'error',
        'font-bold': line.type === 'command'
    };
};

// 获取当前时间戳
const getCurrentTimestamp = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

// 滚动到底部
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

// 组件挂载后滚动到底部
onMounted(() => {
    scrollToBottom();

    // 如果终端处于活动状态，每10秒添加一条消息
    if (props.active) {
        setInterval(() => {
            const messages = [
                '系统运行正常',
                '收到用户请求',
                '处理中...',
                '响应已发送'
            ];
            const randomIndex = Math.floor(Math.random() * messages.length);
            terminalLines.value.push({
                timestamp: getCurrentTimestamp(),
                text: messages[randomIndex],
                type: 'info'
            });
        }, 10000);
    }
});
</script>

<style scoped>
@import '../../assets/css/instances/terminalPanel.css';

.terminal-panel {
    @apply flex flex-col;
    height: calc(100vh - 12rem);
}

.terminal-header {
    @apply rounded-t-lg;
}

.control {
    @apply w-3 h-3 rounded-full inline-block;
}

.close {
    @apply bg-error;
}

.minimize {
    @apply bg-warning;
}

.maximize {
    @apply bg-success;
}

.terminal-tabs {
    @apply border-b border-base-content/10;
}

.tab {
    @apply px-4 py-2 text-sm cursor-pointer border-t border-l border-r border-base-content/10 rounded-t-md bg-neutral text-neutral-content;
}

.tab-active {
    @apply bg-neutral border-base-content/20;
}

.terminal-content {
    font-family: 'Courier New', monospace;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
}

.terminal-line {
    @apply mb-1;
}

.terminal-timestamp {
    @apply text-base-content/40 mr-2 text-xs;
}

.terminal-prompt {
    @apply text-primary font-bold mr-2;
}

.terminal-empty {
    @apply text-center;
}

.terminal-status {
    @apply text-base-content/80 text-sm;
}

/* 响应式样式 */
@media (max-width: 768px) {
    .terminal-content {
        min-height: 300px;
        max-height: 400px;
    }
}
</style>
