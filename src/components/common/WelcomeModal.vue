<template>
    <div v-if="visible" class="fixed inset-0 z-50 bg-base-100 overflow-y-auto">
        <div class="min-h-screen w-full max-w-4xl mx-auto p-6">
            <!-- 头部 -->
            <div class="flex items-center justify-between gap-3 mb-6">
                <div class="flex items-center gap-3">
                    <img src="/assets/icon.ico" alt="MaiLauncher" class="w-12 h-12" />
                    <div>
                        <h3 class="font-bold text-xl">MaiLauncher 启动器</h3>
                        <p class="text-sm text-base-content/70">功能介绍</p>
                    </div>
                </div>

                <!-- 倒计时提示 -->
                <div v-if="countdown > 0" class="flex items-center gap-2 text-sm text-base-content/70">
                    <Icon icon="mdi:clock-outline" class="w-4 h-4" />
                    <span>{{ countdown }} 秒后可关闭</span>
                </div>
            </div>

            <!-- 内容区域 -->
            <div class="space-y-4">
                <div class="alert alert-info">
                    <Icon icon="mdi:information" class="shrink-0 w-6 h-6" />
                    <div>
                        <h4 class="font-bold">欢迎使用 MaiLauncher!</h4>
                        <p class="text-sm">以下是当前已实现并能正常运行的功能</p>
                    </div>
                </div>

                <!-- 功能列表 -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- 核心功能 -->
                    <div class="card bg-base-100 border border-base-300">
                        <div class="card-body p-4">
                            <div class="flex items-center gap-2 mb-3">
                                <Icon icon="mdi:server" class="text-primary w-5 h-5" />
                                <h5 class="font-semibold">实例管理</h5>
                            </div>
                            <ul class="text-sm space-y-1 text-base-content/80">
                                <li>✅ 创建和部署 MaiBot 实例</li>
                                <li>✅ 启动、停止、重启实例</li>
                                <li>✅ 实例状态监控</li>
                                <li>✅ 实例配置管理</li>
                            </ul>
                        </div>
                    </div>

                    <!-- 终端功能 -->
                    <div class="card bg-base-100 border border-base-300">
                        <div class="card-body p-4">
                            <div class="flex items-center gap-2 mb-3">
                                <Icon icon="mdi:console" class="text-primary w-5 h-5" />
                                <h5 class="font-semibold">终端控制</h5>
                            </div>
                            <ul class="text-sm space-y-1 text-base-content/80">
                                <li>✅ 实时终端输出</li>
                                <li>✅ 命令交互执行</li>
                                <li>✅ MaiBot / napcat-ada 双终端</li>
                                <li>✅ WebSocket 实时通信</li>
                            </ul>
                        </div>
                    </div>

                    <!-- 部署功能 -->
                    <div class="card bg-base-100 border border-base-300">
                        <div class="card-body p-4">
                            <div class="flex items-center gap-2 mb-3">
                                <Icon icon="mdi:download" class="text-primary w-5 h-5" />
                                <h5 class="font-semibold">自动化部署</h5>
                            </div>
                            <ul class="text-sm space-y-1 text-base-content/80">
                                <li>✅ GitHub 版本自动获取</li>
                                <li>✅ 一键安装配置</li>
                                <li>✅ 服务依赖管理</li>
                                <li>✅ 安装进度监控</li>
                            </ul>
                        </div>
                    </div>

                    <!-- 系统监控 -->
                    <div class="card bg-base-100 border border-base-300">
                        <div class="card-body p-4">
                            <div class="flex items-center gap-2 mb-3">
                                <Icon icon="mdi:chart-line" class="text-primary w-5 h-5" />
                                <h5 class="font-semibold">系统监控</h5>
                            </div>
                            <ul class="text-sm space-y-1 text-base-content/80">
                                <li>✅ 系统资源监控</li>
                                <li>✅ 实例运行状态</li>
                                <li>✅ 性能图表展示</li>
                                <li>✅ 实时数据刷新</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- 后端通信状态 -->
                <div class="alert" :class="connectionStatus.alertClass">
                    <Icon :icon="connectionStatus.icon" class="shrink-0 w-6 h-6" />
                    <div>
                        <h4 class="font-bold">{{ connectionStatus.title }}</h4>
                        <p class="text-sm">{{ connectionStatus.description }}</p>
                    </div>
                </div>

                <!-- 技术栈 -->
                <div class="bg-base-200 rounded-lg p-4">
                    <h5 class="font-semibold mb-2 flex items-center gap-2">
                        <Icon icon="mdi:cog" class="w-4 h-4" />
                        技术架构
                    </h5>
                    <div class="flex flex-wrap gap-2">
                        <span class="badge badge-outline">Vue 3</span>
                        <span class="badge badge-outline">DaisyUI</span>
                        <span class="badge badge-outline">FastAPI</span>
                        <span class="badge badge-outline">WebSocket</span>
                        <span class="badge badge-outline">xterm.js</span>
                        <span class="badge badge-outline">Pinia</span>
                    </div>
                </div>
            </div>

            <!-- 底部操作 -->
            <div class="flex items-center justify-between mt-8">
                <label class="label cursor-pointer flex items-center gap-2">
                    <input type="checkbox" v-model="dontShowAgain" class="checkbox checkbox-primary checkbox-sm" />
                    <span class="label-text text-sm">我已知悉，不再显示</span>
                </label>
                <div class="flex gap-2">
                    <button class="btn btn-ghost btn-sm" @click="openDocs">
                        <Icon icon="mdi:book-open" class="w-4 h-4 mr-1" />
                        查看文档
                    </button>
                    <button class="btn btn-primary btn-sm" @click="close" :disabled="countdown > 0"
                        :class="{ 'btn-disabled': countdown > 0 }">
                        <Icon icon="mdi:check" class="w-4 h-4 mr-1" />
                        {{ countdown > 0 ? `请等待 ${countdown} 秒` : '开始使用' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { isMockModeActive } from '@/services/apiService'

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['close', 'dont-show-again'])

const dontShowAgain = ref(false)
const countdown = ref(30)
let countdownTimer = null

// 监听弹窗显示状态，启动倒计时
watch(() => props.visible, (newVisible) => {
    if (newVisible) {
        startCountdown()
    } else {
        stopCountdown()
    }
})

// 启动倒计时
const startCountdown = () => {
    countdown.value = 30
    countdownTimer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
            stopCountdown()
        }
    }, 1000)
}

