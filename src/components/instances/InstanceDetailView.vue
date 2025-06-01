<template>
    <div class="instance-detail-container animate-slide-in"> <!-- 顶部应用标题栏 -->
        <div class="app-header shadow-sm">
            <div class="flex items-center">
                <!-- 返回按钮 -->
                <button class="btn btn-xs btn-ghost mr-3" @click="goBack" title="返回">
                    <Icon icon="mdi:arrow-left" class="mr-1" width="16" height="16" />
                    返回
                </button>
                <span class="text-primary font-bold">MaiBot</span> <span class="mx-2 text-base-content/30">|</span>
                <span class="status-text">{{ isRunning ? '运行中' : '未运行' }}</span>
                <span class="mx-2 text-base-content/30">|</span>
                <span class="terminal-connection-status" :class="{
                    'text-green-500': isTerminalConnected,
                    'text-yellow-500': isTerminalConnecting,
                    'text-red-500': !isTerminalConnected && !isTerminalConnecting
                }">
                    {{ isTerminalConnecting ? '连接中...' : (isTerminalConnected ? '已连接' : '未连接') }}
                </span>
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
                    <div class="modules-grid"> <!-- 文件管理模块 -->
                        <div class="module-card" @click="openModule('file')">
                            <div class="module-icon module-icon-blue">
                                <Icon icon="mdi:folder-outline" class="text-blue-500" />
                            </div>
                            <div class="module-name">文件管理</div>
                            <div class="module-action">
                                <Icon icon="mdi:chevron-right" />
                            </div>
                        </div>

                        <!-- 自动任务模块 -->
                        <div class="module-card" @click="openModule('tasks')">
                            <div class="module-icon module-icon-purple">
                                <Icon icon="mdi:calendar-clock" class="text-purple-500" />
                            </div>
                            <div class="module-name">自动任务</div>
                            <div class="module-action">
                                <Icon icon="mdi:chevron-right" />
                            </div>
                        </div>

                        <!-- Bot配置模块 -->
                        <div class="module-card" @click="openModule('bot')">
                            <div class="module-icon module-icon-amber">
                                <Icon icon="mdi:robot" class="text-amber-500" />
                            </div>
                            <div class="module-name">Bot配置</div>
                            <div class="module-action">
                                <Icon icon="mdi:chevron-right" />
                            </div>
                        </div>

                        <!-- 适配器配置模块 -->
                        <div class="module-card" @click="openModule('adapter')">
                            <div class="module-icon module-icon-cyan">
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
            <div class="terminal-container shadow-md">                <!-- 终端标题栏和控制按钮 -->
                <div class="terminal-header">
                    <div class="flex items-center">
                        <span class="text-primary font-bold">MaiBot</span>
                        <span class="mx-2 text-base-content/30">|</span>
                        <span class="status-text" :class="{ 'text-success': isRunning, 'text-neutral': !isRunning }">
                            {{ isRunning ? '运行中' : '未运行' }}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button class="btn btn-xs btn-outline" @click="restartTerminal" title="重启终端">
                            <Icon icon="mdi:restart" />
                        </button>
                        <button class="btn btn-xs btn-ghost" @click="checkAndRestoreTerminalConnection(activeTerminal)" title="检查连接">
                            <Icon icon="mdi:connection" />
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
const showInstanceDetail = inject('showInstanceDetail', ref(true));

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
    } commandInput.value = '';
};

// 返回函数
const goBack = () => {
    emit('back');
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
            }, 200);        } else {
            // 显示已存在的终端
            console.log(`重新渲染已存在的终端: ${terminalType}`);
            
            // 使用新的状态检查和恢复方法
            checkAndRestoreTerminalConnection(terminalType);
        }
    });
};

