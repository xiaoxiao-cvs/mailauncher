<template>
    <div class="toast-container">
        <Transition name="toast">
            <div v-if="visible" class="toast-message" :class="toastTypeClass">
                <div class="toast-content">
                    <button @click="handleClose" class="toast-close">×</button>
                    <div class="toast-body">
                        <span v-if="icon" class="toast-icon">
                            <Icon :icon="getIconForType(type)" />
                        </span>
                        <span class="toast-text">{{ message }}</span>
                    </div>
                </div>
                <div class="toast-progress-container">
                    <div class="toast-progress" :style="progressStyle"></div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps({
    message: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        default: 'info' // 'success', 'error', 'warning', 'info'
    },
    duration: {
        type: Number,
        default: 3000 // 持续时间（毫秒）
    },
    icon: {
        type: Boolean,
        default: true
    },
    visible: {
        type: Boolean,
        default: true
    }
});

const emit = defineEmits(['close']);

const progress = ref(100); // 进度百分比
const progressInterval = ref(null);
const toastTimeout = ref(null);

const progressStyle = computed(() => {
    return {
        width: `${progress.value}%`,
    };
});

const toastTypeClass = computed(() => {
    return `toast-${props.type}`;
});

const getIconForType = (type) => {
    switch (type) {
        case 'success': return 'mdi:check-circle';
        case 'error': return 'mdi:alert-circle';
        case 'warning': return 'mdi:alert';
        case 'info':
        default: return 'mdi:information';
    }
};

const handleClose = () => {
    clearInterval(progressInterval.value);
    clearTimeout(toastTimeout.value);
    emit('close');
};

// 初始化进度条
const resetProgress = () => {
    progress.value = 100;
};

const startProgressBar = () => {
    clearInterval(progressInterval.value);
    clearTimeout(toastTimeout.value);

    // 计算更新进度的间隔（使进度条平滑移动）
    const updateInterval = 10; // 每10毫秒更新一次
    const decrementPerInterval = (updateInterval / props.duration) * 100;

    progressInterval.value = setInterval(() => {
        progress.value = Math.max(0, progress.value - decrementPerInterval);
        if (progress.value <= 0) {
            clearInterval(progressInterval.value);
        }
    }, updateInterval);

    // 设置关闭超时
    toastTimeout.value = setTimeout(() => {
        handleClose();
    }, props.duration);
};

onMounted(() => {
    if (props.visible) {
        resetProgress();
        startProgressBar();
    }
});

onBeforeUnmount(() => {
    clearInterval(progressInterval.value);
    clearTimeout(toastTimeout.value);
});

// 监听可见性变化
watch(() => props.visible, (newVal) => {
    if (newVal) {
        resetProgress();
        startProgressBar();
    } else {
        clearInterval(progressInterval.value);
        clearTimeout(toastTimeout.value);
    }
});
</script>

<style scoped>
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    pointer-events: none;
}

.toast-message {
    position: relative;
    background-color: white;
    color: #333;
    min-width: 300px;
    max-width: 450px;
    margin-bottom: 10px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    pointer-events: auto;
    animation: toast-in 0.3s ease forwards;
}

.toast-content {
    padding: 12px 16px 12px 36px;
    display: flex;
    align-items: center;
    position: relative;
}

.toast-close {
    position: absolute;
    top: 8px;
    left: 12px;
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #666;
    padding: 0;
    margin: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
    transition: opacity 0.2s;
}

.toast-close:hover {
    opacity: 1;
}

.toast-body {
    display: flex;
    align-items: center;
}

.toast-icon {
    margin-right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.toast-icon .iconify {
    font-size: 20px;
}

.toast-text {
    font-size: 14px;
    line-height: 1.5;
}

.toast-progress-container {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background-color: rgba(0, 0, 0, 0.05);
}

.toast-progress {
    height: 100%;
    background-color: hsl(var(--p));
    transition: width 0.1s linear;
}

/* 不同类型的Toast样式 */
.toast-success .toast-icon {
    color: hsl(var(--su));
}

.toast-success .toast-progress {
    background-color: hsl(var(--su));
}

.toast-error .toast-icon {
    color: hsl(var(--er));
}

.toast-error .toast-progress {
    background-color: hsl(var(--er));
}

.toast-warning .toast-icon {
    color: hsl(var(--wa));
}

.toast-warning .toast-progress {
    background-color: hsl(var(--wa));
}

.toast-info .toast-icon {
    color: hsl(var(--in));
}

.toast-info .toast-progress {
    background-color: hsl(var(--in));
}

/* 动画效果 */
@keyframes toast-in {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes toast-out {
    from {
        opacity: 1;
        transform: translateX(0);
    }

    to {
        opacity: 0;
        transform: translateX(100%);
    }
}
</style>
