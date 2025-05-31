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
                    <div class="tab" :class="{ active: activeTerminal === 'maibot' }" @click="switchTerminal('maibot')">
                        MaiBot {{ instance.version || 'v0.6.3' }}
                    </div>
                    <div class="tab" :class="{ active: activeTerminal === 'napcat-ada' }"
                        @click="switchTerminal('napcat-ada')" v-if="hasNapcatAdaService">
                        napcat-ada
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

// 检查是否有napcat-ada服务
const hasNapcatAdaService = computed(() => {
    if (!props.instance?.services || !Array.isArray(props.instance.services)) {
        return false;
    }
    return props.instance.services.some(service =>
        service.name === 'napcat-ada' || service.name === 'napcat'
    );
});

// 当前激活的终端
const activeTerminal = ref('maibot');

// 终端相关状态
const terminalContent = ref(null);
const commandInputRef = ref(null);
const commandInput = ref('');

// 多终端状态管理
const terminalStates = ref({
    'maibot': {
        isConnected: false,
        isConnecting: false,
        websocket: null,
        term: null,
        fitAddon: null
    },
    'napcat-ada': {
        isConnected: false,
        isConnecting: false,
        websocket: null,
        term: null,
        fitAddon: null
    }
});

// 当前终端状态的计算属性
const currentTerminalState = computed(() => terminalStates.value[activeTerminal.value]);
const isTerminalConnected = computed(() => currentTerminalState.value.isConnected);
const isTerminalConnecting = computed(() => currentTerminalState.value.isConnecting);

