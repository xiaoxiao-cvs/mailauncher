<template>
    <div class="instances-container">
        <!-- 顶部导航栏 -->
        <div class="navbar bg-base-200 rounded-box shadow-sm mb-6 animated-header">
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
            </div> <!-- 实例卡片网格 -->
            <div v-else class="animated-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-2">
                <div v-for="(instance, index) in filteredInstances" :key="instance.id || instance.name"
                    class="instance-card shadow-md hover:shadow-lg transition-all animated-card clickable-card"
                    :style="{ animationDelay: `${index * 0.1}s` }" @click="viewInstance(instance)"
                    @mousedown="handleCardMouseDown($event)" @mouseup="handleCardMouseUp($event)"
                    @mouseleave="handleCardMouseLeave($event)">
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
import { Icon } from '@iconify/vue';
import toastService from '@/services/toastService';

// 导入优化的状态管理
import { useInstanceStore } from '@/stores/instanceStore';
import { usePollingStore } from '@/stores/pollingStore';

// 事件总线，用于与其他组件通信
const emitter = inject('emitter');

// 使用优化的状态管理
const instanceStore = useInstanceStore();
const pollingStore = usePollingStore();

// 定义组件的emit
const emit = defineEmits(['refresh-instances', 'toggle-instance', 'view-instance']);

// 获取当前活动的标签页
const activeTab = inject('activeTab', ref(''));

// 状态变量
const searchQuery = ref('');
const filterType = ref('all');
const showDeleteConfirm = ref(false);
const showRestartConfirm = ref(false);
const instanceToDelete = ref(null);
const instanceToRestart = ref(null);
const deleteLoading = ref(false);
const restartLoading = ref(false);

// 使用计算属性从store获取数据，避免重复请求
const instances = computed(() => instanceStore.instances);
const loading = computed(() => instanceStore.loading);

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

    // 手动关闭下拉菜单 - 移除焦点
    const dropdownButton = document.querySelector('.instances-container .dropdown [tabindex="0"][role="button"]');
    if (dropdownButton) {
        dropdownButton.blur();
    }
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

    // 手动关闭下拉菜单 - 移除焦点
    const dropdownButton = document.querySelector('.dropdown-end [tabindex="0"]');
    if (dropdownButton) {
        dropdownButton.blur();
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

// 优化：切换实例运行状态，使用store防重复操作
const toggleInstanceRunning = async (instance) => {
    try {
        if (instance.status === 'running') {
            await instanceStore.stopInstance(instance.id || instance.name);
        } else {
            await instanceStore.startInstance(instance.id || instance.name);
        }

        // 操作成功，通知父组件
        emit('refresh-instances');
    } catch (error) {
        console.error('操作实例状态时出错:', error);
        toastService.error('操作失败: ' + (error.message || '未知错误'));
    }
};

// 优化：重启实例，使用store方法
const restartInstance = async (instance) => {
    try {
        await instanceStore.restartInstance(instance.id || instance.name);

        toastService.success(`实例 ${instance.name} 已重启`);
        emit('refresh-instances');

        // 关闭确认对话框
        showRestartConfirm.value = false;
        instanceToRestart.value = null;
    } catch (error) {
        console.error('重启实例失败:', error);
        toastService.error(`重启实例失败: ${error.message || '未知错误'}`);
    } finally {
        restartLoading.value = false;
    }
};

// 优化：删除实例，使用store方法
const deleteInstance = async (instance) => {
    try {
        deleteLoading.value = true;

        await instanceStore.deleteInstance(instance.id || instance.name);

        toastService.success(`实例 ${instance.name} 已删除`);
        emit('refresh-instances');

        // 关闭确认对话框
        showDeleteConfirm.value = false;
        instanceToDelete.value = null;
    } catch (error) {
        console.error('删除实例失败:', error);
        toastService.error(`删除实例失败: ${error.message || '未知错误'}`);
    } finally {
        deleteLoading.value = false;
    }
};

// 启动自动刷新轮询
const startPolling = () => {
    pollingStore.adjustPollingByPageState('instances');
    console.log('实例页面轮询已启动');
};

// 停止轮询
const stopPolling = () => {
    pollingStore.adjustPollingByPageState('background');
    console.log('实例页面轮询已调整为后台模式');
};

// 停止实例 - 已移除，使用store方法

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

    // 手动关闭下拉菜单 - 移除焦点
    const dropdownButton = document.querySelector('.dropdown-end [tabindex="0"]');
    if (dropdownButton) {
        dropdownButton.blur();
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

// 初始化 - 优化版本
onMounted(() => {
    // 初始加载时自动刷新一次
    fetchInstances();

    // 启动智能轮询
    startPolling();

    // 监听刷新实例列表事件
    if (emitter) {
        emitter.on('refresh-instances', fetchInstances);
    }
});

// 移除事件监听器 - 优化版本
onUnmounted(() => {
    // 停止轮询
    stopPolling();

    if (emitter) {
        emitter.off('refresh-instances', fetchInstances);
    }
});

// 只有当点击卡片时才会进入实例详情
const viewInstance = (instance) => {
    emit('view-instance', instance);
};

// 实例卡片点击反馈动画处理
const handleCardMouseDown = (event) => {
    const card = event.currentTarget;
    card.classList.add('card-pressed');
};

const handleCardMouseUp = (event) => {
    const card = event.currentTarget;
    card.classList.remove('card-pressed');
    card.classList.add('card-released');

    // 清理动画类名
    setTimeout(() => {
        card.classList.remove('card-released');
    }, 200);
};

const handleCardMouseLeave = (event) => {
    const card = event.currentTarget;
    card.classList.remove('card-pressed', 'card-released');
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
        // 使用store中的删除方法
        await instanceStore.deleteInstance(instanceToDelete.value.id || instanceToDelete.value.name);

        // 关闭确认框
        showDeleteConfirm.value = false;
        instanceToDelete.value = null;

        // 刷新实例列表
        emit('refresh-instances');
    } catch (error) {
        console.error('删除实例失败:', error);
        // store中已经处理了错误提示，这里不需要重复显示
    } finally {
        deleteLoading.value = false;
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

    // 手动关闭下拉菜单 - 移除焦点
    const dropdownButton = document.querySelector('.dropdown-end [tabindex="0"]');
    if (dropdownButton) {
        dropdownButton.blur();
    }
};
</script>

<style lang="postcss" scoped>
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

/* 脉冲动画 - 优化性能 */
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

/* 减少动画频率以提升性能 */
.status-dot.status-running,
.status-dot.status-maintenance {
    animation: pulse 2s infinite ease-in-out;
}

.status-dot.status-starting,
.status-dot.status-stopping {
    animation: pulse 1s infinite ease-in-out;
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
    @apply bg-base-100 border-base-300;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
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

/* 点击反馈动画 */
.clickable-card.card-pressed {
    transform: translateY(-1px) scale(0.98);
    box-shadow: 0 6px 12px -2px rgba(0, 0, 0, 0.15), 0 3px 5px -1px rgba(0, 0, 0, 0.08);
    transition: all 0.1s ease;
}

.clickable-card.card-released {
    transform: translateY(-5px) scale(1.02);
    box-shadow: 0 12px 20px -4px rgba(0, 0, 0, 0.15), 0 5px 8px -2px rgba(0, 0, 0, 0.1);
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
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
    @apply bg-base-100 text-base-content;
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
