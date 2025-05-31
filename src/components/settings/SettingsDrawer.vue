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

    // 确保暗色模式下文本颜色正确应用
    nextTick(() => {
        forceDarkModeTextStyles()
    })

    // 注意：setTheme 函数中已经处理了事件触发，这里不再重复触发
}

// 强制应用暗色模式文本样式
const forceDarkModeTextStyles = () => {
    // 检查当前是否为暗色模式
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark' ||
        themeMode.value === 'dark' ||
        (themeMode.value === 'system' && systemDarkMode.value)

    if (isDarkMode) {
        console.log('强制应用暗色模式文本样式')
        // 设置容器
        const container = document.querySelector('.settings-drawer-container')
        if (container) {
            // 添加明确的暗色模式类
            container.classList.add('force-dark-text')
            container.style.color = 'hsl(var(--bc))'

            // 强制应用文本颜色到所有关键元素
            const selectors = [
                '.settings-title', '.panel-title', '.setting-label',
                '.setting-desc', '.panel-description', '.version-info',
                '.nav-label', '.option-label', '.group-title',
                'input', 'select', 'textarea', 'button', '.btn',
                '.theme-option', '.theme-name', '.footer-info'
            ].join(', ')

            const elements = container.querySelectorAll(selectors)
            elements.forEach(el => {
                el.classList.add('force-dark-text')
                el.style.color = 'hsl(var(--bc))'
            })
        }
    }
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
                container.style.backgroundColor = 'hsl(var(--b1))'
                container.style.opacity = '1'

                // 调用强制应用暗色模式文本样式的方法
                forceDarkModeTextStyles()
            }
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
