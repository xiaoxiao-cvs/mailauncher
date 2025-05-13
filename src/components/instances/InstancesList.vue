<template>
    <div class="instances-container">
        <!-- 顶部导航栏 - 修改样式以匹配侧边栏 -->
        <div class="header-bar">
            <div class="title-area">
                <el-icon class="app-icon">
                    <List />
                </el-icon>
                <span class="header-title">应用实例</span>
            </div>

            <div class="search-area">
                <el-dropdown trigger="click" @command="handleFilterChange">
                    <div class="filter-button">
                        {{ filterLabel }}
                        <el-icon>
                            <ArrowDown />
                        </el-icon>
                    </div>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item command="all">所有</el-dropdown-item>
                            <el-dropdown-item command="not_running">未运行</el-dropdown-item>
                            <el-dropdown-item command="stopping">停止中</el-dropdown-item>
                            <el-dropdown-item command="starting">启动中</el-dropdown-item>
                            <el-dropdown-item command="running">运行中</el-dropdown-item>
                            <el-dropdown-item command="maintenance">维护中</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>

                <div class="search-box">
                    <el-input v-model="searchQuery" placeholder="根据应用名字搜索" clearable>
                        <template #suffix>
                            <el-icon class="search-icon">
                                <Search />
                            </el-icon>
                        </template>
                    </el-input>
                </div>
            </div>

            <div class="action-area">
                <el-button plain size="default" @click="refreshInstances" class="action-btn">
                    <el-icon>
                        <Refresh />
                    </el-icon>
                    刷新
                </el-button>
                <el-button plain size="default" @click="batchOperation" class="action-btn">批量操作</el-button>
                <el-button type="primary" class="new-app-btn" @click="createNewInstance">新建应用</el-button>
            </div>
        </div>

        <!-- 实例列表区域 -->
        <div class="instances-list">
            <!-- 加载状态 -->
            <div v-if="loading" class="loading-container">
                <el-skeleton :rows="3" animated />
            </div>

            <!-- 空状态 -->
            <el-empty v-else-if="filteredInstances.length === 0" description="没有找到应用实例" class="empty-state">
                <el-button type="primary" @click="goToDownloads">新建应用</el-button>
            </el-empty>

            <!-- 实例卡片列表 - 卡片式布局 -->
            <div v-else class="instances-grid">
                <el-card v-for="instance in filteredInstances" :key="instance.name" class="instance-card"
                    shadow="hover">
                    <div class="instance-header">
                        <span class="instance-name">{{ instance.name }}</span>
                        <span class="instance-desc">Maibot-Napcat_ada</span>
                    </div>

                    <div class="instance-info">
                        <div class="info-item">
                            <span class="info-label">安装时间:</span>
                            <span class="info-value">{{ instance.createdAt || instance.installedAt || '2023-05-13 19:56:18' }}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">总运行时长:</span>
                            <span class="info-value">{{ instance.totalRunningTime || '48小时36分钟' }}</span>
                        </div>
                    </div>

                    <div class="instance-status">
                        <div class="status-indicator">
                            <el-icon class="status-icon" :class="getInstanceStatusClass(instance)">
                                <Loading v-if="instance.status === 'starting' || instance.status === 'stopping'" />
                                <CircleCheck v-else-if="instance.status === 'running'" />
                                <CircleClose v-else />
                            </el-icon>
                            <span class="status-text" :class="getInstanceStatusClass(instance)">
                                {{ getInstanceStatusText(instance) }}
                            </span>
                        </div>
                    </div>

                    <!-- 重新设计的实例操作按钮区域 - 移至卡片右下角 -->
                    <div class="instance-actions-new">
                        <div class="action-group">
                            <!-- 启动/停止按钮 - 改为圆形按钮 -->
                            <el-tooltip :content="instance.status === 'running' ? '停止' : '启动'" placement="top"
                                :show-after="500">
                                <el-button :type="instance.status === 'running' ? 'danger' : 'success'" circle
                                    @click="toggleInstanceRunning(instance)">
                                    <el-icon>
                                        <VideoPlay v-if="instance.status !== 'running'" />
                                        <VideoPause v-else />
                                    </el-icon>
                                </el-button>
                            </el-tooltip>

                            <!-- 重启按钮 - 改为圆形按钮 -->
                            <el-tooltip content="重启" placement="top" :show-after="500">
                                <el-button circle :disabled="instance.status !== 'running'"
                                    @click="restartInstance(instance)">
                                    <el-icon>
                                        <RefreshRight />
                                    </el-icon>
                                </el-button>
                            </el-tooltip>
                        </div>

                        <!-- 分隔线 -->
                        <div class="action-divider"></div>

                        <div class="action-group">
                            <!-- 终端按钮 -->
                            <el-tooltip content="终端" placement="top" :show-after="500">
                                <el-button circle @click="openTerminal(instance)">
                                    <el-icon>
                                        <Monitor />
                                    </el-icon>
                                </el-button>
                            </el-tooltip>

                            <!-- 设置按钮 -->
                            <el-tooltip content="设置" placement="top" :show-after="500">
                                <el-button circle @click="configureInstance(instance)">
                                    <el-icon>
                                        <Setting />
                                    </el-icon>
                                </el-button>
                            </el-tooltip>
                        </div>
                    </div>
                </el-card>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, onUnmounted, watch } from 'vue';