// 打开模块
const openModule = (moduleName) => {
    console.log('打开模块:', moduleName);

    // 测试Toast功能
    if (moduleName === 'file') {
        toastService.show('测试文件管理模块Toast', { type: 'info', duration: 5000 });
    } else if (moduleName === 'tasks') {
        toastService.show('测试自动任务模块Toast', { type: 'success', duration: 4000 });
    } else if (moduleName === 'adapter') {
        toastService.show('测试适配器配置模块Toast', { type: 'warning', duration: 6000 });
    }

    // 根据不同模块进行处理
    if (moduleName === 'bot') {
        // 发送打开Bot配置的事件，带上实例信息、tab标识和来源标识
        if (emitter) {
            emitter.emit('open-bot-config', props.instance);
        }
        toastService.show('打开Bot配置模块', { type: 'info', duration: 3000 });
    } else {
        // 其他模块的处理
        switch (moduleName) {
            case 'file':
                break;
            case 'tasks':
                break;
            case 'adapter':
                break;
        }
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

// 检查并恢复终端连接状态
const checkAndRestoreTerminalConnection = (terminalType = 'maibot') => {
    const state = terminalStates.value[terminalType];
    
    if (!state.term) {
        console.log(`${terminalType} 终端实例不存在，重新初始化`);
        initXterm(terminalType);
        return;
    }
    
    // 检查WebSocket连接状态，但要避免频繁重连
    if (!state.isConnected && !state.isConnecting) {
        // 添加防抖机制，避免频繁重连
        if (checkAndRestoreTerminalConnection.timers) {
            clearTimeout(checkAndRestoreTerminalConnection.timers[terminalType]);
        } else {
            checkAndRestoreTerminalConnection.timers = {};
        }
        
        checkAndRestoreTerminalConnection.timers[terminalType] = setTimeout(() => {
            // 二次检查状态，避免竞态条件
            const currentState = terminalStates.value[terminalType];
            if (!currentState.isConnected && !currentState.isConnecting) {
                console.log(`${terminalType} 终端WebSocket未连接，尝试重新连接`);
                initTerminalWebSocket(terminalType);
            } else {
                console.log(`${terminalType} 终端WebSocket状态已恢复，跳过重连`);
            }
        }, 1000); // 增加延迟到1秒，减少频繁重连
        return;
    }
    
    // 如果终端已连接但没有在DOM中渲染，重新渲染
    if (state.isConnected && state.term && terminalContent.value) {
        const hasTerminalContent = terminalContent.value.querySelector('.xterm');
        if (!hasTerminalContent) {
            console.log(`${terminalType} 终端已连接但未渲染，重新渲染到DOM`);
            try {
                state.term.open(terminalContent.value);
                setTimeout(() => {
                    try {
                        if (state.fitAddon) {
                            state.fitAddon.fit();
                        }
                    } catch (e) {
                        console.error("Error fitting terminal on restore:", e);
                    }
                }, 100);
            } catch (e) {
                console.error(`重新渲染 ${terminalType} 终端失败:`, e);
                // 如果渲染失败，重新初始化（但延迟执行）
                setTimeout(() => {
                    initXterm(terminalType);
                    setTimeout(() => {
                        initTerminalWebSocket(terminalType);
                    }, 200);
                }, 500);
            }
        }
    }
    
    console.log(`${terminalType} 终端状态检查完成:`, {
        hasTerm: !!state.term,
        isConnected: state.isConnected,
        isConnecting: state.isConnecting,
        hasDOM: !!terminalContent.value?.querySelector('.xterm')
    });
};

// 组件挂载后的初始化
onMounted(() => {
    console.log('InstanceDetailView 组件已挂载，实例:', props.instance);

    // 延迟初始化，确保DOM已渲染
    nextTick(() => {
        // 初始化默认终端 (MaiBot)
        initXterm('maibot');

        // 初始化MaiBot终端连接
        setTimeout(() => {
            initTerminalWebSocket('maibot');
        }, 200);

        // 如果有napcat-ada服务，预创建终端但不连接
        if (hasNapcatAdaService.value) {
            setTimeout(() => {
                // 预创建napcat-ada终端实例
                const napcatState = terminalStates.value['napcat-ada'];
                if (!napcatState.term) {
                    // 创建xterm实例但不渲染到DOM
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

                    // 设置事件处理
                    napcatState.term.onData(data => {
                        if (napcatState.isConnected && napcatState.websocket) {
                            napcatState.websocket.send({
                                type: 'input',
                                data: data
                            });
                        }
                    });

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
            }, 300);
        }
    });

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
        });    }    // 页面可见性监听器函数
    const visibilityChangeHandler = () => {
        if (document.visibilityState === 'visible') {
            console.log('页面重新可见，检查终端状态');
            // 添加防抖，避免频繁触发
            clearTimeout(visibilityChangeHandler.timer);
            visibilityChangeHandler.timer = setTimeout(() => {
                checkAndRestoreTerminalConnection(activeTerminal.value);
            }, 500); // 增加延迟到500ms，减少频繁触发
        }
    };

    // 添加页面可见性监听，处理页面切换
    document.addEventListener('visibilitychange', visibilityChangeHandler);

    // 添加窗口大小调整监听
    window.addEventListener('resize', handleResize);
});

