<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">关于</h3>

        <el-card class="settings-card about-card">
            <div class="app-info">
                <img src="/assets/icon.ico" alt="App Logo" class="app-logo">
                <div class="app-details">
                    <h2>X² Launcher</h2>
                    <p class="app-version">版本: 0.1.1</p>
                    <p class="app-description">MaiBot 管理器</p>
                </div>
            </div>

            <div class="action-buttons">
                <el-button type="primary" @click="checkForUpdates" :loading="checkingUpdates">
                    检查更新
                </el-button>
                <el-button type="info" @click="openGitHub">
                    GitHub
                </el-button>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="credits-section">
                <h4>开发团队</h4>
                <p>Developed by Team X²</p>
                <h4>致谢</h4>
                <p>感谢所有为此项目做出贡献的开发者们</p>
                <h4>许可协议</h4>
                <p>开源许可: GPL V3 License</p>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';

const checkingUpdates = ref(false);

// 检查更新
const checkForUpdates = async () => {
    checkingUpdates.value = true;

    try {
        // 模拟检查更新的过程
        await new Promise(resolve => setTimeout(resolve, 1500));

        ElMessage.success('您的应用已是最新版本');
    } catch (error) {
        ElMessage.error('检查更新时出错');
        console.error('检查更新失败:', error);
    } finally {
        checkingUpdates.value = false;
    }
};

// 打开GitHub页面
const openGitHub = () => {
    window.open('https://github.com/MaiM-with-u/MaiBot', '_blank');
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

.about-card {
    padding: 20px;
}

.app-info {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
}

.app-logo {
    width: 64px;
    height: 64px;
    margin-right: 20px;
}

.app-details h2 {
    margin: 0 0 8px 0;
    font-weight: 500;
}

.app-version {
    color: var(--el-text-color-secondary);
    margin: 0 0 5px 0;
}

.app-description {
    color: var(--el-text-color-regular);
    margin: 0;
}

.action-buttons {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}

.credits-section {
    padding: 10px 0;
}

.credits-section h4 {
    margin: 15px 0 5px 0;
    font-weight: 500;
    color: var(--el-text-color-primary);
}

.credits-section p {
    margin: 0 0 10px 0;
    color: var(--el-text-color-regular);
}

@media (max-width: 768px) {
    .app-info {
        flex-direction: column;
        text-align: center;
    }

    .app-logo {
        margin-right: 0;
        margin-bottom: 15px;
    }

    .action-buttons {
        flex-direction: column;
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
