<template>
    <div v-if="isOpen" class="drawer drawer-end z-30">
        <input id="instance-settings-drawer" type="checkbox" class="drawer-toggle" checked />
        <div class="drawer-side">
            <label for="instance-settings-drawer" class="drawer-overlay" @click="handleBackdropClick"></label>
            <div class="settings-drawer-container bg-base-100 p-4 w-full max-w-2xl h-full overflow-auto flex flex-col">
                <div class="settings-header mb-4">
                    <div class="flex justify-between items-center">
                        <h2 class="text-xl font-bold">{{ instanceName }} 设置</h2>
                        <button class="btn btn-sm btn-circle btn-ghost" @click="closeDrawer">
                            <i class="icon icon-close"></i>
                        </button>
                    </div>
                    <div class="tabs tabs-boxed mt-4">
                        <a v-for="tab in tabs" :key="tab.key" :class="['tab', { 'tab-active': activeTab === tab.key }]"
                            @click="activeTab = tab.key">
                            <i :class="['mr-2', tab.icon]"></i>
                            {{ tab.title }}
                        </a>
                    </div>
                </div>

                <div class="settings-content flex-grow overflow-auto">
                    <div class="settings-body">
                        <transition name="tab-transition" mode="out-in">
                            <component :is="currentSettingComponent" :key="activeTab" :config="configData"
                                @update:config="updateConfig" />
                        </transition>
                    </div>
                </div>

                <div class="settings-drawer-footer mt-4 border-t pt-4 flex justify-between">
                    <button class="btn btn-ghost" @click="closeDrawer">取消</button>
                    <button class="btn btn-primary" @click="saveConfig">保存配置</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, provide } from 'vue';

// 导入设置子组件
import BasicInfoSettings from './instance/BasicInfoSettings.vue';
import GroupManagementSettings from './instance/GroupManagementSettings.vue';
import PersonalitySettings from './instance/PersonalitySettings.vue';
import ScheduleSettings from './instance/ScheduleSettings.vue';
import ChatSettings from './instance/ChatSettings.vue';
import MemorySettings from './instance/MemorySettings.vue';
import ModelSettings from './instance/ModelSettings.vue';
import AdvancedSettings from './instance/AdvancedSettings.vue';

// 定义基础组件用于占位
const PlaceholderComponent = {
    template: `
        <div class="settings-tab-content">
            <h3 class="text-lg font-medium mb-4">{{ title }}</h3>
            <div class="card bg-base-100 shadow">
                <div class="card-body">
                    <div class="placeholder-message flex items-center">
                        <i class="icon icon-info-circle mr-2"></i>
                        <span>该功能正在开发中...</span>
                    </div>
                </div>
            </div>
        </div>
    `,
    props: {
        title: {
            type: String,
            default: '设置'
        },
        config: Object
    },
    emits: ['update:config']
};

// 使用占位组件
const EmojiSettings = PlaceholderComponent;
const EmotionSettings = PlaceholderComponent;
const OtherSettings = PlaceholderComponent;

// 定义属性
const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true
    },
    instanceName: {
        type: String,
        default: '未命名实例'
    },
    instancePath: {
        type: String,
        default: ''
    }
});

// 定义事件
const emit = defineEmits(['close', 'save']);

// 当前活动选项卡
const activeTab = ref('basic-info');

// 选项卡配置
const tabs = [
    { key: 'basic-info', title: '基本信息', icon: 'icon-user' },
    { key: 'group-management', title: '群组管理', icon: 'icon-users' },
    { key: 'personality', title: '性格设置', icon: 'icon-heart' },
    { key: 'schedule', title: '计划任务', icon: 'icon-calendar' },
    { key: 'chat', title: '聊天设置', icon: 'icon-message-circle' },
    { key: 'memory', title: '记忆管理', icon: 'icon-database' },
    { key: 'model', title: '模型设置', icon: 'icon-cpu' },
    { key: 'advanced', title: '高级选项', icon: 'icon-settings' }
];

// 配置数据
const configData = ref({});

// 原始配置数据备份 (用于比较变更)
const originalConfigData = ref({});

