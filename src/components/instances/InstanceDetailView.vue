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
                            <div class="info-value">{{ instance.lastStartTime || '从未启动' }}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">创建时间:</div>
                            <div class="info-value">{{ instance.createdAt || instance.installedAt || '未知' }}</div>
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
                            <div class="info-value">{{ instance.startCount || 0 }}</div>
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
                <!-- 终端标题栏和控制按钮 -->
                <div class="terminal-header">
                    <div class="flex items-center">
                        <span class="text-primary font-bold">MaiBot</span>
                        <span class="mx-2 text-gray-300">|</span>
                        <span class="status-text" :class="{ 'text-success': isRunning, 'text-neutral': !isRunning }">
                            {{ isRunning ? '运行中' : '未运行' }}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <!-- 启动按钮 -->
                        <button class="btn btn-xs" :class="(isRunning || isStarting) ? 'btn-disabled' : 'btn-success'"
                            @click="startInstance" :disabled="isRunning || isStarting || isStopping">
                            <span v-if="isStarting" class="loading loading-spinner loading-xs mr-1"></span>
                            <Icon v-else icon="mdi:play" class="mr-1" width="14" height="14" />
                            {{ isStarting ? '启动中...' : '启动' }}
                        </button>

                        <!-- 停止按钮 -->
                        <button class="btn btn-xs" :class="(!isRunning || isStopping) ? 'btn-disabled' : 'btn-error'"
                            @click="stopInstance" :disabled="!isRunning || isStopping || isStarting">
                            <span v-if="isStopping" class="loading loading-spinner loading-xs mr-1"></span>
                            <Icon v-else icon="mdi:stop" class="mr-1" width="14" height="14" />
                            {{ isStopping ? '停止中...' : '停止' }}
                        </button>

                        <!-- 重启终端按钮 -->
                        <button class="btn btn-xs btn-ghost" @click="restartTerminal" title="重启终端">
                            <Icon icon="mdi:refresh" class="mr-1" width="14" height="14" />
                            重启终端
                        </button>
                    </div>
                </div>

                <div class="terminal-tabs">
                    <div class="tab active">
                        MaiBot v0.6.3
                    </div>
                </div>

                <!-- xterm.js 终端 -->
                <div class="xterm-wrapper">
                    <div class="terminal-content" ref="terminalContent"></div>
                </div>

                <!-- 终端输入区 -->
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
import { getTerminalWebSocketService, closeTerminalWebSocket } from '@/services/websocket';
import { isMockModeActive } from '@/services/apiService';
import { instancesApi } from '@/services/api'; // 导入instancesApi以使用实例控制API

// 导入xterm和相关插件
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import '@xterm/xterm/css/xterm.css';

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

// WebSocket 终端实例
let terminalWS = null;

// xterm.js 相关
let term = null;
let fitAddon = null;

// 初始化xterm.js终端
const initXterm = () => {
    // 创建xterm实例
    term = new Terminal({
        cursorBlink: true,
        convertEol: true,
        fontFamily: '"Cascadia Code", "Fira Code", Consolas, "Courier New", monospace',
        fontSize: 14,
        theme: {
            background: '#1e1e1e',
            foreground: '#d4d4d4',
            cursor: '#ffffff',
            selectionBackground: '#555555',
        },
        allowProposedApi: true
    });

    // 加载插件
    fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.loadAddon(new Unicode11Addon());

    // 打开终端
    if (terminalContent.value) {
        term.open(terminalContent.value);

        // 首次自适应大小
        setTimeout(() => {
            try {
                fitAddon.fit();
            } catch (e) {
                console.error("Error fitting terminal on initial load:", e);
            }
        }, 100);
    }

    // 设置终端输入处理
    term.onData(data => {
        if (isTerminalConnected.value && terminalWS) {
            terminalWS.send({
                type: 'input',
                data: data
            });
        }
    });

    // 监听终端大小变化
    term.onResize(size => {
        if (isTerminalConnected.value && terminalWS) {
            terminalWS.send({
                type: 'resize',
                cols: size.cols,
                rows: size.rows
            });
        }
    });
};

