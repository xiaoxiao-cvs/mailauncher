<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">隐私设置</h3>

        <el-card class="settings-card">
            <div class="setting-item">
                <span class="setting-label">启用匿名数据收集</span>
                <div class="setting-control">
                    <el-switch v-model="collectAnonymousData" />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">自动发送错误报告</span>
                <div class="setting-control">
                    <el-switch v-model="autoSendErrorReports" />
                </div>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="setting-item">
                <span class="setting-label">清除所有本地数据</span>
                <div class="setting-control">
                    <el-button type="danger" @click="confirmClearData">清除数据</el-button>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';

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
    ElMessageBox.confirm(
        '确定要清除所有本地存储的数据吗？此操作不可撤销！',
        '清除数据',
        {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }
    ).then(() => {
        // 清除所有与用户数据相关的本地存储
        // 这里仅作示例，实际应用中可能需要更精细的控制
        localStorage.clear();

        ElMessage.success('所有本地数据已清除，应用将在3秒后重启');

        setTimeout(() => {
            window.location.reload();
        }, 3000);
    }).catch(() => { });
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
