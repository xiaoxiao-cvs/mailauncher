<template>
    <div class="section">
        <div class="section-title">已安装实例</div>
        <div class="overflow-x-auto">
            <table class="table w-full">
                <thead>
                    <tr>
                        <th>名称</th>
                        <th>状态</th>
                        <th>安装时间</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="instance in instances" :key="instance.id" class="hover">
                        <td>{{ instance.name }}</td>
                        <td>
                            <div class="badge" :class="getStatusBadgeClass(instance.status)">
                                {{ getStatusText(instance.status) }}
                            </div>
                        </td>
                        <td>{{ instance.installedAt || '未知' }}</td>
                        <td>
                            <div class="flex gap-2">
                                <button class="btn btn-sm" 
                                    :class="instance.status === 'running' ? 'btn-error' : 'btn-success'"
                                    @click="toggleInstance(instance)">
                                    {{ instance.status === 'running' ? '停止' : '启动' }}
                                </button>
                                <button class="btn btn-sm btn-ghost" @click="openInstancePath(instance)">
                                    <i class="icon icon-folder"></i>
                                </button>
                                <button class="btn btn-sm btn-ghost" @click="openSettings(instance)">
                                    <i class="icon icon-settings"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                    <!-- 空状态 -->
                    <tr v-if="instances.length === 0">
                        <td colspan="4" class="text-center py-6">
                            <div class="flex flex-col items-center justify-center">
                                <i class="icon icon-package text-2xl opacity-40 mb-2"></i>
                                <p class="opacity-60">尚未安装实例</p>
                                <p class="text-xs opacity-40 mt-1">请在上方配置并安装一个新的MaiBot实例</p>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="flex justify-end mt-4">
            <button class="btn btn-sm btn-outline" @click="refreshInstances">刷新列表</button>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
    instances: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['refresh-instances', 'toggle-instance']);

// 切换实例状态
const toggleInstance = (instance) => {
    emit('toggle-instance', instance);
};

// 打开实例配置
const openSettings = (instance) => {
    // 通知用户功能正在开发中
    showToast('实例设置功能即将推出', 'info');
};

// 打开实例文件夹
const openInstancePath = (instance) => {
    if (instance.path) {
        // 显示确认消息
        showToast(`正在打开: ${instance.path}`, 'success');
        
        // 在实际应用中，这里会调用Electron或其他API来打开文件夹
        // 现在只是一个模拟
        console.log('打开实例路径:', instance.path);
    } else {
        showToast('无法获取实例路径', 'error');
    }
};

// 刷新实例列表
const refreshInstances = () => {
    emit('refresh-instances');
};

// 获取状态徽章样式
const getStatusBadgeClass = (status) => {
    switch (status) {
        case 'running': return 'badge-success';
        case 'stopped': return 'badge-secondary';
        case 'starting': return 'badge-warning';
        case 'stopping': return 'badge-warning';
        case 'error': return 'badge-error';
        default: return 'badge-neutral';
    }
};

// 获取状态文本
const getStatusText = (status) => {
    switch (status) {
        case 'running': return '运行中';
        case 'stopped': return '已停止';
        case 'starting': return '启动中';
        case 'stopping': return '停止中';
        case 'error': return '错误';
        default: return '未知';
    }
};

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
</script>

<style scoped>
.section-title {
    font-weight: bold;
    font-size: 1rem;
    margin-bottom: 1rem;
    color: var(--primary);
    border-bottom: 1px solid var(--primary);
    padding-bottom: 0.5rem;
}

/* Toast动画 */
.toast {
    transition: opacity 0.3s;
    opacity: 1;
}

.badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
}

.icon {
    font-size: 1rem;
}
</style>
