<template>
  <div class="maibot-resource-manager" :data-theme="currentTheme">
    <!-- 标题栏 -->
    <div class="resource-header">
      <div class="flex items-center gap-3">
        <button class="btn btn-sm btn-ghost" @click="$emit('close')" title="返回">
          <Icon icon="mdi:arrow-left" width="18" height="18" />
        </button>
        <Icon icon="mdi:database" class="text-primary" width="24" height="24" />
        <h2 class="text-xl font-bold">MaiBot 资源管理</h2>
      </div>
      <div class="resource-info">
        <span class="text-sm text-base-content/70">实例: {{ instanceName }}</span>
      </div>
    </div>

    <!-- 资源总览 -->
    <div class="resource-overview">
      <div class="stats shadow">
        <div class="stat">
          <div class="stat-figure text-primary">
            <Icon icon="mdi:emoticon-happy" width="32" height="32" />
          </div>
          <div class="stat-title">表情包总数</div>
          <div class="stat-value text-primary">{{ emojiStats.total || 0 }}</div>
          <div class="stat-desc">{{ emojiStats.registered || 0 }} 已注册</div>
        </div>

        <div class="stat">
          <div class="stat-figure text-secondary">
            <Icon icon="mdi:account-group" width="32" height="32" />
          </div>
          <div class="stat-title">用户信息</div>
          <div class="stat-value text-secondary">{{ personStats.total || 0 }}</div>
          <div class="stat-desc">{{ personStats.active || 0 }} 活跃用户</div>
        </div>

        <div class="stat">
          <div class="stat-figure text-accent">
            <Icon icon="mdi:database" width="32" height="32" />
          </div>
          <div class="stat-title">数据库状态</div>
          <div class="stat-value text-accent">{{ dbInfo.status }}</div>
          <div class="stat-desc">{{ formatFileSize(dbInfo.size || 0) }}</div>
        </div>
      </div>
    </div>

    <!-- 功能标签页 -->
    <div class="resource-tabs">
      <div class="tabs tabs-boxed">
        <a 
          class="tab" 
          :class="{ 'tab-active': activeTab === 'emoji' }" 
          @click="setActiveTab('emoji')"
        >
          <Icon icon="mdi:emoticon" width="16" height="16" class="mr-2" />
          表情包管理
        </a>
        <a 
          class="tab" 
          :class="{ 'tab-active': activeTab === 'person' }" 
          @click="setActiveTab('person')"
        >
          <Icon icon="mdi:account" width="16" height="16" class="mr-2" />
          用户信息
        </a>
        <a 
          class="tab" 
          :class="{ 'tab-active': activeTab === 'tools' }" 
          @click="setActiveTab('tools')"
        >
          <Icon icon="mdi:tools" width="16" height="16" class="mr-2" />
          管理工具
        </a>
      </div>
    </div>

    <!-- 标签页内容 -->
    <div class="resource-content">
      <!-- 表情包管理 -->
      <div v-if="activeTab === 'emoji'" class="emoji-management">
        <EmojiManagement 
          :instance-id="instanceId" 
          :instance-name="instanceName"
          @stats-updated="updateEmojiStats"
        />
      </div>

      <!-- 用户信息管理 -->
      <div v-if="activeTab === 'person'" class="person-management">
        <PersonManagement 
          :instance-id="instanceId" 
          :instance-name="instanceName"
          @stats-updated="updatePersonStats"
        />
      </div>

      <!-- 管理工具 -->
      <div v-if="activeTab === 'tools'" class="management-tools">
        <ManagementTools 
          :instance-id="instanceId" 
          :instance-name="instanceName"
          :db-info="dbInfo"
          @refresh-stats="loadResourceStats"
        />
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading loading-spinner loading-lg text-primary"></div>
      <p class="mt-4">加载资源信息中...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import { Icon } from '@iconify/vue';
import EmojiManagement from './EmojiManagement.vue';
import PersonManagement from './PersonManagement.vue';
import ManagementTools from './ManagementTools.vue';
import { maibotResourceApi } from '@/services/maibotResourceApi.js';
import toastService from '@/services/toastService.js';

// Props
const props = defineProps({
  instanceId: {
    type: String,
    required: true
  },
  instanceName: {
    type: String,
    required: true
  }
});

// Emits
const emit = defineEmits(['close']);

// 响应式数据
const loading = ref(true);
const activeTab = ref('emoji');
const emojiStats = ref({
  total: 0,
  registered: 0,
  banned: 0
});
const personStats = ref({
  total: 0,
  active: 0,
  platforms: 0
});
const dbInfo = ref({
  status: '未知',
  size: 0,
  path: '',
  exists: false,
  valid: false
});

// 注入主题
const currentTheme = computed(() => {
  return inject('currentTheme', ref('light')).value;
});

// 方法
const setActiveTab = (tab) => {
  activeTab.value = tab;
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const updateEmojiStats = (stats) => {
  emojiStats.value = { ...emojiStats.value, ...stats };
};

const updatePersonStats = (stats) => {
  personStats.value = { ...personStats.value, ...stats };
};

const loadResourceStats = async () => {
  try {
    loading.value = true;

    // 获取实例资源信息
    const resourceInfo = await maibotResourceApi.resource.getInstanceInfo(props.instanceId);
    if (resourceInfo.status === 'success' && resourceInfo.data) {
      const { database } = resourceInfo.data;
      dbInfo.value = {
        status: database?.valid ? '正常' : (database?.exists ? '异常' : '不存在'),
        size: database?.size || 0,
        path: database?.path || '',
        exists: database?.exists || false,
        valid: database?.valid || false
      };
    }

    // 获取表情包统计
    try {
      const emojiCount = await maibotResourceApi.emoji.getCount(props.instanceId);
      if (emojiCount.status === 'success' && emojiCount.data) {
        emojiStats.value.total = emojiCount.data.total_count || 0;
      }

      // 获取已注册表情包数量
      const registeredEmoji = await maibotResourceApi.emoji.getCount(props.instanceId, {
        is_registered: 1
      });
      if (registeredEmoji.status === 'success' && registeredEmoji.data) {
        emojiStats.value.registered = registeredEmoji.data.total_count || 0;
      }
    } catch (error) {
      console.warn('获取表情包统计失败:', error);
    }

    // 获取用户信息统计
    try {
      const personCount = await maibotResourceApi.person.getCount(props.instanceId);
      if (personCount.status === 'success' && personCount.data) {
        personStats.value.total = personCount.data.total_count || 0;
      }
    } catch (error) {
      console.warn('获取用户信息统计失败:', error);
    }

  } catch (error) {
    console.error('加载资源统计失败:', error);
    toastService.show('加载资源信息失败', { type: 'error' });
  } finally {
    loading.value = false;
  }
};

// 生命周期
onMounted(() => {
  loadResourceStats();
});
</script>

<style scoped>
.maibot-resource-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: hsl(var(--b1));
}

.resource-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid hsl(var(--b3));
  background-color: hsl(var(--b2));
}

.resource-overview {
  padding: 1rem;
}

.resource-tabs {
  padding-left: 1rem;
  padding-right: 1rem;
  padding-bottom: 1rem;
}

.resource-content {
  flex: 1;
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background-color: hsl(var(--b1) / 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
</style>
