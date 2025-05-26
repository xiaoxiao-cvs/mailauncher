<template>
    <div class="drawer-container" :class="{ 'open': isOpen }">
        <div class="drawer-backdrop" @click="handleClose"></div>
        <div class="drawer-content bg-base-100">
            <!-- 抽屉标题 -->
            <div class="drawer-header">
                <h3 class="drawer-title">{{ instanceName }} 设置</h3>
                <button class="btn btn-sm btn-ghost" @click="handleClose">
                    <Icon icon="mdi:close" width="20" height="20" />
                </button>
            </div>

            <!-- 抽屉内容区域 - 只保留基本信息 -->
            <div class="drawer-body">
                <div class="p-4">
                    <h4 class="text-lg font-medium mb-3">实例基本信息</h4>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">实例名称</span>
                        </label>
                        <input type="text" v-model="settings.name" class="input input-bordered" disabled />
                    </div>

                    <div class="form-control mt-3">
                        <label class="label">
                            <span class="label-text">实例路径</span>
                        </label>
                        <div class="flex">
                            <input type="text" v-model="settings.path" class="input input-bordered flex-1" disabled />
                            <button class="btn btn-square btn-outline ml-2" @click="openPath">
                                <Icon icon="mdi:folder-open-outline" />
                            </button>
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
</template>

<script setup>
import { ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import toastService from '@/services/toastService';

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

// 设置数据
const settings = ref({
    name: '',
    path: ''
});

// 监听实例名称和路径变化，更新本地设置对象
watch(() => props.instanceName, (newVal) => {
    settings.value.name = newVal;
});

watch(() => props.instancePath, (newVal) => {
    settings.value.path = newVal;
});

// 打开实例路径
const openPath = () => {
    if (!settings.value.path) {
        toastService.error('路径不存在');
        return;
    }

    if (window.electron && window.electron.openPath) {
        window.electron.openPath(settings.value.path);
    } else {
        toastService.info('文件管理功能开发中');
    }
};

// 关闭抽屉
const handleClose = () => {
    emit('close');
};

// 保存设置
const handleSave = () => {
    toastService.success('设置已保存');
    emit('save', settings.value);
};
</script>

<style>
.drawer-container {
    position: fixed;
    top: 0;
    right: -100%;
    width: 100%;
    height: 100%;
    z-index: 1000;
    transition: all 0.3s ease-in-out;
}

.drawer-container.open {
    right: 0;
}

.drawer-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1001;
}

.drawer-content {
    position: absolute;
    top: 0;
    right: 0;
    width: 450px;
    height: 100%;
    background-color: #ffffff;
    /* 确保内容区域背景为白色 */
    z-index: 1002;
    box-shadow: -3px 0 10px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
}

.drawer-header {
    padding: 1rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #ffffff;
    /* 确保标题区域背景为白色 */
}

.drawer-title {
    margin: 0;
    font-weight: 600;
}

.drawer-body {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
    background-color: #ffffff;
    /* 确保主体区域背景为白色 */
}

.drawer-footer {
    padding: 1rem;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    background-color: #ffffff;
    /* 确保底部区域背景为白色 */
}

@media (max-width: 768px) {
    .drawer-content {
        width: 100%;
    }
}
</style>
