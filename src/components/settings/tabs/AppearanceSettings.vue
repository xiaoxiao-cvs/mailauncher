<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">外观设置</h3>

        <el-card class="settings-card">
            <div class="setting-item">
                <span class="setting-label">深色模式</span>
                <div class="setting-control">
                    <el-switch v-model="darkMode" :active-icon="Moon" :inactive-icon="Sunny" @change="toggleDarkMode" />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">主题色</span>
                <div class="setting-control color-theme-selector">
                    <div v-for="(color, name) in themeColors" :key="name" class="color-item"
                        :class="{ 'active': currentTheme === name }" :style="{ backgroundColor: color }"
                        @click="selectTheme(name, color)"></div>
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">界面动画效果</span>
                <div class="setting-control">
                    <el-switch v-model="enableAnimations" @change="toggleAnimations" />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">紧凑界面</span>
                <div class="setting-control">
                    <el-select v-model="density" placeholder="选择密度" style="width: 150px">
                        <el-option label="默认" value="default" />
                        <el-option label="紧凑" value="compact" />
                    </el-select>
                </div>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="setting-item">
                <span class="setting-label">字体大小</span>
                <div class="setting-control">
                    <el-slider v-model="fontSize" :min="12" :max="20" :step="1" show-input />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">侧边栏位置</span>
                <div class="setting-control">
                    <el-radio-group v-model="sidebarPosition">
                        <el-radio value="left">靠左</el-radio>
                        <el-radio value="right">靠右</el-radio>
                    </el-radio-group>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { ref, onMounted, inject, watch } from 'vue';
import { Moon, Sunny } from '@element-plus/icons-vue';
import { useDarkMode, useTheme } from '../../../services/theme';
import { ElMessage } from 'element-plus';

// 获取共享状态
const emitter = inject('emitter');
const appDarkMode = inject('darkMode', ref(false));

// 获取主题服务
const { darkMode, toggleDarkMode } = useDarkMode(emitter);
const { currentTheme, themeColors, selectTheme } = useTheme(emitter);

// 设置状态
const enableAnimations = ref(true);
const density = ref('default');
const fontSize = ref(14);
const sidebarPosition = ref('left');

// 同步深色模式状态
watch(appDarkMode, (newValue) => {
    darkMode.value = newValue;
});

// 获取本地存储中的设置
onMounted(() => {
    // 同步深色模式设置
    darkMode.value = appDarkMode.value;

    // 加载其他的配置
    const savedAnimations = localStorage.getItem('enableAnimations');
    if (savedAnimations !== null) {
        enableAnimations.value = savedAnimations === 'true';
    }

    const savedDensity = localStorage.getItem('density');
    if (savedDensity) {
        density.value = savedDensity;
    }

    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        fontSize.value = parseInt(savedFontSize);
    }

    const savedSidebarPosition = localStorage.getItem('sidebarPosition');
    if (savedSidebarPosition) {
        sidebarPosition.value = savedSidebarPosition;
    }

    // 应用初始设置
    applyFontSize(fontSize.value);
    applySidebarPosition(sidebarPosition.value);
});

// 切换动画效果
const toggleAnimations = (value) => {
    localStorage.setItem('enableAnimations', value);
    if (!value) {
        document.documentElement.classList.add('no-animations');
    } else {
        document.documentElement.classList.remove('no-animations');
    }
};

// 监听密度变化
watch(density, (newValue) => {
    localStorage.setItem('density', newValue);
    document.documentElement.setAttribute('data-density', newValue);
});

// 监听字体大小变化
watch(fontSize, (newValue) => {
    applyFontSize(newValue);
    localStorage.setItem('fontSize', newValue);
});

// 监听侧边栏位置变化
watch(sidebarPosition, (newValue) => {
    applySidebarPosition(newValue);
    localStorage.setItem('sidebarPosition', newValue);
});

// 应用字体大小
const applyFontSize = (size) => {
    document.documentElement.style.setProperty('--app-font-size', `${size}px`);
};

// 应用侧边栏位置
const applySidebarPosition = (position) => {
    document.documentElement.setAttribute('data-sidebar-position', position);
    ElMessage.info(`侧边栏位置已设置为${position === 'left' ? '靠左' : '靠右'}`);
};
</script>

<style scoped>
.settings-tab-content {
    animation: fadeIn 0.5s ease;
}

.settings-section-title {
    margin-bottom: 20px;
    color: var(--el-text-color-primary);
    font-weight: 500;
}

.settings-card {
    margin-bottom: 20px;
    border-radius: 8px;
    overflow: hidden;
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.setting-item:last-child {
    border-bottom: none;
}

.setting-label {
    font-size: 14px;
    color: var(--el-text-color-primary);
}

.setting-control {
    display: flex;
    align-items: center;
}

/* 主题色选择器样式 */
.color-theme-selector {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.color-item {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s;
    border: 2px solid transparent;
    position: relative;
}

.color-item.active {
    border-color: var(--el-text-color-primary);
    transform: scale(1.1);
}

.color-item.active::after {
    content: "✓";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-weight: bold;
    font-size: 14px;
}

.color-item:hover {
    transform: scale(1.1);
}

/* 响应式调整 */
@media (max-width: 768px) {
    .setting-item {
        flex-direction: column;
        align-items: flex-start;
    }

    .setting-control {
        margin-top: 10px;
        width: 100%;
    }

    .color-theme-selector {
        justify-content: flex-start;
        margin-top: 10px;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
