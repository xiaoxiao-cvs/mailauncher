<template>
    <div class="navbar bg-base-200 rounded-box shadow-sm mb-6">
        <div class="navbar-start">
            <div class="flex items-center gap-3">
                <i class="icon icon-list text-primary text-lg"></i>
                <h2 class="text-xl font-bold">实例管理</h2>
            </div>
        </div>
        <div class="navbar-center">
            <div class="flex items-center gap-3">
                <!-- 过滤下拉菜单 -->
                <div class="dropdown dropdown-hover">
                    <div tabindex="0" role="button" class="btn btn-sm">
                        {{ filterLabel }} <i class="icon icon-chevron-down"></i>
                    </div>
                    <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                        <li><a @click="handleFilterChange('all')">所有</a></li>
                        <li><a @click="handleFilterChange('not_running')">未运行</a></li>
                        <li><a @click="handleFilterChange('stopping')">停止中</a></li>
                        <li><a @click="handleFilterChange('starting')">启动中</a></li>
                        <li><a @click="handleFilterChange('running')">运行中</a></li>
                        <li><a @click="handleFilterChange('maintenance')">维护中</a></li>
                    </ul>
                </div>

                <!-- 搜索框 -->
                <div class="form-control">
                    <div class="input-group">
                        <input v-model="searchQuery" type="text" placeholder="根据应用名字搜索"
                            class="input input-bordered input-sm w-64" />
                        <button class="btn btn-sm btn-square">
                            <i class="icon icon-search"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="navbar-end">
            <div class="flex items-center gap-2">
                <!-- 新建按钮 - 改为截图尺寸 -->
                <button class="btn btn-sm btn-primary btn-square" title="新建实例" @click="createNewInstance">
                    <Icon icon="ri:add-line" width="16" height="16" />
                </button>

                <!-- 刷新按钮 - 改为截图尺寸 -->
                <button class="btn btn-sm btn-ghost btn-square" @click="refreshInstances" title="刷新列表">
                    <Icon icon="ri:refresh-line" width="16" height="16" />
                </button>

                <!-- 批量操作按钮 - 改为截图尺寸 -->
                <button class="btn btn-sm btn-ghost btn-square" @click="batchOperation" title="批量操作">
                    <Icon icon="ri:checkbox-multiple-line" width="16" height="16" />
                </button>
            </div>
        </div>
    </div>

    <!-- 实例列表区域 -->
    <div class="instances-list">
        <!-- 加载状态 -->
        <div v-if="loading" class="w-full p-8">
            <div class="flex flex-col gap-4">
                <div class="skeleton h-12 w-full"></div>
                <div class="skeleton h-32 w-full"></div>
                <div class="skeleton h-32 w-full"></div>
            </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="filteredInstances.length === 0"
            class="empty-state flex flex-col items-center justify-center p-12">
            <div class="text-center">
                <Icon icon="ri:file-list-3-line" class="text-lg opacity-40 mb-2" />
                <h3 class="font-bold text-lg mb-2">没有找到应用实例</h3>
                <p class="text-sm opacity-60 mb-4">尝试调整过滤条件或创建新的实例</p>
                <button class="btn btn-primary" @click="goToDownloads">新建应用</button>
            </div>
        </div>

        <!-- 实例卡片网格 -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-2">
            <div v-for="instance in filteredInstances" :key="instance.id || instance.name"
                class="instance-card shadow-md hover:shadow-lg transition-all" @click="viewInstance(instance)">
                <div class="card-body p-5 flex flex-col h-full">
                    <!-- 实例标题与描述 -->
                    <div class="mb-3">
                        <h3 class="card-title text-lg">{{ instance.name }}</h3>
                        <p class="text-sm opacity-70">Maibot-Napcat-ada</p>
                    </div>

                    <!-- 实例信息 -->
                    <div class="space-y-2 mb-4 text-sm flex-1">
                        <div class="flex justify-between">
                            <span class="opacity-70">安装时间:</span>
                            <span>{{ instance.createdAt || instance.installedAt || '2023-05-13 19:56:18' }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="opacity-70">总运行时长:</span>
                            <span>{{ instance.totalRunningTime || '48小时36分钟' }}</span>
                        </div>
                    </div>

                    <!-- 底部操作区域 - 将状态和按钮放在同一行 -->
                    <div class="mt-auto">
                        <!-- 实例状态显示 -->
                        <div class="flex justify-between items-center">
                            <div class="status-indicator">
                                <span :class="['status-dot', getStatusClass(instance.status)]"></span>
                                <span class="status-text" :class="getStatusClass(instance.status)">
                                    {{ getStatusText(instance.status) }}
                                </span>
                            </div>

                            <!-- 动作按钮 -->
                            <div class="action-group flex flex-row gap-2">
                                <button class="btn btn-sm btn-square rounded-md action-btn"
                                    :class="getActionButtonClass(instance)"
                                    @click.stop="toggleInstanceRunning(instance)" :disabled="instance.isLoading">
                                    <span v-if="instance.isLoading" class="loading loading-spinner loading-xs"></span>
                                    <Icon v-else :icon="instance.status === 'running' ? 'mdi:stop' : 'mdi:play'" />
                                </button>
                                <button class="btn btn-sm btn-square btn-ghost rounded-md action-btn"
                                    @click.stop="openInstancePath(instance)" :disabled="instance.isLoading">
                                    <Icon icon="mdi:folder-outline" />
                                </button>
                                <button class="btn btn-sm btn-square btn-ghost rounded-md action-btn"
                                    @click.stop="configureInstance(instance)" :disabled="instance.isLoading">
                                    <Icon icon="mdi:cog-outline" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, onUnmounted, watch } from 'vue';
