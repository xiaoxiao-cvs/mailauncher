<template>
    <div v-if="isOpen" class="settings-drawer-backdrop" @click.self="handleBackdropClick">
        <div class="settings-drawer-container"> <!-- 头部 -->
            <div class="settings-header">
                <h2 class="settings-title">系统设置</h2> <button class="btn btn-ghost btn-sm btn-circle"
                    @click="closeDrawer" title="关闭">
                    <IconifyIcon icon="mdi:close" size="lg" />
                </button>
            </div>

            <!-- 主体内容 -->
            <div class="settings-content">
                <!-- 侧边栏导航 -->
                <div class="settings-sidebar">
                    <nav class="settings-nav">
                        <button v-for="tab in settingTabs" :key="tab.key" :class="[
                            'nav-item',
                            { active: activeTab === tab.key }]" @click="switchTab(tab.key)">
                            <IconifyIcon :icon="tab.icon" class="nav-icon" />
                            <span class="nav-label">{{ tab.title }}</span>
                        </button>
                    </nav>
                </div>

                <!-- 主内容区 -->
                <div class="settings-main">
                    <!-- 外观设置 -->
                    <div v-if="activeTab === 'appearance'" class="settings-panel">
                        <div class="panel-header">
                            <h3 class="panel-title">外观设置</h3>
                            <p class="panel-description">自定义界面外观和主题样式</p>
                        </div>

                        <div class="settings-section">
                            <!-- 主题模式 -->
                            <div class="setting-group">
                                <h4 class="group-title">主题模式</h4>
                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">跟随系统/手动切换</label>
                                        <p class="setting-desc">切换系统界面的明暗主题，支持跟随系统设置</p>
                                    </div>
                                    <div class="setting-control">
                                        <div class="theme-mode-control">
                                            <label class="mode-option">
                                                <input type="radio" name="themeMode" value="system" v-model="themeMode"
                                                    @change="changeThemeMode" /> <span class="option-label">
                                                    <IconifyIcon icon="mdi:theme-light-dark" class="option-icon" />
                                                    跟随系统
                                                </span>
                                            </label>
                                            <label class="mode-option">
                                                <input type="radio" name="themeMode" value="light" v-model="themeMode"
                                                    @change="changeThemeMode" /> <span class="option-label">
                                                    <IconifyIcon icon="mdi:weather-sunny" class="option-icon" />
                                                    亮色模式
                                                </span>
                                            </label>
                                            <label class="mode-option">
                                                <input type="radio" name="themeMode" value="dark" v-model="themeMode"
                                                    @change="changeThemeMode" /> <span class="option-label">
                                                    <IconifyIcon icon="mdi:weather-night" class="option-icon" />
                                                    暗色模式
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 其他外观设置 -->
                            <div class="setting-group">
                                <h4 class="group-title">界面调整</h4>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">动画效果</label>
                                        <p class="setting-desc">启用或禁用界面动画</p>
                                    </div>
                                    <div class="setting-control">
                                        <label class="toggle-switch">
                                            <input type="checkbox" v-model="enableAnimations" @change="toggleAnimations"
                                                class="toggle-input" />
                                            <span class="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">字体大小</label>
                                        <p class="setting-desc">调整界面文字的显示大小</p>
                                    </div>
                                    <div class="setting-control">
                                        <div class="font-size-control">
                                            <input type="range" min="12" max="18" v-model="fontSize"
                                                @input="changeFontSize" class="font-size-slider" />
                                            <span class="font-size-value">{{ fontSize }}px</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">布局密度</label>
                                        <p class="setting-desc">选择界面元素的间距紧密程度</p>
                                    </div>
                                    <div class="setting-control">
                                        <div class="density-options">
                                            <button
                                                :class="['density-btn', { active: layoutDensity === 'comfortable' }]"
                                                @click="setLayoutDensity('comfortable')">
                                                舒适
                                            </button>
                                            <button :class="['density-btn', { active: layoutDensity === 'compact' }]"
                                                @click="setLayoutDensity('compact')">
                                                紧凑
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> <!-- 关于标签页 -->
                    <div v-else-if="activeTab === 'about'" class="settings-panel">
                        <div class="panel-header">
                            <h3 class="panel-title">关于 MaiLauncher</h3>
                            <p class="panel-description">查看应用版本信息和相关资源</p>
                        </div>

                        <div class="settings-section">
                            <!-- 应用信息 -->
                            <div class="setting-group">
                                <h4 class="group-title">应用信息</h4>

                                <div class="about-app-info">
                                    <div class="app-icon">
                                        <IconifyIcon icon="mdi:rocket-launch" class="app-icon-img" />
                                    </div>
                                    <div class="app-details">
                                        <h5 class="app-name">MaiLauncher</h5>
                                        <p class="app-description">MaiBot 实例管理和部署工具</p>
                                        <div class="version-details">
                                            <div class="version-item">
                                                <span class="version-label">前端版本:</span>
                                                <span class="version-value">0.1.0-Preview.1</span>
                                            </div>
                                            <div class="version-item">
                                                <span class="version-label">后端版本:</span>
                                                <span class="version-value">0.1.0-Preview.1</span>
                                            </div>
                                            <div class="version-item">
                                                <span class="version-label">构建时间:</span>
                                                <span class="version-value">{{ buildDate }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 系统信息 -->
                            <div class="setting-group">
                                <h4 class="group-title">系统信息</h4>
                                <div class="system-info-grid">
                                    <div class="system-info-item">
                                        <span class="info-label">操作系统:</span>
                                        <span class="info-value">{{ systemInfo.platform }}</span>
                                    </div>
                                    <div class="system-info-item">
                                        <span class="info-label">系统架构:</span>
                                        <span class="info-value">{{ systemInfo.arch }}</span>
                                    </div>
                                    <div class="system-info-item">
                                        <span class="info-label">Node.js 版本:</span>
                                        <span class="info-value">{{ systemInfo.nodeVersion }}</span>
                                    </div>
                                    <div class="system-info-item">
                                        <span class="info-label">浏览器引擎:</span>
                                        <span class="info-value">{{ systemInfo.userAgent }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- 开源信息 -->
                            <div class="setting-group">
                                <h4 class="group-title">开源信息</h4>
                                <div class="open-source-info">
                                    <div class="license-info">
                                        <p><strong>许可证:</strong> GNU General Public License v3.0</p>
                                        <p><strong>项目地址:</strong>
                                            <a href="https://github.com/MaiM-with-u/MaiLauncher" target="_blank"
                                                class="link link-primary">
                                                GitHub Repository
                                            </a>
                                        </p>
                                        <p><strong>Bug 反馈:</strong>
                                            <a href="https://github.com/MaiM-with-u/MaiLauncher/issues" target="_blank"
                                                class="link link-primary">
                                                提交 Issue
                                            </a>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- 依赖信息 -->
                            <div class="setting-group">
                                <h4 class="group-title">主要依赖</h4>
                                <div class="dependencies-info">
                                    <div class="dependency-item">
                                        <span class="dep-name">Vue.js</span>
                                        <span class="dep-version">3.5.13</span>
                                    </div>
                                    <div class="dependency-item">
                                        <span class="dep-name">Tauri</span>
                                        <span class="dep-version">2.x</span>
                                    </div>
                                    <div class="dependency-item">
                                        <span class="dep-name">Vite</span>
                                        <span class="dep-version">6.0.3</span>
                                    </div>
                                    <div class="dependency-item">
                                        <span class="dep-name">DaisyUI</span>
                                        <span class="dep-version">4.5.0</span>
                                    </div>
                                    <div class="dependency-item">
                                        <span class="dep-name">Python Backend</span>
                                        <span class="dep-version">3.10+</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> <!-- 高级设置 -->
                    <div v-else-if="activeTab === 'advanced'" class="settings-panel">
                        <div class="panel-header">
                            <h3 class="panel-title">高级设置</h3>
                            <p class="panel-description">配置高级功能和调试选项</p>
                        </div>

                        <div class="settings-section">
                            <!-- 模拟数据控制 -->
                            <div class="setting-group">
                                <h4 class="group-title">数据源设置</h4>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">强制禁用模拟数据</label>
                                        <p class="setting-desc">启用后，即使后端连接失败也不会使用模拟数据。适合生产环境使用。</p>
                                    </div>
                                    <div class="setting-control">
                                        <label class="toggle-switch">
                                            <input type="checkbox" v-model="forceMockDisabled"
                                                @change="toggleForceMockDisabled" class="toggle-input" />
                                            <span class="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">当前模拟数据状态</label>
                                        <p class="setting-desc">显示当前应用是否正在使用模拟数据</p>
                                    </div>
                                    <div class="setting-control">
                                        <div class="status-indicator">
                                            <span
                                                :class="['status-badge', isMockDataActive ? 'status-active' : 'status-inactive']">
                                                {{ isMockDataActive ? '使用模拟数据' : '使用真实数据' }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 调试设置 -->
                            <div class="setting-group">
                                <h4 class="group-title">调试设置</h4>
                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">后端连接状态</label>
                                        <p class="setting-desc">手动检查后端服务器连接状态，支持自动重连</p>
                                    </div>
                                    <div class="setting-control">
                                        <div class="connection-controls">
                                            <div class="connection-status">
                                                <span :class="['status-badge', backendConnectionStatus]">
                                                    <IconifyIcon :icon="connectionStatusIcon" />
                                                    {{ connectionStatusText }}
                                                </span>
                                            </div>
                                            <div class="connection-buttons">
                                                <button class="btn btn-outline btn-sm" @click="checkBackendConnection"
                                                    :class="{ 'loading': isCheckingConnection }"
                                                    :disabled="isCheckingConnection">
                                                    <IconifyIcon v-if="!isCheckingConnection" icon="mdi:refresh" />
                                                    {{ isCheckingConnection ? '检查中...' : '重新检查' }}
                                                </button>
                                                <button v-if="!isConnected && !forceMockDisabled"
                                                    class="btn btn-primary btn-sm" @click="attemptReconnection"
                                                    :class="{ 'loading': isReconnecting }" :disabled="isReconnecting">
                                                    <IconifyIcon v-if="!isReconnecting" icon="mdi:connection" />
                                                    {{ isReconnecting ? '重连中...' : '尝试重连' }}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">清除本地缓存</label>
                                        <p class="setting-desc">清除应用的本地存储和缓存数据</p>
                                    </div>
                                    <div class="setting-control">
                                        <button class="btn btn-outline btn-sm btn-warning" @click="clearLocalData">
                                            <IconifyIcon icon="mdi:delete-sweep" />
                                            清除缓存
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 其他标签页的占位内容 -->
                    <div v-else class="settings-panel">
                        <div class="panel-header">
                            <h3 class="panel-title">{{ getCurrentTabTitle() }}</h3>
                            <p class="panel-description">功能开发中...</p>
                        </div>
                        <div class="coming-soon">
                            <IconifyIcon icon="mdi:construction" class="coming-soon-icon" />
                            <p>此功能正在开发中，敬请期待</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 底部 -->
            <div class="settings-footer">
                <div class="footer-info">
                    <span class="version-info">版本 0.1.0-Preview.1</span>
                </div>
                <div class="footer-actions"> <button class="btn btn-ghost btn-sm" @click="resetSettings">
                        <IconifyIcon icon="mdi:refresh" size="sm" />
                        重置设置
                    </button>
                    <button class="btn btn-primary btn-sm" @click="closeDrawer">
                        <IconifyIcon icon="mdi:check" size="sm" />
                        完成
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, inject, nextTick } from 'vue'
import { useDarkMode, useTheme } from '../../services/theme'
import settingsService from '../../services/settingsService'
import IconifyIcon from '../common/IconifyIcon.vue'
import './SettingsDrawer.css'

// 注入依赖
const emitter = inject('emitter', null)

// 属性定义
const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true
    }
})

