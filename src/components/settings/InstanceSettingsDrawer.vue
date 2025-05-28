<template>
    <div class="drawer-container" :class="{ 'open': isOpen }">
        <div class="drawer-content bg-base-100">
            <div class="drawer-body">
                <div class="p-4">
                    <h3 class="text-xl font-bold mb-4">实例设置 - {{ instanceName }}</h3>

                    <!-- 模型配置按钮 -->
                    <div class="card bg-base-200 shadow-sm hover:shadow-md transition-all mb-4">
                        <div class="card-body">
                            <h2 class="card-title text-lg">Bot 配置</h2>
                            <p class="text-sm opacity-70">配置机器人模型、聊天设置和人格特性</p>
                            <div class="card-actions justify-end mt-2">
                                <button class="btn btn-primary" @click="openModelSettings">
                                    <Icon icon="mdi:robot" class="mr-2" />
                                    打开配置
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="mt-6">
                        <div class="alert alert-info shadow-sm">
                            <div>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                    class="stroke-current flex-shrink-0 w-6 h-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span>更多设置功能开发中...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 抽屉底部操作区 -->
            <div class="drawer-footer">
                <button class="btn btn-ghost" @click="handleClose">取消</button>
                <button class="btn btn-primary" @click="handleSave">保存</button>
            </div>
        </div>
    </div>

    <!-- 模型设置抽屉 -->
    <ModelSettingsDrawer :is-open="isModelSettingsOpen" :instance-name="instanceName" @close="closeModelSettings"
        @save="handleModelSettingsSave" />
</template>

<script setup>
import { ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import toastService from '@/services/toastService';
import ModelSettingsDrawer from './ModelSettingsDrawer.vue';

const props = defineProps({
    isOpen: {
        type: Boolean,
        default: false
    },
    instanceName: {
        type: String,
        default: ''
    },
    instancePath: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['close', 'save']);

// 模型设置抽屉状态
const isModelSettingsOpen = ref(false);

// 监听isOpen变化，当打开InstanceSettingsDrawer时，自动打开ModelSettingsDrawer
watch(() => props.isOpen, (newVal) => {
    if (newVal) {
        // 直接打开模型设置抽屉
        setTimeout(() => { // 使用setTimeout确保DOM更新完成
            openModelSettings();
        }, 100);
    } else {
        // 实例设置关闭时，确保模型设置也关闭
        isModelSettingsOpen.value = false;
    }
});

// 打开模型设置抽屉
const openModelSettings = () => {
    isModelSettingsOpen.value = true;
};

// 关闭模型设置抽屉
const closeModelSettings = () => {
    isModelSettingsOpen.value = false;
    // 同时关闭实例设置抽屉
    emit('close');
};

// 处理模型设置保存
const handleModelSettingsSave = (modelConfig) => {
    console.log('模型配置已保存:', modelConfig);
    toastService.success('模型配置已保存');
    // 保存后关闭两个抽屉
    emit('save');
    emit('close');
};

// 关闭抽屉
const handleClose = () => {
    emit('close');
};

// 保存设置
const handleSave = () => {
    toastService.success('实例设置已保存');
    emit('save');
    emit('close');
};
</script>

<style scoped>
.drawer-container {
    @apply fixed inset-0 z-50 transform translate-x-full transition-transform duration-300 ease-in-out;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
}

.drawer-container.open {
    @apply translate-x-0;
}

.drawer-content {
    @apply h-full w-full md:w-2/3 lg:w-1/2 ml-auto flex flex-col shadow-xl;
    max-width: 600px;
}

.drawer-body {
    @apply flex-1 overflow-y-auto;
}

.drawer-footer {
    @apply p-4 bg-base-200 flex justify-end gap-2 border-t border-base-300;
}
</style>
