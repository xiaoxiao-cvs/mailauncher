<template>
    <div class="download-center">
        <div class="version-select-container">
            <div class="card rounded-xl bg-base-100 p-5 shadow-md">

                <!-- 安装方式选择页面 -->
                <transition name="page-fade" mode="out-in">
                    <div v-if="currentStep === 'select-mode'" key="select-mode" class="install-mode-selection">
                        <div class="card-title mb-6 text-center">选择安装方式</div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- 添加硬盘中已有实例 -->
                            <div class="install-option">
                                <button @click="selectInstallMode('existing')"
                                    class="btn btn-outline btn-lg w-full h-32 flex flex-col gap-3 hover:btn-primary transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                    </svg>
                                    <div class="text-center">
                                        <div class="font-semibold">添加硬盘中已有实例</div>
                                        <div class="text-sm opacity-70">导入已存在的MaiBot实例</div>
                                    </div>
                                </button>
                            </div>

                            <!-- 下载新实例 -->
                            <div class="install-option">
                                <button @click="selectInstallMode('new')"
                                    class="btn btn-outline btn-lg w-full h-32 flex flex-col gap-3 hover:btn-primary transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                    </svg>
                                    <div class="text-center">
                                        <div class="font-semibold">下载新实例</div>
                                        <div class="text-sm opacity-70">从官方源下载并安装新实例</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 添加已有实例页面 -->
                    <div v-else-if="currentStep === 'existing-instance'" key="existing-instance"
                        class="existing-instance-setup">
                        <div class="flex items-center mb-6">
                            <button @click="goBack"
                                class="btn btn-ghost btn-sm mr-3 hover:scale-105 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div class="card-title">添加硬盘中已有实例</div>
                        </div>

                        <!-- 实例路径选择 -->
                        <div class="mb-4">
                            <label class="label">
                                <span class="label-text">实例路径</span>
                            </label>
                            <div class="input-group">
                                <input v-model="existingInstancePath" type="text"
                                    placeholder="例如：D:\MaiBot\existing-instance" class="input input-bordered flex-1" />
                                <button @click="selectFolder" class="btn btn-outline">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                    </svg>
                                    浏览
                                </button>
                            </div>
                        </div>

                        <!-- 实例检测状态 -->
                        <div v-if="existingInstancePath" class="mb-4">
                            <div class="card p-3 rounded-lg border border-base-200 bg-base-100">
                                <div class="flex items-center gap-3">
                                    <div v-if="instanceDetection.loading" class="loading loading-spinner loading-sm">
                                    </div>
                                    <div v-else-if="instanceDetection.valid" class="text-success">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20"
                                            fill="currentColor">
                                            <path fill-rule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                    <div v-else-if="instanceDetection.error" class="text-error">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20"
                                            fill="currentColor">
                                            <path fill-rule="evenodd"
                                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                    <div class="flex-1">
                                        <div v-if="instanceDetection.loading" class="text-sm">检测实例中...</div>
                                        <div v-else-if="instanceDetection.valid" class="text-sm text-success">实例检测成功
                                        </div>
                                        <div v-else-if="instanceDetection.error" class="text-sm text-error">{{
                                            instanceDetection.error }}</div>
                                        <div v-if="instanceDetection.version" class="text-xs opacity-70">版本: {{
                                            instanceDetection.version }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 实例配置 -->
                        <div v-if="instanceDetection.valid" class="space-y-4">
                            <!-- 实例名称 -->
                            <div class="mb-4">
                                <label class="label">
                                    <span class="label-text">实例名称</span>
                                </label>
                                <input v-model="existingInstanceName" type="text" placeholder="请输入实例名称"
                                    class="input input-bordered w-full" />
                            </div>

                            <!-- MaiBot端口 -->
                            <div class="mb-4">
                                <label class="label">
                                    <span class="label-text">MaiBot 端口</span>
                                </label>
                                <input v-model="existingMaibotPort" type="number" placeholder="例如：8000"
                                    class="input input-bordered w-full" />
                            </div>

                            <!-- EULA 同意选项 -->
                            <div class="mb-4">
                                <div class="card p-3 rounded-lg border border-base-200 bg-base-100">
                                    <div class="form-control">
                                        <label class="label cursor-pointer justify-start gap-3">
                                            <input type="checkbox" v-model="existingEulaAgreed"
                                                class="checkbox checkbox-primary" />
                                            <div class="flex-1">
                                                <div class="font-medium text-sm">我已阅读并同意</div>
                                                <div class="text-xs text-base-content/70">
                                                    <a href="https://gitee.com/DrSmooth/MaiBot/blob/main/EULA.md"
                                                        target="_blank" class="link link-primary hover:link-accent">
                                                        最终用户许可协议 (EULA)
                                                    </a>
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- 添加按钮 -->
                            <div class="flex justify-end">
                                <button class="btn btn-primary" @click="addExistingInstance"
                                    :disabled="!canAddExisting">
                                    <span v-if="addingInstance" class="loading loading-spinner loading-xs mr-2"></span>
                                    添加实例
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 下载新实例页面 -->
                    <div v-else-if="currentStep === 'new-instance'" key="new-instance" class="new-instance-setup">
                        <div class="flex items-center mb-6">
                            <button @click="goBack"
                                class="btn btn-ghost btn-sm mr-3 hover:scale-105 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div class="card-title">下载新实例</div>
                        </div>

                        <!-- 版本选择下拉框 -->
                        <div class="mb-4">
                            <label class="label">
                                <span class="label-text">选择版本</span>
                            </label>
                            <select v-model="selectedVersion" class="select select-bordered w-full"
                                :disabled="loading || installing">
                                <option disabled value="">请选择一个版本</option>
                                <option v-for="version in availableVersions" :key="version" :value="version">{{ version
                                }}
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
                                </div>

                                <!-- Napcat-ada 服务配置 -->
                                <div class="mb-4">
                                    <div
                                        class="card p-3 rounded-lg border border-base-200 bg-base-100 hover:shadow-md transition-all">
                                        <div class="card-title text-sm mb-2">Napcat-ada 服务</div>

                                        <div class="form-control">
                                            <label class="label cursor-pointer justify-start gap-2">
                                                <input type="checkbox" v-model="selectedServices['napcat-ada']" checked
                                                    disabled class="checkbox checkbox-primary" />
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
                                        </div>
                                        <!-- Napcat-ada 端口配置 -->
                                        <div v-show="selectedServices['napcat-ada']" class="mb-3">
                                            <label class="label">
                                                <span class="label-text">Napcat-ada 端口</span>
                                            </label>
                                            <input v-model="servicePorts['napcat-ada']" type="number"
                                                placeholder="例如：8095" class="input input-bordered w-full"
                                                :disabled="installing" />
                                        </div>
                                    </div>
                                </div>

                                <!-- EULA 同意选项 -->
                                <div class="mb-4">
                                    <div class="card p-3 rounded-lg border border-base-200 bg-base-100">
                                        <div class="form-control">
                                            <label class="label cursor-pointer justify-start gap-3">
                                                <input type="checkbox" v-model="eulaAgreed"
                                                    class="checkbox checkbox-primary" :disabled="installing" />
                                                <div class="flex-1">
                                                    <div class="font-medium text-sm">我已阅读并同意</div>
                                                    <div class="text-xs text-base-content/70">
                                                        <a href="https://gitee.com/DrSmooth/MaiBot/blob/main/EULA.md"
                                                            target="_blank" class="link link-primary hover:link-accent">
                                                            最终用户许可协议 (EULA)
                                                        </a>
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <!-- 安装按钮 -->
                                <div class="flex justify-end">
                                    <button class="btn btn-primary" @click="startInstall"
                                        :disabled="!canInstall || installing">
                                        <span v-if="installing" class="loading loading-spinner loading-xs mr-2"></span>
                                        开始安装
                                    </button>
                                </div>
                            </div>
                        </transition>
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
                                <div>MaiBot端口: <span class="font-medium">{{ maibotPort }}</span></div>
                                <template v-for="service in availableServices" :key="`summary-${service.name}`">
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
                                max="100"></progress>
                            <!-- 服务安装进度条 -->
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
import { addExistingInstance as addExistingInstanceAPI } from '@/api/instances';

// 使用 stores
const deployStore = useDeployStore();
const instanceStore = useInstanceStore();

// 本地状态变量
const loading = ref(false);
const currentStep = ref('select-mode'); // 当前步骤: 'select-mode', 'existing-instance', 'new-instance'

// 下载新实例相关状态
const selectedVersion = ref('');
const instanceName = ref('');
const installPath = ref('D:\\MaiBot\\MaiBot-1');
const maibotPort = ref('8000');
const selectedServices = reactive({});
const servicePorts = reactive({});
const eulaAgreed = ref(false); // EULA 同意状态

// 添加已有实例相关状态
const existingInstancePath = ref('');
const existingInstanceName = ref('');
const existingMaibotPort = ref('8000');
const existingEulaAgreed = ref(false);
const addingInstance = ref(false);
const instanceDetection = reactive({
    loading: false,
    valid: false,
    error: null,
    version: null,
    hasConfig: false
});

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

// 计算属性 - 是否可以安装新实例
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

    // EULA 必须同意
    if (!eulaAgreed.value) {
        return false;
    }

    return true;
});