// 事件定义
const emit = defineEmits(['close'])

// 设置标签页
const activeTab = ref('appearance')

// 设置标签页定义
const settingTabs = [
    { key: 'appearance', title: '外观', icon: 'mdi:palette' },
    { key: 'system', title: '系统', icon: 'mdi:cog' },
    { key: 'notifications', title: '通知', icon: 'mdi:bell' },
    { key: 'privacy', title: '隐私', icon: 'mdi:shield-lock' },
    { key: 'about', title: '关于', icon: 'mdi:information' },
    { key: 'advanced', title: '高级', icon: 'mdi:tune' }
]

// 使用主题和暗色模式
const { currentTheme, availableThemes, setTheme } = useTheme()
const { darkMode, toggleDarkMode } = useDarkMode(emitter)

// 确保 currentTheme 是响应式的
watch(currentTheme, (newTheme) => {
    console.log('currentTheme 变化:', newTheme)
}, { immediate: true })

// 主题模式状态 (system, light, dark)
const themeMode = ref(localStorage.getItem('themeMode') || 'system')

// 系统暗色模式检测
const systemDarkMode = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)

// 外观设置状态
const isDarkMode = computed(() => {
    if (themeMode.value === 'system') {
        return systemDarkMode.value
    }
    return themeMode.value === 'dark'
})

