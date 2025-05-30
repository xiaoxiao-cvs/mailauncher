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
                </transition> <!-- 安装日志 -->
                <transition name="fade">
                    <div v-if="installing && logs.length > 0" class="mt-4">
                        <div class="flex items-center justify-between mb-2">
                            <div class="font-medium">安装日志</div>
                        </div>
                        <div class="log-container bg-base-300 rounded-lg p-3 h-80 overflow-y-auto font-mono text-sm">
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
import { ref, computed, reactive, onMounted, onBeforeUnmount, watch } from 'vue';
import { useDeployStore } from '@/stores/deployStore';
import { useInstanceStore } from '@/stores/instanceStore';
import toastService from '@/services/toastService';

// 使用 stores
const deployStore = useDeployStore();
const instanceStore = useInstanceStore();

// 本地状态变量
const loading = ref(false);
const selectedVersion = ref('');
const instanceName = ref('');
const qqNumber = ref('');
const installPath = ref('D:\\MaiBot\\MaiBot-1');
const maibotPort = ref('8000');
const selectedServices = reactive({});
const servicePorts = reactive({});

// 事件
const emit = defineEmits(['refresh']);

// 计算属性 - 基于 store 状态
const availableVersions = computed(() => deployStore.availableVersions);
const availableServices = computed(() => deployStore.availableServices);
const installing = computed(() => deployStore.currentDeployment?.installing || false);
const installComplete = computed(() => deployStore.currentDeployment?.installComplete || false);
const installProgress = computed(() => deployStore.currentDeployment?.installProgress || 0);
const servicesProgress = computed(() => deployStore.currentDeployment?.servicesProgress || []);
const logs = computed(() => deployStore.currentDeployment?.logs || []);

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
    } return '准备中';
});

// 获取服务的默认端口
const getDefaultPort = (serviceName) => {
    switch (serviceName) {
        case 'napcat-ada': return '8095';
        default: return '8000';
    }
};

// 初始化版本和服务数据
const initializeData = async () => {
    loading.value = true;
    try {
        await Promise.all([
            deployStore.fetchVersions(),
            deployStore.fetchServices()
        ]);

        // 初始化服务选择状态和端口
        selectedServices['napcat-ada'] = true; // 默认选中
        servicePorts['napcat-ada'] = '8095'; // 默认端口
        console.log('数据初始化完成');
    } catch (error) {
        console.error('数据初始化失败:', error);
        toastService.error('数据初始化失败');
    } finally {
        loading.value = false;
    }
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

// 开始安装流程 (使用 deployStore)
const startInstall = async () => {
    if (!canInstall.value) {
        toastService.error('请完成所有必填项');
        return;
    }

    try {
        // 准备部署配置
        const installServices = [];
        if (selectedServices['napcat-ada']) {
            installServices.push({
                name: 'napcat-ada',
                path: `${installPath.value}\\napcat-ada`,
                port: parseInt(servicePorts['napcat-ada']),
                run_cmd: 'python main.py'
            });
        } const deployConfig = {
            instance_name: instanceName.value,
            install_services: installServices,
            install_path: installPath.value,
            port: parseInt(maibotPort.value),
            version: selectedVersion.value
        };

        // 使用 deployStore 开始部署
        await deployStore.startDeployment(deployConfig);

        // 触发实例列表刷新
        emit('refresh');
        instanceStore.fetchInstances(true);

    } catch (error) {
        console.error('安装过程出错:', error);
        toastService.error(`安装失败: ${error.message}`);
    }
};

// 当组件挂载时初始化数据
onMounted(() => {
    initializeData();
});

// 组件卸载时清理资源
onBeforeUnmount(() => {
    // deployStore 会自动处理清理工作
    if (deployStore.currentDeployment) {
        deployStore.cleanup();
    }
});

// 监听选择版本变化
watch(selectedVersion, (newValue) => {
    if (newValue) {
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
    max-width: 1200px;
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
