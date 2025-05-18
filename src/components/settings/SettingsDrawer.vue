<template>
    <div v-if="isOpen" class="settings-drawer-backdrop" @click.self="handleBackdropClick">
        <div class="settings-drawer-container">
            <div class="settings-drawer-header">
                <h2 class="text-xl font-bold">系统设置</h2>
                <button class="btn btn-sm btn-ghost btn-circle" @click="closeDrawer">
                    <i class="icon icon-xmark"></i>
                </button>
            </div>

            <div class="settings-content">
                <!-- 设置侧边栏 -->
                <div class="settings-sidebar">
                    <ul class="menu menu-compact p-2 rounded-lg bg-base-200">
                        <li v-for="tab in settingTabs" :key="tab.key">
                            <a :class="{ 'active': activeTab === tab.key }" @click="switchTab(tab.key)">
                                <i class="icon" :class="'icon-' + tab.icon"></i>
                                {{ tab.title }}
                            </a>
                        </li>
                    </ul>
                </div>

                <!-- 设置内容区 -->
                <div class="settings-body">
                    <transition name="tab-transition" mode="out-in">
                        <component :is="currentSettingComponent" :key="activeTab" />
                    </transition>
                </div>
            </div>

            <div class="settings-drawer-footer">
                <div class="flex justify-between items-center w-full">
                    <span class="text-sm opacity-70">版本 1.0.0</span>
                    <button class="btn btn-sm btn-outline" @click="closeDrawer">关闭</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch, inject } from 'vue';
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

// 当前活动选项卡
const activeTab = ref('appearance');

// 设置选项卡定义
const settingTabs = [
    { key: 'appearance', title: '外观', icon: 'palette' },
    { key: 'system', title: '系统', icon: 'computer' },
    { key: 'notifications', title: '通知', icon: 'bell' },
    { key: 'privacy', title: '隐私', icon: 'lock' },
    { key: 'about', title: '关于', icon: 'circle-info' },
    { key: 'advanced', title: '高级', icon: 'sliders' }
];

// 计算当前应该显示的组件
const currentSettingComponent = computed(() => {
    switch (activeTab.value) {
        case 'appearance': return AppearanceSettings;
        case 'system': return SystemSettings;
        case 'notifications': return NotificationSettings;
        case 'privacy': return PrivacySettings;
        case 'about': return AboutSettings;
        case 'advanced': return AdvancedSettings;
        default: return AppearanceSettings;
    }
});

// 切换设置选项卡
const switchTab = (tab) => {
    activeTab.value = tab;
    settingsService.setTab(tab);
};

// 关闭抽屉
const closeDrawer = () => {
    emit('close');
    settingsService.closeSettings();
};

// 点击背景关闭
const handleBackdropClick = () => {
    closeDrawer();
};

// 监听ESC键关闭抽屉
const handleEscKey = (e) => {
    if (e.key === 'Escape' && props.isOpen) {
        closeDrawer();
    }
};

// 监听设置服务的选项卡变化
const handleSettingTabChange = (tab) => {
    if (tab && typeof tab === 'string') {
        activeTab.value = tab;
    }
};

// 当抽屉打开时添加body的类
watch(() => props.isOpen, (newValue) => {
    if (newValue) {
        document.body.classList.add('settings-open');
    } else {
        document.body.classList.remove('settings-open');
    }
});

// 组件挂载
onMounted(() => {
    // 添加键盘事件监听
    document.addEventListener('keydown', handleEscKey);
    
    // 监听设置服务的选项卡变化
    settingsService.onTabChange(handleSettingTabChange);
    
    // 如果有设置的选项卡，使用它
    const currentTab = settingsService.getTab();
    if (currentTab) {
        activeTab.value = currentTab;
    }
});

// 组件卸载前清理
onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleEscKey);
    settingsService.offTabChange(handleSettingTabChange);
    document.body.classList.remove('settings-open');
});
</script>

<style scoped>
.settings-drawer-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
}

.settings-drawer-container {
    width: 90%;
    max-width: 1000px;
    height: 90%;
    max-height: 700px;
    background-color: var(--bg-color);
    border-radius: 0.75rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    animation: slideIn 0.3s ease;
    position: relative;
    overflow: hidden;
}

.settings-drawer-header {
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
}

.settings-content {
    display: flex;
    flex: 1;
    overflow: hidden;
}

.settings-sidebar {
    width: 220px;
    padding: 1rem;
    border-right: 1px solid var(--border-color);
    overflow-y: auto;
}

.settings-body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
}

.settings-drawer-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-color);
}

/* 图标样式 */
.icon {
    display: inline-block;
    width: 1em;
    height: 1em;
    margin-right: 0.5rem;
}

.icon-palette::before { content: "\f53f"; }
.icon-computer::before { content: "\f109"; }
.icon-bell::before { content: "\f0f3"; }
.icon-lock::before { content: "\f023"; }
.icon-circle-info::before { content: "\f05a"; }
.icon-sliders::before { content: "\f1de"; }
.icon-xmark::before { content: "\f00d"; }

/* 动画 */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideIn {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

.tab-transition-enter-active, 
.tab-transition-leave-active {
    transition: opacity 0.3s, transform 0.3s;
}

.tab-transition-enter-from,
.tab-transition-leave-to {
    opacity: 0;
    transform: translateX(20px);
}

/* 响应式调整 */
@media (max-width: 768px) {
    .settings-content {
        flex-direction: column;
    }
    
    .settings-sidebar {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--border-color);
        padding: 0.5rem 1rem;
    }
    
    .settings-sidebar ul {
        display: flex;
        overflow-x: auto;
        padding-bottom: 0.5rem;
    }
    
    .settings-sidebar li {
        margin-right: 0.5rem;
    }
}
</style>