// 初始化终端WebSocket连接
const initTerminalWebSocket = () => {
    if (!props.instance?.id) {
        console.warn('实例ID缺失，无法建立WebSocket连接');
        if (term) {
            term.writeln('\r\n\x1b[31m错误: 无法建立终端连接 - 实例ID缺失\x1b[0m');
        }
        return;
    }

    // 检查是否为模拟模式
    const useMockMode = isMockModeActive();
    if (useMockMode) {
        console.log('使用模拟模式，生成模拟终端数据');
        if (term) {
            term.writeln('\r\n\x1b[33m=== 模拟终端模式 ===\x1b[0m');
            term.writeln('Starting MaiBot v0.6.3...');
            term.writeln('Loading configuration...');
            term.writeln('\x1b[32mNapCat adapter initialized\x1b[0m');
            term.writeln('\x1b[32mReady to receive commands\x1b[0m');
        }
        isTerminalConnected.value = true;
        return;
    }

    // 构建session_id格式为 {instance_id}_main
    const sessionId = `${props.instance.id}_main`;

    console.log(`初始化终端WebSocket连接，会话ID: ${sessionId}`);
    isTerminalConnecting.value = true;

    try {
        // 使用新的终端WebSocket服务
        terminalWS = getTerminalWebSocketService(sessionId);

        // 连接打开事件
        terminalWS.on('open', () => {
            console.log('终端WebSocket连接已建立');
            isTerminalConnected.value = true;
            isTerminalConnecting.value = false;

            if (term) {
                term.writeln('\r\n\x1b[32m终端连接已建立\x1b[0m');

                // 连接成功后发送终端大小
                if (fitAddon) {
                    try {
                        fitAddon.fit();
                        const dimensions = term.rows && term.cols ? { rows: term.rows, cols: term.cols } : { rows: 24, cols: 80 };
                        terminalWS.send({
                            type: 'resize',
                            cols: dimensions.cols,
                            rows: dimensions.rows
                        });
                    } catch (e) {
                        console.error("Error fitting terminal after connection:", e);
                    }
                }
            }
        });

        // 接收消息事件
        terminalWS.on('message', (data) => {
            console.log('收到终端消息:', data);

            if (data.isMock) {
                // 处理模拟数据
                if (term) {
                    term.writeln(data.message || '模拟终端输出');
                }
                return;
            }

            // 处理真实WebSocket消息
            if (data.type === 'output' && term) {
                // 直接写入xterm
                term.write(data.data || data.message);
            } else if (data.type === 'status' && term) {
                // 状态消息
                term.writeln(`\r\n\x1b[33m${data.message}\x1b[0m`);
            } else if (data.type === 'error' && term) {
                // 错误消息
                term.writeln(`\r\n\x1b[31m${data.message || '终端错误'}\x1b[0m`);
            }
        });

        // 连接关闭事件
        terminalWS.on('close', (event) => {
            console.log('终端WebSocket连接已关闭:', event);
            isTerminalConnected.value = false;
            isTerminalConnecting.value = false;

            if (!event.isMock && term) {
                term.writeln('\r\n\x1b[33m终端连接已断开\x1b[0m');
            }
        });

        // 连接错误事件
        terminalWS.on('error', (error) => {
            console.error('终端WebSocket连接错误:', error);
            isTerminalConnected.value = false;
            isTerminalConnecting.value = false;

            if (term) {
                term.writeln('\r\n\x1b[31m终端连接出错，回退到模拟模式\x1b[0m');
            }

            // 回退到模拟模式
            setTimeout(() => {
                if (term) {
                    term.writeln('\r\n\x1b[33m=== 回退到模拟模式 ===\x1b[0m');
                    term.writeln('Starting MaiBot v0.6.3...');
                    term.writeln('\x1b[32mReady to receive commands\x1b[0m');
                }
                isTerminalConnected.value = true;
            }, 1000);
        });

        // 建立连接
        terminalWS.connect();

    } catch (error) {
        console.error('创建终端WebSocket连接失败:', error);
        isTerminalConnecting.value = false;

        if (term) {
            term.writeln('\r\n\x1b[31m终端连接失败，使用模拟模式\x1b[0m');
        }

        // 回退到模拟模式
        setTimeout(() => {
            if (term) {
                term.writeln('\r\n\x1b[33m=== 回退到模拟模式 ===\x1b[0m');
                term.writeln('Starting MaiBot v0.6.3...');
                term.writeln('\x1b[32mReady to receive commands\x1b[0m');
            }
            isTerminalConnected.value = true;
        }, 1000);
    }
};

