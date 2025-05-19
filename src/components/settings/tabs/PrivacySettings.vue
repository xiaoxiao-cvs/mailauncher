<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">隐私设置</h3>

        <div class="card bg-base-100 shadow-xl mb-6">
            <div class="card-body">
                <div class="setting-item">
                    <span class="setting-label">启用匿名数据收集</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle" v-model="collectAnonymousData" />
                    </div>
                </div>

                <div class="setting-item">
                    <span class="setting-label">自动发送错误报告</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle" v-model="autoSendErrorReports" />
                    </div>
                </div>
            </div>
        </div>

        <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
                <div class="setting-item">
                    <span class="setting-label">清除所有本地数据</span>
                    <div class="setting-control">
                        <button class="btn btn-error" @click="confirmClearData">清除数据</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

// 设置状态
const collectAnonymousData = ref(false);
const autoSendErrorReports = ref(false);

// 加载设置
onMounted(() => {
    const savedCollectData = localStorage.getItem('collectAnonymousData');
    if (savedCollectData !== null) {
        collectAnonymousData.value = savedCollectData === 'true';
    }

    const savedErrorReports = localStorage.getItem('autoSendErrorReports');
    if (savedErrorReports !== null) {
        autoSendErrorReports.value = savedErrorReports === 'true';
    }
});

// 监听设置变化
watch(collectAnonymousData, (newValue) => {
    localStorage.setItem('collectAnonymousData', newValue);
});

watch(autoSendErrorReports, (newValue) => {
    localStorage.setItem('autoSendErrorReports', newValue);
});

// 清除所有数据确认
const confirmClearData = () => {
    if (confirm('确定要清除所有本地存储的数据吗？此操作不可撤销！')) {
        // 清除所有与用户数据相关的本地存储
        localStorage.clear();

        // 显示成功消息
        const toast = document.createElement('div');
        toast.className = 'toast toast-top toast-center';
        toast.innerHTML = `
            <div class="alert alert-success">
                <span>所有本地数据已清除，应用将在3秒后重启</span>
            </div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            window.location.reload();
        }, 3000);
    }
};
</script>

<style scoped>
.settings-tab-content {
    animation: fadeIn 0.5s ease;
}

.settings-section-title {
    margin-bottom: 20px;
    color: var(--color-text-primary);
    font-weight: 500;
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 0;
    border-bottom: 1px solid var(--color-border-light);
}

.setting-item:last-child {
    border-bottom: none;
}

.setting-label {
    font-size: 14px;
}

.setting-control {
    display: flex;
    align-items: center;
}

/* 提示框样式 */
.toast {
    position: fixed;
    top: 2rem;
    z-index: 100;
    left: 50%;
    transform: translateX(-50%);
}

@media (max-width: 768px) {
    .setting-item {
        flex-direction: column;
        align-items: flex-start;
    }

    .setting-control {
        margin-top: 10px;
        width: 100%;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