// 组件卸载时清理
onUnmounted(() => {
    console.log('InstanceDetailView 组件即将卸载');
    
    // 清理页面可见性监听器 - 移除在mounted中添加的监听器
    document.removeEventListener('visibilitychange', visibilityChangeHandler);
    
    // 清理防抖计时器
    if (visibilityChangeHandler.timer) {
        clearTimeout(visibilityChangeHandler.timer);
    }
    
    // 清理终端连接恢复的计时器
    if (checkAndRestoreTerminalConnection.timers) {
        Object.values(checkAndRestoreTerminalConnection.timers).forEach(timer => {
            clearTimeout(timer);
        });
    }

    // 不立即清理WebSocket连接，而是延迟清理，给页面切换留出时间
    setTimeout(() => {
        // 只有在真正离开实例管理页面时才清理连接
        const currentPath = window.location.hash || window.location.pathname;
        if (!currentPath.includes('instances') && !showInstanceDetail.value) {
            console.log('离开实例管理页面，清理WebSocket连接');
            closeTerminalConnection();
        } else {
            console.log('仍在实例管理页面，保持WebSocket连接');
        }
    }, 1000); // 1秒延迟，给页面切换留出时间

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
    } else if (newInstance?.id === oldInstance?.id) {
        // 相同实例，检查并恢复终端状态
        console.log('相同实例，检查终端状态');
        nextTick(() => {
            checkAndRestoreTerminalConnection(activeTerminal.value);
        });
    }
}, { deep: true });
</script>

<style scoped lang="postcss">
/* 整体容器样式 */
.instance-detail-container {
    @apply bg-base-200 min-h-screen flex flex-col;
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
    @apply bg-base-100 p-4 flex justify-between items-center mb-5;
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
    @apply bg-base-100 rounded-lg shadow-sm p-6;
}

.card-title {
    @apply text-lg font-medium mb-4 pb-2 border-b border-base-300 text-base-content;
}

.info-grid {
    @apply grid grid-cols-2 gap-4;
}

.info-item {
    @apply flex gap-2;
}

.info-label {
    @apply text-base-content/60;
}

.info-value {
    @apply font-medium text-base-content;
}

/* 功能模块区域 */
.feature-modules {
    @apply bg-base-100 rounded-lg shadow-sm p-6;
}

.section-title {
    @apply text-lg font-medium mb-4 pb-2 border-b border-base-300 text-base-content;
}

.modules-grid {
    @apply grid grid-cols-2 gap-4;
}

.module-card {
    @apply bg-base-200 rounded-md p-4 flex items-center gap-3 cursor-pointer hover:bg-base-300 transition-all duration-300;
}

.module-icon {
    @apply w-10 h-10 rounded-md flex items-center justify-center;
}

/* 模块图标深色模式兼容的背景色 */
.module-icon-blue {
    @apply bg-blue-50;
}

.module-icon-purple {
    @apply bg-purple-50;
}

.module-icon-amber {
    @apply bg-amber-50;
}

.module-icon-cyan {
    @apply bg-cyan-50;
}

/* 深色模式下的图标背景色 */
[data-theme="dark"] .module-icon-blue {
    @apply bg-blue-900/30;
}

[data-theme="dark"] .module-icon-purple {
    @apply bg-purple-900/30;
}

[data-theme="dark"] .module-icon-amber {
    @apply bg-amber-900/30;
}

[data-theme="dark"] .module-icon-cyan {
    @apply bg-cyan-900/30;
}

.module-name {
    @apply flex-1 font-medium text-base-content;
}

.module-action {
    @apply text-base-content/40;
}

/* 右侧终端区域 */
.terminal-container {
    @apply w-3/5 bg-base-100 rounded-lg flex flex-col overflow-hidden;
    height: calc(100vh - 15rem);
}

.terminal-header {
    @apply bg-base-200 px-4 py-3 flex justify-between items-center;
}

.terminal-connection-status {
    @apply text-xs font-medium text-base-content;
}

.terminal-tabs {
    @apply bg-base-200/50 px-2 pt-1 border-b border-base-300;
}

.tab {
    @apply px-4 py-2 text-sm inline-block cursor-pointer transition-all duration-200;
    border: 1px solid transparent;
    margin-right: 2px;
}

.tab:hover {
    @apply bg-base-200;
}

.tab.active {
    @apply bg-base-100 border-t border-l border-r border-base-300 rounded-t-md relative -mb-px font-medium;
}

/* xterm 相关样式 */
.xterm-wrapper {
    @apply flex-1 flex flex-col bg-base-content overflow-hidden;
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
    @apply bg-base-content;
}

.terminal-input-area {
    @apply p-3 border-t border-base-300 flex items-center gap-2 bg-base-200;
}

.terminal-prompt {
    @apply text-primary font-bold;
}

.terminal-input-field {
    @apply bg-base-100 border border-base-300 rounded px-2 py-1 outline-none flex-1 text-sm text-base-content;
}

.terminal-input-field:disabled {
    @apply bg-base-200 text-base-content/50 cursor-not-allowed;
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
