<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">其他与调试设置</h3>

        <el-card class="settings-card">
            <div class="card-header">
                <span>调试选项</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">启用详细日志</span>
                <div class="setting-control">
                    <el-switch v-model="localConfig.debug.enable_verbose_logging" />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">保存模型调用记录</span>
                <div class="setting-control">
                    <el-switch v-model="localConfig.debug.save_model_calls" />
                </div>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="card-header">
                <span>通用设置</span>
            </div>
            <div class="setting-item vertical-item">
                <span class="setting-label">自定义初始化脚本</span>
                <div class="setting-control full-width">
                    <el-input v-model="localConfig.other.init_script" type="textarea" :rows="3"
                        placeholder="可以在此填写实例启动时要执行的Python代码" maxlength="500" />
                </div>
                <p class="setting-description">此脚本将在机器人启动时执行，请确保代码安全</p>
            </div>

            <div class="setting-item">
                <span class="setting-label">API监听端口</span>
                <div class="setting-control">
                    <el-input-number v-model="localConfig.other.api_port" :min="1000" :max="65535" />
                </div>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="card-header">
                <span>高级操作</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">清除记忆数据库</span>
                <div class="setting-control">
                    <el-button type="danger" @click="confirmClearMemory">清除记忆</el-button>
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">导出配置</span>
                <div class="setting-control">
                    <el-button type="primary" @click="exportConfig">导出配置</el-button>
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">重置配置</span>
                <div class="setting-control">
                    <el-button type="warning" @click="confirmResetConfig">重置</el-button>
                </div>
            </div>
        </el-card>

        <div class="setting-description">
            <el-alert type="warning" :closable="false">
                <p>高级操作区域的功能可能会导致数据丢失，请谨慎使用</p>
                <p>特别是清除记忆功能会删除所有历史记忆数据，无法恢复</p>
            </el-alert>
        </div>
    </div>
</template>

<script setup>
import { reactive, watch } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';

const props = defineProps({
    config: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['update:config']);

// 创建本地配置副本
const localConfig = reactive({
    debug: {
        enable_verbose_logging: props.config.debug?.enable_verbose_logging ?? false,
        save_model_calls: props.config.debug?.save_model_calls ?? false,
    },
    other: {
        init_script: props.config.other?.init_script || '',
        api_port: props.config.other?.api_port || 8000,
    }
});

// 确认清除记忆
const confirmClearMemory = () => {
    ElMessageBox.confirm(
        '此操作将清除实例的所有记忆数据，这些数据将无法恢复。是否继续?',
        '警告',
        {
            confirmButtonText: '确认清除',
            cancelButtonText: '取消',
            type: 'warning',
        }
    ).then(() => {
        // 模拟清除记忆操作
        setTimeout(() => {
            ElMessage.success('记忆数据已清除');
        }, 1000);
    }).catch(() => {
        // 用户取消操作
    });
};

// 导出配置
const exportConfig = () => {
    try {
        const configData = JSON.stringify(props.config, null, 2);
        const blob = new Blob([configData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `config_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();

        URL.revokeObjectURL(url);
        document.body.removeChild(a);

        ElMessage.success('配置已导出');
    } catch (error) {
        console.error('导出配置失败:', error);
        ElMessage.error('导出配置失败');
    }
};

// 确认重置配置
const confirmResetConfig = () => {
    ElMessageBox.confirm(
        '此操作将重置所有配置为默认值，确定继续吗?',
        '警告',
        {
            confirmButtonText: '确认重置',
            cancelButtonText: '取消',
            type: 'warning',
        }
    ).then(() => {
        // 模拟重置操作
        setTimeout(() => {
            ElMessage.success('配置已重置为默认值');
        }, 1000);
    }).catch(() => {
        // 用户取消操作
    });
};

// 监听配置变化
watch(localConfig, () => {
    emit('update:config', {
        ...props.config,
        debug: {
            ...localConfig.debug
        },
        other: {
            ...localConfig.other
        }
    });
}, { deep: true });
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

.card-header {
    font-weight: 500;
    margin-bottom: 15px;
    color: var(--el-text-color-primary);
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

.vertical-item {
    flex-direction: column;
    align-items: flex-start;
}

.vertical-item .setting-control {
    margin-top: 10px;
}

.full-width {
    width: 100%;
}

p.setting-description {
    margin-top: 5px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.setting-description {
    margin-top: 20px;
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
