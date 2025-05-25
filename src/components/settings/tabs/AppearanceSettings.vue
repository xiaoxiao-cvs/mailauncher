<template>
    <div class="settings-tab-content">
        <div class="card bg-base-100 shadow">
            <!-- 外观设置 -->
            <div class="card-body">
                <h2 class="card-title">外观设置</h2>

                <!-- 暗黑模式开关 -->
                <div class="setting-item">
                    <div class="setting-label">暗黑模式</div>
                    <div class="setting-control">
                        <label class="swap swap-rotate">
                            <input type="checkbox" v-model="darkMode" @change="toggleDarkMode" />
                            <IconifyIcon class="swap-on" icon="mdi:weather-sunny" size="lg" />
                            <IconifyIcon class="swap-off" icon="mdi:weather-night" size="lg" />
                        </label>
                    </div>
                </div>

                <!-- 动画效果开关 -->
                <div class="setting-item">
                    <div class="setting-label">动画效果</div>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle toggle-primary" v-model="enableAnimations"
                            @change="toggleAnimations" />
                    </div>
                </div>

                <!-- 布局密度 -->
                <div class="setting-item">
                    <div class="setting-label">布局密度</div>
                    <div class="setting-control">
                        <div class="join">
                            <button class="btn join-item" :class="{ 'btn-primary': layoutDensity === 'comfortable' }"
                                @click="setLayoutDensity('comfortable')">舒适</button>
                            <button class="btn join-item" :class="{ 'btn-primary': layoutDensity === 'compact' }"
                                @click="setLayoutDensity('compact')">紧凑</button>
                        </div>
                    </div>
                </div>

                <!-- 字体大小 -->
                <div class="setting-item">
                    <div class="setting-label">字体大小</div>
                    <div class="setting-control">
                        <input type="range" min="12" max="18" v-model="fontSize" class="range range-primary"
                            @change="changeFontSize" />
                        <div class="text-sm mt-1">{{ fontSize }}px</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 主题选择 -->
        <div class="card bg-base-100 shadow mt-4">
            <div class="card-body">
                <h3 class="card-title text-lg">界面主题</h3>

                <div class="setting-item">
                    <span class="setting-label">当前主题</span>
                    <div class="setting-control">
                        <div class="dropdown dropdown-end">
                            <div tabindex="0" role="button" class="btn">
                                <span class="theme-color-preview"
                                    :style="{ backgroundColor: getCurrentThemeColor() }"></span>
                                {{ getCurrentThemeName() }}
                                <IconifyIcon icon="mdi:chevron-down" size="sm" />
                            </div>
                            <ul tabindex="0"
                                class="dropdown-content z-[999] menu p-2 shadow bg-base-100 rounded-box w-52 max-h-[60vh] overflow-y-auto">
                                <li v-for="theme in availableThemes" :key="theme.name">
                                    <a @click="setTheme(theme.name)" :class="{ 'active': theme.name === currentTheme }">
                                        <span class="theme-color-preview"
                                            :style="{ backgroundColor: theme.color }"></span>
                                        {{ theme.label }}
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- 主题色展示 -->
                <div class="theme-colors-preview mt-4">
                    <h4 class="text-sm font-medium mb-2">当前主题色</h4>
                    <div class="flex flex-wrap gap-2">
                        <div class="color-preview" v-for="(color, name) in themeColors" :key="name"
                            :style="{ backgroundColor: color }" :title="name">
                            <span class="color-name">{{ name }}</span>
                        </div>
                    </div>
                </div>

                <!-- 重置主题设置 -->
                <div class="setting-item border-t mt-4 pt-4">
                    <div class="setting-label">重置主题设置</div>
                    <div class="setting-control">
                        <button class="btn btn-sm btn-error" @click="resetThemeSettings">
                            <IconifyIcon icon="mdi:refresh" size="sm" />
                            重置
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, inject, onMounted, computed, onBeforeUnmount } from 'vue';
import { useDarkMode, useTheme } from '../../../services/theme';
import IconifyIcon from '../../common/IconifyIcon.vue';
import settingsService from '../../../services/settingsService';

// 获取事件总线
const emitter = inject('emitter', null);

// 使用深色模式
const { darkMode, toggleDarkMode } = useDarkMode(emitter);

// 使用主题
const { currentTheme, availableThemes, setTheme } = useTheme();

// 主题状态
const isDarkMode = computed(() => {
    return currentTheme.value === 'dark' || currentTheme.value === 'night' ||
        currentTheme.value === 'dracula' || currentTheme.value === 'black';
});

// 动画效果状态
const enableAnimations = ref(localStorage.getItem('enableAnimations') !== 'false');

// 布局密度
const layoutDensity = ref(localStorage.getItem('layoutDensity') || 'comfortable');

// 字体大小
const fontSize = ref(parseInt(localStorage.getItem('fontSize') || '14'));

// 当前主题的色彩值
const themeColors = ref({});

// 获取当前主题名称
const getCurrentThemeName = () => {
    const theme = availableThemes.value.find(t => t.name === currentTheme.value);
    return theme ? theme.label : '默认';
};

// 获取当前主题颜色
const getCurrentThemeColor = () => {
    const theme = availableThemes.value.find(t => t.name === currentTheme.value);
    return theme ? theme.color : '#570df8';
};

