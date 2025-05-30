<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">系统设置</h3>

        <div class="card bg-base-100 shadow">
            <div class="card-body">
                <div class="setting-item">
                    <span class="setting-label">自动检查更新</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle toggle-primary" v-model="autoCheckUpdates" />
                    </div>
                </div>

                <div class="setting-item">
                    <span class="setting-label">启动时自动运行</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle toggle-primary" v-model="autoStart" />
                    </div>
                </div>

                <div class="setting-item">
                    <span class="setting-label">显示系统托盘图标</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle toggle-primary" v-model="showTrayIcon" />
                    </div>
                </div>
            </div>
        </div>

        <div class="card bg-base-100 shadow mt-4">
            <div class="card-body">
                <div class="setting-item">
                    <span class="setting-label">性能监控频率</span>
                    <div class="setting-control">
                        <select class="select select-bordered w-full max-w-xs" v-model="monitorFrequency">
                            <option value="high">高 (每5秒)</option>
                            <option value="medium">中 (每15秒)</option>
                            <option value="low">低 (每30秒)</option>
                            <option value="disabled">禁用</option>
                        </select>
                    </div>
                </div>

                <div class="setting-item">
                    <span class="setting-label">日志记录级别</span>
                    <div class="setting-control">
                        <select class="select select-bordered w-full max-w-xs" v-model="logLevel">
                            <option value="debug">调试</option>
                            <option value="info">信息</option>
                            <option value="warning">警告</option>
                            <option value="error">错误</option>
                            <option value="critical">严重</option>
                        </select>
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
const monitorFrequency = ref('medium');
const logLevel = ref('info');

// 加载设置
onMounted(() => {
    // 这里可以从localStorage或API加载设置
    const savedSettings = localStorage.getItem('systemSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        autoCheckUpdates.value = settings.autoCheckUpdates ?? true;
        autoStart.value = settings.autoStart ?? false;
        showTrayIcon.value = settings.showTrayIcon ?? true;
        monitorFrequency.value = settings.monitorFrequency ?? 'medium';
        logLevel.value = settings.logLevel ?? 'info';
    }
});

// 保存设置变更
watch([autoCheckUpdates, autoStart, showTrayIcon, monitorFrequency, logLevel], () => {
    const settings = {
        autoCheckUpdates: autoCheckUpdates.value,
        autoStart: autoStart.value,
        showTrayIcon: showTrayIcon.value,
        monitorFrequency: monitorFrequency.value,
        logLevel: logLevel.value
    };
    localStorage.setItem('systemSettings', JSON.stringify(settings));
}, { deep: true });
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
    border-bottom: 1px solid hsl(var(--b3));
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
</style>
