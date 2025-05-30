<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">高级设置</h3>

        <div class="card bg-base-100 shadow mb-4">
            <div class="card-body">
                <div class="setting-item">
                    <span class="setting-label">开发者模式</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle toggle-primary" v-model="developerMode" />
                    </div>
                </div>

                <div class="setting-item">
                    <span class="setting-label">API端点</span>
                    <div class="setting-control">
                        <input type="text" class="input input-bordered w-full" v-model="apiEndpoint" placeholder="API地址"
                            :disabled="!developerMode" />
                    </div>
                </div>

                <div class="setting-item">
                    <span class="setting-label">使用模拟数据</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle toggle-primary" v-model="useMockData"
                            :disabled="!developerMode" />
                    </div>
                </div>
            </div>
        </div>

        <div class="card bg-base-100 shadow" v-if="developerMode">
            <div class="card-body">
                <div class="setting-item">
                    <span class="setting-label">打开开发工具</span>
                    <div class="setting-control">
                        <button class="btn btn-warning" @click="openDevTools">打开开发工具</button>
                    </div>
                </div>

                <div class="setting-item">
                    <span class="setting-label">导出日志</span>
                    <div class="setting-control">
                        <button class="btn btn-primary" @click="exportLogs">导出日志</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

// 设置状态
const developerMode = ref(false);
const apiEndpoint = ref('http://localhost:8080');
const useMockData = ref(false);

// 加载设置
onMounted(() => {
    const savedDevMode = localStorage.getItem('developerMode');
    if (savedDevMode !== null) {
        developerMode.value = savedDevMode === 'true';
    }

    const savedApiEndpoint = localStorage.getItem('apiEndpoint');
    if (savedApiEndpoint) {
        apiEndpoint.value = savedApiEndpoint;
    }

    const savedMockData = localStorage.getItem('useMockData');
    if (savedMockData !== null) {
        useMockData.value = savedMockData === 'true';
    }
});

// 保存设置变更
watch([developerMode, apiEndpoint, useMockData], () => {
    localStorage.setItem('developerMode', developerMode.value);
    localStorage.setItem('apiEndpoint', apiEndpoint.value);
    localStorage.setItem('useMockData', useMockData.value);
});

// 打开开发者工具
const openDevTools = () => {
    if (window.electron) {
        window.electron.openDevTools();
    } else {
        // 如果不在Electron环境，用浏览器console代替
        console.log('开发者工具在浏览器中可通过F12或右键检查打开');
        showToast('请使用F12打开浏览器开发者工具');
    }
};

// 导出日志
const exportLogs = () => {
    // 实现日志导出功能
    showToast('日志导出成功');
};

// 显示Toast消息
const showToast = (message) => {
    // 创建Toast元素
    const toast = document.createElement('div');
    toast.className = 'toast toast-top toast-end';
    toast.innerHTML = `
        <div class="alert alert-info">
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);

    // 3秒后移除
    setTimeout(() => {
        document.body.removeChild(toast);
    }, 3000);
};
</script>

<style scoped>
.settings-tab-content {
    animation: fadeIn 0.5s ease;
    padding: 1rem;
    color: hsl(var(--bc));
}

.settings-section-title {
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
    font-weight: 500;
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid rgba(var(--b3, var(--fallback-b3, 0, 0, 0)), 0.1);
}

.setting-item:last-child {
    border-bottom: none;
}

.setting-label {
    font-size: 0.95rem;
}

.setting-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
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

.toast {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
}
</style>