// 计算属性 - 是否可以添加已有实例
const canAddExisting = computed(() => {
    return instanceDetection.valid &&
        existingInstanceName.value.trim() &&
        existingMaibotPort.value &&
        existingEulaAgreed.value;
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

    // 再次检查 EULA 是否已同意
    if (!eulaAgreed.value) {
        toastService.error('请先阅读并同意最终用户许可协议 (EULA)');
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
        }

        const deployConfig = {
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

// 选择安装模式
const selectInstallMode = (mode) => {
    if (mode === 'existing') {
        currentStep.value = 'existing-instance';
    } else if (mode === 'new') {
        currentStep.value = 'new-instance';
    }
};

// 返回上一步
const goBack = () => {
    currentStep.value = 'select-mode';
    // 重置相关状态
    existingInstancePath.value = '';
    existingInstanceName.value = '';
    existingMaibotPort.value = '8000';
    existingEulaAgreed.value = false;
    resetInstanceDetection();

    selectedVersion.value = '';
    instanceName.value = '';
    installPath.value = 'D:\\MaiBot\\MaiBot-1';
    maibotPort.value = '8000';
    eulaAgreed.value = false;
};

// 选择文件夹 (简化版本，实际需要集成文件选择API)
const selectFolder = async () => {
    // 这里应该调用 Tauri 的文件选择 API
    // 临时使用 prompt 作为演示
    const path = prompt('请输入实例路径:', existingInstancePath.value);
    if (path) {
        existingInstancePath.value = path;
        await detectInstance();
    }
};

// 重置实例检测状态
const resetInstanceDetection = () => {
    instanceDetection.loading = false;
    instanceDetection.valid = false;
    instanceDetection.error = null;
    instanceDetection.version = null;
    instanceDetection.hasConfig = false;
};

// 检测实例
const detectInstance = async () => {
    if (!existingInstancePath.value.trim()) {
        resetInstanceDetection();
        return;
    }

    instanceDetection.loading = true;
    resetInstanceDetection();
    instanceDetection.loading = true;

    try {
        // 这里应该调用后端API来检测实例
        // 临时模拟检测逻辑
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟检测延迟

        // 简单的路径验证
        if (existingInstancePath.value.includes('main.py') ||
            existingInstancePath.value.includes('MaiBot')) {
            instanceDetection.valid = true;
            instanceDetection.version = '检测到的版本';
            instanceDetection.hasConfig = true;

            // 预填充实例名称
            if (!existingInstanceName.value) {
                const pathParts = existingInstancePath.value.split('\\');
                existingInstanceName.value = pathParts[pathParts.length - 1] || 'existing-instance';
            }
        } else {
            instanceDetection.error = '未检测到有效的MaiBot实例，请确保路径包含main.py文件';
        }
    } catch (error) {
        instanceDetection.error = `检测失败: ${error.message}`;
    } finally {
        instanceDetection.loading = false;
    }
};

// 添加已有实例
const addExistingInstance = async () => {
    if (!canAddExisting.value) {
        toastService.error('请完成所有必填项');
        return;
    }

    if (!existingEulaAgreed.value) {
        toastService.error('请先阅读并同意最终用户许可协议 (EULA)');
        return;
    }

    addingInstance.value = true;

    try {
        // 构建符合后端API格式的请求数据
        const instanceConfig = {
            instance_name: existingInstanceName.value,
            install_services: [
                {
                    name: 'napcat-ada',
                    path: `${existingInstancePath.value}\\napcat-ada`,
                    port: 8095,
                    run_cmd: 'python main.py'
                }
            ],
            install_path: existingInstancePath.value,
            port: parseInt(existingMaibotPort.value),
            version: instanceDetection.version || 'unknown'
        };

        // 调用后端API
        const response = await addExistingInstanceAPI(instanceConfig);

        toastService.success(response.message || '实例添加成功');

        // 触发实例列表刷新
        emit('refresh');
        instanceStore.fetchInstances(true);

        // 返回首页
        goBack();

    } catch (error) {
        console.error('添加实例失败:', error);
        toastService.error(`添加实例失败: ${error.message}`);
    } finally {
        addingInstance.value = false;
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

// 监听已有实例路径变化
watch(existingInstancePath, (newValue) => {
    if (newValue && newValue.trim()) {
        detectInstance();
    } else {
        resetInstanceDetection();
    }
});
</script>

<style scoped>
@import './DownloadCenter.css';
</style>