const enableAnimations = ref(localStorage.getItem('enableAnimations') !== 'false')
const fontSize = ref(parseInt(localStorage.getItem('fontSize') || '14'))
const layoutDensity = ref(localStorage.getItem('layoutDensity') || 'comfortable')

// 高级设置状态
const forceMockDisabled = ref(localStorage.getItem('forceMockDisabled') === 'true')
const isCheckingConnection = ref(false)
const isReconnecting = ref(false)
const isConnected = ref(false)
const lastConnectionCheck = ref(null)

// 计算属性：后端连接状态
const backendConnectionStatus = computed(() => {
    if (isCheckingConnection.value || isReconnecting.value) return 'status-checking'
    if (isConnected.value) return 'status-connected'
    if (forceMockDisabled.value) return 'status-error'
    return 'status-mock'
})

const connectionStatusIcon = computed(() => {
    if (isCheckingConnection.value || isReconnecting.value) return 'mdi:loading'
    if (isConnected.value) return 'mdi:check-circle'
    if (forceMockDisabled.value) return 'mdi:alert-circle'
    return 'mdi:database'
})

const connectionStatusText = computed(() => {
    if (isCheckingConnection.value) return '检查中...'
    if (isReconnecting.value) return '重连中...'
    if (isConnected.value) return '已连接后端'
    if (forceMockDisabled.value) return '连接失败'
    return '使用模拟数据'
})

