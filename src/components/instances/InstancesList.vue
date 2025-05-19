<template>
    <div class="instances-container">
        <!-- 顶部导航栏 -->
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
                <div v-for="instance in filteredInstances" :key="instance.name"
                    class="card bg-base-100 shadow-md hover:shadow-lg transition-all">
                    <div class="card-body p-5">
                        <!-- 实例标题与描述 -->
                        <div class="mb-3">
                            <h3 class="card-title text-lg">{{ instance.name }}</h3>
                            <p class="text-sm opacity-70">Maibot-Napcat_ada</p>
                        </div>

                        <!-- 实例信息 -->
                        <div class="space-y-2 mb-4 text-sm">
                            <div class="flex justify-between">
                                <span class="opacity-70">安装时间:</span>
                                <span>{{ instance.createdAt || instance.installedAt || '2023-05-13 19:56:18' }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="opacity-70">总运行时长:</span>
                                <span>{{ instance.totalRunningTime || '48小时36分钟' }}</span>
                            </div>
                        </div>

                        <!-- 状态指示器 -->
                        <div class="flex items-center gap-2 mb-4">
                            <span class="status-indicator flex items-center">
                                <!-- 运行状态图标 - 只保留三种状态 -->
                                <span v-if="instance.status === 'running'"
                                    class="status-dot status-running mr-2"></span>
                                <span v-else-if="instance.status === 'maintenance'"
                                    class="status-dot status-maintenance mr-2"></span>
                                <span v-else class="status-dot status-stopped mr-2"></span>
                                <!-- 状态文本 - 不再使用彩色背景 -->
                                <span class="text-sm">{{ getStatusText(instance.status) }}</span>
                            </span>
                        </div>

                        <!-- 操作按钮区 - 缩小图标并将终端改为重启 -->
                        <div class="card-actions justify-end mt-2">
                            <div class="flex gap-2">
                                <!-- 停止/启动按钮 - 显示加载状态 -->
                                <button class="btn btn-sm btn-square"
                                    :class="[getActionButtonClass(instance), 'status-btn']"
                                    @click="toggleInstanceRunning(instance)" :disabled="instance.isLoading"
                                    :title="instance.status === 'running' ? '停止' : '启动'">
                                    <span v-if="instance.isLoading" class="loading loading-spinner loading-xs"></span>
                                    <Icon v-else :icon="instance.status === 'running' ? 'ri:stop-line' : 'ri:play-line'"
                                        width="12" height="12" />
                                </button>
                                <!-- 重启按钮 - 尽量小的图标 -->
                                <button class="btn btn-sm btn-ghost btn-square" @click="restartInstance(instance)"
                                    :disabled="instance.isLoading" title="重启实例">
                                    <span v-if="instance.isRestarting"
                                        class="loading loading-spinner loading-xs"></span>
                                    <Icon v-else icon="ri:restart-line" width="12" height="12" />
                                </button>
                                <!-- 设置按钮 - 尽量小的图标 -->
                                <button class="btn btn-sm btn-ghost btn-square" @click="configureInstance(instance)"
                                    title="设置">
                                    <Icon icon="ri:settings-3-line" width="12" height="12" />
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
import { instancesApi } from '@/services/api';
import { Icon } from '@iconify/vue';

// 事件总线，用于与其他组件通信
const emitter = inject('emitter');

// 获取当前活动的标签页
const activeTab = inject('activeTab', ref(''));

// 状态变量
const loading = ref(false);
const instances = ref([]);
const searchQuery = ref('');
const filterType = ref('all');

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
        fetchInstances();
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

// 获取实例
const fetchInstances = async () => {
    try {
        loading.value = true;
        console.log('获取实例列表...');

        // 检查是否使用模拟数据
        const useMockData = localStorage.getItem('useMockData') === 'true';

        if (useMockData) {
            // 使用模拟数据
            console.log('使用模拟数据');
            instances.value = getMockInstances();
        } else {
            try {
                // 尝试从API获取数据
                console.log('尝试从API获取实例数据');
                const response = await instancesApi.getInstances();

                if (response && response.data && Array.isArray(response.data.instances)) {
                    instances.value = response.data.instances;
                } else if (response && Array.isArray(response.instances)) {
                    instances.value = response.instances;
                } else {
                    console.warn('API返回数据格式不符合预期，使用模拟数据');
                    instances.value = getMockInstances();
                }
            } catch (apiError) {
                console.error('API请求失败:', apiError);
                instances.value = getMockInstances();
            }
        }

        console.log(`获取到${instances.value.length}个实例`);
    } catch (error) {
        console.error("获取实例失败:", error);
        instances.value = getMockInstances();
    } finally {
        loading.value = false;
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

// 获取实例状态文本
const getStatusText = (status) => {
    switch (status) {
        case 'running': return '运行中';
        case 'starting': return '启动中';
        case 'stopping': return '停止中';
        case 'maintenance': return '维护中';
        default: return '未运行';
    }
};

// 获取操作按钮的类
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

// 处理过滤器更改
const handleFilterChange = (command) => {
    filterType.value = command;
    console.log('过滤器已更改为:', command);
};

// 批量操作
const batchOperation = () => {
    showToast('批量操作功能开发中', 'info');
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
    if (instance.status === 'running') {
        stopInstance(instance);
    } else {
        startInstance(instance);
    }
};

// 启动实例
const startInstance = async (instance) => {
    try {
        showToast(`正在启动实例: ${instance.name}`, 'info');

        // 设置加载状态
        instance.isLoading = true;

        // 模拟延迟
        setTimeout(() => {
            instance.status = 'running';
            instance.isLoading = false;
            showToast(`实例 ${instance.name} 已启动`, 'success');
        }, 2000);

        // 在真实环境中应该调用API
        // await instancesApi.startInstance(instance.name);
    } catch (error) {
        console.error('启动实例失败:', error);
        instance.isLoading = false;
        showToast(`启动实例失败: ${error.message}`, 'error');
    }
};

// 停止实例
const stopInstance = async (instance) => {
    try {
        showToast(`正在停止实例: ${instance.name}`, 'info');

        // 设置加载状态
        instance.isLoading = true;

        // 模拟延迟
        setTimeout(() => {
            instance.status = 'stopped';
            instance.isLoading = false;
            showToast(`实例 ${instance.name} 已停止`, 'success');
        }, 2000);

        // 在真实环境中应该调用API
        // await instancesApi.stopInstance(instance.name);
    } catch (error) {
        console.error('停止实例失败:', error);
        instance.isLoading = false;
        showToast(`停止实例失败: ${error.message}`, 'error');
    }
};

// 重启实例
const restartInstance = async (instance) => {
    try {
        if (instance.status !== 'running') {
            showToast('只能重启运行中的实例', 'warning');
            return;
        }

        showToast(`正在重启实例: ${instance.name}`, 'info');

        // 设置重启加载状态
        instance.isRestarting = true;

        // 模拟延迟
        setTimeout(() => {
            instance.isRestarting = false;
            instance.status = 'running';
            showToast(`实例 ${instance.name} 已重启`, 'success');
        }, 3000);

        // 在真实环境中应该调用API
        // await instancesApi.restartInstance(instance.name);
    } catch (error) {
        console.error('重启实例失败:', error);
        instance.isRestarting = false;
        showToast(`重启实例失败: ${error.message}`, 'error');
    }
};

// 打开终端
const openTerminal = (instance) => {
    showToast(`打开实例终端: ${instance.name}`, 'info');
};

// 显示提示消息
const showToast = (message, type = 'info') => {
    // 创建一个toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-end z-50`;

    // 根据类型选择样式
    let alertClass;
    switch (type) {
        case 'success': alertClass = 'alert-success'; break;
        case 'error': alertClass = 'alert-error'; break;
        case 'warning': alertClass = 'alert-warning'; break;
        default: alertClass = 'alert-info';
    }

    toast.innerHTML = `
    <div class="alert ${alertClass}">
      <span>${message}</span>
    </div>
  `;

    document.body.appendChild(toast);

    // 3秒后移除
    setTimeout(() => {
        toast.classList.add('opacity-0');
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
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
</script>

<style scoped>
/* Toast动画 */
.toast {
    position: fixed;
    top: 1rem;
    right: 1rem;
    transition: opacity 0.3s;
    opacity: 1;
}

/* 卡片动画效果 */
.card {
    transition: all 0.3s ease;
}

.card:hover {
    transform: translateY(-5px);
}

/* 移除之前的徽章样式 */
.badge {
    @apply py-1 px-2;
    font-size: 0.7rem;
    background-color: transparent;
    color: inherit;
    border: none;
}

/* 状态指示器样式 */
.status-indicator {
    display: flex;
    align-items: center;
    padding: 0.25rem 0;
}

/* 图标颜色 */
.text-success {
    color: var(--success);
}

.text-warning {
    color: var(--warning);
}

.text-info {
    color: var(--info);
}

/* 添加旋转动画 */
.animate-spin {
    animation: spin 2s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

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
    @apply items-center;
}
</style>
