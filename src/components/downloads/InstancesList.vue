<template>
    <div class="section">
        <div class="section-title">已安装实例</div>
        <div class="overflow-x-auto">
            <table class="table w-full">
                <thead>
                    <tr>
                        <th>名称</th>
                        <th>状态</th>
                        <th>创建时间</th>
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
                                <button class="btn btn-sm btn-square rounded-md action-btn"
                                    :class="instance.status === 'running' ? 'btn-error' : 'btn-success'"
                                    @click.stop="toggleInstance(instance)" :disabled="instance.isLoading">
                                    <!-- 使用DaisyUI的加载动画 -->
                                    <span v-if="instance.isLoading" class="loading loading-spinner loading-xs"></span>
                                    <Icon v-else :icon="instance.status === 'running' ? 'mdi:stop' : 'mdi:play'" />
                                </button>
                                <button class="btn btn-sm btn-square btn-ghost rounded-md action-btn"
                                    @click.stop="openInstancePath(instance)" :disabled="instance.isLoading">
                                    <Icon icon="mdi:folder-outline" />
                                </button>
                                <button class="btn btn-sm btn-square btn-ghost rounded-md action-btn"
                                    @click.stop="openSettings(instance)" :disabled="instance.isLoading">
                                    <Icon icon="mdi:cog-outline" />
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
    </div>
</template>

<script setup>
import { ref, inject } from 'vue';
import { Icon } from '@iconify/vue';
import toastService from '@/services/toastService';

const props = defineProps({
    instances: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['refresh-instances', 'toggle-instance']);
const emitter = inject('emitter', null);

// 切换实例状态
const toggleInstance = (instance) => {
    try {
        // 防止重复点击
        if (instance.isLoading) return;

        // 设置加载状态
        instance.isLoading = true;

        // 正在运行则停止，否则启动
        const action = instance.status === 'running' ? '停止' : '启动';

        // 更新临时状态
        instance.status = instance.status === 'running' ? 'stopping' : 'starting';

        toastService.info(`正在${action}实例: ${instance.name}`);

        // 模拟API调用
        setTimeout(() => {
            try {
                // 切换状态
                instance.status = instance.status === 'stopping' ? 'stopped' : 'running';
                instance.isLoading = false;

                // 通知成功
                toastService.success(`实例 ${instance.name} 已${action}`);

                // 通知父组件刷新列表
                emit('refresh-instances');
            } catch (err) {
                // 恢复原始状态
                instance.status = instance.status === 'stopping' ? 'running' : 'stopped';
                instance.isLoading = false;
                toastService.error(`${action}实例失败: ${err.message || '未知错误'}`);
            }
        }, 1500);

        emit('toggle-instance', instance);
    } catch (error) {
        console.error('操作实例状态时出错:', error);
        toastService.error('操作失败: ' + (error.message || '未知错误'));
        // 确保出错时重置加载状态
        instance.isLoading = false;
    }
};

// 打开实例配置
const openSettings = (instance) => {
    // 使用事件总线打开实例设置
    if (emitter) {
        emitter.emit('open-instance-settings', {
            name: instance.name,
            path: instance.path || ''
        });
    } else {
        toastService.info('实例设置功能即将推出');
    }
};

// 打开实例文件夹
const openInstancePath = (instance) => {
    if (instance.path) {
        // 显示确认消息
        toastService.success(`正在打开: ${instance.path}`);

        // 如果在Electron环境中，可以使用shell.openPath
        if (window.electron && window.electron.openPath) {
            window.electron.openPath(instance.path);
        } else {
            // 功能提示
            toastService.warning('文件管理功能开发中', 3000);
        }

        console.log('打开实例路径:', instance.path);
    } else {
        toastService.error('无法获取实例路径');
    }
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

// 刷新实例列表
const refreshInstances = () => {
    emit('refresh-instances');
};

// 阻止事件冒泡导致的重复触发
const viewInstanceDetails = (instance) => {
    if (emitter) {
        // 使用防抖函数避免事件频繁触发
        if (viewInstanceDetails.timer) {
            clearTimeout(viewInstanceDetails.timer);
        }

        viewInstanceDetails.timer = setTimeout(() => {
            // 导航到实例管理页面
            emitter.emit('navigate-to-tab', 'instances');

            // 延迟发送查看详情事件，确保页面已切换
            setTimeout(() => {
                emitter.emit('view-instance-details', instance);
            }, 300);
        }, 100);
    } else {
        toastService.error('无法查看实例详情');
    }
};
viewInstanceDetails.timer = null;
</script>

<style lang="postcss" scoped>
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

.action-btn {
    @apply w-8 h-8 flex items-center justify-center;
    font-size: 16px;
}

.btn-square.rounded-md {
    border-radius: 6px;
}

/* 添加加载动画样式 */
.loading-spinner {
    @apply text-base-content;
}

/* 优化按钮状态样式 */
.action-btn:disabled {
    @apply cursor-not-allowed opacity-70;
}

.action-btn {
    @apply transition-all duration-200;
}
</style>