// 计算属性：检查当前是否使用模拟数据
const isMockDataActive = computed(() => {
    return localStorage.getItem('useMockData') === 'true'
})

// 关于页面数据
const buildDate = ref('2025-01-01 12:00:00')
const systemInfo = ref({
    platform: 'Unknown',
    arch: 'Unknown',
    nodeVersion: 'Unknown',
    userAgent: 'Unknown'
})

// 方法
const switchTab = (tab) => {
    activeTab.value = tab
    settingsService.setTab(tab)
}

const closeDrawer = () => {
    emit('close')
    settingsService.closeSettings()
}

const handleBackdropClick = () => {
    closeDrawer()
}

const getCurrentTabTitle = () => {
    const tab = settingTabs.find(t => t.key === activeTab.value)
    return tab ? tab.title : '设置'
}

// 初始化系统信息
const initSystemInfo = () => {
    // 设置构建时间
    buildDate.value = new Date().toLocaleString('zh-CN')

    // 检测系统信息
    systemInfo.value = {
        platform: navigator.platform || 'Unknown',
        arch: navigator.userAgent.includes('x64') ? 'x64' :
            navigator.userAgent.includes('x86') ? 'x86' : 'Unknown',
        nodeVersion: process?.versions?.node || 'Unknown',
        userAgent: navigator.userAgent.substring(0, 80) + '...'
    }
}