// 关闭终端WebSocket连接
const closeTerminalConnection = () => {
    if (props.instance?.id) {
        const sessionId = `${props.instance.id}_main`;
        closeTerminalWebSocket(sessionId);
    }

    // 销毁xterm实例
    if (term) {
        try {
            term.dispose();
        } catch (e) {
            console.error("Error disposing terminal:", e);
        }
        term = null;
        fitAddon = null;
    }

    terminalWS = null;
    isTerminalConnected.value = false;
    isTerminalConnecting.value = false;
};

// 发送命令
const sendCommand = () => {
    if (!commandInput.value || !isTerminalConnected.value) return;

    const command = commandInput.value;

    // 使用xterm显示命令
    if (term) {
        term.writeln(`\r\n$ ${command}`);
    }

    // 检查是否为模拟模式
    const useMockMode = isMockModeActive();

    if (useMockMode || !terminalWS) {
        // 模拟模式处理
        setTimeout(() => {
            if (!term) return;

            switch (command.toLowerCase()) {
                case 'help':
                    term.writeln('可用命令:');
                    term.writeln('help - 显示帮助');
                    term.writeln('status - 显示状态');
                    term.writeln('version - 显示版本');
                    term.writeln('clear - 清除屏幕');
                    break;
                case 'status':
                    term.writeln(`MaiBot 运行状态: ${isRunning.value ? '正常' : '已停止'}`);
                    term.writeln('CPU: 32% | 内存: 128MB');
                    break;
                case 'version':
                    term.writeln('MaiBot v0.6.3');
                    term.writeln('NapCat v1.2.0');
                    term.writeln('NoneBot v2.0.0');
                    break;
                case 'clear':
                    term.clear();
                    break;
                default:
                    term.writeln(`[模拟] 执行命令: ${command}`);
            }
        }, 300);
    } else {
        // 真实WebSocket模式，发送命令到后端
        try {
            const success = terminalWS.send({
                type: 'input',
                data: command + '\n'  // 添加换行符
            });

            if (!success && term) {
                term.writeln('\r\n\x1b[31m命令发送失败\x1b[0m');
            }
        } catch (error) {
            console.error('发送命令失败:', error);
            if (term) {
                term.writeln(`\r\n\x1b[31m命令发送失败: ${error.message}\x1b[0m`);
            }
        }
    }

    commandInput.value = '';
};