import { Icon } from '@iconify/vue';
import toastService from '@/services/toastService';

// 导入优化的状态管理
import { useInstanceStore } from '@/stores/instanceStore';

// 事件总线，用于与其他组件通信
const emitter = inject('emitter');

// 使用优化的状态管理
const instanceStore = useInstanceStore();

// 定义组件的emit
const emit = defineEmits(['refresh-instances', 'toggle-instance', 'view-instance']);

// 获取当前活动的标签页
const activeTab = inject('activeTab', ref(''));

// 状态变量
const searchQuery = ref('');
const filterType = ref('all');

// 使用计算属性从store获取数据，添加默认值防止错误
const instances = computed(() => instanceStore.instances || []);
const loading = computed(() => instanceStore.loading || false);

// 过滤器标签映射
const filterLabels = {
    'all': '所有',
    'not_running': '未运行',
    'stopping': '停止中',
    'starting': '启动中',
    'running': '运行中',
    'maintenance': '维护中'
};

// 计算属性 - 获取当前过滤器标签
const filterLabel = computed(() => {
    return filterLabels[filterType.value] || '所有';
});

// 监听活动标签页变化，当切换到instances标签时自动刷新
watch(activeTab, (newTab) => {
    if (newTab === 'instances') {
        console.log('自动刷新实例列表');
        // 使用store方法，避免重复请求
        instanceStore.fetchInstances();
    }
});

// 过滤并搜索实例
const filteredInstances = computed(() => {
    let result = instances.value;

    // 根据状态过滤
    if (filterType.value !== 'all') {
        result = result.filter(instance => {
            if (filterType.value === 'not_running') return instance.status === 'stopped';
            return instance.status === filterType.value;
        });
    }

    // 根据搜索词过滤
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(instance =>
            instance.name.toLowerCase().includes(query) ||
            (instance.description && instance.description.toLowerCase().includes(query))
        );
    }

    return result;
});

// 优化：使用store统一获取实例，避免重复请求
const fetchInstances = async () => {
    try {
        console.log('从store获取实例列表...');
        await instanceStore.fetchInstances();
        console.log(`获取到${instances.value.length}个实例`);
    } catch (error) {
        console.error("获取实例失败:", error);
        toastService.error('获取实例列表失败');
    }
};

// 获取模拟实例数据
const getMockInstances = () => {
    // 使用硬编码的数据而不是动态生成
    return [
        {
            name: '本地实例_1',
            status: 'stopped',
            createdAt: '2023-05-13 19:56:18',
            totalRunningTime: '48小时36分钟',
            path: 'D:\\MaiBot\\本地实例_1'
        },
        {
            name: '本地实例_2',
            status: 'running',
            createdAt: '2023-05-12 10:30:00',
            totalRunningTime: '147小时12分钟',
            path: 'D:\\MaiBot\\本地实例_2'
        },
        {
            name: '测试实例_3',
            status: 'starting',
            createdAt: '2023-05-11 08:15:00',
            totalRunningTime: '5小时23分钟',
            path: 'D:\\MaiBot\\测试实例_3'
        },
        {
            name: '远程实例_4',
            status: 'stopping',
            createdAt: '2023-05-10 14:20:00',
            totalRunningTime: '72小时45分钟',
            path: 'D:\\MaiBot\\远程实例_4'
        },
        {
            name: '维护实例_5',
            status: 'maintenance',
            createdAt: '2023-05-09 09:45:00',
            totalRunningTime: '12小时08分钟',
            path: 'D:\\MaiBot\\维护实例_5'
        }
    ];
};

// 刷新实例列表
const refreshInstances = () => {
    fetchInstances();
};