// 应用动画状态
const applyAnimationsState = (enabled) => {
    if (enabled) {
        document.documentElement.classList.remove('no-animations');
    } else {
        document.documentElement.classList.add('no-animations');
    }
};

// 切换动画效果
const toggleAnimations = () => {
    applyAnimationsState(enableAnimations.value);
    localStorage.setItem('enableAnimations', enableAnimations.value);
    if (emitter) {
        emitter.emit('animations-toggled', enableAnimations.value);
    }
};

// 设置布局密度
const setLayoutDensity = (density) => {
    layoutDensity.value = density;
    document.documentElement.setAttribute('data-density', density);
    localStorage.setItem('layoutDensity', density);
};

// 修改字体大小
const changeFontSize = () => {
    document.documentElement.style.setProperty('--base-font-size', `${fontSize.value}px`);
    localStorage.setItem('fontSize', fontSize.value);
};

// 更新当前主题的色彩值
const updateThemeColors = () => {
    // 获取CSS变量
    const computedStyle = getComputedStyle(document.documentElement);
    themeColors.value = {
        '主色调': computedStyle.getPropertyValue('--p').trim() || 'hsl(var(--p))',
        '次色调': computedStyle.getPropertyValue('--s').trim() || 'hsl(var(--s))',
        '强调色': computedStyle.getPropertyValue('--a').trim() || 'hsl(var(--a))',
        '中性色': computedStyle.getPropertyValue('--n').trim() || 'hsl(var(--n))',
        '基础色': computedStyle.getPropertyValue('--b1').trim() || 'hsl(var(--b1))',
        '成功色': computedStyle.getPropertyValue('--su').trim() || 'hsl(var(--su))',
        '警告色': computedStyle.getPropertyValue('--wa').trim() || 'hsl(var(--wa))',
        '错误色': computedStyle.getPropertyValue('--er').trim() || 'hsl(var(--er))',
    };
};

// 重置主题设置
const resetThemeSettings = () => {
    if (confirm('确定要重置所有主题设置吗？这将恢复默认的颜色、字体大小和布局密度。')) {
        // 调用settingsService的resetSettings方法
        settingsService.resetSettings();

        // 更新当前状态
        currentTheme.value = 'light';
        darkMode.value = false;
        enableAnimations.value = true;
        layoutDensity.value = 'comfortable';
        fontSize.value = 14;

        // 应用变更
        applyAnimationsState(true);
        document.documentElement.setAttribute('data-density', 'comfortable');
        document.documentElement.style.setProperty('--base-font-size', '14px');

        // 更新主题色展示
        setTimeout(() => {
            updateThemeColors();
        }, 100);

        // 显示成功消息
        if (emitter) {
            emitter.emit('show-toast', {
                type: 'success',
                message: '主题设置已重置',
                duration: 3000
            });
        } else {
            alert('主题设置已重置');
        }
    }
};

// 初始化设置
onMounted(() => {
    // 从本地存储加载动画设置
    applyAnimationsState(enableAnimations.value);

    // 加载布局密度
    document.documentElement.setAttribute('data-density', layoutDensity.value);

    // 加载字体大小
    document.documentElement.style.setProperty('--base-font-size', `${fontSize.value}px`);

    // 初始化当前主题
    updateThemeColors();

    // 设置监听器，当主题变量变化时更新显示
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                updateThemeColors();
            }
        });
    });

    observer.observe(document.documentElement, { attributes: true });

    // 监听主题变更事件
    window.addEventListener('theme-changed', () => {
        updateThemeColors();
    });

    // 监听主题色变更事件
    window.addEventListener('theme-color-changed', () => {
        updateThemeColors();
    });

    // 组件销毁时断开监听
    onBeforeUnmount(() => {
        observer.disconnect();
        window.removeEventListener('theme-changed', () => { });
        window.removeEventListener('theme-color-changed', () => { });
    });
});
</script>

<style scoped>
.settings-tab-content {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid var(--border-light);
}

.setting-item:last-child {
    border-bottom: none;
}

.setting-label {
    font-size: 1rem;
    color: var(--text-color);
}

.setting-control {
    display: flex;
    align-items: center;
}

/* 主题色选择器样式 */
.theme-color-preview {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    margin-right: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
}

.theme-colors-preview {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.color-preview {
    width: 80px;
    height: 80px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    text-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
    font-size: 12px;
    position: relative;
    overflow: hidden;
}

.color-name {
    position: absolute;
    bottom: 8px;
    left: 0;
    right: 0;
    text-align: center;
    background: rgba(0, 0, 0, 0.3);
    padding: 2px 0;
}

/* 改进下拉菜单样式 */
.dropdown .dropdown-content {
    width: 200px;
}

.dropdown .dropdown-content li a {
    display: flex;
    align-items: center;
}

.dropdown .dropdown-content li a.active {
    background-color: hsl(var(--p) / 0.2);
    color: hsl(var(--pc));
}

/* 响应式调整 */
@media (max-width: 768px) {
    .setting-item {
        flex-direction: column;
        align-items: flex-start;
    }

    .setting-control {
        margin-top: 0.625rem;
        width: 100%;
    }
}
</style>