// 加载配置数据
const loadConfig = async () => {
    try {
        // 在实际应用中，这里会调用API加载配置
        // 现在使用模拟数据
        await new Promise(resolve => setTimeout(resolve, 300)); // 模拟加载延迟

        configData.value = {
            name: props.instanceName,
            path: props.instancePath || '/home/user/bots/' + props.instanceName,
            description: '这是一个示例机器人实例',
            created_at: new Date().toISOString(),
            version: '0.6.3',
            character: {
                name: '小助手',
                personality: '友好、乐于助人',
                description: '一个日常助手机器人'
            },
            schedule: {
                enabled: true,
                tasks: []
            },
            chat: {
                response_length: 'medium',
                chat_memory_depth: 10,
                style: 'casual'
            },
            memory: {
                enabled: true,
                memory_depth: 50
            },
            model: {
                type: 'gpt-3.5-turbo',
                temperature: 0.7,
                top_p: 0.9
            },
            debug: {
                enable_verbose_logging: false,
                save_model_calls: true
            },
            other: {
                init_script: '',
                api_port: 8000
            }
        };

        // 保存原始配置副本
        originalConfigData.value = JSON.parse(JSON.stringify(configData.value));

    } catch (error) {
        console.error('加载配置失败:', error);
        showToast('加载配置失败: ' + error.message, 'error');
    }
};

// 更新配置
const updateConfig = (newConfig) => {
    configData.value = { ...newConfig };
};

// 保存配置
const saveConfig = async () => {
    try {
        // 检查配置是否有变更
        if (JSON.stringify(configData.value) === JSON.stringify(originalConfigData.value)) {
            showToast('没有发现配置变更', 'info');
            return;
        }

        // 在实际应用中，这里会调用API保存配置
        await new Promise(resolve => setTimeout(resolve, 500)); // 模拟保存延迟

        showToast('配置保存成功', 'success');

        // 更新原始配置
        originalConfigData.value = JSON.parse(JSON.stringify(configData.value));

        // 触发保存事件
        emit('save', configData.value);

        // 关闭抽屉
        closeDrawer();
    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('保存配置失败: ' + error.message, 'error');
    }
};

// 处理背景点击
const handleBackdropClick = () => {
    // 如果配置有未保存的变更，提示确认
    if (JSON.stringify(configData.value) !== JSON.stringify(originalConfigData.value)) {
        if (window.confirm('有未保存的更改，确定要关闭吗？')) {
            closeDrawer();
        }
    } else {
        closeDrawer();
    }
};

// 关闭抽屉
const closeDrawer = () => {
    emit('close');
};

// 计算当前设置组件
const currentSettingComponent = computed(() => {
    switch (activeTab.value) {
        case 'basic-info': return BasicInfoSettings;
        case 'group-management': return GroupManagementSettings;
        case 'personality': return PersonalitySettings;
        case 'schedule': return ScheduleSettings;
        case 'chat': return ChatSettings;
        case 'memory': return MemorySettings;
        case 'model': return ModelSettings;
        case 'advanced': return AdvancedSettings;
        case 'emoji': return EmojiSettings;
        case 'emotion': return EmotionSettings;
        case 'other': return OtherSettings;
        default: return BasicInfoSettings;
    }
});

// 显示提醒消息
const showToast = (message, type = 'info') => {
    // 创建一个toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fixed top-4 right-4 z-50`;
    toast.innerHTML = `
        <div class="alert ${type === 'success' ? 'alert-success' : type === 'error' ? 'alert-error' : 'alert-info'}">
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);

    // 3秒后移除
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
};

// 为子组件提供实例名称
provide('instanceName', props.instanceName);

// 组件挂载时加载配置
onMounted(() => {
    loadConfig();
});

// 组件卸载前可能需要清理
onBeforeUnmount(() => {
    // 清理工作（如果有需要）
});
</script>

<style scoped>
.settings-drawer-container {
    animation: slideIn 0.3s ease;
    box-shadow: -5px 0 25px rgba(0, 0, 0, 0.1);
}

.placeholder-message {
    color: var(--color-text-secondary);
}

.tab-transition-enter-active,
.tab-transition-leave-active {
    transition: opacity 0.2s, transform 0.2s;
}

.tab-transition-enter-from,
.tab-transition-leave-to {
    opacity: 0;
    transform: translateX(20px);
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
    }

    to {
        transform: translateX(0);
    }
}

/* Toast动画 */
.toast {
    transition: opacity 0.3s;
}
</style>
