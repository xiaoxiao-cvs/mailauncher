<template>
    <transition name="settings-drawer">
        <div v-if="isOpen" class="settings-drawer-backdrop" @click.self="handleBackdropClick">
            <div class="settings-drawer-container">
                <div class="settings-drawer-header">
                    <h2>实例配置设置 - {{ instanceName }}</h2>
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
                            <component :is="currentSettingComponent" :key="activeTab" :config="configData"
                                @update:config="updateConfig" />
                        </transition>
                    </div>
                </div>

                <div class="settings-drawer-footer">
                    <el-button @click="closeDrawer">取消</el-button>
                    <el-button type="primary" @click="saveConfig">保存配置</el-button>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, provide } from 'vue';
import {
    Close, InfoFilled, User, ChatDotRound, Collection,
    Calendar, Document, Memo, Monitor, SetUp, PictureFilled,
    SwitchButton, MoreFilled
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 导入设置子组件
import BasicInfoSettings from './instance/BasicInfoSettings.vue';
import GroupManagementSettings from './instance/GroupManagementSettings.vue';
import PersonalitySettings from './instance/PersonalitySettings.vue';
import ScheduleSettings from './instance/ScheduleSettings.vue';
import ChatSettings from './instance/ChatSettings.vue';
import MemorySettings from './instance/MemorySettings.vue';
import ModelSettings from './instance/ModelSettings.vue';
import AdvancedSettings from './instance/AdvancedSettings.vue';

// 修改：暂时注释掉未创建的组件导入
// import EmojiSettings from './instance/EmojiSettings.vue';
// import EmotionSettings from './instance/EmotionSettings.vue';
// import OtherSettings from './instance/OtherSettings.vue';

// 定义基础组件用于占位
const PlaceholderComponent = {
    template: `
        <div class="settings-tab-content">
            <h3 class="settings-section-title">{{ title }}</h3>
            <el-card class="settings-card">
                <div class="placeholder-message">
                    <el-icon><InfoFilled /></el-icon>
                    <span>该功能正在开发中...</span>
                </div>
            </el-card>
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

// 配置数据
const configData = ref({});

// 原始配置数据备份 (用于比较变更)
const originalConfigData = ref({});

// 加载配置数据
const loadConfig = async () => {
    try {
        // 实际应用中这里应该从后端加载配置
        // 现在我们使用模拟数据
        const response = await fetch('/api/instance/' + props.instanceName + '/config');
        if (response.ok) {
            const data = await response.json();
            configData.value = data;
            originalConfigData.value = JSON.parse(JSON.stringify(data));
        } else {
            // 模拟数据
            loadMockConfig();
        }
    } catch (error) {
        console.error('加载配置失败:', error);
        // 加载模拟数据
        loadMockConfig();
        ElMessage.info('使用模拟配置数据');
    }
};

// 加载模拟配置数据
const loadMockConfig = () => {
    configData.value = {
        inner: { version: "1.6.0" },
        bot: {
            qq: 1145141919810,
            nickname: "麦麦",
            alias_names: ["麦叠", "牢麦"]
        },
        platforms: { "nonebot-qq": "http://127.0.0.1:18002/api/message" },
        groups: {
            talk_allowed: [123, 123],
            talk_frequency_down: [],
            ban_user_id: []
        },
        personality: {
            personality_core: "友善、有趣、乐于助人",
            personality_sides: [
                "喜欢研究新技术",
                "擅长解释复杂概念",
                "有时会开一些无伤大雅的玩笑",
                "非常有耐心",
                "好奇心旺盛"
            ]
        },
        identity: {
            identity_detail: ["技术爱好者", "喜欢帮助他人"],
            age: 20,
            gender: "男",
            appearance: "阳光开朗的科技爱好者形象"
        },
        chat: {
            allow_focus_mode: true,
            base_normal_chat_num: 3,
            base_focused_chat_num: 2,
            observation_context_size: 15,
            message_buffer: true,
            ban_words: []
        },
        normal_chat: {
            model_reasoning_probability: 0.7,
            model_normal_probability: 0.3,
            emoji_chance: 0.2,
            thinking_timeout: 100,
            willing_mode: "classical",
            response_willing_amplifier: 1
        },
        focus_chat: {
            reply_trigger_threshold: 3.6,
            default_decay_rate_per_second: 0.95,
            consecutive_no_reply_threshold: 3
        },
        memory: {
            build_memory_interval: 2000,
            build_memory_sample_num: 8,
            build_memory_sample_length: 40,
            memory_compress_rate: 0.1,
            forget_memory_interval: 1000,
            memory_forget_time: 24,
            memory_forget_percentage: 0.01,
            consolidate_memory_interval: 1000,
            memory_ban_words: []
        },
        schedule: {
            enable_schedule_gen: true,
            enable_schedule_interaction: true,
            prompt_schedule_gen: "活泼外向，喜欢社交和探索新事物",
            schedule_doing_update_interval: 900,
            schedule_temperature: 0.1,
            time_zone: "Asia/Shanghai"
        },
        model: {
            llm_reasoning: {
                name: "Pro/deepseek-ai/DeepSeek-R1",
                provider: "SILICONFLOW"
            },
            llm_normal: {
                name: "Pro/deepseek-ai/DeepSeek-V3",
                provider: "SILICONFLOW",
                temp: 0.2
            },
            llm_heartflow: {
                name: "Qwen/Qwen2.5-32B-Instruct",
                provider: "SILICONFLOW"
            }
        },
        emoji: {
            max_emoji_num: 40,
            max_reach_deletion: true,
            check_interval: 10,
            save_pic: false,
            save_emoji: false,
            steal_emoji: true,
            enable_check: false,
            check_prompt: "符合公序良俗"
        },
        mood: {
            mood_update_interval: 1.0,
            mood_decay_rate: 0.95,
            mood_intensity_factor: 1.0
        }
    };
    originalConfigData.value = JSON.parse(JSON.stringify(configData.value));
};

// 更新配置
const updateConfig = (newConfig) => {
    configData.value = newConfig;
};

// 保存配置
const saveConfig = async () => {
    try {
        // 实际应用中这里应该调用API保存配置
        console.log('保存配置:', configData.value);

        // 模拟保存过程
        await new Promise(resolve => setTimeout(resolve, 500));

        ElMessage.success('配置保存成功');
        originalConfigData.value = JSON.parse(JSON.stringify(configData.value));
        emit('save', configData.value);
        closeDrawer();
    } catch (error) {
        console.error('保存配置失败:', error);
        ElMessage.error('保存配置失败: ' + error.message);
    }
};

// 设置选项卡定义
const settingsTabs = {
    'basic-info': { title: '基础信息', icon: InfoFilled, component: BasicInfoSettings },
    'group-management': { title: '群组与用户', icon: User, component: GroupManagementSettings },
    'personality': { title: '个性与身份', icon: Collection, component: PersonalitySettings },
    'schedule': { title: '日程与行为', icon: Calendar, component: ScheduleSettings },
    'chat': { title: '聊天与回复', icon: ChatDotRound, component: ChatSettings },
    'memory': { title: '记忆管理', icon: Memo, component: MemorySettings },
    'model': { title: '模型配置', icon: Monitor, component: ModelSettings },
    'advanced': { title: '高级功能', icon: SetUp, component: AdvancedSettings },
    'emoji': {
        title: '表情包管理',
        icon: PictureFilled,
        component: {
            ...EmojiSettings,
            props: { ...EmojiSettings.props, title: '表情包管理' }
        }
    },
    'emotion': {
        title: '情绪与互动',
        icon: SwitchButton,
        component: {
            ...EmotionSettings,
            props: { ...EmotionSettings.props, title: '情绪与互动' }
        }
    },
    'others': {
        title: '其他与调试',
        icon: MoreFilled,
        component: {
            ...OtherSettings,
            props: { ...OtherSettings.props, title: '其他与调试' }
        }
    }
};

// 计算当前显示的设置组件
const currentSettingComponent = computed(() => {
    return settingsTabs[activeTab.value]?.component || BasicInfoSettings;
});

// 切换选项卡
const switchTab = (tab) => {
    activeTab.value = tab;
};

// 关闭抽屉
const closeDrawer = () => {
    // 检查是否有未保存的更改
    const isConfigChanged = JSON.stringify(configData.value) !== JSON.stringify(originalConfigData.value);

    if (isConfigChanged) {
        ElMessageBox.confirm(
            '您有未保存的配置更改，确定要关闭吗？',
            '未保存的更改',
            {
                confirmButtonText: '放弃更改',
                cancelButtonText: '继续编辑',
                type: 'warning'
            }
        )
            .then(() => {
                emit('close');
            })
            .catch(() => {
                // 继续编辑，什么也不做
            });
    } else {
        emit('close');
    }
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
    loadConfig();
});

// 移除事件监听
onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style>
/* 继承系统设置抽屉的样式，保持一致性 */
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

.settings-drawer-footer {
    display: flex;
    justify-content: flex-end;
    padding: 12px 20px;
    border-top: 1px solid var(--el-border-color-light);
    gap: 10px;
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