import {
    Search,
    List,
    Monitor,
    Setting,
    Loading,
    CircleCheck,
    CircleClose,
    ArrowDown,
    VideoPlay,
    VideoPause,
    RefreshRight,
    Refresh
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { instancesApi } from '@/services/api';

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
    // 扩展模拟数据，包含更多状态和案例
    return [
        {
            name: '本地实例_1',
            status: 'stopped',
            createdAt: '2023-05-13 19:56:18',
            totalRunningTime: '48小时36分钟',
            path: '/path/to/instance'
        },
        {
            name: '本地实例_2',
            status: 'running',
            createdAt: '2023-05-12 10:30:00',
            totalRunningTime: '147小时12分钟',
            path: '/path/to/another/instance'
        },
        {
            name: '测试实例_3',
            status: 'starting',
            createdAt: '2023-05-11 08:15:00',
            totalRunningTime: '5小时23分钟',
            path: '/path/to/mixed/instance'
        },
        {
            name: '远程实例_4',
            status: 'stopping',
            createdAt: '2023-05-10 14:20:00',
            totalRunningTime: '72小时45分钟',
            path: '/path/to/remote/instance'
        },
        {
            name: '维护实例_5',
            status: 'maintenance',
            createdAt: '2023-05-09 09:45:00',
            totalRunningTime: '12小时08分钟',
            path: '/path/to/maintenance/instance'
        }
    ];
};

// 刷新实例列表
const refreshInstances = () => {
    fetchInstances();
};

// 获取实例状态类
const getInstanceStatusClass = (instance) => {
    switch (instance.status) {
        case 'running': return 'status-running';
        case 'starting': return 'status-starting';
        case 'stopping': return 'status-stopping';
        case 'maintenance': return 'status-maintenance';
        default: return 'status-stopped';
    }
};