// 获取状态徽章类
const getStatusBadgeClass = (status) => {
    switch (status) {
        case 'running': return 'badge-success';
        case 'starting': return 'badge-warning';
        case 'stopping': return 'badge-error';
        case 'maintenance': return 'badge-info';
        default: return 'badge-ghost';
    }
};

// 获取按钮样式类
const getActionButtonClass = (instance) => {
    if (instance.isLoading) {
        return 'btn-neutral'; // 加载中使用中性颜色
    }
    if (instance.status === 'running') {
        return 'btn-error'; // 运行中时显示停止按钮(红色)
    }
    // 未运行时显示启动按钮(绿色)，与状态指示点颜色一致
    return 'btn-success';
};

// 获取状态类名
const getStatusClass = (status) => {
    switch (status) {
        case 'running': return 'status-running';
        case 'starting': return 'status-starting';
        case 'stopping': return 'status-stopping';
        case 'maintenance': return 'status-maintenance';
        default: return 'status-stopped';
    }
};

// 获取状态文本
const getStatusText = (status) => {
    switch (status) {
        case 'running': return '运行中';
        case 'starting': return '启动中';
        case 'stopping': return '停止中';
        case 'maintenance': return '维护中';
        default: return '未运行';
    }
};

// 处理过滤器更改
const handleFilterChange = (command) => {
    filterType.value = command;
    console.log('过滤器已更改为:', command);
};

// 批量操作
const batchOperation = () => {
    toastService.info('批量操作功能开发中');
};

// 配置实例
const configureInstance = (instance) => {
    if (emitter) {
        emitter.emit('open-instance-settings', {
            name: instance.name,
            path: instance.path || ''
        });
    }
};

// 创建新实例
const createNewInstance = () => {
    if (emitter) {
        emitter.emit('navigate-to-tab', 'downloads');
    }
};

// 跳转到下载页面
const goToDownloads = () => {
    if (emitter) {
        emitter.emit('navigate-to-tab', 'downloads');
    }
};

// 切换实例运行状态
const toggleInstanceRunning = (instance) => {
    try {
        // 防止重复点击
        if (instance.isLoading) return;

        // 设置加载状态
        instance.isLoading = true;

        if (instance.status === 'running') {
            stopInstance(instance);
        } else {
            startInstance(instance);
        }
    } catch (error) {
        console.error('操作实例状态时出错:', error);
        toastService.error('操作失败: ' + (error.message || '未知错误'));
        // 确保出错时重置加载状态
        instance.isLoading = false;
    }
};

// 启动实例
const startInstance = (instance) => {
    // 先设置临时状态表示启动中
    instance.status = 'starting';

    // 显示通知
    toastService.info(`正在启动实例: ${instance.name}`);

    // 模拟API调用
    setTimeout(() => {
        try {
            // 切换到运行状态
            instance.status = 'running';
            instance.isLoading = false;

            // 通知成功
            toastService.success(`实例 ${instance.name} 已启动`);

            // 通知父组件刷新列表
            emit('refresh-instances');
        } catch (err) {
            // 恢复状态
            instance.status = 'stopped';
            instance.isLoading = false;
            toastService.error(`启动实例失败: ${err.message || '未知错误'}`);
        }
    }, 1500);
};

// 停止实例
const stopInstance = (instance) => {
    // 先设置临时状态表示停止中
    instance.status = 'stopping';

    // 显示通知
    toastService.info(`正在停止实例: ${instance.name}`);

    // 模拟API调用
    setTimeout(() => {
        try {
            // 切换到停止状态
            instance.status = 'stopped';
            instance.isLoading = false;

            // 通知成功
            toastService.success(`实例 ${instance.name} 已停止`);

            // 通知父组件刷新列表
            emit('refresh-instances');
        } catch (err) {
            // 恢复状态
            instance.status = 'running';
            instance.isLoading = false;
            toastService.error(`停止实例失败: ${err.message || '未知错误'}`);
        }
    }, 1500);
};

// 打开实例文件夹
const openInstancePath = (instance) => {
    if (instance.path) {
        // 显示文件路径
        toastService.info(`正在打开文件夹: ${instance.path}`, 3000);
        console.log('打开文件夹:', instance.path);

        // 如果在Electron环境中，可以使用shell.openPath
        if (window.electron && window.electron.openPath) {
            window.electron.openPath(instance.path);
        } else {
            // 功能提示
            toastService.warning('文件管理功能开发中', 3000);
        }
    } else {
        toastService.error('无法获取实例路径');
    }
};

// 打开实例设置
const openSettings = (instance) => {
    // 使用事件总线打开实例设置
    if (emitter) {
        emitter.emit('open-instance-settings', {
            name: instance.name,
            path: instance.path || ''
        });
    } else {
        toastService.error('无法打开设置');
    }
};

