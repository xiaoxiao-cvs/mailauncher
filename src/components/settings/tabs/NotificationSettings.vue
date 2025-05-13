<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">通知设置</h3>

        <el-card class="settings-card">
            <div class="setting-item">
                <span class="setting-label">开启系统通知</span>
                <div class="setting-control">
                    <el-switch v-model="enableNotifications" />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">通知声音</span>
                <div class="setting-control">
                    <el-switch v-model="notificationSound" :disabled="!enableNotifications" />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">错误通知</span>
                <div class="setting-control">
                    <el-switch v-model="errorNotifications" :disabled="!enableNotifications" />
                </div>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

// 设置状态
const enableNotifications = ref(true);
const notificationSound = ref(true);
const errorNotifications = ref(true);

// 加载设置
onMounted(() => {
    const savedNotifications = localStorage.getItem('enableNotifications');
    if (savedNotifications !== null) {
        enableNotifications.value = savedNotifications === 'true';
    }

    const savedSound = localStorage.getItem('notificationSound');
    if (savedSound !== null) {
        notificationSound.value = savedSound === 'true';
    }

    const savedErrorNotifications = localStorage.getItem('errorNotifications');
    if (savedErrorNotifications !== null) {
        errorNotifications.value = savedErrorNotifications === 'true';
    }
});

// 监听设置变化
watch(enableNotifications, (newValue) => {
    localStorage.setItem('enableNotifications', newValue);
});

watch(notificationSound, (newValue) => {
    localStorage.setItem('notificationSound', newValue);
});

watch(errorNotifications, (newValue) => {
    localStorage.setItem('errorNotifications', newValue);
});
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
