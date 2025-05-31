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

    // 注意：setTheme 函数中已经处理了事件触发，这里不再重复触发
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

        // 应用设置
        changeThemeMode()
        toggleAnimations()
        changeFontSize()
        setLayoutDensity('comfortable')
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
        document.body.classList.add('settings-open')
    } else {
        document.body.classList.remove('settings-open')
    }
})

// 生命周期
onMounted(() => {
    document.addEventListener('keydown', handleEscKey)

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

        // 强制刷新设置抽屉的样式
        nextTick(() => {
            // 确保设置抽屉保持不透明
            const container = document.querySelector('.settings-drawer-container')
            if (container) {
                container.style.backgroundColor = 'var(--b1)'
                container.style.opacity = '1'
            }
        })
    }

    // 只监听theme-changed-after事件，这样可以避免与其他处理冲突
    window.addEventListener('theme-changed-after', handleThemeChanged)

    // 初始化主题模式
    if (themeMode.value === 'system') {
        applySystemTheme()
    }    // 在组件卸载时清理监听器
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

<style scoped>
/* 背景遮罩 */
.settings-drawer-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: backdrop-fade-in 0.2s ease;
}

/* 确保深色模式下背景遮罩效果也正常 */
:root[data-theme="dark"] .settings-drawer-backdrop {
    background: rgba(0, 0, 0, 0.7);
}

@keyframes backdrop-fade-in {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

/* 主容器 */
.settings-drawer-container {
    width: 90%;
    max-width: 1000px;
    height: 85%;
    max-height: 700px;
    background-color: hsl(var(--b1) / 1) !important;
    /* 确保背景不透明 */
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4),
        0 8px 32px rgba(0, 0, 0, 0.2),
        0 0 0 1px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid hsl(var(--b3) / 0.3);
    animation: container-scale-in 0.2s ease;
    /* 确保在任何主题模式下都不透明 */
    opacity: 1 !important;
}

/* 深色模式下的样式调整 */
:root[data-theme="dark"] .settings-drawer-container,
.dark-mode .settings-drawer-container {
    background-color: hsl(var(--b1) / 1) !important;
    border-color: hsl(var(--b3) / 0.5);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6),
        0 8px 32px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.05);
}

@keyframes container-scale-in {
    from {
        opacity: 0;
        transform: scale(0.95);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

/* 头部 */
.settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 2rem;
    background: hsl(var(--b2) / 1) !important;
    /* 保证头部不透明 */
    border-bottom: 1px solid hsl(var(--b3) / 0.3);
}

.settings-header .btn {
    color: hsl(var(--bc));
}

.settings-header .btn:hover {
    background: hsl(var(--b3) / 0.3);
    color: hsl(var(--bc));
}

.settings-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: hsl(var(--bc));
    margin: 0;
}

/* 主体内容 */
.settings-content {
    display: flex;
    flex: 1;
    overflow: hidden;
}

/* 侧边栏 */
.settings-sidebar {
    width: 240px;
    background: hsl(var(--b2) / 1) !important;
    /* 确保侧边栏不透明 */
    border-right: 1px solid hsl(var(--b3) / 0.3);
    padding: 1.5rem 0;
    overflow-y: auto;
    box-shadow: inset -1px 0 0 rgba(0, 0, 0, 0.1),
        2px 0 8px rgba(0, 0, 0, 0.08);
}

.settings-nav {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0 1rem;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: hsl(var(--bc) / 0.7);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
    width: 100%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.nav-item:hover {
    background: hsl(var(--b3) / 0.5);
    color: hsl(var(--bc));
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12),
        0 1px 3px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
}

.nav-item.active {
    background: hsl(var(--p) / 0.1);
    color: hsl(var(--p));
    border-left: 3px solid hsl(var(--p));
    margin-left: -1rem;
    padding-left: calc(1rem - 3px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15),
        0 1px 4px rgba(0, 0, 0, 0.1),
        inset 3px 0 0 hsl(var(--p));
}

.nav-icon {
    font-size: 1.125rem;
    flex-shrink: 0;
}

.nav-label {
    flex: 1;
}

/* 主内容区 */
.settings-main {
    flex: 1;
    overflow-y: auto;
    background: hsl(var(--b1));
}

.settings-panel {
    padding: 2rem;
    max-width: 600px;
    animation: panel-slide-in 0.2s ease;
}

@keyframes panel-slide-in {
    from {
        opacity: 0;
        transform: translateX(20px);
    }

    to {
        opacity: 1;
        transform: translateX(0);
    }
}

/* 面板头部 */
.panel-header {
    margin-bottom: 2rem;
}

.panel-title {
    font-size: 1.75rem;
    font-weight: 600;
    color: hsl(var(--bc));
    margin: 0 0 0.5rem 0;
}