// 主题切换
const toggleThemeMode = () => {
    toggleDarkMode()
}

// 主题模式改变
const changeThemeMode = () => {
    console.log('主题模式改变:', themeMode.value, new Date().toISOString());
    localStorage.setItem('themeMode', themeMode.value)

    // 直接应用对应主题，不再重复触发事件
    if (themeMode.value === 'system') {
        // 跟随系统
        applySystemTheme()
    } else if (themeMode.value === 'light') {
        // 强制亮色
        applyLightTheme()
    } else if (themeMode.value === 'dark') {
        // 强制暗色
        applyDarkTheme()
    }

    // 确保设置面板样式正确应用
    nextTick(() => {
        ensureSettingsDrawerStyles()
    })

    // 注意：setTheme 函数中已经处理了事件触发，这里不再重复触发
}

// 确保设置抽屉样式正确应用
const ensureSettingsDrawerStyles = () => {
    const container = document.querySelector('.settings-drawer-container')
    if (container) {
        // 确保设置抽屉保持不透明背景
        container.style.backgroundColor = 'hsl(var(--b1))'
        container.style.opacity = '1'

        // 移除任何可能导致透明的类
        container.classList.remove('transparent', 'backdrop-blur')

        // 根据当前主题应用正确的文字颜色，但只影响设置抽屉内部
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark' ||
            themeMode.value === 'dark' ||
            (themeMode.value === 'system' && systemDarkMode.value)

        // 只为设置抽屉内的元素应用样式，不影响页面其他部分
        if (isDarkMode) {
            container.classList.add('force-dark-text')
        } else {
            container.classList.remove('force-dark-text')
        }

        // 强制应用文本颜色到设置抽屉内的关键元素，使用容器作为范围限制
        const settingsSelectors = [
            '.settings-title', '.panel-title', '.setting-label',
            '.setting-desc', '.panel-description', '.version-info',
            '.nav-label', '.option-label', '.group-title',
            'input', 'select', 'textarea', 'button', '.btn',
            '.theme-option', '.theme-name', '.footer-info'
        ]

        settingsSelectors.forEach(selector => {
            const elements = container.querySelectorAll(selector)
            elements.forEach(el => {
                el.style.color = 'hsl(var(--bc))'
            })
        })
    }
}

// 强制应用暗色模式文本样式（保留原方法以兼容现有代码）
const forceDarkModeTextStyles = () => {
    ensureSettingsDrawerStyles()
}

// 应用系统主题
const applySystemTheme = () => {
    console.log('应用系统主题', new Date().toISOString());
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    darkMode.value = isDark
    // 使用setTheme来统一处理主题切换，避免重复操作DOM
    setTheme(isDark ? 'dark' : 'light')
}

// 应用亮色主题
const applyLightTheme = () => {
    console.log('应用亮色主题', new Date().toISOString());
    darkMode.value = false
    // 使用setTheme来统一处理主题切换，避免重复操作DOM
    setTheme('light')
}

// 应用暗色主题
const applyDarkTheme = () => {
    console.log('应用暗色主题', new Date().toISOString());
    darkMode.value = true
    // 使用setTheme来统一处理主题切换，避免重复操作DOM
    setTheme('dark')
}

// 动画切换
const toggleAnimations = () => {
    if (enableAnimations.value) {
        document.documentElement.classList.remove('no-animations')
    } else {
        document.documentElement.classList.add('no-animations')
    }
    localStorage.setItem('enableAnimations', enableAnimations.value)
}

// 字体大小调整
const changeFontSize = () => {
    document.documentElement.style.setProperty('--base-font-size', `${fontSize.value}px`)
    localStorage.setItem('fontSize', fontSize.value)
}

