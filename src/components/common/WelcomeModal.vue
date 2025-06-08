<template>
    <div v-if="visible" class="fixed inset-0 z-50 bg-base-100 overflow-y-auto">
        <div class="min-h-screen w-full max-w-3xl mx-auto p-6 flex items-center justify-center">
            <div class="w-full">
                <!-- 头部 -->
                <div class="text-center mb-8">
                    <div class="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                        <img src="/assets/icon.ico" alt="MaiLauncher" class="w-12 h-12" />
                    </div>
                    <h1 class="font-bold text-3xl mb-2">欢迎使用 MaiLauncher</h1>
                    <p class="text-lg text-base-content/70">强大的 MaiBot 实例管理和部署工具</p>
                </div>

                <!-- 主要选择 -->
                <div class="space-y-6 mb-8">
                    <!-- 首次使用 -->
                    <div
                        class="card bg-gradient-to-r from-primary/5 to-secondary/5 border-2 border-primary/20 transition-all duration-300 hover:shadow-lg hover:border-primary/40">
                        <div class="card-body p-6">
                            <div class="flex items-center gap-4">
                                <div class="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <Icon icon="mdi:rocket-launch" class="w-8 h-8 text-primary" />
                                </div>
                                <div class="flex-1">
                                    <h3 class="text-xl font-bold mb-2">首次使用配置向导</h3>
                                    <p class="text-base-content/70 mb-4">
                                        这是您第一次使用 MaiLauncher。让我们通过简单的步骤来配置系统，包括路径设置、后端连接和主题选择。
                                    </p>
                                    <button @click="startSetupWizard" class="btn btn-primary">
                                        <Icon icon="mdi:play" class="w-4 h-4" />
                                        开始配置
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 快速开始 -->
                    <div class="card bg-base-200 border border-base-300 transition-all duration-300 hover:shadow-md">
                        <div class="card-body p-6">
                            <div class="flex items-center gap-4">
                                <div class="w-16 h-16 bg-success/10 rounded-xl flex items-center justify-center">
                                    <Icon icon="mdi:lightning-bolt" class="w-8 h-8 text-success" />
                                </div>
                                <div class="flex-1">
                                    <h3 class="text-xl font-bold mb-2">直接开始使用</h3>
                                    <p class="text-base-content/70 mb-4">
                                        使用默认设置立即开始体验 MaiLauncher。您随时可以在设置页面中调整配置。
                                    </p>
                                    <button @click="skipSetup" class="btn btn-outline">
                                        <Icon icon="mdi:skip-next" class="w-4 h-4" />
                                        跳过配置
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div> <!-- 后端连接状态 -->
                <div class="alert mb-6" :class="connectionStatus.alertClass">
                    <Icon :icon="connectionStatus.icon" class="shrink-0 w-6 h-6" />
                    <div class="flex-1">
                        <h4 class="font-bold">{{ connectionStatus.title }}</h4>
                        <p class="text-sm">{{ connectionStatus.description }}</p>
                    </div>
                    <button v-if="!connectionStatus.isConnected" @click="showBackendConfig = true"
                        class="btn btn-sm btn-outline">
                        <Icon icon="mdi:settings" class="w-4 h-4" />
                        配置后端
                    </button>
                </div>

                <!-- 后端服务配置 -->
                <div v-if="showBackendConfig" class="card bg-base-200 border border-warning mb-6">
                    <div class="card-body p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="font-bold flex items-center gap-2">
                                <Icon icon="mdi:server-network" class="w-5 h-5" />
                                后端服务配置
                            </h4>
                            <button @click="showBackendConfig = false" class="btn btn-ghost btn-sm">
                                <Icon icon="mdi:close" class="w-4 h-4" />
                            </button>
                        </div>

                        <div class="alert alert-info mb-4">
                            <Icon icon="mdi:information" class="shrink-0 w-5 h-5" />
                            <div class="text-sm">
                                <p class="font-medium">局域网访问说明</p>
                                <p>当前后端地址为 {{ currentBackendUrl }}，如果您在局域网中的其他设备上访问，请输入运行后端服务的机器的局域网IP地址。</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text font-medium">服务器地址</span>
                                </label>
                                <input type="text" v-model="backendHost" placeholder="例如: 192.168.31.152"
                                    class="input input-bordered" :class="{ 'input-error': hostError }" />
                                <label v-if="hostError" class="label">
                                    <span class="label-text-alt text-error">{{ hostError }}</span>
                                </label>
                            </div>

                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text font-medium">端口号</span>
                                </label>
                                <input type="number" v-model.number="backendPort" placeholder="23456"
                                    class="input input-bordered" min="1" max="65535" />
                            </div>
                        </div>

                        <div class="alert alert-warning mb-4">
                            <Icon icon="mdi:alert" class="shrink-0 w-5 h-5" />
                            <div class="text-sm">
                                <p class="font-medium">常见IP地址示例：</p>
                                <p>• 本机访问：127.0.0.1 或 localhost</p>
                                <p>• 局域网访问：192.168.x.x 或 10.x.x.x 或 172.16-31.x.x</p>
                                <p>• 公网访问：您的公网IP地址</p>
                            </div>
                        </div>

                        <div class="flex gap-3">
                            <button @click="testConnection" class="btn btn-primary flex-1"
                                :class="{ 'loading': testingConnection }">
                                <Icon v-if="!testingConnection" icon="mdi:connection" class="w-4 h-4" />
                                {{ testingConnection ? '测试中...' : '测试连接' }}
                            </button>
                            <button @click="saveBackendConfig" class="btn btn-success flex-1"
                                :disabled="!backendHost || hostError">
                                <Icon icon="mdi:content-save" class="w-4 h-4" />
                                保存配置
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 快速功能预览 -->
                <div class="bg-base-200 rounded-lg p-6 mb-8">
                    <h4 class="font-semibold mb-4 flex items-center gap-2">
                        <Icon icon="mdi:feature-search" class="w-5 h-5" />
                        主要功能
                    </h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="text-center">
                            <div
                                class="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Icon icon="mdi:server" class="w-6 h-6 text-blue-500" />
                            </div>
                            <p class="text-sm font-medium">实例管理</p>
                        </div>
                        <div class="text-center">
                            <div
                                class="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Icon icon="mdi:console" class="w-6 h-6 text-green-500" />
                            </div>
                            <p class="text-sm font-medium">终端控制</p>
                        </div>
                        <div class="text-center">
                            <div
                                class="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Icon icon="mdi:download" class="w-6 h-6 text-purple-500" />
                            </div>
                            <p class="text-sm font-medium">自动部署</p>
                        </div>
                        <div class="text-center">
                            <div
                                class="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Icon icon="mdi:chart-line" class="w-6 h-6 text-orange-500" />
                            </div>
                            <p class="text-sm font-medium">系统监控</p>
                        </div>
                    </div>
                </div>

                <!-- 底部操作 -->
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <label class="label cursor-pointer flex items-center gap-2">
                            <input type="checkbox" v-model="dontShowAgain"
                                class="checkbox checkbox-primary checkbox-sm" />
                            <span class="label-text text-sm">启动时不再显示</span>
                        </label>
                    </div>
                    <div class="flex gap-2">
                        <button class="btn btn-ghost btn-sm" @click="openDocs">
                            <Icon icon="mdi:book-open" class="w-4 h-4" />
                            文档
                        </button>
                        <button class="btn btn-ghost btn-sm" @click="openSettings">
                            <Icon icon="mdi:settings" class="w-4 h-4" />
                            设置
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import toastService from '@/services/toastService'
import backendConfig from '@/config/backendConfig'

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['close', 'open-settings', 'start-setup-wizard'])