// 停止倒计时
const stopCountdown = () => {
    if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
    }
}

// 连接状态计算属性
const connectionStatus = computed(() => {
    const isMockMode = isMockModeActive()

    if (isMockMode) {
        return {
            alertClass: 'alert-warning',
            icon: 'mdi:alert-circle',
            title: '模拟模式运行',
            description: '当前使用模拟数据，部分功能为演示效果。请启动后端服务以获得完整功能。'
        }
    } else {
        return {
            alertClass: 'alert-success',
            icon: 'mdi:check-circle',
            title: '后端连接正常',
            description: '所有功能已就绪，可以正常使用实例管理、终端控制等完整功能。'
        }
    }
})

// 关闭弹窗
const close = () => {
    if (countdown.value > 0) {
        return // 倒计时未结束，不能关闭
    }

    if (dontShowAgain.value) {
        // 保存用户选择，下次启动不再显示
        localStorage.setItem('welcomeModalDontShow', 'true')
        emit('dont-show-again')
    }
    emit('close')
}

// 打开文档
const openDocs = () => {
    // 可以打开在线文档或本地文档
    window.open('https://github.com/MaiM-with-u/MaiBot', '_blank')
}

// 组件卸载时清理倒计时
onUnmounted(() => {
    stopCountdown()
})
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