// 布局密度设置
const setLayoutDensity = (density) => {
    layoutDensity.value = density
    document.documentElement.setAttribute('data-density', density)
    localStorage.setItem('layoutDensity', density)
}

// 重置设置
const resetSettings = () => {
    if (confirm('确定要重置所有设置吗？这将恢复默认配置。')) {
        settingsService.resetSettings()

        // 重新加载设置
        themeMode.value = 'system'
        enableAnimations.value = true
        fontSize.value = 14
        layoutDensity.value = 'comfortable'
        forceMockDisabled.value = false

        // 应用设置
        changeThemeMode()
        toggleAnimations()
        changeFontSize()
        setLayoutDensity('comfortable')
        toggleForceMockDisabled()
    }
}

// 高级设置方法
const toggleForceMockDisabled = () => {
    localStorage.setItem('forceMockDisabled', forceMockDisabled.value.toString())

    if (forceMockDisabled.value) {
        // 强制禁用模拟数据，立即关闭模拟数据模式
        localStorage.setItem('useMockData', 'false')
        console.log('模拟数据功能已被强制禁用')

        // 通知用户
        import('../../services/toastService').then(({ default: toastService }) => {
            toastService.info('模拟数据功能已禁用，应用将只使用真实后端数据')
        })
    } else {
        console.log('模拟数据功能禁用已解除')

        // 通知用户
        import('../../services/toastService').then(({ default: toastService }) => {
            toastService.info('模拟数据功能禁用已解除，后端连接失败时将自动启用模拟数据')
        })
    }
}

const checkBackendConnection = async () => {
    isCheckingConnection.value = true
    lastConnectionCheck.value = new Date()

    try {
        // 动态导入需要的服务
        const [{ default: apiService }, { default: toastService }] = await Promise.all([
            import('../../services/apiService'),
            import('../../services/toastService')
        ])

        console.log('开始检查后端连接...')
        const connected = await apiService.testBackendConnection()
        isConnected.value = connected

        if (connected) {
            toastService.success('后端连接正常')
            localStorage.setItem('useMockData', 'false')

            // 通知App.vue更新状态
            window.dispatchEvent(new CustomEvent('backend-connection-changed', {
                detail: { connected: true, useMockData: false }
            }))
        } else {
            if (!forceMockDisabled.value) {
                localStorage.setItem('useMockData', 'true')
                toastService.warning('后端连接失败，已启用模拟数据模式')

                // 通知App.vue更新状态
                window.dispatchEvent(new CustomEvent('backend-connection-changed', {
                    detail: { connected: false, useMockData: true }
                }))
            } else {
                toastService.error('后端连接失败，且模拟数据功能已被禁用')

                // 通知App.vue更新状态
                window.dispatchEvent(new CustomEvent('backend-connection-changed', {
                    detail: { connected: false, useMockData: false }
                }))
            }
        }
    } catch (error) {
        console.error('检查后端连接时出错:', error)
        isConnected.value = false
        const { default: toastService } = await import('../../services/toastService')
        toastService.error('检查连接时出错: ' + error.message)
    } finally {
        isCheckingConnection.value = false
    }
}

const attemptReconnection = async () => {
    isReconnecting.value = true

    try {
        const [{ default: apiService }, { default: toastService }] = await Promise.all([
            import('../../services/apiService'),
            import('../../services/toastService')
        ])

        console.log('开始尝试重连后端...')
        toastService.info('正在尝试重新连接后端服务...')

        // 尝试多次连接
        const maxRetries = 3
        let connected = false

        for (let i = 0; i < maxRetries && !connected; i++) {
            console.log(`重连尝试 ${i + 1}/${maxRetries}`)

            if (i > 0) {
                // 等待一段时间后再试
                await new Promise(resolve => setTimeout(resolve, 2000))
            }

            connected = await apiService.testBackendConnection()

            if (connected) {
                isConnected.value = true
                localStorage.setItem('useMockData', 'false')
                toastService.success('重连成功！已连接到后端服务')

                // 通知App.vue更新状态
                window.dispatchEvent(new CustomEvent('backend-connection-changed', {
                    detail: { connected: true, useMockData: false }
                }))
                break
            }
        }

        if (!connected) {
            isConnected.value = false
            toastService.error(`重连失败，已尝试 ${maxRetries} 次`)
        }

    } catch (error) {
        console.error('重连时出错:', error)
        isConnected.value = false
        const { default: toastService } = await import('../../services/toastService')
        toastService.error('重连时出错: ' + error.message)
    } finally {
        isReconnecting.value = false
    }
}

