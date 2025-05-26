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
                        <!-- 实例名称 (移到Napcat-ada上方) -->
                        <div class="mb-4">
                            <label class="label">
                                <span class="label-text">实例名称</span>
                            </label>
                            <input v-model="instanceName" type="text" placeholder="请输入实例名称"
                                class="input input-bordered w-full" :disabled="installing" />
                        </div>

                        <!-- 服务配置卡片 -->
                        <div class="mb-4">
                            <div
                                class="service-card p-3 rounded-lg border border-base-200 bg-base-100 hover:shadow-md transition-all">
                                <div class="form-control">
                                    <label class="label cursor-pointer justify-start gap-2">
                                        <input type="checkbox" v-model="enableNapcat"
                                            class="checkbox checkbox-primary" />
                                        <div class="service-info">
                                            <div class="font-medium">Napcat 服务</div>
                                            <div class="text-xs text-base-content/70">Napcat-ada</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- 端口配置 -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label class="label">
                                    <span class="label-text">MaiBot 端口</span>
                                </label>
                                <input v-model="maibotPort" type="number" placeholder="例如：8000"
                                    class="input input-bordered w-full" :disabled="installing" />
                            </div>

                            <div>
                                <label class="label">
                                    <span class="label-text">Napcat-ada 端口</span>
                                </label>
                                <input v-model="napcatPort" type="number" placeholder="例如：18002"
                                    class="input input-bordered w-full" :disabled="!enableNapcat || installing" />
                            </div>
                        </div>

                        <!-- 安装按钮 -->
                        <div class="flex justify-end">
                            <button class="btn btn-primary" @click="startInstall" :disabled="!canInstall || installing">
                                开始安装
                            </button>
                        </div>
                    </div>
                </transition>

                <!-- 安装配置概要和进度 -->
                <transition name="fade">
                    <div v-if="installing" class="mt-4">
                        <div class="install-summary p-3 rounded-lg bg-base-200 mb-4">
                            <div class="font-medium mb-2">安装配置概要</div>
                            <div class="text-sm grid grid-cols-2 gap-x-4 gap-y-2">
                                <div>版本: <span class="font-medium">{{ selectedVersion }}</span></div>
                                <div>实例名: <span class="font-medium">{{ instanceName }}</span></div>
                                <div>MaiBot端口: <span class="font-medium">{{ maibotPort }}</span></div>
                                <div v-if="enableNapcat">Napcat-ada端口: <span class="font-medium">{{ napcatPort }}</span>
                                </div>
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
                                    <span>{{ installComplete ? '安装完成' : '安装中...' }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- 进度条 -->
                        <div class="mb-4">
                            <div class="flex justify-between mb-1">
                                <span class="text-sm">安装进度</span>
                                <span class="text-sm">{{ installProgress }}%</span>
                            </div>
                            <progress class="progress progress-primary w-full" :value="installProgress"
                                max="100"></progress>
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
import { ref, computed, onMounted, watch } from 'vue';
import { instancesApi } from '@/services/api';
import toastService from '@/services/toastService';

// 状态变量
const loading = ref(false);
const installing = ref(false);
const installComplete = ref(false);
const availableVersions = ref(['latest', 'stable', 'beta', 'v0.6.5', 'v0.6.4', 'v0.6.3']);
const selectedVersion = ref('');
const enableNapcat = ref(true);
const instanceName = ref('');
const maibotPort = ref('8000');
const napcatPort = ref('18002');
const installProgress = ref(0);
const logs = ref([]);

// 事件
const emit = defineEmits(['refresh']);

// 计算属性 - 是否可以安装
const canInstall = computed(() => {
    return selectedVersion.value &&
        instanceName.value.trim() &&
        maibotPort.value &&
        (!enableNapcat.value || napcatPort.value);
});

// 获取可用版本
const fetchVersions = async () => {
    loading.value = true;
    try {
        const response = await instancesApi.getVersions();
        if (response && response.versions && response.versions.length > 0) {
            availableVersions.value = response.versions;
        }
    } catch (error) {
        console.error('获取版本列表失败:', error);
        // 保留默认版本列表
    } finally {
        loading.value = false;
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

// 开始安装流程
const startInstall = () => {
    if (!canInstall.value) {
        toastService.error('请完成所有必填项');
        return;
    }

    installing.value = true;
    installComplete.value = false;
    installProgress.value = 0;
    logs.value = [];

    // 添加初始日志
    addLog(`开始安装 MaiBot ${selectedVersion.value} 实例: ${instanceName.value}`);

    // 通知安装开始
    toastService.info(`开始安装 MaiBot ${selectedVersion.value}`);

    // 模拟安装进度
    simulateInstallation();
};

// 模拟安装过程
const simulateInstallation = () => {
    const totalSteps = 10;
    let currentStep = 0;

    const interval = setInterval(() => {
        currentStep++;
        installProgress.value = Math.round((currentStep / totalSteps) * 100);

        // 根据步骤添加不同的日志
        switch (currentStep) {
            case 1:
                addLog('正在准备安装环境...');
                break;
            case 2:
                addLog('下载 MaiBot 核心组件...');
                break;
            case 3:
                addLog('安装依赖库...');
                break;
            case 4:
                addLog('配置 MaiBot 服务...');
                break;
            case 5:
                addLog(`设置 MaiBot 端口: ${maibotPort.value}`, 'success');
                break;
            case 6:
                if (enableNapcat.value) {
                    addLog('安装 Napcat-ada 组件...');
                }
                break;
            case 7:
                if (enableNapcat.value) {
                    addLog(`配置 Napcat-ada 端口: ${napcatPort.value}`, 'success');
                }
                break;
            case 8:
                addLog('生成配置文件...');
                break;
            case 9:
                addLog('执行最终检查...');
                break;
            case 10:
                addLog('安装完成！', 'success');
                clearInterval(interval);

                // 安装完成后，标记完成状态并显示成功通知
                installComplete.value = true;
                toastService.success(`MaiBot ${selectedVersion.value} 安装成功！`);
                emit('refresh');
                break;
        }
    }, 1000);
};

// 当组件挂载时获取可用版本
onMounted(() => {
    fetchVersions();
});

// 监听选择版本变化
watch(selectedVersion, (newValue) => {
    if (newValue) {
        // 清空日志，因为每次选择新版本时应该重置
        logs.value = [];
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
    max-height: 600px;
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

.service-card {
    transition: all 0.3s ease;
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

.card,
.service-card,
.install-summary,
.log-container {
    border-radius: 0.75rem;
}

.log-container {
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.1);
}
</style>
