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
                            <i class="icon icon-sun swap-on"></i>
                            <i class="icon icon-moon swap-off"></i>
                        </label>
                    </div>
                </div>

                <!-- 主题色选择 -->
                <div class="setting-item">
                    <div class="setting-label">主题色</div>
                    <div class="setting-control">
                        <div class="color-theme-selector">
                            <div v-for="(color, key) in themeColors" :key="key" class="color-item cursor-pointer"
                                :class="{ active: currentTheme === key }" :style="{ backgroundColor: color }"
                                @click="selectTheme(key)">
                            </div>
                        </div>
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
                        <div class="btn-group">
                            <button class="btn btn-sm" :class="{ 'btn-active': layoutDensity === 'comfortable' }"
                                @click="setLayoutDensity('comfortable')">舒适</button>
                            <button class="btn btn-sm" :class="{ 'btn-active': layoutDensity === 'compact' }"
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
                                <li v-for="theme in themes" :key="theme.name">
                                    <a @click="setTheme(theme.name)" :class="{ 'active': theme.name === currentTheme }">
                                        <span class="theme-color-preview"
                                            :style="{ backgroundColor: theme.primaryColor }"></span>
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
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, inject, onMounted, computed, onBeforeUnmount } from 'vue';
import { useDarkMode } from '../../../services/theme';
import IconifyIcon from '../../common/IconifyIcon.vue';

// 获取事件总线
const emitter = inject('emitter', null);

// 使用深色模式
const { darkMode, toggleDarkMode } = useDarkMode(emitter);

// 主题状态
const currentTheme = ref(localStorage.getItem('theme') || 'light');
const isDarkMode = computed(() => {
    return currentTheme.value === 'dark' || currentTheme.value === 'night' ||
        currentTheme.value === 'dracula' || currentTheme.value === 'black';
});

// 主题列表定义
const themes = ref([
    { name: 'light', label: '明亮', primaryColor: '#e5e7eb', icon: 'mdi:weather-sunny' },
    { name: 'dark', label: '暗黑', primaryColor: '#2a303c', icon: 'mdi:weather-night' },
    { name: 'cupcake', label: '蛋糕', primaryColor: '#65c3c8', icon: 'mdi:cake' },
    { name: 'bumblebee', label: '大黄蜂', primaryColor: '#e0a82e', icon: 'mdi:bee' },
    { name: 'emerald', label: '翡翠', primaryColor: '#66cc8a', icon: 'mdi:diamond' },
    { name: 'corporate', label: '企业', primaryColor: '#4b6bfb', icon: 'mdi:office-building' },
    { name: 'synthwave', label: '合成波', primaryColor: '#e779c1', icon: 'mdi:synthesizer' },
    { name: 'retro', label: '复古', primaryColor: '#ef9995', icon: 'mdi:alarm' },
    { name: 'cyberpunk', label: '赛博朋克', primaryColor: '#ff7598', icon: 'mdi:robot' },
    { name: 'valentine', label: '情人节', primaryColor: '#e96d7b', icon: 'mdi:heart' },
    { name: 'halloween', label: '万圣节', primaryColor: '#f28c18', icon: 'mdi:pumpkin' },
    { name: 'garden', label: '花园', primaryColor: '#5c7f67', icon: 'mdi:flower' },
    { name: 'forest', label: '森林', primaryColor: '#1eb854', icon: 'mdi:pine-tree' },
    { name: 'aqua', label: '水色', primaryColor: '#09ecf3', icon: 'mdi:water' },
    { name: 'lofi', label: '低保真', primaryColor: '#808080', icon: 'mdi:music-note' },
    { name: 'pastel', label: '粉彩', primaryColor: '#d1c1d7', icon: 'mdi:palette-swatch' },
    { name: 'fantasy', label: '幻想', primaryColor: '#6e0b75', icon: 'mdi:castle' },
    { name: 'wireframe', label: '线框', primaryColor: '#b8b8b8', icon: 'mdi:vector-square' },
    { name: 'black', label: '纯黑', primaryColor: '#333333', icon: 'mdi:circle' },
    { name: 'luxury', label: '奢华', primaryColor: '#ffffff', icon: 'mdi:crown' },
    { name: 'dracula', label: '德古拉', primaryColor: '#ff79c6', icon: 'mdi:vampire' },
    { name: 'cmyk', label: '印刷', primaryColor: '#45aeee', icon: 'mdi:printer' },
    { name: 'autumn', label: '秋天', primaryColor: '#8C0327', icon: 'mdi:leaf-maple' },
    { name: 'business', label: '商务', primaryColor: '#1C4E80', icon: 'mdi:briefcase' },
    { name: 'acid', label: '酸性', primaryColor: '#FF00F4', icon: 'mdi:flask' },
    { name: 'lemonade', label: '柠檬水', primaryColor: '#FFFF00', icon: 'mdi:fruit-citrus' },
    { name: 'night', label: '夜晚', primaryColor: '#38bdf8', icon: 'mdi:moon-waning-crescent' },
    { name: 'coffee', label: '咖啡', primaryColor: '#DB924B', icon: 'mdi:coffee' },
    { name: 'winter', label: '冬季', primaryColor: '#0EA5E9', icon: 'mdi:snowflake' }
]);