const clearLocalData = async () => {
    if (confirm('确定要清除所有本地缓存数据吗？这将清除设置、缓存和历史记录。')) {
        try {
            // 保存重要设置
            const themeModeBak = themeMode.value
            const forceMockDisabledBak = forceMockDisabled.value

            // 清除localStorage
            localStorage.clear()

            // 恢复重要设置
            localStorage.setItem('themeMode', themeModeBak)
            localStorage.setItem('forceMockDisabled', forceMockDisabledBak.toString())

            // 通知用户
            const { default: toastService } = await import('../../services/toastService')
            toastService.success('本地缓存已清除')

            // 刷新页面以重新初始化
            setTimeout(() => {
                window.location.reload()
            }, 1000)
        } catch (error) {
            console.error('清除缓存时出错:', error)
            const { default: toastService } = await import('../../services/toastService')
            toastService.error('清除缓存失败: ' + error.message)
        }
    }
}

// ESC键处理
const handleEscKey = (e) => {
    if (e.key === 'Escape' && props.isOpen) {
        closeDrawer()
    }
}

// 监听设置变化
watch(() => props.isOpen, (newValue) => {
    if (newValue) {
        // 当设置面板打开时，不要改变页面主题，只添加必要的类
        document.body.classList.add('settings-open')

        // 确保设置抽屉样式正确
        nextTick(() => {
            ensureSettingsDrawerStyles()
        })
    } else {
        document.body.classList.remove('settings-open')
    }
})

// 生命周期
onMounted(() => {
    document.addEventListener('keydown', handleEscKey)

    // 初始化系统信息
    initSystemInfo()

    // 初始化连接状态
    const currentUseMockData = localStorage.getItem('useMockData') === 'true'
    isConnected.value = !currentUseMockData

    // 从设置服务获取当前标签页
    const currentTab = settingsService.getTab()
    if (currentTab) {
        activeTab.value = currentTab
    }

    // 同步当前主题
    const domTheme = document.documentElement.getAttribute('data-theme')
    const localTheme = localStorage.getItem('theme')
    const actualTheme = domTheme || localTheme || 'light'

    if (currentTheme.value !== actualTheme) {
        console.log('🔄 同步主题状态:', { current: currentTheme.value, actual: actualTheme })
        currentTheme.value = actualTheme
    }

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (e) => {
        systemDarkMode.value = e.matches
        if (themeMode.value === 'system') {
            applySystemTheme()
        }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)    // 添加主题变化全局监听器
    const handleThemeChanged = (event) => {
        console.log('SettingsDrawer 接收到主题变更事件:', event.type, new Date().toISOString());

        // 强制刷新设置抽屉的样式，但不影响页面其他部分
        nextTick(() => {
            ensureSettingsDrawerStyles()
        })
    }

    // 只监听theme-changed-after事件，这样可以避免与其他处理冲突
    window.addEventListener('theme-changed-after', handleThemeChanged)    // 初始化主题模式
    if (themeMode.value === 'system') {
        applySystemTheme()
    }

    // 确保初始应用暗色模式文本样式
    nextTick(() => {
        forceDarkModeTextStyles()
    })

    // 在组件卸载时清理监听器
    onBeforeUnmount(() => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange)
        window.removeEventListener('theme-changed-after', handleThemeChanged)
    })
})

onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleEscKey)
    document.body.classList.remove('settings-open')
})
</script>