// 初始化
onMounted(() => {
    // 初始加载时自动刷新一次
    fetchInstances();

    // 监听刷新实例列表事件
    if (emitter) {
        emitter.on('refresh-instances', fetchInstances);
    }
});

// 移除事件监听器
onUnmounted(() => {
    if (emitter) {
        emitter.off('refresh-instances', fetchInstances);
    }
});

// 只有当点击卡片时才会进入实例详情
const viewInstance = (instance) => {
    emit('view-instance', instance);
};
</script>

<style scoped lang="postcss">
/* 移除旧的Toast样式 */
/* 调整按钮为非常小的尺寸 */
.btn-square {
    width: 28px !important;
    height: 28px !important;
    min-height: 28px !important;
    max-height: 28px !important;
    padding: 0 !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    border-radius: 4px;
    line-height: 1 !important;
    min-width: 28px !important;
}

.btn-square:hover {
    transform: scale(1.03);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 图标调整为极小尺寸 */
.btn-square .iconify {
    font-size: 0.75rem;
    stroke-width: 1;
    opacity: 0.9;
}

/* 确保导航栏图标也使用相同的小尺寸 */
.navbar-end .btn-square {
    width: 28px !important;
    height: 28px !important;
}

.navbar-end .btn-square .iconify {
    font-size: 0.75rem;
    stroke-width: 1;
}

/* 批量操作模式激活样式 */
.batch-mode-active {
    @apply bg-primary/10;
}

.section-title {
    font-weight: bold;
    font-size: 1rem;
    margin-bottom: 1rem;
    color: var(--primary);
    border-bottom: 1px solid var(--primary);
    padding-bottom: 0.5rem;
}

.badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
}

/* 状态指示点样式 */
.status-dot {
    @apply w-2.5 h-2.5 rounded-full inline-block;
}

/* 运行状态 - 绿色脉冲 */
.status-dot.status-running {
    @apply bg-success;
    animation: pulse 1.5s infinite;
    box-shadow: 0 0 5px 1px rgba(72, 199, 116, 0.5);
}

/* 维护状态 - 蓝色脉冲 */
.status-dot.status-maintenance {
    @apply bg-info;
    animation: pulse 1.5s infinite;
    box-shadow: 0 0 5px 1px rgba(56, 182, 255, 0.5);
}

/* 停止状态 - 灰色固定点 */
.status-dot.status-stopped {
    @apply bg-base-content/40;
}

/* 脉冲动画 */
@keyframes pulse {

    0%,
    100% {
        opacity: 1;
        transform: scale(1);
    }

    50% {
        opacity: 0.7;
        transform: scale(0.85);
    }
}

/* 启动按钮 - 与运行指示点同色 */
.status-btn-success {
    background-color: hsl(var(--su)) !important;
    border-color: hsl(var(--su)) !important;
    color: hsl(var(--suc)) !important;
}

.status-btn-success:hover {
    filter: brightness(0.95);
    background-color: hsl(var(--su) / 0.9) !important;
    border-color: hsl(var(--su) / 0.9) !important;
}

/* 让loading组件显示得更好 */
.loading.loading-spinner {
    @apply inline-block;
}

/* 状态指示器容器保持垂直对齐 */
.status-indicator {
    @apply flex items-center;
}

/* 实例列表操作按钮样式 */
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

/* 过渡状态样式 */
.status-starting .status-dot,
.status-stopping .status-dot {
    animation: pulse 0.8s infinite;
}

/* 加强过渡动画 */
@keyframes pulse {

    0%,
    100% {
        transform: scale(1);
        opacity: 1;
    }

    50% {
        transform: scale(0.8);
        opacity: 0.7;
    }
}

/* 恢复卡片样式 */
.instance-card {
    @apply bg-base-100 rounded-xl flex flex-col border border-base-300 shadow-sm transition-all duration-300 overflow-hidden;
    height: 220px;
    /* 固定高度，确保一致性 */
}

.instance-card:hover {
    @apply -translate-y-[3px] shadow-lg;
}

/* 卡片内容布局优化 */
.card-body {
    @apply p-5 flex flex-col;
    height: 100%;
}

/* 状态指示器和操作按钮统一放在底部 */
.status-indicator {
    @apply flex items-center gap-1;
}

/* 按钮样式保持不变但确保样式统一 */
.action-btn {
    @apply w-8 h-8 flex items-center justify-center transition-all duration-200;
    font-size: 16px;
    border-radius: 6px !important;
}

/* 确保状态文本与按钮对齐 */
.status-text {
    @apply ml-1 text-sm;
    vertical-align: middle;
}
</style>