.panel-description {
    color: hsl(var(--bc) / 0.6);
    margin: 0;
    font-size: 0.95rem;
}

/* 设置区域 */
.settings-section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.setting-group {
    background: hsl(var(--b2) / 0.5);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid hsl(var(--b3) / 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08),
        0 1px 4px rgba(0, 0, 0, 0.05);
}

/* 深色模式下的设置组背景 */
:root[data-theme="dark"] .setting-group,
.dark-mode .setting-group {
    background: hsl(var(--b2) / 0.9) !important;
    border-color: hsl(var(--b3) / 0.5);
}

.group-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: hsl(var(--bc));
    margin: 0 0 1rem 0;
}

.setting-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.5rem;
    padding: 1rem 0;
    border-bottom: 1px solid hsl(var(--b3) / 0.2);
}

.setting-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.setting-info {
    flex: 1;
}

.setting-label {
    display: block;
    font-size: 1rem;
    font-weight: 500;
    color: hsl(var(--bc));
    margin-bottom: 0.25rem;
}

.setting-desc {
    font-size: 0.875rem;
    color: hsl(var(--bc) / 0.6);
    margin: 0;
    line-height: 1.4;
}

.setting-control {
    flex-shrink: 0;
}

/* 主题模式控制 */
.theme-mode-control {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 200px;
}

.mode-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border: 2px solid hsl(var(--b3) / 0.3);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    background: hsl(var(--b1));
}

.mode-option:hover {
    border-color: hsl(var(--p) / 0.5);
    background: hsl(var(--b2) / 0.5);
}

.mode-option input[type="radio"] {
    width: 1rem;
    height: 1rem;
    margin: 0;
    accent-color: hsl(var(--p));
}

.mode-option input[type="radio"]:checked+.option-label {
    color: hsl(var(--p));
    font-weight: 600;
}

.mode-option:has(input[type="radio"]:checked) {
    border-color: hsl(var(--p));
    background: hsl(var(--p) / 0.1);
    box-shadow: 0 2px 8px hsl(var(--p) / 0.2);
}

.option-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: hsl(var(--bc) / 0.8);
    transition: all 0.15s ease;
}

.option-icon {
    font-size: 1rem;
    color: hsl(var(--bc) / 0.6);
    transition: color 0.15s ease;
}

.mode-option:has(input[type="radio"]:checked) .option-icon {
    color: hsl(var(--p));
}

/* 主题选择器 */
.theme-selector {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 0.75rem;
    max-width: 320px;
    margin-bottom: 1rem;
}

/* 刷新前端区域 */
.refresh-frontend-section {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 1rem;
    background: hsl(var(--warning) / 0.1);
    border: 1px solid hsl(var(--warning) / 0.3);
    border-radius: 8px;
}

.refresh-hint {
    font-size: 0.75rem;
    color: hsl(var(--bc) / 0.6);
    margin: 0;
    line-height: 1.3;
    font-style: italic;
}

.theme-option {
    width: 80px;
    height: 50px;
    border-radius: 8px;
    border: 2px solid transparent;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.15s ease;
    display: flex;
    align-items: end;
    justify-content: center;
    padding: 0.25rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15),
        0 1px 3px rgba(0, 0, 0, 0.1);
}

.theme-option:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2),
        0 3px 8px rgba(0, 0, 0, 0.15);
}

.theme-option.active {
    border-color: hsl(var(--p));
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25),
        0 3px 10px rgba(0, 0, 0, 0.2),
        0 0 0 3px hsl(var(--p) / 0.3);
}

.theme-check-icon {
    position: absolute;
    top: 4px;
    right: 4px;
    background: hsl(var(--p));
    color: white;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    animation: checkmark-appear 0.3s ease-out;
}

@keyframes checkmark-appear {
    from {
        opacity: 0;
        transform: scale(0.5);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

.theme-option:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
}

.theme-name {
    font-size: 0.75rem;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    background: rgba(0, 0, 0, 0.3);
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    white-space: nowrap;
}

/* 普通切换开关 */
.toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    cursor: pointer;
}

.toggle-input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: hsl(var(--b3));
    border-radius: 12px;
    transition: 0.2s ease;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2),
        0 1px 2px rgba(0, 0, 0, 0.1);
}

.toggle-slider:before {
    content: "";
    position: absolute;
    height: 18px;
    width: 18px;
    left: 3px;
    top: 3px;
    background: white;
    border-radius: 50%;
    transition: 0.2s ease;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25),
        0 1px 3px rgba(0, 0, 0, 0.15);
}

.toggle-input:checked+.toggle-slider {
    background: hsl(var(--p));
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1),
        0 1px 2px rgba(0, 0, 0, 0.1);
}

