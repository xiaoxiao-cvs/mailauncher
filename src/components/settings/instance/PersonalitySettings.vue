<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">个性与身份设定</h3>

        <div class="card bg-base-100 shadow mb-4">
            <div class="card-body">
                <h3 class="card-title">人格核心设置</h3>
                <div class="setting-item vertical-item">
                    <span class="setting-label">核心人格描述</span>
                    <div class="setting-control full-width">
                        <textarea class="textarea textarea-bordered w-full" placeholder="用一句话或几句话描述人格的核心特点（建议20字以内）"
                            v-model="localConfig.personality.personality_core" rows="2" maxlength="100"></textarea>
                        <div class="text-xs opacity-60 text-right">
                            {{ localConfig.personality.personality_core.length }}/100
                        </div>
                    </div>
                    <p class="setting-description">简洁描述人格核心特点，建议不超过20字</p>
                </div>

                <div class="setting-item vertical-item">
                    <span class="setting-label">人格细节特征</span>
                    <div class="setting-control full-width">
                        <div class="personality-sides-list">
                            <div v-for="(side, index) in localConfig.personality.personality_sides" :key="index"
                                class="personality-side-item">
                                <div class="input-group w-full">
                                    <input type="text" class="input input-bordered flex-1"
                                        v-model="localConfig.personality.personality_sides[index]"
                                        placeholder="用一句话描述人格的一些细节">
                                    <button class="btn btn-error" @click="removePersonalitySide(index)">
                                        <i class="i-mdi-delete text-lg"></i>
                                    </button>
                                </div>
                            </div>
                            <button class="btn btn-primary mt-2" @click="addPersonalitySide">
                                <i class="i-mdi-plus text-lg mr-2"></i>添加人格特征
                            </button>
                        </div>
                    </div>
                    <p class="setting-description">可添加多条人格细节描述，该选项仍在调试中，可能未完全生效</p>
                </div>
            </div>
        </div>

        <div class="card bg-base-100 shadow mb-4">
            <div class="card-body">
                <h3 class="card-title">身份特征设置</h3>
                <div class="setting-item vertical-item">
                    <span class="setting-label">身份细节</span>
                    <div class="setting-control full-width">
                        <div class="identity-details-list">
                            <div v-for="(detail, index) in localConfig.identity.identity_detail" :key="index"
                                class="identity-detail-item">
                                <div class="input-group w-full">
                                    <input type="text" class="input input-bordered flex-1"
                                        v-model="localConfig.identity.identity_detail[index]" placeholder="填写身份特点">
                                    <button class="btn btn-error" @click="removeIdentityDetail(index)">
                                        <i class="i-mdi-delete text-lg"></i>
                                    </button>
                                </div>
                            </div>
                            <button class="btn btn-primary mt-2" @click="addIdentityDetail">
                                <i class="i-mdi-plus text-lg mr-2"></i>添加身份特点
                            </button>
                        </div>
                    </div>
                    <p class="setting-description">条数任意，不能为0，该选项仍在调试中</p>
                </div>

                <div class="setting-item">
                    <span class="setting-label">年龄</span>
                    <div class="setting-control">
                        <input type="number" class="input input-bordered w-24" min="1" max="100"
                            v-model.number="localConfig.identity.age" />
                    </div>
                </div>

                <div class="setting-item">
                    <span class="setting-label">性别</span>
                    <div class="setting-control">
                        <select class="select select-bordered" v-model="localConfig.identity.gender">
                            <option value="男">男</option>
                            <option value="女">女</option>
                            <option value="其他">其他</option>
                        </select>
                    </div>
                </div>

                <div class="setting-item vertical-item">
                    <span class="setting-label">外貌特征</span>
                    <div class="setting-control full-width">
                        <textarea class="textarea textarea-bordered w-full" rows="3"
                            v-model="localConfig.identity.appearance" placeholder="用几句话描述外貌特征"
                            maxlength="200"></textarea>
                        <div class="text-xs opacity-60 text-right">
                            {{ localConfig.identity.appearance.length }}/200
                        </div>
                    </div>
                    <p class="setting-description">该选项仍在调试中，暂时未生效</p>
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
    personality: {
        personality_core: props.config.personality?.personality_core || '友善、有趣、乐于助人',
        personality_sides: [...(props.config.personality?.personality_sides || [
            '喜欢研究新技术',
            '擅长解释复杂概念',
            '有时会开一些无伤大雅的玩笑',
            '非常有耐心',
            '好奇心旺盛'
        ])]
    },
    identity: {
        identity_detail: [...(props.config.identity?.identity_detail || ['技术爱好者', '喜欢帮助他人'])],
        age: props.config.identity?.age || 20,
        gender: props.config.identity?.gender || '男',
        appearance: props.config.identity?.appearance || '阳光开朗的科技爱好者形象'
    }
});

// 添加人格特征
const addPersonalitySide = () => {
    localConfig.personality.personality_sides.push('');
};

// 移除人格特征
const removePersonalitySide = (index) => {
    if (localConfig.personality.personality_sides.length > 1) {
        localConfig.personality.personality_sides.splice(index, 1);
    } else {
        // 至少保留一项
        localConfig.personality.personality_sides = [''];
    }
};

// 添加身份细节
const addIdentityDetail = () => {
    localConfig.identity.identity_detail.push('');
};

// 移除身份细节
const removeIdentityDetail = (index) => {
    if (localConfig.identity.identity_detail.length > 1) {
        localConfig.identity.identity_detail.splice(index, 1);
    } else {
        // 至少保留一项
        localConfig.identity.identity_detail = [''];
    }
};

// 监听配置变化
watch(localConfig, () => {
    emit('update:config', {
        ...props.config,
        personality: {
            ...localConfig.personality
        },
        identity: {
            ...localConfig.identity
        }
    });
}, { deep: true });
</script>

<style scoped>
.settings-tab-content {
    animation: fadeIn 0.5s ease;
    padding: 1rem;
}

.settings-section-title {
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
    font-weight: 500;
}

.vertical-item {
    flex-direction: column;
    align-items: flex-start;
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid rgba(var(--b3, var(--fallback-b3, 0, 0, 0)), 0.1);
}

.setting-item:last-child {
    border-bottom: none;
}

.setting-description {
    font-size: 0.75rem;
    opacity: 0.7;
    margin-top: 0.25rem;
}

.full-width {
    width: 100%;
}

.personality-sides-list,
.identity-details-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
}

.personality-side-item,
.identity-detail-item {
    display: flex;
    align-items: center;
    width: 100%;
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
