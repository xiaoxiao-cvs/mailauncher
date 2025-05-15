<template>
    <div class="settings-tab-content">
        <h3 class="settings-section-title">个性与身份设定</h3>

        <el-card class="settings-card">
            <div class="card-header">
                <span>人格核心设置</span>
            </div>
            <div class="setting-item vertical-item">
                <span class="setting-label">核心人格描述</span>
                <div class="setting-control full-width">
                    <el-input v-model="localConfig.personality.personality_core" type="textarea" :rows="2"
                        placeholder="用一句话或几句话描述人格的核心特点（建议20字以内）" maxlength="100" show-word-limit />
                </div>
                <p class="setting-description">简洁描述人格核心特点，建议不超过20字</p>
            </div>

            <div class="setting-item vertical-item">
                <span class="setting-label">人格细节特征</span>
                <div class="setting-control full-width">
                    <div class="personality-sides-list">
                        <div v-for="(side, index) in localConfig.personality.personality_sides" :key="index"
                            class="personality-side-item">
                            <el-input v-model="localConfig.personality.personality_sides[index]"
                                placeholder="用一句话描述人格的一些细节">
                                <template #append>
                                    <el-button @click="removePersonalitySide(index)" type="danger" :icon="Delete" />
                                </template>
                            </el-input>
                        </div>
                        <el-button type="primary" @click="addPersonalitySide" :icon="Plus">添加人格特征</el-button>
                    </div>
                </div>
                <p class="setting-description">可添加多条人格细节描述，该选项仍在调试中，可能未完全生效</p>
            </div>
        </el-card>

        <el-card class="settings-card">
            <div class="card-header">
                <span>身份特征设置</span>
            </div>
            <div class="setting-item vertical-item">
                <span class="setting-label">身份细节</span>
                <div class="setting-control full-width">
                    <div class="identity-details-list">
                        <div v-for="(detail, index) in localConfig.identity.identity_detail" :key="index"
                            class="identity-detail-item">
                            <el-input v-model="localConfig.identity.identity_detail[index]" placeholder="填写身份特点">
                                <template #append>
                                    <el-button @click="removeIdentityDetail(index)" type="danger" :icon="Delete" />
                                </template>
                            </el-input>
                        </div>
                        <el-button type="primary" @click="addIdentityDetail" :icon="Plus">添加身份特点</el-button>
                    </div>
                </div>
                <p class="setting-description">条数任意，不能为0，该选项仍在调试中</p>
            </div>

            <div class="setting-item">
                <span class="setting-label">年龄</span>
                <div class="setting-control">
                    <el-input-number v-model="localConfig.identity.age" :min="1" :max="100" />
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">性别</span>
                <div class="setting-control">
                    <el-select v-model="localConfig.identity.gender" placeholder="选择性别">
                        <el-option label="男" value="男" />
                        <el-option label="女" value="女" />
                        <el-option label="其他" value="其他" />
                    </el-select>
                </div>
            </div>

            <div class="setting-item vertical-item">
                <span class="setting-label">外貌特征</span>
                <div class="setting-control full-width">
                    <el-input v-model="localConfig.identity.appearance" type="textarea" :rows="3"
                        placeholder="用几句话描述外貌特征" maxlength="200" show-word-limit />
                </div>
                <p class="setting-description">该选项仍在调试中，暂时未生效</p>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { reactive, watch } from 'vue';
import { Delete, Plus } from '@element-plus/icons-vue';

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
}

.settings-section-title {
    margin-bottom: 20px;
    color: var(--el-text-color-primary);
    font-weight: 500;
}

.vertical-item {
    flex-direction: column;
    align-items: flex-start;
}

.setting-description {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 4px;
}

.full-width {
    width: 100%;
}

.personality-sides-list,
.identity-details-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
}

.personality-side-item,
.identity-detail-item {
    display: flex;
    align-items: center;
    width: 100%;
}
</style>