.toggle-input:checked+.toggle-slider:before {
    transform: translateX(20px);
}

/* 字体大小控制 */
.font-size-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.font-size-slider {
    width: 120px;
    height: 4px;
    background: hsl(var(--b3));
    border-radius: 2px;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
}

.font-size-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: hsl(var(--p));
    border-radius: 50%;
    cursor: pointer;
}

.font-size-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: hsl(var(--p));
    border-radius: 50%;
    cursor: pointer;
    border: none;
}

.font-size-value {
    font-size: 0.875rem;
    color: hsl(var(--bc) / 0.7);
    min-width: 40px;
}

/* 密度选项 */
.density-options {
    display: flex;
    background: hsl(var(--b3) / 0.3);
    border-radius: 6px;
    padding: 2px;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.density-btn {
    padding: 0.5rem 1rem;
    border: none;
    background: transparent;
    color: hsl(var(--bc) / 0.7);
    font-size: 0.875rem;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: none;
}

.density-btn:hover {
    background: hsl(var(--b3) / 0.5);
    color: hsl(var(--bc));
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.density-btn.active {
    background: hsl(var(--p));
    color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2),
        0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 开发中提示 */
.coming-soon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
    color: hsl(var(--bc) / 0.6);
}

.coming-soon-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: hsl(var(--bc) / 0.4);
}

/* 底部 */
.settings-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 2rem;
    background: hsl(var(--b2) / 1) !important;
    /* 确保底部不透明 */
    border-top: 1px solid hsl(var(--b3) / 0.3);
}

.footer-info {
    display: flex;
    align-items: center;
}

.version-info {
    font-size: 0.875rem;
    color: hsl(var(--bc) / 0.6);
}

.footer-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

/* 按钮样式 */
.btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: none;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
}

.btn-ghost {
    background: transparent;
    color: hsl(var(--bc) / 0.7);
    border: 1px solid hsl(var(--b3) / 0.5);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn-ghost:hover {
    background: hsl(var(--b3) / 0.3);
    color: hsl(var(--bc));
    border-color: hsl(var(--b3));
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}

/* 确保图标在按钮中正确显示 */
.btn .iconify {
    color: inherit;
    vertical-align: middle;
}

.btn-primary {
    background: hsl(var(--p));
    color: hsl(var(--pc)) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2),
        0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn-primary:hover {
    background: hsl(var(--p) / 0.9);
    color: hsl(var(--pc)) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25),
        0 2px 6px rgba(0, 0, 0, 0.15);
}

.btn-warning {
    background: hsl(var(--warning));
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2),
        0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn-warning:hover {
    background: hsl(var(--warning) / 0.9);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25),
        0 2px 6px rgba(0, 0, 0, 0.15);
}

.btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
}

.btn-circle {
    width: 2rem;
    height: 2rem;
    padding: 0;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .settings-drawer-container {
        width: 95%;
        height: 90%;
    }

    .settings-content {
        flex-direction: column;
    }

    .settings-sidebar {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid hsl(var(--b3) / 0.3);
        padding: 1rem 0;
    }

    .settings-nav {
        flex-direction: row;
        overflow-x: auto;
        padding: 0 1rem;
        gap: 0.5rem;
    }

    .nav-item {
        flex-shrink: 0;
        white-space: nowrap;
    }

    .settings-panel {
        padding: 1.5rem;
    }

    .setting-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
    }

    .theme-selector {
        grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    }
}

/* 滚动条样式 */
.settings-sidebar::-webkit-scrollbar,
.settings-main::-webkit-scrollbar {
    width: 6px;
}

.settings-sidebar::-webkit-scrollbar-track,
.settings-main::-webkit-scrollbar-track {
    background: transparent;
}

.settings-sidebar::-webkit-scrollbar-thumb,
.settings-main::-webkit-scrollbar-thumb {
    background: hsl(var(--bc) / 0.2);
    border-radius: 3px;
}

.settings-sidebar::-webkit-scrollbar-thumb:hover,
.settings-main::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--bc) / 0.3);
}

/* 针对暗色主题的额外样式 */
[data-theme="dark"] .settings-drawer-container {
    background: hsl(var(--b1));
    border-color: hsl(var(--b3) / 0.3);
}

[data-theme="dark"] .btn-primary .iconify {
    color: hsl(var(--pc)) !important;
}

[data-theme="dark"] .btn-ghost .iconify {
    color: inherit;
}

[data-theme="dark"] .settings-header .btn .iconify {
    color: hsl(var(--bc));
}

/* 强制确保图标可见性 */
.btn .iconify {
    opacity: 1 !important;
    visibility: visible !important;
}
</style>
