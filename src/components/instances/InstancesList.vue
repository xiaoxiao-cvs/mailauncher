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
                <div v-for="instance in filteredInstances" :key="instance.id || instance.name"
                    class="instance-card shadow-md hover:shadow-lg transition-all" @click="viewInstance(instance)">
                    <div class="card-body p-5 flex flex-col h-full">
                        <!-- 实例标题与描述 -->
                        <div class="mb-3">
                            <h3 class="card-title text-lg">{{ instance.name }}</h3>
                            <p class="text-sm opacity-70">Maibot-Napcat_ada</p>
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
                                </div> <!-- 动作按钮 -->
                                <div class="action-group flex flex-row gap-1">
                                    <!-- 启动/停止按钮 -->
                                    <button class="btn btn-sm btn-square rounded-md action-btn"
                                        :class="getActionButtonClass(instance)"
                                        @click.stop="toggleInstanceRunning(instance)" :disabled="instance.isLoading"
                                        :title="instance.status === 'running' ? '停止实例' : '启动实例'">
                                        <span v-if="instance.isLoading"
                                            class="loading loading-spinner loading-xs"></span>
                                        <Icon v-else :icon="instance.status === 'running' ? 'mdi:stop' : 'mdi:play'" />
                                    </button>
                                    <!-- 重启按钮 -->
                                    <button class="btn btn-sm btn-square btn-ghost rounded-md action-btn"
                                        @click.stop="confirmRestartInstance(instance)" :disabled="instance.isLoading"
                                        title="重启实例">
                                        <Icon icon="mdi:restart" />
                                    </button>

                                    <!-- 删除按钮 -->
                                    <button class="btn btn-sm btn-square btn-error rounded-md action-btn"
                                        @click.stop="confirmDeleteInstance(instance)" :disabled="instance.isLoading"
                                        title="删除实例">
                                        <Icon icon="mdi:delete-outline" />
                                    </button>

                                    <!-- 下拉菜单按钮 -->
                                    <div class="dropdown dropdown-end">
                                        <button tabindex="0"
                                            class="btn btn-sm btn-square btn-ghost rounded-md action-btn"
                                            :disabled="instance.isLoading" title="更多操作">
                                            <Icon icon="mdi:dots-vertical" />
                                        </button>
                                        <ul tabindex="0"
                                            class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                                            <li><a @click="openInstancePath(instance)">
                                                    <Icon icon="mdi:folder-outline" class="w-4 h-4" />
                                                    打开文件夹
                                                </a></li>
                                            <li><a @click="configureInstance(instance)">
                                                    <Icon icon="mdi:cog-outline" class="w-4 h-4" />
                                                    实例设置
                                                </a></li>
                                            <li><a @click="viewInstanceLogs(instance)">
                                                    <Icon icon="mdi:text-box-outline" class="w-4 h-4" />
                                                    查看日志
                                                </a></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div> <!-- 删除确认对话框 -->
        <div class="modal" :class="{ 'modal-open': showDeleteConfirm }">
            <div class="modal-box">
                <h3 class="font-bold text-lg">确认删除实例</h3>
                <p class="py-4">
                    确定要删除实例 <strong>{{ instanceToDelete?.name }}</strong> 吗？
                    <br />
                    <span class="text-warning text-sm">此操作不可撤销，将删除所有相关数据。</span>
                </p>
                <div class="modal-action">
                    <button class="btn btn-ghost" @click="cancelDelete">取消</button>
                    <button class="btn btn-error" @click="confirmDelete" :disabled="deleteLoading">
                        <span v-if="deleteLoading" class="loading loading-spinner loading-sm"></span>
                        {{ deleteLoading ? '删除中...' : '确认删除' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- 重启确认对话框 -->
        <div class="modal" :class="{ 'modal-open': showRestartConfirm }">
            <div class="modal-box">
                <h3 class="font-bold text-lg">确认重启实例</h3>
                <p class="py-4">
                    确定要重启实例 <strong>{{ instanceToRestart?.name }}</strong> 吗？
                    <br />
                    <span class="text-info text-sm">重启过程中实例服务将暂时中断。</span>
                </p>
                <div class="modal-action">
                    <button class="btn btn-ghost" @click="cancelRestart">取消</button>
                    <button class="btn btn-warning" @click="confirmRestart" :disabled="restartLoading">
                        <span v-if="restartLoading" class="loading loading-spinner loading-sm"></span>
                        {{ restartLoading ? '重启中...' : '确认重启' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, onUnmounted, watch } from 'vue';
import { fetchInstances as apiFetchInstances, startInstance as apiStartInstance, stopInstance as apiStopInstance, restartInstance as apiRestartInstance, deleteInstance as apiDeleteInstance } from '@/api/instances';
import { Icon } from '@iconify/vue';
import toastService from '@/services/toastService';

// 事件总线，用于与其他组件通信
const emitter = inject('emitter');

// 定义组件的emit
const emit = defineEmits(['refresh-instances', 'toggle-instance', 'view-instance']);

// 获取当前活动的标签页
const activeTab = inject('activeTab', ref(''));

// 状态变量
const loading = ref(false);
const instances = ref([]);
const searchQuery = ref('');
const filterType = ref('all');
const showDeleteConfirm = ref(false);
const showRestartConfirm = ref(false);
const instanceToDelete = ref(null);
const instanceToRestart = ref(null);
const deleteLoading = ref(false);
const restartLoading = ref(false);

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

        try {
            // 引入数据适配器
            const { adaptInstancesList, adaptInstanceData } = await import('@/utils/apiAdapters');
            
            // 尝试从API获取数据
            console.log('尝试从API获取实例数据');
            const apiInstances = await apiFetchInstances();

            if (apiInstances && (Array.isArray(apiInstances) || apiInstances.length > 0)) {
                // 使用适配器处理实例数据，确保字段名称一致
                const adaptedInstances = Array.isArray(apiInstances) 
                    ? apiInstances.map(adaptInstanceData) 
                    : adaptInstancesList(apiInstances);
                
                // 为每个实例添加必要的UI状态字段
                instances.value = adaptedInstances.map(instance => ({
                    ...instance,
                    isLoading: false, // 添加加载状态字段
                    id: instance.id || instance.name // 确保有ID字段
                }));
            } else {
                console.warn('API返回数据格式不符合预期，使用模拟数据');
                instances.value = getMockInstances();
            }
        } catch (apiError) {
            console.error('API请求失败:', apiError);
            console.log('回退到模拟数据');
            instances.value = getMockInstances();
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
    // 使用硬编码的数据而不是动态生成，为每个实例添加ID和UI状态
    return [
        {
            id: 'local_instance_1',
            name: '本地实例_1',
            status: 'stopped',
            createdAt: '2023-05-13 19:56:18',
            totalRunningTime: '48小时36分钟',
            path: 'D:\\MaiBot\\本地实例_1',
            isLoading: false
        },
        {
            id: 'local_instance_2',
            name: '本地实例_2',
            status: 'running',
            createdAt: '2023-05-12 10:30:00',
            totalRunningTime: '147小时12分钟',
            path: 'D:\\MaiBot\\本地实例_2',
            isLoading: false
        },
        {
            id: 'test_instance_3',
            name: '测试实例_3',
            status: 'starting',
            createdAt: '2023-05-11 08:15:00',
            totalRunningTime: '5小时23分钟',
            path: 'D:\\MaiBot\\测试实例_3',
            isLoading: false
        },
        {
            id: 'remote_instance_4',
            name: '远程实例_4',
            status: 'stopping',
            createdAt: '2023-05-10 14:20:00',
            totalRunningTime: '72小时45分钟',
            path: 'D:\\MaiBot\\远程实例_4',
            isLoading: false
        },
        {
            id: 'maintenance_instance_5',
            name: '维护实例_5',
            status: 'maintenance',
            createdAt: '2023-05-09 09:45:00',
            totalRunningTime: '12小时08分钟',
            path: 'D:\\MaiBot\\维护实例_5',
            isLoading: false
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

// 创建新实例 - 添加防抖避免多次触发
const createNewInstance = () => {
    if (emitter) {
        // 防止短时间内多次触发
        if (createNewInstance.timer) {
            clearTimeout(createNewInstance.timer);
        }

        createNewInstance.timer = setTimeout(() => {
            emitter.emit('navigate-to-tab', 'downloads');
        }, 100);
    }
};
createNewInstance.timer = null;

// 跳转到下载页面 - 添加防抖避免多次触发
const goToDownloads = () => {
    if (emitter) {
        // 防止短时间内多次触发
        if (goToDownloads.timer) {
            clearTimeout(goToDownloads.timer);
        }

        goToDownloads.timer = setTimeout(() => {
            emitter.emit('navigate-to-tab', 'downloads');
        }, 100);
    }
};
goToDownloads.timer = null;

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
const startInstance = async (instance) => {
    try {
        // 先设置临时状态表示启动中
        instance.status = 'starting';

        // 显示通知
        toastService.info(`正在启动实例: ${instance.name}`);

        // 调用真实API - 使用更新后的API函数
        const response = await apiStartInstance(instance.id || instance.name);

        // 检查响应 - 支持新的响应格式
        if (response && (response.success || response.status === 'success' || response.message === 'success')) {
            // 切换到运行状态
            instance.status = 'running';
            instance.isLoading = false;

            // 通知成功
            toastService.success(`实例 ${instance.name} 已启动`);

            // 通知父组件刷新列表
            emit('refresh-instances');
        } else {
            throw new Error(response?.message || response?.error || '启动失败');
        }
    } catch (error) {
        console.error('启动实例失败:', error);

        // 恢复状态
        instance.status = 'stopped';
        instance.isLoading = false;

        // 提供更详细的错误信息
        const errorMessage = error.response?.data?.message || error.message || '未知错误';
        toastService.error(`启动实例失败: ${errorMessage}`);
    }
};

// 停止实例
const stopInstance = async (instance) => {
    try {
        // 先设置临时状态表示停止中
        instance.status = 'stopping';

        // 显示通知
        toastService.info(`正在停止实例: ${instance.name}`);

        // 调用真实API - 使用更新后的API函数
        const response = await apiStopInstance(instance.id || instance.name);

        // 检查响应 - 支持新的响应格式
        if (response && (response.success || response.status === 'success' || response.message === 'success')) {
            // 切换到停止状态
            instance.status = 'stopped';
            instance.isLoading = false;

            // 通知成功
            toastService.success(`实例 ${instance.name} 已停止`);

            // 通知父组件刷新列表
            emit('refresh-instances');
        } else {
            throw new Error(response?.message || response?.error || '停止失败');
        }
    } catch (error) {
        console.error('停止实例失败:', error);

        // 恢复状态
        instance.status = 'running';
        instance.isLoading = false;

        // 提供更详细的错误信息
        const errorMessage = error.response?.data?.message || error.message || '未知错误';
        toastService.error(`停止实例失败: ${errorMessage}`);
    }
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

// 确认删除实例
const confirmDeleteInstance = (instance) => {
    instanceToDelete.value = instance;
    showDeleteConfirm.value = true;
};

// 取消删除
const cancelDelete = () => {
    showDeleteConfirm.value = false;
    instanceToDelete.value = null;
};

// 确认重启实例
const confirmRestartInstance = (instance) => {
    instanceToRestart.value = instance;
    showRestartConfirm.value = true;
};

// 取消重启
const cancelRestart = () => {
    showRestartConfirm.value = false;
    instanceToRestart.value = null;
};

// 执行重启
const confirmRestart = async () => {
    if (!instanceToRestart.value) return;

    restartLoading.value = true;

    try {
        // 调用真实的重启函数
        await restartInstance(instanceToRestart.value);

        // 关闭确认框
        showRestartConfirm.value = false;
        instanceToRestart.value = null;
        restartLoading.value = false;
    } catch (error) {
        console.error('重启实例失败:', error);
        restartLoading.value = false;
    }
};

// 执行删除
const confirmDelete = async () => {
    if (!instanceToDelete.value) return;

    deleteLoading.value = true;

    try {
        // 调用真实API删除实例
        toastService.info(`正在删除实例: ${instanceToDelete.value.name}`);

        const response = await apiDeleteInstance(instanceToDelete.value.id || instanceToDelete.value.name);

        // 检查响应 - 支持新的响应格式
        if (response && (response.success || response.status === 'success' || response.message === 'success')) {
            // 删除成功，更新实例列表
            instances.value = instances.value.filter(instance =>
                (instance.id || instance.name) !== (instanceToDelete.value.id || instanceToDelete.value.name)
            );

            toastService.success(`实例 ${instanceToDelete.value.name} 删除成功`);

            // 关闭确认框
            showDeleteConfirm.value = false;
            instanceToDelete.value = null;
            deleteLoading.value = false;

            // 刷新实例列表
            emit('refresh-instances');
        } else {
            throw new Error(response?.message || response?.error || '删除失败');
        }
    } catch (error) {
        console.error('删除实例失败:', error);

        // 提供更详细的错误信息
        const errorMessage = error.response?.data?.message || error.message || '未知错误';
        toastService.error(`删除实例失败: ${errorMessage}`);
        deleteLoading.value = false;
    }
};

// 重启实例
const restartInstance = async (instance) => {
    try {
        // 防止重复点击
        if (instance.isLoading) return;

        // 设置加载状态
        instance.isLoading = true;
        instance.status = 'starting'; // 重启时先显示启动中

        // 显示通知
        toastService.info(`正在重启实例: ${instance.name}`);

        // 调用真实API - 使用更新后的API函数
        const response = await apiRestartInstance(instance.id || instance.name);

        // 检查响应 - 支持新的响应格式
        if (response && (response.success || response.status === 'success' || response.message === 'success')) {
            // 重启成功
            instance.status = 'running';
            instance.isLoading = false;

            // 通知成功
            toastService.success(`实例 ${instance.name} 重启成功`);

            // 通知父组件刷新列表
            emit('refresh-instances');
        } else {
            throw new Error(response?.message || response?.error || '重启失败');
        }
    } catch (error) {
        console.error('重启实例失败:', error);

        // 恢复状态 - 假设重启失败时实例是停止的
        instance.status = 'stopped';
        instance.isLoading = false;

        // 提供更详细的错误信息
        const errorMessage = error.response?.data?.message || error.message || '未知错误';
        toastService.error(`重启实例失败: ${errorMessage}`);
    }
};

// 查看实例日志
const viewInstanceLogs = (instance) => {
    try {
        // 显示通知
        toastService.info(`正在打开实例日志: ${instance.name}`);

        // 使用事件总线通知主应用打开日志查看器
        if (emitter) {
            emitter.emit('view-instance-logs', {
                instanceId: instance.id || instance.name,
                instanceName: instance.name,
                instancePath: instance.path
            });
        } else {
            // 如果没有事件总线，显示提示
            toastService.warning('日志查看功能开发中');
        }
    } catch (error) {
        console.error('打开日志失败:', error);
        toastService.error('无法打开日志: ' + (error.message || '未知错误'));
    }
};
</script>

<style scoped>
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
    background-color: rgba(74, 222, 128, 0.1);
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
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
}

/* 运行状态 - 绿色脉冲 */
.status-dot.status-running {
    background-color: #48c774;
    animation: pulse 1.5s infinite;
    box-shadow: 0 0 5px 1px rgba(72, 199, 116, 0.5);
}

/* 维护状态 - 蓝色脉冲 */
.status-dot.status-maintenance {
    background-color: #38b6ff;
    animation: pulse 1.5s infinite;
    box-shadow: 0 0 5px 1px rgba(56, 182, 255, 0.5);
}

/* 停止状态 - 灰色固定点 */
.status-dot.status-stopped {
    background-color: rgba(108, 114, 147, 0.4);
}

/* 启动中状态 */
.status-dot.status-starting {
    background-color: #fbbf24;
    animation: pulse 0.8s infinite;
}

/* 停止中状态 */
.status-dot.status-stopping {
    background-color: #ef4444;
    animation: pulse 0.8s infinite;
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
    background-color: #48c774 !important;
    border-color: #48c774 !important;
    color: white !important;
}

.status-btn-success:hover {
    filter: brightness(0.95);
    background-color: rgba(72, 199, 116, 0.9) !important;
    border-color: rgba(72, 199, 116, 0.9) !important;
}

/* 让loading组件显示得更好 */
.loading.loading-spinner {
    display: inline-block;
}

/* 状态指示器容器保持垂直对齐 */
.status-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
}

/* 实例列表操作按钮样式 */
.action-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    font-size: 16px;
}

.btn-square.rounded-md {
    border-radius: 6px;
}

/* 添加加载动画样式 */
.loading-spinner {
    color: inherit;
}

/* 优化按钮状态样式 */
.action-btn:disabled {
    cursor: not-allowed;
    opacity: 0.7;
}

/* 恢复卡片样式 */
.instance-card {
    background-color: white;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    border: 1px solid #e5e7eb;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    transition: all 0.3s ease;
    overflow: hidden;
    height: 220px;
    cursor: pointer;
}

.instance-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* 卡片内容布局优化 */
.card-body {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    height: 100%;
}

/* 状态指示器和操作按钮统一放在底部 */
.status-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
}

/* 确保状态文本与按钮对齐 */
.status-text {
    margin-left: 4px;
    font-size: 0.875rem;
    vertical-align: middle;
}

/* 模态框样式 */
.modal {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px);
    background-color: rgba(0, 0, 0, 0.5);
}

.modal-box {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    width: 90%;
    max-width: 400px;
}

.modal-action {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
}

/* 删除确认对话框特有样式 */
.modal-warning {
    color: #f59e0b;
}

.modal-error {
    color: #ef4444;
}

/* 操作按钮组样式 */
.action-group {
    display: flex;
    flex-direction: row;
    gap: 4px;
}

/* 下拉菜单样式修正 */
.dropdown-content {
    z-index: 10;
}
</style>
