<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">系统设置</h3>

        <el-card class="settings-card">
            <div class="setting-item">
                <span class="setting-label">自动检查更新</span>
                <div class="setting-control">
                    <el-switch v-model="autoCheckUpdates" />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">启动时自动运行</span>
                <div class="setting-control">
                    <el-switch v-model="autoStart" />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">显示系统托盘图标</span>
                <div class="setting-control">
                    <el-switch v-model="showTrayIcon" />
                </div>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="setting-item">
                <span class="setting-label">性能监控频率</span>
                <div class="setting-control">
                    <el-select v-model="monitorInterval" placeholder="选择更新频率" style="width: 150px">
                        <el-option label="1秒" :value="1000" />
                        <el-option label="5秒" :value="5000" />
                        <el-option label="10秒" :value="10000" />
                        <el-option label="30秒" :value="30000" />
                    </el-select>
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">日志级别</span>
                <div class="setting-control">
                    <el-select v-model="logLevel" placeholder="选择日志级别" style="width: 150px">
                        <el-option label="调试" value="debug" />
                        <el-option label="信息" value="info" />
                        <el-option label="警告" value="warn" />
                        <el-option label="错误" value="error" />
                    </el-select>
                </div>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="setting-item">
                <span class="setting-label">重置所有设置</span>
                <div class="setting-control">
                    <el-button type="danger" @click="confirmResetSettings">重置</el-button>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';

// 设置状态
const autoCheckUpdates = ref(true);
const autoStart = ref(false);
const showTrayIcon = ref(true);
const monitorInterval = ref(5000);
const logLevel = ref('info');

// 加载设置
onMounted(() => {
    // 从本地存储加载设置
    const savedAutoCheck = localStorage.getItem('autoCheckUpdates');
    if (savedAutoCheck !== null) {
        autoCheckUpdates.value = savedAutoCheck === 'true';
    }

    const savedAutoStart = localStorage.getItem('autoStart');
    if (savedAutoStart !== null) {
        autoStart.value = savedAutoStart === 'true';
    }

    const savedShowTrayIcon = localStorage.getItem('showTrayIcon');
    if (savedShowTrayIcon !== null) {
        showTrayIcon.value = savedShowTrayIcon === 'true';
    }

    const savedMonitorInterval = localStorage.getItem('monitorInterval');
    if (savedMonitorInterval) {
        monitorInterval.value = parseInt(savedMonitorInterval);
    }

    const savedLogLevel = localStorage.getItem('logLevel');
    if (savedLogLevel) {
        logLevel.value = savedLogLevel;
    }
});

// 监听设置变化
watch(autoCheckUpdates, (newValue) => {
    localStorage.setItem('autoCheckUpdates', newValue);
});

watch(autoStart, (newValue) => {
    localStorage.setItem('autoStart', newValue);
});

watch(showTrayIcon, (newValue) => {
    localStorage.setItem('showTrayIcon', newValue);
});

watch(monitorInterval, (newValue) => {
    localStorage.setItem('monitorInterval', newValue);
    ElMessage.success(`性能监控频率已设置为${newValue / 1000}秒`);
});

watch(logLevel, (newValue) => {
    localStorage.setItem('logLevel', newValue);
});

// 重置所有设置
const confirmResetSettings = () => {
    ElMessageBox.confirm(
        '确定要重置所有设置吗？此操作不可撤销！',
        '重置设置',
        {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }
    ).then(() => {
        // 清除所有本地存储的设置
        localStorage.removeItem('autoCheckUpdates');
        localStorage.removeItem('autoStart');
        localStorage.removeItem('showTrayIcon');
        localStorage.removeItem('monitorInterval');
        localStorage.removeItem('logLevel');
        localStorage.removeItem('density');
        localStorage.removeItem('enableAnimations');
        localStorage.removeItem('themeColor');
        localStorage.removeItem('fontSize');
        localStorage.removeItem('sidebarPosition');

        // 提示用户
        ElMessage.success('所有设置已重置，将在下次启动时生效');

        // 延迟后刷新页面
        setTimeout(() => {
            window.location.reload();
        }, 1500);
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

/* 响应式调整 */
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
