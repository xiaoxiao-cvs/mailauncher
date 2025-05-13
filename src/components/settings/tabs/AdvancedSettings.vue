<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">高级设置</h3>

        <el-card class="settings-card">
            <div class="setting-item">
                <span class="setting-label">开发者模式</span>
                <div class="setting-control">
                    <el-switch v-model="developerMode" />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">API端点</span>
                <div class="setting-control">
                    <el-input v-model="apiEndpoint" placeholder="API地址" :disabled="!developerMode" />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">使用模拟数据</span>
                <div class="setting-control">
                    <el-switch v-model="useMockData" :disabled="!developerMode" />
                </div>
            </div>
        </el-card>

        <el-card class="settings-card" v-if="developerMode">
            <div class="setting-item">
                <span class="setting-label">打开开发工具</span>
                <div class="setting-control">
                    <el-button type="warning" @click="openDevTools">打开开发工具</el-button>
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">导出日志</span>
                <div class="setting-control">
                    <el-button type="primary" @click="exportLogs">导出日志</el-button>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';

// 设置状态
const developerMode = ref(false);
const apiEndpoint = ref('http://localhost:8080');
const useMockData = ref(true);

// 加载设置
onMounted(() => {
    const savedDevMode = localStorage.getItem('developerMode');
    if (savedDevMode !== null) {
        developerMode.value = savedDevMode === 'true';
    }

    const savedEndpoint = localStorage.getItem('apiEndpoint');
    if (savedEndpoint) {
        apiEndpoint.value = savedEndpoint;
    }

    const savedMockData = localStorage.getItem('useMockData');
    if (savedMockData !== null) {
        useMockData.value = savedMockData === 'true';
    }
});

// 监听设置变化
watch(developerMode, (newValue) => {
    localStorage.setItem('developerMode', newValue);
});

watch(apiEndpoint, (newValue) => {
    localStorage.setItem('apiEndpoint', newValue);
});

watch(useMockData, (newValue) => {
    localStorage.setItem('useMockData', newValue);
    window._useMockData = newValue;
});

// 打开开发工具
const openDevTools = () => {
    // 模拟打开开发者工具的操作
    if (window.electronAPI && window.electronAPI.openDevTools) {
        window.electronAPI.openDevTools();
        ElMessage.success('开发者工具已打开');
    } else {
        ElMessage.warning('开发者工具在Web环境中不可用');
        window.open('about:blank', '_blank');
    }
};

// 导出日志
const exportLogs = () => {
    // 模拟导出日志的操作
    ElMessage.success('日志导出功能模拟成功');
};
</script>

<style scoped>
.settings-tab-content {
    animation: fadeIn 0.5s ease;
}

.settings-section-title {
    margin-bottom: 20px;
    color: var(--el-text-color-primary);
    font-weight: 500;
}

.settings-card {
    margin-bottom: 20px;
    border-radius: 8px;
    overflow: hidden;
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.setting-item:last-child {
    border-bottom: none;
}

.setting-label {
    font-size: 14px;
    color: var(--el-text-color-primary);
}

.setting-control {
    display: flex;
    align-items: center;
}

.setting-control .el-input {
    width: 250px;
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

    .setting-control .el-input {
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
