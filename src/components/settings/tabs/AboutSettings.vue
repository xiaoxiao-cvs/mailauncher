<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">关于</h3>

        <div class="card bg-base-100 shadow about-card">
            <div class="card-body">
                <div class="app-info">
                    <img src="/assets/icon.ico" alt="App Logo" class="app-logo">
                    <div class="app-details">
                        <h2>MaiLauncher</h2>
                        <p class="app-version">版本: 0.1.0-preview.1</p>
                        <p class="app-description">MaiBot 启动器</p>
                    </div>
                </div>

                <div class="action-buttons">
                    <button class="btn btn-primary" @click="checkForUpdates" :class="{ 'loading': checkingUpdates }">
                        检查更新
                    </button>
                    <button class="btn btn-info" @click="openGitHub">
                        GitHub
                    </button>
                    <button class="btn btn-secondary" @click="openDocs">
                        文档
                    </button>
                </div>
            </div>
        </div>

        <div class="card bg-base-100 shadow mt-4">
            <div class="card-body">
                <div class="credits-section">
                    <h4>开发团队</h4>
                    <p>Developed by Team Mai.To.The.Gate</p>
                </div>

                <div class="divider"></div>

                <div class="license-section">
                    <h4>许可证</h4>
                    <p>MIT License</p>
                    <p class="text-sm opacity-75">Copyright (c) 2025 Team Mai.To.The.Gate</p>
                </div>

                <div class="divider"></div>

                <div class="third-party-section">
                    <h4>第三方组件</h4>
                    <ul>
                        <li>Vue.js</li>
                        <li>DaisyUI</li>
                        <li>Tailwind CSS</li>
                        <li>Iconify</li>
                    </ul>
                </div>

                <div class="divider"></div>

                <div class="version-info">
                    <h4>版本信息</h4>
                    <p>当前版本: {{ appVersion }}</p>
                    <p>构建日期: {{ buildDate }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, inject } from 'vue';

// 注入toast服务
const toast = inject('toast');

// 更新检查状态
const checkingUpdates = ref(false);

// 版本信息
const appVersion = ref('1.1.4');
const buildDate = ref('2023-12-01');

// 检查更新
const checkForUpdates = async () => {
    checkingUpdates.value = true;

    try {
        // 模拟检查更新
        await new Promise(resolve => setTimeout(resolve, 2000));

        toast.info('当前已是最新版本');
    } catch (error) {
        toast.error('检查更新失败');
    } finally {
        checkingUpdates.value = false;
    }
};

// 打开GitHub
const openGitHub = () => {
    window.open('https://github.com/MaiM-with-u/MaiBot', '_blank');
};

// 打开文档
const openDocs = () => {
    window.open('https://maibot.docs', '_blank');
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

.app-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.app-logo {
    width: 64px;
    height: 64px;
    border-radius: 12px;
}

.app-details h2 {
    font-size: 1.8rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
}

.app-version {
    font-size: 1rem;
    opacity: 0.8;
    margin-bottom: 0.25rem;
}

.app-description {
    font-size: 0.9rem;
    opacity: 0.7;
}

.action-buttons {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
}

.credits-section,
.license-section,
.third-party-section,
.version-info {
    margin-bottom: 1rem;
}

.credits-section h4,
.license-section h4,
.third-party-section h4,
.version-info h4 {
    font-size: 1.1rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
}

.third-party-section ul {
    list-style-type: disc;
    padding-left: 1.5rem;
}

.third-party-section li {
    margin-bottom: 0.25rem;
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