// 初始化xterm.js终端
const initXterm = (terminalType = 'maibot') => {
    const state = terminalStates.value[terminalType];

    // 如果该终端已存在，先清理
    if (state.term) {
        try {
            state.term.dispose();
        } catch (e) {
            console.error("Error disposing previous terminal:", e);
        }
    }

    // 创建xterm实例
    state.term = new Terminal({
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
    state.fitAddon = new FitAddon();
    state.term.loadAddon(state.fitAddon);
    state.term.loadAddon(new WebLinksAddon());
    state.term.loadAddon(new Unicode11Addon());    // 如果当前正在创建的是激活的终端，立即显示在DOM中
    if (terminalType === activeTerminal.value && terminalContent.value) {
        state.term.open(terminalContent.value);

        // 首次自适应大小
        setTimeout(() => {
            try {
                state.fitAddon.fit();
            } catch (e) {
                console.error("Error fitting terminal on initial load:", e);
            }
        }, 100);
    }

    // 设置终端输入处理
    state.term.onData(data => {
        if (state.isConnected && state.websocket) {
            state.websocket.send({
                type: 'input',
                data: data
            });
        }
    });    // 监听终端大小变化
    state.term.onResize(size => {
        if (state.isConnected && state.websocket) {
            state.websocket.send({
                type: 'resize',
                cols: size.cols,
                rows: size.rows
            });
        }
    });
};

// 初始化终端WebSocket连接
const initTerminalWebSocket = (terminalType = 'maibot') => {
    if (!props.instance?.id) {
        console.warn('实例ID缺失，无法建立WebSocket连接');
        const state = terminalStates.value[terminalType];
        if (state.term) {
            state.term.writeln('\r\n\x1b[31m错误: 无法建立终端连接 - 实例ID缺失\x1b[0m');
        }
        return;
    }

    const state = terminalStates.value[terminalType];

    // 检查是否为模拟模式
    const useMockMode = isMockModeActive();
    if (useMockMode) {
        console.log(`使用模拟模式，生成 ${terminalType} 终端数据`);
        if (state.term) {
            state.term.writeln('\r\n\x1b[33m=== 模拟终端模式 ===\x1b[0m');
            if (terminalType === 'maibot') {
                state.term.writeln(`Starting MaiBot ${props.instance.version || 'v0.6.3'}...`);
                state.term.writeln('Loading configuration...');
                state.term.writeln('\x1b[32mNapCat adapter initialized\x1b[0m');
                state.term.writeln('\x1b[32mReady to receive commands\x1b[0m');
            } else if (terminalType === 'napcat-ada') {
                state.term.writeln('Starting napcat-ada service...');
                state.term.writeln('Loading napcat-ada configuration...');
                state.term.writeln('\x1b[32mnapcat-ada adapter ready\x1b[0m');
                state.term.writeln('\x1b[32mWebSocket server listening\x1b[0m');
            }
        }
        state.isConnected = true;
        return;
    }    // 构建session_id格式，napcat-ada使用不同的会话ID
    const sessionId = terminalType === 'napcat-ada'
        ? `${props.instance.id}_napcat-ada`
        : `${props.instance.id}_main`;

    console.log(`初始化 ${terminalType} 终端WebSocket连接，会话ID: ${sessionId}`);
    state.isConnecting = true;

    try {
        // 使用新的终端WebSocket服务
        state.websocket = getTerminalWebSocketService(sessionId);        // 连接打开事件
        state.websocket.on('open', () => {
            console.log(`${terminalType} 终端WebSocket连接已建立`);
            state.isConnected = true;
            state.isConnecting = false;

            if (state.term) {
                state.term.writeln('\r\n\x1b[32m终端连接已建立\x1b[0m');

                // 连接成功后发送终端大小
                if (state.fitAddon) {
                    try {
                        state.fitAddon.fit();
                        const dimensions = state.term.rows && state.term.cols ?
                            { rows: state.term.rows, cols: state.term.cols } :
                            { rows: 24, cols: 80 };
                        state.websocket.send({
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
        state.websocket.on('message', (data) => {
            console.log(`收到 ${terminalType} 终端消息:`, data);

            if (data.isMock) {
                // 处理模拟数据
                if (state.term) {
                    state.term.writeln(data.message || '模拟终端输出');
                }
                return;
            }

            // 处理真实WebSocket消息
            if (data.type === 'output' && state.term) {
                // 直接写入xterm
                state.term.write(data.data || data.message);
            } else if (data.type === 'status' && state.term) {
                // 状态消息
                state.term.writeln(`\r\n\x1b[33m${data.message}\x1b[0m`);
            } else if (data.type === 'error' && state.term) {
                // 错误消息
                state.term.writeln(`\r\n\x1b[31m${data.message || '终端错误'}\x1b[0m`);
            }
        });

        // 连接关闭事件
        state.websocket.on('close', (event) => {
            console.log(`${terminalType} 终端WebSocket连接已关闭:`, event);
            state.isConnected = false;
            state.isConnecting = false;

            if (!event.isMock && state.term) {
                state.term.writeln('\r\n\x1b[33m终端连接已断开\x1b[0m');
            }
        });

        // 连接错误事件
        state.websocket.on('error', (error) => {
            console.error(`${terminalType} 终端WebSocket连接错误:`, error);
            state.isConnected = false;
            state.isConnecting = false;

            if (state.term) {
                state.term.writeln('\r\n\x1b[31m终端连接出错，回退到模拟模式\x1b[0m');
            }

            // 回退到模拟模式
            setTimeout(() => {
                if (state.term) {
                    state.term.writeln('\r\n\x1b[33m=== 回退到模拟模式 ===\x1b[0m');
                    if (terminalType === 'maibot') {
                        state.term.writeln(`Starting MaiBot ${props.instance.version || 'v0.6.3'}...`);
                    } else {
                        state.term.writeln('Starting napcat-ada service...');
                    }
                    state.term.writeln('\x1b[32mReady to receive commands\x1b[0m');
                }
                state.isConnected = true;
            }, 1000);
        });

        // 建立连接
        state.websocket.connect();
    } catch (error) {
        console.error(`创建 ${terminalType} 终端WebSocket连接失败:`, error);
        state.isConnecting = false;

        if (state.term) {
            state.term.writeln('\r\n\x1b[31m终端连接失败，使用模拟模式\x1b[0m');
        }

        // 回退到模拟模式
        setTimeout(() => {
            if (state.term) {
                state.term.writeln('\r\n\x1b[33m=== 回退到模拟模式 ===\x1b[0m');
                if (terminalType === 'maibot') {
                    state.term.writeln(`Starting MaiBot ${props.instance.version || 'v0.6.3'}...`);
                } else {
                    state.term.writeln('Starting napcat-ada service...');
                }
                state.term.writeln('\x1b[32mReady to receive commands\x1b[0m');
            }
            state.isConnected = true;
        }, 1000);
    }
};

// 关闭终端WebSocket连接
const closeTerminalConnection = (terminalType = null) => {
    if (terminalType) {
        // 关闭指定类型的终端
        const state = terminalStates.value[terminalType]; if (props.instance?.id && state.websocket) {
            const sessionId = terminalType === 'napcat-ada'
                ? `${props.instance.id}_napcat-ada`
                : `${props.instance.id}_main`;
            closeTerminalWebSocket(sessionId);
        }

        // 销毁xterm实例
        if (state.term) {
            try {
                state.term.dispose();
            } catch (e) {
                console.error("Error disposing terminal:", e);
            }
            state.term = null;
            state.fitAddon = null;
        }

        state.websocket = null;
        state.isConnected = false;
        state.isConnecting = false;
    } else {
        // 关闭所有终端
        Object.keys(terminalStates.value).forEach(type => {
            closeTerminalConnection(type);
        });
    }
};

// 发送命令
const sendCommand = () => {
    if (!commandInput.value || !isTerminalConnected.value) return;

    const command = commandInput.value;
    const currentState = terminalStates.value[activeTerminal.value];

    // 使用xterm显示命令
    if (currentState.term) {
        currentState.term.writeln(`\r\n$ ${command}`);
    }

    // 检查是否为模拟模式
    const useMockMode = isMockModeActive();

    if (useMockMode || !currentState.websocket) {
        // 模拟模式处理
        setTimeout(() => {
            if (!currentState.term) return;

            if (activeTerminal.value === 'maibot') {
                // MaiBot终端命令
                switch (command.toLowerCase()) {
                    case 'help':
                        currentState.term.writeln('可用命令:');
                        currentState.term.writeln('help - 显示帮助');
                        currentState.term.writeln('status - 显示状态');
                        currentState.term.writeln('version - 显示版本');
                        currentState.term.writeln('clear - 清除屏幕');
                        break;
                    case 'status':
                        currentState.term.writeln(`MaiBot 运行状态: ${isRunning.value ? '正常' : '已停止'}`);
                        currentState.term.writeln('CPU: 32% | 内存: 128MB');
                        break;
                    case 'version':
                        currentState.term.writeln(`MaiBot ${props.instance.version || 'v0.6.3'}`);
                        currentState.term.writeln('NapCat v1.2.0');
                        currentState.term.writeln('NoneBot v2.0.0');
                        break;
                    case 'clear':
                        currentState.term.clear();
                        break;
                    default:
                        currentState.term.writeln(`[模拟] 执行命令: ${command}`);
                }
            } else if (activeTerminal.value === 'napcat-ada') {
                // napcat-ada终端命令
                switch (command.toLowerCase()) {
                    case 'help':
                        currentState.term.writeln('napcat-ada 可用命令:');
                        currentState.term.writeln('help - 显示帮助');
                        currentState.term.writeln('status - 显示适配器状态');
                        currentState.term.writeln('restart - 重启适配器');
                        currentState.term.writeln('clear - 清除屏幕');
                        break;
                    case 'status':
                        currentState.term.writeln('napcat-ada 适配器状态: 正常运行');
                        currentState.term.writeln('WebSocket连接数: 2');
                        currentState.term.writeln('消息转发: 活跃');
                        break;
                    case 'restart':
                        currentState.term.writeln('正在重启 napcat-ada 适配器...');
                        currentState.term.writeln('\x1b[32m适配器重启完成\x1b[0m');
                        break;
                    case 'clear':
                        currentState.term.clear();
                        break;
                    default:
                        currentState.term.writeln(`[napcat-ada] 执行命令: ${command}`);
                }
            }
        }, 300);
    } else {
        // 真实WebSocket模式，发送命令到后端
        try {
            const success = currentState.websocket.send({
                type: 'input',
                data: command + '\n'  // 添加换行符
            });

            if (!success && currentState.term) {
                currentState.term.writeln('\r\n\x1b[31m命令发送失败\x1b[0m');
            }
        } catch (error) {
            console.error('发送命令失败:', error);
            if (currentState.term) {
                currentState.term.writeln(`\r\n\x1b[31m命令发送失败: ${error.message}\x1b[0m`);
            }
        }
    }

    commandInput.value = '';
};

// 重启终端
const restartTerminal = () => {
    const currentState = terminalStates.value[activeTerminal.value];

    if (currentState.term) {
        currentState.term.writeln('\r\n\x1b[33m正在重启终端连接...\x1b[0m');
    }

    // 关闭当前终端连接
    closeTerminalConnection(activeTerminal.value);

    // 重新初始化终端
    nextTick(() => {
        // 先初始化xterm.js
        initXterm(activeTerminal.value);

        // 然后初始化WebSocket连接
        setTimeout(() => {
            initTerminalWebSocket(activeTerminal.value);
        }, 500);
    });
};

// 切换终端
const switchTerminal = (terminalType) => {
    if (activeTerminal.value === terminalType) return;

    console.log(`切换终端从 ${activeTerminal.value} 到 ${terminalType}`);
    console.log('当前实例服务:', props.instance?.services);
    console.log('hasNapcatAdaService:', hasNapcatAdaService.value);

    // 清空终端容器
    if (terminalContent.value) {
        terminalContent.value.innerHTML = '';
    }

    // 切换到新终端
    activeTerminal.value = terminalType;
    const newState = terminalStates.value[terminalType];

    console.log(`${terminalType} 终端状态:`, {
        hasTerm: !!newState.term,
        isConnected: newState.isConnected,
        isConnecting: newState.isConnecting
    });

    // 确保新终端在下一个tick中渲染
    nextTick(() => {
        if (!terminalContent.value) {
            console.error('终端容器不存在');
            return;
        }

        // 如果新终端还没初始化，先初始化
        if (!newState.term) {
            console.log(`初始化新终端: ${terminalType}`);
            initXterm(terminalType);
            // 延迟初始化WebSocket连接
            setTimeout(() => {
                initTerminalWebSocket(terminalType);
            }, 200);
        } else {
            // 显示已存在的终端
            console.log(`重新渲染已存在的终端: ${terminalType}`);
            try {
                newState.term.open(terminalContent.value);
                console.log(`${terminalType} 终端成功渲染到DOM`);

                // 自适应大小
                setTimeout(() => {
                    try {
                        if (newState.fitAddon) {
                            newState.fitAddon.fit();
                            console.log(`${terminalType} 终端大小已调整`);
                        }
                    } catch (e) {
                        console.error("Error fitting terminal on switch:", e);
                    }
                }, 100);

                // 如果WebSocket未连接，尝试重新连接
                if (!newState.isConnected && !newState.isConnecting) {
                    console.log(`重新连接 ${terminalType} 终端WebSocket`);
                    setTimeout(() => {
                        initTerminalWebSocket(terminalType);
                    }, 200);
                }
            } catch (e) {
                console.error(`渲染终端失败: ${terminalType}`, e);
                // 如果渲染失败，重新初始化
                initXterm(terminalType);
                setTimeout(() => {
                    initTerminalWebSocket(terminalType);
                }, 200);
            }
        }
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

// 添加加载状态管理
const isStarting = ref(false);
const isStopping = ref(false);

// 添加实例启动和停止函数
const startInstance = async () => {
    if (!props.instance?.id || isRunning.value || isStarting.value) return;

    isStarting.value = true;
    const currentState = terminalStates.value[activeTerminal.value];

    if (currentState.term) {
        currentState.term.writeln('\r\n\x1b[33m正在启动实例...\x1b[0m');
    }

    try {
        const response = await instancesApi.startInstance(props.instance.id);
        if (response.success) {
            if (currentState.term) {
                currentState.term.writeln('\r\n\x1b[32m实例启动成功!\x1b[0m');
            }
            // 触发emitter以通知其他组件实例状态变化
            if (emitter) {
                emitter.emit('instance-status-changed', {
                    id: props.instance.id,
                    status: 'running'
                });
            }
        } else {
            if (currentState.term) {
                currentState.term.writeln(`\r\n\x1b[31m启动失败: ${response.message}\x1b[0m`);
            }
        }
    } catch (error) {
        console.error('启动实例出错:', error);
        if (currentState.term) {
            currentState.term.writeln(`\r\n\x1b[31m启动出错: ${error.message || '未知错误'}\x1b[0m`);
        }
    } finally {
        isStarting.value = false;
    }
};

const stopInstance = async () => {
    if (!props.instance?.id || !isRunning.value || isStopping.value) return;

    isStopping.value = true;
    const currentState = terminalStates.value[activeTerminal.value];

    if (currentState.term) {
        currentState.term.writeln('\r\n\x1b[33m正在停止实例...\x1b[0m');
    }

    try {
        const response = await instancesApi.stopInstance(props.instance.id);
        if (response.success) {
            if (currentState.term) {
                currentState.term.writeln('\r\n\x1b[32m实例已停止!\x1b[0m');
            }
            // 触发emitter以通知其他组件实例状态变化
            if (emitter) {
                emitter.emit('instance-status-changed', {
                    id: props.instance.id,
                    status: 'stopped'
                });
            }
        } else {
            if (currentState.term) {
                currentState.term.writeln(`\r\n\x1b[31m停止失败: ${response.message}\x1b[0m`);
            }
        }
    } catch (error) {
        console.error('停止实例出错:', error);
        if (currentState.term) {
            currentState.term.writeln(`\r\n\x1b[31m停止出错: ${error.message || '未知错误'}\x1b[0m`);
        }
    } finally {
        isStopping.value = false;
    }
};

// 自适应窗口大小
const handleResize = () => {
    const currentState = terminalStates.value[activeTerminal.value];

    if (currentState.fitAddon && currentState.term) {
        try {
            currentState.fitAddon.fit();

            // 发送终端尺寸到后端
            if (currentState.isConnected && currentState.websocket) {
                currentState.websocket.send({
                    type: 'resize',
                    cols: currentState.term.cols,
                    rows: currentState.term.rows
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

    // 初始化默认终端 (MaiBot)
    initXterm('maibot');

    // 初始化MaiBot终端连接
    initTerminalWebSocket('maibot');

    // 如果有napcat-ada服务，预创建终端实例（但不渲染到DOM）
    if (hasNapcatAdaService.value) {
        // 预创建napcat-ada终端，但不渲染
        const napcatState = terminalStates.value['napcat-ada'];

        // 创建xterm实例
        napcatState.term = new Terminal({
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
        napcatState.fitAddon = new FitAddon();
        napcatState.term.loadAddon(napcatState.fitAddon);
        napcatState.term.loadAddon(new WebLinksAddon());
        napcatState.term.loadAddon(new Unicode11Addon());

        // 设置终端输入处理
        napcatState.term.onData(data => {
            if (napcatState.isConnected && napcatState.websocket) {
                napcatState.websocket.send({
                    type: 'input',
                    data: data
                });
            }
        });

        // 监听终端大小变化
        napcatState.term.onResize(size => {
            if (napcatState.isConnected && napcatState.websocket) {
                napcatState.websocket.send({
                    type: 'resize',
                    cols: size.cols,
                    rows: size.rows
                });
            }
        });
    }

    // 添加窗口大小调整监听
    window.addEventListener('resize', handleResize);
});

// 组件卸载时清理
onUnmounted(() => {
    console.log('InstanceDetailView 组件即将卸载，清理WebSocket连接');
    closeTerminalConnection(); // 关闭所有终端连接

    // 移除窗口大小调整监听
    window.removeEventListener('resize', handleResize);
});

// 监听实例变化，重新初始化终端
watch(() => props.instance, (newInstance, oldInstance) => {
    if (newInstance?.id !== oldInstance?.id) {
        console.log('实例变化，重新初始化终端连接');
        closeTerminalConnection(); // 关闭所有终端

        nextTick(() => {
            // 重置到默认终端
            activeTerminal.value = 'maibot';

            // 重新初始化MaiBot终端
            initXterm('maibot');

            // 如果有napcat-ada服务，也初始化它的终端
            if (hasNapcatAdaService.value) {
                initXterm('napcat-ada');
            }

            // 然后初始化WebSocket连接
            setTimeout(() => {
                initTerminalWebSocket('maibot');
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
    @apply px-4 py-2 text-sm inline-block cursor-pointer transition-all duration-200;
    border: 1px solid transparent;
    margin-right: 2px;
}

.tab:hover {
    @apply bg-gray-100;
}

.tab.active {
    @apply bg-white border-t border-l border-r border-gray-200 rounded-t-md relative -mb-px font-medium;
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