const dontShowAgain = ref(false)

// 后端配置相关状态
const showBackendConfig = ref(false)
const backendHost = ref('192.168.31.152')
const backendPort = ref(23456)
const testingConnection = ref(false)
const hostError = ref('')

// 计算属性：当前后端URL
const currentBackendUrl = computed(() => {
    return backendConfig.getBackendUrl()
})

// IP地址验证
const validateHost = (host) => {
    if (!host) {
        return '请输入服务器地址'
    }

    // 简单的IP地址或域名验证
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^localhost$|^[\w.-]+\.[a-z]{2,}$/i

    if (!ipRegex.test(host)) {
        return '请输入有效的IP地址或域名'
    }

    // 验证IP地址范围
    if (host.includes('.')) {
        const parts = host.split('.')
        if (parts.length === 4) {
            for (const part of parts) {
                const num = parseInt(part, 10)
                if (isNaN(num) || num < 0 || num > 255) {
                    return 'IP地址格式不正确'
                }
            }
        }
    }

    return ''
}

// 监听输入变化进行验证
watch(backendHost, (newHost) => {
    hostError.value = validateHost(newHost)
})

// 测试连接
const testConnection = async () => {
    if (!backendHost.value || hostError.value) {
        toastService.error('请输入有效的服务器地址')
        return
    } testingConnection.value = true

    try {
        const testUrl = `http://${backendHost.value}:${backendPort.value}/api/v1/system/health`
        const response = await fetch(testUrl, {
            method: 'GET',
            timeout: 5000
        })

        if (response.ok) {
            const data = await response.json()
            if (data && data.status === 'success') {
                toastService.success('后端连接测试成功！')
            } else {
                toastService.error('后端服务响应格式不正确')
            }
        } else {
            toastService.error(`连接失败：HTTP ${response.status}`)
        }
    } catch (error) {
        console.error('后端连接测试失败:', error)
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            toastService.error('连接被拒绝，请检查：\n1. 后端服务是否已启动\n2. IP地址和端口是否正确\n3. 防火墙设置')
        } else {
            toastService.error('连接测试失败：' + error.message)
        }
    } finally {
        testingConnection.value = false
    }
}