// 当前主题的色彩值
const themeColors = ref({});

// 预定义主题色
const predefinedThemeColors = {
    primary: '#570df8',
    secondary: '#f000b8',
    accent: '#1dcdbc',
    neutral: '#2b3440',
    info: '#3abff8',
    success: '#36d399',
    warning: '#fbbd23',
    error: '#f87272'
};

// 动画效果状态
const enableAnimations = ref(true);

// 布局密度
const layoutDensity = ref('comfortable');

// 字体大小
const fontSize = ref(14);

// 设置主题
const setTheme = (themeName) => {
    currentTheme.value = themeName;
    localStorage.setItem('theme', themeName);
    document.documentElement.setAttribute('data-theme', themeName);
    updateThemeColors();

    // 根据主题设置暗黑模式状态
    darkMode.value = isDarkMode.value;
};

// 获取当前主题名称
const getCurrentThemeName = () => {
    const theme = themes.value.find(t => t.name === currentTheme.value);
    return theme ? theme.label : '默认';
};

// 获取当前主题颜色
const getCurrentThemeColor = () => {
    const theme = themes.value.find(t => t.name === currentTheme.value);
    return theme ? theme.primaryColor : '#570df8';
};

// 设置明暗模式
const setColorMode = (mode) => {
    if (mode === 'dark' && currentTheme.value === 'light') {
        setTheme('dark');
    } else if (mode === 'light' && currentTheme.value === 'dark') {
        setTheme('light');
    }
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

// 选择主题色
const selectTheme = (key) => {
    const newTheme = predefinedThemeColors[key] || key;
    document.documentElement.style.setProperty('--primary-color', newTheme);
    localStorage.setItem('themeColor', newTheme);
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

// 初始化设置
onMounted(() => {
    // 从本地存储加载动画设置
    const savedAnimations = localStorage.getItem('enableAnimations');
    if (savedAnimations !== null) {
        enableAnimations.value = savedAnimations === 'true';
        applyAnimationsState(enableAnimations.value);
    }

    // 从本地存储加载布局密度
    const savedDensity = localStorage.getItem('layoutDensity');
    if (savedDensity) {
        layoutDensity.value = savedDensity;
        document.documentElement.setAttribute('data-density', savedDensity);
    }

    // 从本地存储加载字体大小
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        fontSize.value = parseInt(savedFontSize);
        document.documentElement.style.setProperty('--base-font-size', `${fontSize.value}px`);
    } else {
        document.documentElement.style.setProperty('--base-font-size', '14px');
    }

    // 初始化当前主题
    document.documentElement.setAttribute('data-theme', currentTheme.value);
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

    // 组件销毁时断开监听
    onBeforeUnmount(() => {
        observer.disconnect();
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
.color-theme-selector {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.color-item {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    transition: all 0.3s;
    border: 2px solid transparent;
}

.color-item.active {
    border-color: var(--text-color);
    transform: scale(1.1);
    position: relative;
}

.color-item.active::after {
    content: "✓";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.color-item:hover {
    transform: scale(1.1);
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);
}

/* 图标样式 */
.icon {
    font-size: 1.25rem;
}

.icon-sun::before {
    content: "\f185";
}

.icon-moon::before {
    content: "\f186";
}

/* 主题选择样式 */
.theme-color-preview {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    margin-right: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
}

.color-mode-selector {
    display: flex;
    gap: 8px;
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

    .color-theme-selector {
        justify-content: flex-start;
    }
}
</style>
