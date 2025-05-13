<template>
    <transition name="settings-drawer">
        <div v-if="isOpen" class="settings-drawer-backdrop" @click.self="handleBackdropClick">
            <div class="settings-drawer-container">
                <div class="settings-drawer-header">
                    <h2>应用设置</h2>
                    <el-button circle @click="closeDrawer" class="close-button" text>
                        <el-icon>
                            <Close />
                        </el-icon>
                    </el-button>
                </div>

                <div class="settings-content">
                    <!-- 设置侧边栏 -->
                    <div class="settings-sidebar">
                        <div v-for="(tab, key) in settingsTabs" :key="key" class="settings-tab-item"
                            :class="{ 'active': activeTab === key }" @click="switchTab(key)">
                            <el-icon>
                                <component :is="tab.icon" />
                            </el-icon>
                            <span>{{ tab.title }}</span>
                        </div>
                    </div>

                    <!-- 设置内容区 -->
                    <div class="settings-body">
                        <transition name="tab-transition" mode="out-in">
                            <component :is="currentSettingComponent" :key="activeTab" />
                        </transition>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch, inject } from 'vue';
import { Close, Brush, Monitor, Bell, Lock, InfoFilled, Setting } from '@element-plus/icons-vue';
import settingsService from '../../services/settingsService';

// 导入设置子组件
import AppearanceSettings from './tabs/AppearanceSettings.vue';
import SystemSettings from './tabs/SystemSettings.vue';
import NotificationSettings from './tabs/NotificationSettings.vue';
import PrivacySettings from './tabs/PrivacySettings.vue';
import AboutSettings from './tabs/AboutSettings.vue';
import AdvancedSettings from './tabs/AdvancedSettings.vue';

// 注入依赖项
const darkMode = inject('darkMode', ref(false));
const emitter = inject('emitter', null);

// 定义属性
const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true
    }
});

// 定义事件
const emit = defineEmits(['close']);

// 获取当前活动选项卡
const activeTab = ref(settingsService.activeSettingsTab.value);

// 监听全局活动选项卡变更
watch(() => settingsService.activeSettingsTab.value, (newTab) => {
    activeTab.value = newTab;
});

// 设置选项卡定义
const settingsTabs = {
    appearance: { title: '外观', icon: Brush, component: AppearanceSettings },
    system: { title: '系统', icon: Monitor, component: SystemSettings },
    notification: { title: '通知', icon: Bell, component: NotificationSettings },
    privacy: { title: '隐私', icon: Lock, component: PrivacySettings },
    about: { title: '关于', icon: InfoFilled, component: AboutSettings },
    advanced: { title: '高级', icon: Setting, component: AdvancedSettings },
};

// 计算当前显示的设置组件
const currentSettingComponent = computed(() => {
    return settingsTabs[activeTab.value]?.component || AppearanceSettings;
});

// 切换选项卡
const switchTab = (tab) => {
    activeTab.value = tab;
    settingsService.switchSettingsTab(tab);
};

// 关闭抽屉
const closeDrawer = () => {
    emit('close');
};

// 处理背景点击
const handleBackdropClick = (e) => {
    // 如果点击的是背景，则关闭设置
    if (e.target === e.currentTarget) {
        closeDrawer();
    }
};

// 添加ESC按键监听
const handleKeyDown = (e) => {
    if (e.key === 'Escape' && props.isOpen) {
        closeDrawer();
    }
};

// 监听键盘事件
onMounted(() => {
    document.addEventListener('keydown', handleKeyDown);
});

// 移除事件监听
onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style>
.settings-drawer-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
    background-color: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(5px);
}

.settings-drawer-container {
    width: 900px;
    height: 80vh;
    max-height: 700px;
    background: var(--el-bg-color);
    backdrop-filter: blur(20px);
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    border: 1px solid var(--el-border-color-lighter);
    overflow: hidden;
}

/* 暗色模式下的背景 */
html.dark-mode .settings-drawer-container {
    background: rgba(30, 30, 34, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
}

.settings-drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--el-border-color-light);
}

.settings-drawer-header h2 {
    margin: 0;
    font-weight: 500;
    font-size: 18px;
    color: var(--el-text-color-primary);
}

.settings-content {
    display: flex;
    flex: 1;
    overflow: hidden;
}

.settings-sidebar {
    width: 200px;
    border-right: 1px solid var(--el-border-color-light);
    background-color: var(--el-bg-color-page);
    padding: 16px 0;
    overflow-y: auto;
}

.settings-tab-item {
    display: flex;
    align-items: center;
    padding: 12px 20px;
    cursor: pointer;
    color: var(--el-text-color-regular);
    transition: all 0.3s ease;
    position: relative;
}

.settings-tab-item:hover {
    background-color: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
}

.settings-tab-item.active {
    background-color: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 500;
}

.settings-tab-item.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 3px;
    background-color: var(--el-color-primary);
}

.settings-tab-item .el-icon {
    margin-right: 12px;
    font-size: 18px;
}

.settings-body {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
}

/* 设置抽屉动画 */
.settings-drawer-enter-active,
.settings-drawer-leave-active {
    transition: opacity 0.3s, transform 0.3s;
}

.settings-drawer-enter-from,
.settings-drawer-leave-to {
    opacity: 0;
    transform: translateY(30px);
}

/* 设置选项卡转换动画 */
.tab-transition-enter-active,
.tab-transition-leave-active {
    transition: opacity 0.3s, transform 0.3s;
}

.tab-transition-enter-from {
    opacity: 0;
    transform: translateY(20px);
}

.tab-transition-leave-to {
    opacity: 0;
    transform: translateY(-20px);
}

/* 响应式设计 */
@media (max-width: 960px) {
    .settings-drawer-container {
        width: 95%;
        height: 90vh;
        max-height: none;
    }
}

@media (max-width: 768px) {
    .settings-content {
        flex-direction: column;
    }

    .settings-sidebar {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--el-border-color-light);
        padding: 0;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        display: flex;
    }

    .settings-tab-item {
        display: inline-flex;
        padding: 12px 15px;
    }

    .settings-tab-item.active::before {
        width: 100%;
        height: 3px;
        bottom: 0;
        top: auto;
    }
}
</style>
