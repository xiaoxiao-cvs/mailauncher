<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">其他与调试设置</h3>

        <div class="card bg-base-100 shadow mb-4">
            <div class="card-body">
                <h3 class="card-title text-base font-medium">调试选项</h3>
                <div class="setting-item">
                    <span class="setting-label">启用详细日志</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle toggle-primary"
                            v-model="localConfig.debug.enable_verbose_logging" />
                    </div>
                </div>

                <div class="setting-item">
                    <span class="setting-label">保存模型调用记录</span>
                    <div class="setting-control">
                        <input type="checkbox" class="toggle toggle-primary"
                            v-model="localConfig.debug.save_model_calls" />
                    </div>
                </div>
            </div>
        </div>

        <div class="card bg-base-100 shadow mb-4">
            <div class="card-body">
                <h3 class="card-title text-base font-medium">通用设置</h3>
                <div class="setting-item vertical-item">
                    <span class="setting-label">自定义初始化脚本</span>
                    <div class="setting-control full-width">
                        <textarea v-model="localConfig.other.init_script" class="textarea textarea-bordered w-full h-24"
                            placeholder="可以在此填写实例启动时要执行的Python代码" maxlength="500"></textarea>
                    </div>
                    <p class="setting-description">此脚本将在机器人启动时执行，请确保代码安全</p>
                </div>

                <div class="setting-item">
                    <span class="setting-label">API监听端口</span>
                    <div class="setting-control">
                        <input type="number" v-model="localConfig.other.api_port" class="input input-bordered w-24"
                            min="1000" max="65535" />
                    </div>
                </div>
            </div>
        </div>

        <div class="card bg-base-100 shadow mb-4">
            <div class="card-body">
                <h3 class="card-title text-base font-medium">高级操作</h3>
                <div class="setting-item">
                    <span class="setting-label">清除记忆数据库</span>
                    <div class="setting-control">
                        <button class="btn btn-error btn-sm" @click="confirmClearMemory">清除记忆</button>
                    </div>
                </div>

                <div class="setting-item">
                    <span class="setting-label">导出配置</span>
                    <div class="setting-control">
                        <button class="btn btn-primary btn-sm" @click="exportConfig">导出配置</button>
                    </div>
                </div>

                <div class="setting-item">
                    <span class="setting-label">重置配置</span>
                    <div class="setting-control">
                        <button class="btn btn-warning btn-sm" @click="confirmResetConfig">重置</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="setting-description">
            <div class="alert alert-warning">
                <div>
                    <i class="icon icon-warning"></i>
                    <p>高级操作区域的功能可能会导致数据丢失，请谨慎使用</p>
                    <p>特别是清除记忆功能会删除所有历史记忆数据，无法恢复</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { reactive, watch } from 'vue';

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
    if (window.confirm('此操作将清除实例的所有记忆数据，这些数据将无法恢复。是否继续?')) {
        // 模拟清除记忆操作
        setTimeout(() => {
            showToast('记忆数据已清除', 'success');
        }, 1000);
    }
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

        showToast('配置已导出', 'success');
    } catch (error) {
        console.error('导出配置失败:', error);
        showToast('导出配置失败', 'error');
    }
};

// 确认重置配置
const confirmResetConfig = () => {
    if (window.confirm('此操作将重置所有配置为默认值，确定继续吗?')) {
        // 模拟重置操作
        setTimeout(() => {
            showToast('配置已重置为默认值', 'success');
        }, 1000);
    }
};

// 显示提醒消息，使用DaisyUI Toast组件
const showToast = (message, type = 'info') => {
    // 创建一个toast元素
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
    font-weight: 500;
    font-size: 1.2rem;
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--bc, currentColor);
    border-opacity: 0.2;
}

.setting-item:last-child {
    border-bottom: none;
}

.setting-label {
    font-size: 0.875rem;
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
    margin-top: 0.5rem;
}

.full-width {
    width: 100%;
}

p.setting-description {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    opacity: 0.7;
}

.setting-description {
    margin-top: 1rem;
}

/* Toast动画 */
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
