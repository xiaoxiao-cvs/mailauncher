<template>
    <div class="download-center">
        <div class="version-select-container">
            <div class="card rounded-xl bg-base-100 p-5 shadow-md">
                <div class="card-title mb-4">MaiBot 版本安装</div>

                <!-- 版本选择下拉框 -->
                <div class="mb-4">
                    <label class="label">
                        <span class="label-text">选择版本</span>
                    </label>
                    <select v-model="selectedVersion" class="select select-bordered w-full"
                        :disabled="loading || installing">
                        <option disabled value="">请选择一个版本</option>
                        <option v-for="version in availableVersions" :key="version" :value="version">{{ version }}
                        </option>
                    </select>
                </div>

                <!-- 选择版本后展开的配置选项 -->
                <transition name="slide-fade">
                    <div v-if="selectedVersion && !installing" class="config-options">
                        <!-- 实例名称 -->
                        <div class="mb-4">
                            <label class="label">
                                <span class="label-text">实例名称</span>
                            </label>
                            <input v-model="instanceName" type="text" placeholder="请输入实例名称"
                                class="input input-bordered w-full" :disabled="installing" />
                        </div>

                        <!-- 安装路径 -->
                        <div class="mb-4">
                            <label class="label">
                                <span class="label-text">安装路径</span>
                            </label>
                            <input v-model="installPath" type="text" placeholder="例如：D:\MaiBot\MaiBot-1"
                                class="input input-bordered w-full" :disabled="installing" />
                        </div> <!-- Napcat-ada 服务配置 -->
                        <div class="mb-4">
                            <div
                                class="card p-3 rounded-lg border border-base-200 bg-base-100 hover:shadow-md transition-all">
                                <div class="card-title text-sm mb-2">Napcat-ada 服务</div>

                                <div class="form-control">
                                    <label class="label cursor-pointer justify-start gap-2">
                                        <input type="checkbox" v-model="selectedServices['napcat-ada']" checked disabled
                                            class="checkbox checkbox-primary" />
                                        <div class="service-info">
                                            <div class="font-medium">napcat-ada</div>
                                            <div class="text-xs text-base-content/70">Napcat-ada 服务</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- 端口配置 -->
                        <div class="mb-4">
                            <div class="card p-3 rounded-lg border border-base-200 bg-base-100">
                                <div class="card-title text-sm mb-2">端口配置</div>
                                <div class="mb-3">
                                    <label class="label">
                                        <span class="label-text">MaiBot 主端口</span>
                                    </label>
                                    <input v-model="maibotPort" type="number" placeholder="例如：8000"
                                        class="input input-bordered w-full" :disabled="installing" />
                                </div> <!-- Napcat-ada 端口配置 -->
                                <div v-show="selectedServices['napcat-ada']" class="mb-3">
                                    <label class="label">
                                        <span class="label-text">Napcat-ada 端口</span>
                                    </label>
                                    <input v-model="servicePorts['napcat-ada']" type="number" placeholder="例如：8095"
                                        class="input input-bordered w-full" :disabled="installing" />
                                </div>
                            </div>
                        </div>

                        <!-- 安装按钮 -->
                        <div class="flex justify-end">
                            <button class="btn btn-primary" @click="startInstall" :disabled="!canInstall || installing">
                                <span v-if="installing" class="loading loading-spinner loading-xs mr-2"></span>
                                开始安装
                            </button>
                        </div>
                    </div>
                </transition>

                <!-- 安装进度 -->
                <transition name="fade">
                    <div v-if="installing" class="mt-4">
                        <div class="install-summary p-3 rounded-lg bg-base-200 mb-4">
                            <div class="font-medium mb-2">安装配置概要</div>
                            <div class="text-sm grid grid-cols-2 gap-x-4 gap-y-2">
                                <div>版本: <span class="font-medium">{{ selectedVersion }}</span></div>
                                <div>实例名: <span class="font-medium">{{ instanceName }}</span></div>
                                <div>路径: <span class="font-medium">{{ installPath }}</span></div>
                                <div>MaiBot端口: <span class="font-medium">{{ maibotPort }}</span></div><template
                                    v-for="service in availableServices" :key="`summary-${service.name}`">
                                    <div v-if="selectedServices[service.name]">
                                        Napcat-ada端口:
                                        <span class="font-medium">{{ servicePorts[service.name] }}</span>
                                    </div>
                                </template>
                                <div class="col-span-2 flex justify-end items-center">
                                    <span v-if="!installComplete"
                                        class="loading loading-spinner loading-xs mr-2"></span>
                                    <span v-else class="text-success">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20"
                                            fill="currentColor">
                                            <path fill-rule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clip-rule="evenodd" />
                                        </svg>
                                    </span>
                                    <span>{{ installComplete ? '安装完成' : `安装中... (${installStatusText})` }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- 进度条 -->
                        <div class="mb-4">
                            <div class="flex justify-between mb-1">
                                <span class="text-sm">总体安装进度</span>
                                <span class="text-sm">{{ installProgress }}%</span>
                            </div>
                            <progress class="progress progress-primary w-full" :value="installProgress"
                                max="100"></progress> <!-- 服务安装进度条 -->
                            <div v-if="servicesProgress.length > 0" class="mt-3">
                                <div v-for="service in servicesProgress" :key="`progress-${service.name}`" class="mb-2">
                                    <div class="flex justify-between mb-1">
                                        <span class="text-sm">{{ service.name }} 安装 ({{ service.status }})</span>
                                        <span class="text-sm">{{ service.progress }}%</span>
                                    </div>
                                    <progress
                                        :class="`progress ${service.status === 'completed' ? 'progress-success' : 'progress-info'} w-full`"
                                        :value="service.progress" max="100"></progress>
                                    <div class="text-xs opacity-70 mt-0.5">{{ service.message }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </transition>

                <!-- 安装日志 -->
                <transition name="fade">
                    <div v-if="installing && logs.length > 0" class="mt-4">
                        <div class="font-medium mb-2">安装日志</div>
                        <div class="log-container bg-base-300 rounded-lg p-3 h-48 overflow-y-auto font-mono text-sm">
                            <div v-for="(log, index) in logs" :key="index" class="log-line" :class="getLogClass(log)">
                                <span class="opacity-60">[{{ log.time }}]</span> {{ log.message }}
                            </div>
                        </div>
                    </div>
                </transition>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue';
import { deployApi } from '@/services/api';
import toastService from '@/services/toastService';

// 状态变量
const loading = ref(false);
const installing = ref(false);
const installComplete = ref(false);
const availableVersions = ref(['latest', 'main', 'v0.6.3', 'v0.6.2', 'v0.6.1']);
const availableServices = ref([
    { name: 'napcat-ada', description: 'Napcat-ada 服务' }
]);
const selectedVersion = ref('');
const instanceName = ref('');
const qqNumber = ref('');
const installPath = ref('D:\\MaiBot\\MaiBot-1');
const maibotPort = ref('8000');
const selectedServices = reactive({});
const servicePorts = reactive({});
const installProgress = ref(0);
const servicesProgress = ref([]);
const logs = ref([]);
const currentInstanceId = ref('');
const statusCheckInterval = ref(null);

// 事件
const emit = defineEmits(['refresh']);

// 计算属性 - 是否可以安装
const canInstall = computed(() => {
    // 基础验证：必须有版本和实例名称
    if (!selectedVersion.value || !instanceName.value.trim() || !installPath.value.trim()) {
        return false;
    }

    // 端口验证 - 主端口必须有效
    if (!maibotPort.value) {
        return false;
    }

    // 如果选择了Napcat-ada服务，必须有对应端口
    if (selectedServices['napcat-ada'] && !servicePorts['napcat-ada']) {
        return false;
    }

    return true;
});

// 计算属性 - 安装状态文本
const installStatusText = computed(() => {
    if (servicesProgress.value.length > 0) {
        const currentService = servicesProgress.value[0];
        switch (currentService.status) {
            case 'downloading':
                return '下载中';
            case 'extracting':
                return '解压中';
            case 'installing':
                return '安装中';
            case 'configuring':
                return '配置中';
            case 'finishing':
                return '完成中';
            default:
                return currentService.status || '处理中';
        }
    }
    return '准备中';
});

// 获取服务的默认端口
const getDefaultPort = (serviceName) => {
    switch (serviceName) {
        case 'napcat-ada': return '8095';
        default: return '8000';
    }
};

// 获取可用版本
const fetchVersions = async () => {
    loading.value = true;
    try {
        const response = await deployApi.getVersions();
        console.log('获取版本响应:', response);

        // 处理不同的响应格式
        let versions = [];
        if (response && response.data) {
            if (Array.isArray(response.data)) {
                // 直接是数组的情况
                versions = response.data;
            } else if (response.data.versions && Array.isArray(response.data.versions)) {
                // 包装在versions字段中的情况
                versions = response.data.versions;
            }
        } else if (response && response.versions && Array.isArray(response.versions)) {
            // 直接在response.versions中的情况
            versions = response.versions;
        }

        if (versions.length > 0) {
            availableVersions.value = versions;
            console.log('成功更新版本列表:', versions);
        } else {
            console.warn('未获取到有效的版本数据，使用默认版本列表');
        }
    } catch (error) {
        console.error('获取版本列表失败:', error);
        // 保留默认版本列表
    } finally {
        loading.value = false;
    }
};

// 获取可部署的服务列表
const fetchServices = async () => {
    // 由于我们只有一个固定的Napcat-ada服务，可以简化这个函数
    try {
        // 初始化服务选择状态和端口
        selectedServices['napcat-ada'] = true; // 默认选中，因为只有一个服务
        servicePorts['napcat-ada'] = '8095'; // 默认端口设为8095

        console.log('服务初始化完成: Napcat-ada');
    } catch (error) {
        console.error('服务初始化失败:', error);
    }
};

// 添加日志
const addLog = (message, level = 'info') => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN');
    logs.value.push({
        time: timeStr,
        message: message,
        level: level
    });

    // 确保日志容器滚动到最新日志
    setTimeout(() => {
        const container = document.querySelector('.log-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, 50);
};

// 获取日志类样式
const getLogClass = (log) => {
    switch (log.level) {
        case 'error': return 'text-error';
        case 'warning': return 'text-warning';
        case 'success': return 'text-success';
        default: return 'text-base-content';
    }
};

// 定期检查安装状态
const checkInstallStatus = async () => {
    if (!currentInstanceId.value) return;

    try {
        const response = await deployApi.checkInstallStatus(currentInstanceId.value);

        if (response) {
            // 更新总体安装进度
            installProgress.value = response.progress || 0;

            // 如果有消息，添加到日志
            if (response.message) {
                addLog(response.message);
            }

            // 更新各服务的安装进度
            if (response.services_install_status && response.services_install_status.length > 0) {
                servicesProgress.value = response.services_install_status;
            }

            // 检查是否已安装完成
            if (response.status === 'completed') {
                clearInterval(statusCheckInterval.value);
                installComplete.value = true;
                addLog('安装已完成！', 'success');
                toastService.success(`MaiBot ${selectedVersion.value} 安装成功！`);
                emit('refresh');
            }
        }
    } catch (error) {
        console.error('检查安装状态失败:', error);
        addLog(`检查安装状态失败: ${error.message}`, 'error');
    }
};

// 开始安装流程
const startInstall = async () => {
    if (!canInstall.value) {
        toastService.error('请完成所有必填项');
        return;
    }

    installing.value = true;
    installComplete.value = false;
    installProgress.value = 0;
    logs.value = [];
    servicesProgress.value = [];

    // 添加初始日志
    addLog(`开始安装 MaiBot ${selectedVersion.value} 实例: ${instanceName.value}`);

    // 通知安装开始
    toastService.info(`开始安装 MaiBot ${selectedVersion.value}`);

    try {
        // 创建要安装的服务列表
        const installServices = [];
        if (selectedServices['napcat-ada']) {
            installServices.push({
                name: 'napcat-ada',
                path: `${installPath.value}\\napcat-ada`,
                port: parseInt(servicePorts['napcat-ada']),
                run_cmd: 'python main.py'  // 添加运行命令
            });
        }

        // 构建部署配置
        const deployConfig = {
            instance_name: instanceName.value,
            install_services: installServices,
            install_path: installPath.value,
            port: parseInt(maibotPort.value),
            version: selectedVersion.value
        };

        // 添加调试日志
        console.log('发送部署请求，配置:', deployConfig);
        addLog(`发送部署请求: ${JSON.stringify(deployConfig, null, 2)}`, 'info');

        // 调用部署API
        const deployResponse = await deployApi.deploy(deployConfig);

        if (!deployResponse || !deployResponse.success) {
            throw new Error(deployResponse?.message || '部署失败');
        }

        // 保存实例ID，用于后续状态检查
        currentInstanceId.value = deployResponse.instance_id;

        // 添加部署成功日志
        addLog(`部署任务已提交，实例ID: ${currentInstanceId.value}`, 'success');

        // 设置定时检查安装状态
        statusCheckInterval.value = setInterval(checkInstallStatus, 2000);

    } catch (error) {
        console.error('安装过程出错:', error);
        addLog(`安装失败: ${error.message}`, 'error');
        toastService.error(`安装失败: ${error.message}`);
        installing.value = false;
    }
};

// 当组件挂载时获取可用版本和服务
onMounted(() => {
    fetchVersions();
    fetchServices();
});

// 组件卸载时清除定时器
onMounted(() => {
    return () => {
        if (statusCheckInterval.value) {
            clearInterval(statusCheckInterval.value);
        }
    };
});

// 监听选择版本变化
watch(selectedVersion, (newValue) => {
    if (newValue) {
        // 清空日志，因为每次选择新版本时应该重置
        logs.value = [];

        // 预填充一些默认值
        if (!instanceName.value) {
            instanceName.value = `maibot-${newValue}-1`;
        }

        // 预填充安装路径
        if (!installPath.value) {
            installPath.value = `D:\\MaiBot\\MaiBot-${newValue}-1`;
        }
    }
});
</script>

<style scoped>
.download-center {
    width: 100%;
}

.version-select-container {
    max-width: 800px;
    margin: 0 auto;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
    transition: all 0.4s ease;
    max-height: 2000px;
    opacity: 1;
    overflow: hidden;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    margin-top: 0;
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.log-line {
    white-space: pre-wrap;
    line-height: 1.5;
    padding: 2px 0;
}

/* 确保圆角设计一致性 */
.rounded-xl {
    border-radius: 1rem;
}

.card {
    border-radius: 0.75rem;
}

.log-container {
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.1);
}

/* 服务选择区域 */
.service-info {
    flex-grow: 1;
}

/* 增强进度条对比度 */
.progress-primary {
    --progress-color: hsl(var(--p));
}

.progress-success {
    --progress-color: hsl(var(--su));
}

.progress-info {
    --progress-color: hsl(var(--in));
}
</style>
