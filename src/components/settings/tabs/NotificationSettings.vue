<template>
    <div class="settings-tab-content">
        <h3 class="text-lg font-medium mb-4">通知设置</h3>

        <div class="card bg-base-100 shadow-xl mb-5">
            <div class="card-body p-4">
                <div class="setting-item">
                    <span class="setting-label">开启系统通知</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle toggle-primary" v-model="enableNotifications" />
                    </div>
                </div>

                <div class="divider my-1"></div>

                <div class="setting-item">
                    <span class="setting-label">通知声音</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle toggle-primary" v-model="notificationSound"
                            :disabled="!enableNotifications" />
                    </div>
                </div>

                <div class="divider my-1"></div>

                <div class="setting-item">
                    <span class="setting-label">错误通知</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle toggle-primary" v-model="errorNotifications"
                            :disabled="!enableNotifications" />
                    </div>
                </div>
            </div>
        </div>
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

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
}

.setting-label {
    font-size: 0.875rem;
}

@media (max-width: 768px) {
    .setting-item {
        flex-direction: column;
        align-items: flex-start;
    }

    .setting-control {
        margin-top: 0.5rem;
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