// 重启终端
const restartTerminal = () => {
    if (term) {
        term.writeln('\r\n\x1b[33m正在重启终端连接...\x1b[0m');
    }

    // 关闭现有连接
    closeTerminalConnection();

    // 重新初始化终端
    nextTick(() => {
        // 先初始化xterm.js
        initXterm();

        // 然后初始化WebSocket连接
        setTimeout(() => {
            initTerminalWebSocket();
        }, 500);
    });
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

// 添加加载状态管理
const isStarting = ref(false);
const isStopping = ref(false);

// 添加实例启动和停止函数
const startInstance = async () => {
    if (!props.instance?.id || isRunning.value || isStarting.value) return;

    isStarting.value = true;

    if (term) {
        term.writeln('\r\n\x1b[33m正在启动实例...\x1b[0m');
    }

    try {
        const response = await instancesApi.startInstance(props.instance.id);
        if (response.success) {
            if (term) {
                term.writeln('\r\n\x1b[32m实例启动成功!\x1b[0m');
            }
            // 触发emitter以通知其他组件实例状态变化
            if (emitter) {
                emitter.emit('instance-status-changed', {
                    id: props.instance.id,
                    status: 'running'
                });
            }
        } else {
            if (term) {
                term.writeln(`\r\n\x1b[31m启动失败: ${response.message}\x1b[0m`);
            }
        }
    } catch (error) {
        console.error('启动实例出错:', error);
        if (term) {
            term.writeln(`\r\n\x1b[31m启动出错: ${error.message || '未知错误'}\x1b[0m`);
        }
    } finally {
        isStarting.value = false;
    }
};

const stopInstance = async () => {
    if (!props.instance?.id || !isRunning.value || isStopping.value) return;

    isStopping.value = true;

    if (term) {
        term.writeln('\r\n\x1b[33m正在停止实例...\x1b[0m');
    }

    try {
        const response = await instancesApi.stopInstance(props.instance.id);
        if (response.success) {
            if (term) {
                term.writeln('\r\n\x1b[32m实例已停止!\x1b[0m');
            }
            // 触发emitter以通知其他组件实例状态变化
            if (emitter) {
                emitter.emit('instance-status-changed', {
                    id: props.instance.id,
                    status: 'stopped'
                });
            }
        } else {
            if (term) {
                term.writeln(`\r\n\x1b[31m停止失败: ${response.message}\x1b[0m`);
            }
        }
    } catch (error) {
        console.error('停止实例出错:', error);
        if (term) {
            term.writeln(`\r\n\x1b[31m停止出错: ${error.message || '未知错误'}\x1b[0m`);
        }
    } finally {
        isStopping.value = false;
    }
};

// 自适应窗口大小
const handleResize = () => {
    if (fitAddon && term) {
        try {
            fitAddon.fit();

            // 发送终端尺寸到后端
            if (isTerminalConnected.value && terminalWS) {
                terminalWS.send({
                    type: 'resize',
                    cols: term.cols,
                    rows: term.rows
                });
            }
        } catch (e) {
            console.error("Error fitting terminal on resize:", e);
        }
    }
};

// 组件挂载后的初始化
onMounted(() => {
    console.log('InstanceDetailView 组件已挂载，实例:', props.instance);

    // 初始化xterm.js
    initXterm();

    // 初始化终端连接
    initTerminalWebSocket();

    // 添加窗口大小调整监听
    window.addEventListener('resize', handleResize);
});

// 组件卸载时清理
onUnmounted(() => {
    console.log('InstanceDetailView 组件即将卸载，清理WebSocket连接');
    closeTerminalConnection();

    // 移除窗口大小调整监听
    window.removeEventListener('resize', handleResize);
});

// 监听实例变化，重新初始化终端
watch(() => props.instance, (newInstance, oldInstance) => {
    if (newInstance?.id !== oldInstance?.id) {
        console.log('实例变化，重新初始化终端连接');
        closeTerminalConnection();

        nextTick(() => {
            // 重新初始化xterm.js
            initXterm();

            // 然后初始化WebSocket连接
            setTimeout(() => {
                initTerminalWebSocket();
            }, 500);
        });
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

/* xterm 相关样式 */
.xterm-wrapper {
    @apply flex-1 flex flex-col bg-gray-900 overflow-hidden;
    min-height: 300px;
}

.terminal-content {
    @apply flex-1 flex;
    position: relative;
    width: 100%;
    height: 100%;
}

/* 定制 xterm.js 外观 */
:deep(.xterm) {
    @apply h-full w-full;
    padding: 8px;
}

:deep(.xterm-viewport) {
    @apply bg-gray-900;
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