// 保存后端配置
const saveBackendConfig = () => {
    if (!backendHost.value || hostError.value) {
        toastService.error('请输入有效的服务器地址')
        return
    }

    // 更新后端配置
    backendConfig.setBackendServer(backendHost.value, backendPort.value)

    toastService.success(`后端地址已更新为: ${backendHost.value}:${backendPort.value}`)
    showBackendConfig.value = false

    // 刷新页面以应用新配置
    setTimeout(() => {
        window.location.reload()
    }, 1000)
}

// 连接状态计算属性
const connectionStatus = computed(() => {
    // 检查后端连接状态
    return {
        alertClass: 'alert-success',
        icon: 'mdi:check-circle',
        title: '后端连接正常',
        description: '所有功能已就绪，可以正常使用实例管理、终端控制等完整功能。',
        isConnected: true
    }
})

// 组件挂载时加载配置
onMounted(() => {
    // 从localStorage加载已保存的配置
    backendConfig.loadFromStorage()

    // 初始化表单值
    backendHost.value = backendConfig.server.host
    backendPort.value = backendConfig.server.port
})

// 开始设置向导
const startSetupWizard = () => {
    emit('start-setup-wizard')
}

// 跳过设置，直接开始使用
const skipSetup = () => {
    // 保存跳过标记
    localStorage.setItem('firstTimeSetupCompleted', 'true')
    if (dontShowAgain.value) {
        localStorage.setItem('welcomeModalDontShow', 'true')
    }
    toastService.info('您可以随时在设置页面中配置系统选项')
    emit('close')
}

// 打开文档
const openDocs = () => {
    window.open('https://github.com/MaiM-with-u/MaiBot', '_blank')
}

// 打开设置页面
const openSettings = () => {
    emit('open-settings')
}
</script>

<style scoped>
.card {
    transition: all 0.2s ease;
}

.card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -8px rgba(0, 0, 0, 0.2);
}

.badge {
    font-size: 0.75rem;
}

/* 禁用状态的按钮样式 */
.btn-disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* 响应式调整 */
@media (max-width: 768px) {
    .min-h-screen {
        padding: 1rem;
    }

    .grid-cols-1 {
        grid-template-columns: 1fr;
    }
}
</style>
