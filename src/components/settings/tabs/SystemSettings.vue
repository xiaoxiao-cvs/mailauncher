<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">系统设置</h3>

        <div class="card bg-base-100 shadow">
            <div class="card-body">
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
            </div>
        </div>

        <div class="card bg-base-100 shadow">
            <div class="card-body">
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
            </div>
        </div>

        <div class="card bg-base-100 shadow">
            <div class="card-body">
                <div class="setting-item">
                    <span class="setting-label">重置所有设置</span>
                    <div class="setting-control">
                        <button class="btn btn-error btn-sm" @click="confirmResetSettings">重置</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

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
    if (savedMonitorInterval !== null) {
        monitorInterval.value = parseInt(savedMonitorInterval);
    }

    const savedLogLevel = localStorage.getItem('logLevel');
    if (savedLogLevel) {
        logLevel.value = savedLogLevel;
    }
});

// 监听设置变化并保存
watch([autoCheckUpdates, autoStart, showTrayIcon, monitorInterval, logLevel], () => {
    localStorage.setItem('autoStart', autoStart.value.toString());
    localStorage.setItem('showTrayIcon', showTrayIcon.value.toString());
    localStorage.setItem('monitorInterval', monitorInterval.value.toString());
    localStorage.setItem('logLevel', logLevel.value);
});

// 重置所有设置
const confirmResetSettings = () => {
    // 使用原生确认对话框
    if (window.confirm('确定要重置所有设置吗？此操作不可撤销。')) {
        resetAllSettings();
    }
};

// 重置所有设置的具体实现
const resetAllSettings = () => {
    // 重置所有本地存储的设置项
    localStorage.removeItem('autoCheckUpdates');
    localStorage.removeItem('autoStart');
    localStorage.removeItem('showTrayIcon');
    localStorage.removeItem('monitorInterval');
    localStorage.removeItem('logLevel');
    localStorage.removeItem('darkMode');
    localStorage.removeItem('theme'); // 修改这里，使用theme替代themeColor
    localStorage.removeItem('animationsEnabled');
    localStorage.removeItem('sidebarCollapsed');
    localStorage.removeItem('dashboard-layout');

    // 重置设置状态变量
    autoCheckUpdates.value = true;
    autoStart.value = false;
    showTrayIcon.value = true;
    monitorInterval.value = 5000;
    logLevel.value = 'info';

    // 显示成功通知
    showToast('所有设置已重置为默认值');

    // 刷新页面以应用所有设置
    setTimeout(() => {
        window.location.reload();
    }, 1500);
};

// 使用DaisyUI的Toast组件
const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fixed top-4 right-4 z-50`;
    toast.innerHTML = `
        <div class="alert ${type === 'success' ? 'alert-success' : type === 'error' ? 'alert-error' : 'alert-info'}">
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);

    // 3秒后移除
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
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

.card {
    margin-bottom: 20px;
    border-radius: 8px;
    overflow: hidden;
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
}

.setting-label {
    font-size: 0.9rem;
    color: var(--color-text-primary);
}

.setting-control {
    display: flex;
    align-items: center;
}

/* 简单的toast动画 */
.toast {
    transition: opacity 0.3s;
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