// 获取实例状态文本
const getInstanceStatusText = (instance) => {
    switch (instance.status) {
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
    ElMessage.info('批量操作功能开发中');
};

// 查看实例详情
const viewInstanceDetail = (instance) => {
    ElMessage.info(`查看实例详情: ${instance.name}`);
};

// 查看日志
const viewInstanceLogs = (instance) => {
    ElMessage.info(`查看实例日志: ${instance.name}`);
};

// 配置实例
const configureInstance = (instance) => {
    ElMessage.info(`配置实例: ${instance.name}`);
};

// 创建新实例
const createNewInstance = () => {
    if (emitter) {
        emitter.emit('navigate-to-tab', 'downloads');
    }
};

// 确认删除实例
const confirmDeleteInstance = (instance) => {
    ElMessageBox.confirm(
        `确定要删除实例 "${instance.name}" 吗？此操作不可逆。`,
        '删除确认',
        {
            confirmButtonText: '确认删除',
            cancelButtonText: '取消',
            type: 'warning',
        }
    )
        .then(() => {
            deleteInstance(instance);
        })
        .catch(() => {
            // 用户取消
        });
};

// 删除实例
const deleteInstance = async (instance) => {
    try {
        const response = await instancesApi.deleteInstance(instance.name);
        if (response.data && response.data.success) {
            ElMessage.success(`实例 ${instance.name} 已删除`);
            instances.value = instances.value.filter(i => i.name !== instance.name);
        } else {
            ElMessage.error('删除实例失败');
        }
    } catch (error) {
        console.error('删除实例失败:', error);
        ElMessage.error('删除实例失败: ' + (error.response?.data?.message || error.message));

        // 在模拟模式下模拟删除成功
        if (localStorage.getItem('useMockData') === 'true') {
            ElMessage.success(`(模拟模式) 实例 ${instance.name} 已删除`);
            instances.value = instances.value.filter(i => i.name !== instance.name);
        }
    }
};

// 跳转到下载页面
const goToDownloads = () => {
    if (emitter) {
        emitter.emit('navigate-to-tab', 'downloads');
    }
};

// 添加新方法: 切换实例运行状态
const toggleInstanceRunning = (instance) => {
    if (instance.status === 'running') {
        stopInstance(instance);
    } else {
        startInstance(instance);
    }
};

// 添加新方法: 启动实例
const startInstance = async (instance) => {
    try {
        ElMessage.info(`正在启动实例: ${instance.name}`);

        // 模拟实例状态改变
        instance.status = 'starting';

        // 模拟延迟
        setTimeout(() => {
            instance.status = 'running';
            ElMessage.success(`实例 ${instance.name} 已启动`);
        }, 2000);

        // 在真实环境中应该调用API
        // await instancesApi.startInstance(instance.name);
    } catch (error) {
        console.error('启动实例失败:', error);
        ElMessage.error(`启动实例失败: ${error.message}`);
    }
};

// 添加新方法: 停止实例
const stopInstance = async (instance) => {
    try {
        ElMessage.info(`正在停止实例: ${instance.name}`);

        // 模拟实例状态改变
        instance.status = 'stopping';

        // 模拟延迟
        setTimeout(() => {
            instance.status = 'stopped';
            ElMessage.success(`实例 ${instance.name} 已停止`);
        }, 2000);

        // 在真实环境中应该调用API
        // await instancesApi.stopInstance(instance.name);
    } catch (error) {
        console.error('停止实例失败:', error);
        ElMessage.error(`停止实例失败: ${error.message}`);
    }
};

// 添加新方法: 重启实例
const restartInstance = async (instance) => {
    try {
        if (instance.status !== 'running') {
            ElMessage.warning('只能重启运行中的实例');
            return;
        }

        ElMessage.info(`正在重启实例: ${instance.name}`);

        // 模拟实例状态改变
        instance.status = 'stopping';

        // 模拟延迟
        setTimeout(() => {
            instance.status = 'starting';
            setTimeout(() => {
                instance.status = 'running';
                ElMessage.success(`实例 ${instance.name} 已重启`);
            }, 1500);
        }, 1500);

        // 在真实环境中应该调用API
        // await instancesApi.restartInstance(instance.name);
    } catch (error) {
        console.error('重启实例失败:', error);
        ElMessage.error(`重启实例失败: ${error.message}`);
    }
};

// 添加新方法: 打开终端
const openTerminal = (instance) => {
    ElMessage.info(`打开实例终端: ${instance.name}`);
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

<style>
@import '../../assets/css/instancesList.css';

/* 新增CSS样式将在instancesList.css文件中定义 */
</style>
