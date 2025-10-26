<template>
  <div v-if="isOpen" class="resource-manager-backdrop" @click.self="handleBackdropClick">
    <div class="resource-manager-container">
      <!-- 头部 -->
      <div class="resource-header">
        <h2 class="resource-title">MaiBot 资源管理</h2>
        <button class="btn btn-ghost btn-sm btn-circle" @click="closeManager" title="关闭">
          <Icon icon="mdi:close" width="20" height="20" />
        </button>
      </div>

      <!-- 实例信息栏 -->
      <div class="instance-info-bar">        <div class="flex items-center gap-3">
          <Icon icon="mdi:database" class="text-primary" width="20" height="20" />
          <div>
            <h3 class="font-semibold text-base-content">{{ instanceName }}</h3>
            <p class="text-sm text-base-content/70">实例ID: {{ instanceId }}</p>
          </div>
        </div>
        <div class="instance-status">
          <span :class="['status-badge', dbInfo.valid ? 'status-connected' : 'status-error']">
            <Icon :icon="dbInfo.valid ? 'mdi:check-circle' : 'mdi:alert-circle'" width="16" height="16" />
            {{ dbInfo.valid ? '数据库正常' : '数据库异常' }}
          </span>
        </div>
      </div>

      <!-- 主体内容 -->
      <div class="resource-content">
        <!-- 侧边栏导航 -->
        <div class="resource-sidebar">
          <nav class="resource-nav">            <button v-for="tab in resourceTabs" :key="tab.key" :class="[
              'nav-item',
              { active: activeTab === tab.key }
            ]" @click="switchTab(tab.key)">
              <Icon :icon="tab.icon" class="nav-icon" width="16" height="16" />
              <span class="nav-label">{{ tab.title }}</span>
            </button>
          </nav>
        </div>

        <!-- 主内容区 -->
        <div class="resource-main">          <!-- 资源面板切换动画容器 -->
          <transition :name="panelTransitionName" mode="out-in">
            <!-- 资源概览 -->
            <div v-if="activeTab === 'overview'" key="overview" class="resource-panel">
              <div class="panel-header">
                <h3 class="panel-title">资源概览</h3>
                <p class="panel-description">查看实例的数据库资源概况和统计信息</p>
              </div>

              <div class="resource-section">
                <!-- 数据库状态 -->
                <div class="resource-group">
                  <h4 class="group-title">数据库状态</h4>
                  
                  <div class="resource-item">
                    <div class="resource-info">
                      <label class="resource-label">数据库文件状态</label>
                      <p class="resource-desc">{{ dbInfo.path }}</p>
                    </div>
                    <div class="resource-control">
                      <div class="status-indicator" :class="getDbStatusClass()">
                        <span class="status-dot"></span>
                        <span>{{ dbInfo.status || '未知' }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="resource-item">
                    <div class="resource-info">
                      <label class="resource-label">文件大小</label>
                      <p class="resource-desc">数据库文件占用的磁盘空间</p>
                    </div>
                    <div class="resource-control">
                      <span class="resource-value">{{ formatFileSize(dbInfo.size || 0) }}</span>
                    </div>
                  </div>
                </div>

                <!-- 资源统计 -->
                <div class="resource-group">
                  <h4 class="group-title">资源统计</h4>                  
                  <div class="stats-grid">
                    <div class="stat-item">
                      <Icon icon="mdi:emoticon" class="text-primary stat-icon" width="18" height="18" />
                      <div class="stat-info">
                        <span class="stat-value">{{ emojiStats.total || 0 }}</span>
                        <span class="stat-label">表情包总数</span>
                      </div>
                    </div>
                    <div class="stat-item">
                      <Icon icon="mdi:emoticon-happy" class="text-success stat-icon" width="18" height="18" />
                      <div class="stat-info">
                        <span class="stat-value">{{ emojiStats.registered || 0 }}</span>
                        <span class="stat-label">已注册表情包</span>
                      </div>
                    </div>
                    <div class="stat-item">
                      <Icon icon="mdi:account" class="text-secondary stat-icon" width="18" height="18" />
                      <div class="stat-info">
                        <span class="stat-value">{{ personStats.total || 0 }}</span>
                        <span class="stat-label">用户信息</span>
                      </div>
                    </div>
                    <div class="stat-item">
                      <Icon icon="mdi:account-check" class="text-info stat-icon" width="18" height="18" />
                      <div class="stat-info">                        <span class="stat-value">{{ personStats.active || 0 }}</span>
                        <span class="stat-label">活跃用户</span>
                      </div>
                    </div>
                  </div>

                  <button class="btn btn-outline btn-sm mt-4 w-full" @click="loadResourceStats">
                    <Icon icon="mdi:refresh" width="16" height="16" class="mr-1" />
                    刷新统计信息
                  </button>
                </div>
              </div>
            </div>

            <!-- 表情包管理 -->
            <div v-else-if="activeTab === 'emoji'" key="emoji" class="resource-panel">
              <div class="panel-header">
                <h3 class="panel-title">表情包管理</h3>
                <p class="panel-description">管理实例中的表情包资源</p>
              </div>

              <div class="resource-section">
                <EmojiManagement 
                  :instance-id="instanceId" 
                  :instance-name="instanceName"
                  @stats-updated="updateEmojiStats"
                />
              </div>
            </div>

            <!-- 用户信息管理 -->
            <div v-else-if="activeTab === 'person'" key="person" class="resource-panel">
              <div class="panel-header">
                <h3 class="panel-title">用户信息管理</h3>
                <p class="panel-description">管理实例中的用户信息数据</p>
              </div>

              <div class="resource-section">
                <PersonManagement 
                  :instance-id="instanceId" 
                  :instance-name="instanceName"
                  @stats-updated="updatePersonStats"
                />
              </div>
            </div>

            <!-- 管理工具 -->
            <div v-else-if="activeTab === 'tools'" key="tools" class="resource-panel">
              <div class="panel-header">
                <h3 class="panel-title">数据库工具</h3>
                <p class="panel-description">数据库维护和管理工具</p>
              </div>

              <div class="resource-section">
                <ManagementTools 
                  :instance-id="instanceId" 
                  :instance-name="instanceName"
                  :db-info="dbInfo"
                  @refresh-stats="loadResourceStats"
                />
              </div>
            </div>

            <!-- 备份恢复 -->
            <div v-else-if="activeTab === 'backup'" key="backup" class="resource-panel">
              <div class="panel-header">
                <h3 class="panel-title">备份与恢复</h3>
                <p class="panel-description">管理数据库的备份和恢复操作</p>
              </div>

              <div class="resource-section">
                <!-- 数据备份 -->
                <div class="resource-group">
                  <h4 class="group-title">数据备份</h4>
                  
                  <div class="resource-item">
                    <div class="resource-info">
                      <label class="resource-label">创建备份</label>
                      <p class="resource-desc">备份当前数据库到指定位置</p>
                    </div>
                    <div class="resource-control">
                      <button class="btn btn-primary btn-sm" @click="createBackup" :disabled="isBackingUp">
                        <div v-if="isBackingUp" class="loading loading-spinner loading-xs mr-1"></div>
                        <Icon v-else icon="mdi:database-export" width="16" height="16" class="mr-1" />
                        {{ isBackingUp ? '备份中...' : '创建备份' }}
                      </button>
                    </div>
                  </div>

                  <div class="resource-item">
                    <div class="resource-info">
                      <label class="resource-label">自动备份</label>
                      <p class="resource-desc">启用定期自动备份功能</p>
                    </div>
                    <div class="resource-control">
                      <HyperOS2Switch v-model="autoBackupEnabled" @update:model-value="toggleAutoBackup" />
                    </div>
                  </div>
                </div>

                <!-- 数据恢复 -->
                <div class="resource-group">
                  <h4 class="group-title">数据恢复</h4>
                  
                  <div class="resource-item">
                    <div class="resource-info">
                      <label class="resource-label">从备份恢复</label>
                      <p class="resource-desc">从备份文件恢复数据库</p>
                    </div>
                    <div class="resource-control">                      <button class="btn btn-primary btn-sm" @click="restoreBackup" :disabled="isRestoring">
                        <div v-if="isRestoring" class="loading loading-spinner loading-xs mr-1"></div>
                        <Icon v-else icon="mdi:database-import" width="16" height="16" class="mr-1" />
                        {{ isRestoring ? '恢复中...' : '选择备份文件' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 关于实例 -->
            <div v-else-if="activeTab === 'about'" key="about" class="resource-panel">
              <div class="panel-header">
                <h3 class="panel-title">关于此实例</h3>
                <p class="panel-description">查看实例的详细信息和版本</p>
              </div>

              <div class="resource-section">
                <!-- 实例信息 -->
                <div class="resource-group">
                  <h4 class="group-title">实例信息</h4>
                  
                  <div class="instance-info-card">
                    <div class="info-item">
                      <span class="info-label">实例名称:</span>
                      <span class="info-value">{{ instanceName }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">实例ID:</span>
                      <span class="info-value">{{ instanceId }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">数据库路径:</span>
                      <span class="info-value">{{ dbInfo.path }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">创建时间:</span>
                      <span class="info-value">{{ formatDate(instanceInfo.createTime) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">最后访问:</span>
                      <span class="info-value">{{ formatDate(instanceInfo.lastAccess) }}</span>
                    </div>
                  </div>
                </div>

                <!-- MaiBot版本信息 -->
                <div class="resource-group">
                  <h4 class="group-title">MaiBot版本</h4>
                  
                  <div class="version-info-card">
                    <div class="version-item">
                      <span class="version-name">MaiBot 核心</span>
                      <span class="version-number">{{ maibotVersion.core || '未知' }}</span>
                    </div>
                    <div class="version-item">
                      <span class="version-name">数据库架构</span>
                      <span class="version-number">{{ maibotVersion.dbSchema || '未知' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>

      <!-- 加载状态覆盖层 -->
      <div v-if="loading" class="loading-overlay">
        <div class="loading-content">
          <div class="loading loading-spinner loading-lg text-primary"></div>
          <p class="mt-4 text-lg font-medium">加载资源信息中...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, inject, nextTick } from 'vue';
import { Icon } from '@iconify/vue';
import EmojiManagement from './EmojiManagement.vue';
import PersonManagement from './PersonManagement.vue';
import ManagementTools from './ManagementTools.vue';
import { HyperOS2Switch } from '../settings/hyperos2';
import { maibotResourceApi } from '@/services/maibotResourceApi.js';
import toastService from '@/services/toastService.js';

// 注入依赖
const emitter = inject('emitter', null);

// Props
const props = defineProps({
  instanceId: {
    type: String,
    required: true
  },
  instanceName: {
    type: String,
    required: true
  },
  isOpen: {
    type: Boolean,
    required: true
  }
});

// Emits
const emit = defineEmits(['close']);

// 资源标签页
const activeTab = ref('overview');

// 资源标签页定义
const resourceTabs = [
  { key: 'overview', title: '概览', icon: 'mdi:view-dashboard' },
  { key: 'emoji', title: '表情包', icon: 'mdi:emoticon' },
  { key: 'person', title: '用户信息', icon: 'mdi:account' },
  { key: 'tools', title: '数据库工具', icon: 'mdi:tools' },
  { key: 'backup', title: '备份恢复', icon: 'mdi:backup-restore' },
  { key: 'about', title: '关于实例', icon: 'mdi:information' }
];

// 前一个标签页（用于动画方向判断）
const previousTab = ref('overview');

// 计算动画方向的transition名称
const panelTransitionName = computed(() => {
  const currentIndex = resourceTabs.findIndex(tab => tab.key === activeTab.value);
  const previousIndex = resourceTabs.findIndex(tab => tab.key === previousTab.value);

  if (currentIndex === -1 || previousIndex === -1) {
    return 'resource-panel-fade';
  }

  // 向右滑动（下一个）
  if (currentIndex > previousIndex) {
    return 'resource-panel-slide-right';
  }
  // 向左滑动（上一个）
  else if (currentIndex < previousIndex) {
    return 'resource-panel-slide-left';
  }
  // 相同索引，使用淡入淡出
  else {
    return 'resource-panel-fade';
  }
});

// 响应式数据
const loading = ref(true);
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

// 实例信息
const instanceInfo = ref({
  createTime: null,
  lastAccess: null
});

// MaiBot版本信息
const maibotVersion = ref({
  core: '',
  dbSchema: ''
});

// 备份恢复相关状态
const autoBackupEnabled = ref(localStorage.getItem(`autoBackup_${props.instanceId}`) !== 'false');
const isBackingUp = ref(false);
const isRestoring = ref(false);

// 注入主题
const currentTheme = computed(() => {
  return inject('currentTheme', ref('light')).value;
});

// 方法
const switchTab = (tab) => {
  previousTab.value = activeTab.value;
  activeTab.value = tab;
};

const closeManager = () => {
  emit('close');
};

const handleBackdropClick = () => {
  closeManager();
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (timestamp) => {
  if (!timestamp) return '未知';
  return new Date(timestamp * 1000).toLocaleString('zh-CN');
};

const getDbStatusClass = () => {
  if (!dbInfo.value.exists) return 'status-error';
  if (!dbInfo.value.valid) return 'status-warning';
  return 'status-connected';
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
    console.log('开始加载资源统计数据...', { instanceId: props.instanceId });

    // 获取实例资源信息
    console.log('正在获取实例资源信息...');
    const resourceInfo = await maibotResourceApi.resource.getInstanceInfo(props.instanceId);
    console.log('实例资源信息响应:', resourceInfo);
    
    if (resourceInfo.status === 'success' && resourceInfo.data) {
      const { database } = resourceInfo.data;
      dbInfo.value = {
        status: database?.valid ? '正常' : (database?.exists ? '异常' : '不存在'),
        size: database?.size || 0,
        path: database?.path || '',
        exists: database?.exists || false,
        valid: database?.valid || false
      };
      console.log('数据库信息更新:', dbInfo.value);
    }

    // 获取表情包统计
    try {
      console.log('正在获取表情包统计...');
      const emojiCount = await maibotResourceApi.emoji.getCount(props.instanceId);
      console.log('表情包总数响应:', emojiCount);
      
      if (emojiCount.status === 'success' && emojiCount.data) {
        emojiStats.value.total = emojiCount.data.total_count || 0;
      }

      const registeredEmoji = await maibotResourceApi.emoji.getCount(props.instanceId, {
        is_registered: 1
      });
      console.log('已注册表情包响应:', registeredEmoji);
      
      if (registeredEmoji.status === 'success' && registeredEmoji.data) {
        emojiStats.value.registered = registeredEmoji.data.total_count || 0;
      }
      
      console.log('表情包统计更新:', emojiStats.value);
    } catch (error) {
      console.warn('获取表情包统计失败:', error);
    }

    // 获取用户信息统计
    try {
      console.log('正在获取用户信息统计...');
      const personCount = await maibotResourceApi.person.getCount(props.instanceId);
      console.log('用户信息统计响应:', personCount);
      
      if (personCount.status === 'success' && personCount.data) {
        personStats.value.total = personCount.data.total_count || 0;
      }
      
      console.log('用户信息统计更新:', personStats.value);
    } catch (error) {
      console.warn('获取用户信息统计失败:', error);
    }

    console.log('资源统计数据加载完成');
  } catch (error) {
    console.error('加载资源统计失败:', error);
    toastService.show('加载资源信息失败', { type: 'error' });
  } finally {
    loading.value = false;
  }
};

// 备份恢复相关方法
const toggleAutoBackup = () => {
  localStorage.setItem(`autoBackup_${props.instanceId}`, autoBackupEnabled.value.toString());
  toastService.show(autoBackupEnabled.value ? '已启用自动备份' : '已禁用自动备份', { 
    type: 'info' 
  });
};

const createBackup = async () => {
  try {
    isBackingUp.value = true;
    // TODO: 实现备份逻辑
    await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟备份过程
    toastService.show('备份创建成功', { type: 'success' });
  } catch (error) {
    console.error('创建备份失败:', error);
    toastService.show('备份创建失败', { type: 'error' });
  } finally {
    isBackingUp.value = false;
  }
};

const restoreBackup = async () => {
  try {
    isRestoring.value = true;
    // TODO: 实现恢复逻辑
    await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟恢复过程
    toastService.show('数据恢复成功', { type: 'success' });
  } catch (error) {
    console.error('恢复数据失败:', error);
    toastService.show('数据恢复失败', { type: 'error' });
  } finally {
    isRestoring.value = false;
  }
};

// 监听props变化
watch(() => props.instanceId, () => {
  if (props.isOpen) {
    loadResourceStats();
  }
});

// 监听isOpen变化，当打开时加载数据
watch(() => props.isOpen, (newValue, oldValue) => {
  console.log('isOpen 状态变化:', { oldValue, newValue, instanceId: props.instanceId });
  if (newValue) {
    console.log('资源管理器已打开，开始加载数据...');
    // 添加延迟确保DOM已渲染
    nextTick(() => {
      loadResourceStats();
    });
  }
});

// 生命周期
onMounted(() => {
  console.log('MaiBot资源管理器组件已挂载', { isOpen: props.isOpen, instanceId: props.instanceId });
  if (props.isOpen) {
    console.log('组件挂载时资源管理器已打开，加载数据...');
    // 添加延迟确保DOM已渲染
    nextTick(() => {
      loadResourceStats();
    });
  }
});

// 监听ESC键关闭
onMounted(() => {
  const handleEscape = (e) => {
    if (e.key === 'Escape' && props.isOpen) {
      closeManager();
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleEscape);
  });
});
</script>

<style scoped>
/* 全局图标大小控制 */
.iconify {
  max-width: 24px !important;
  max-height: 24px !important;
}

/* 具体图标类型控制 */
.resource-manager-container .iconify {
  max-width: 20px !important;
  max-height: 20px !important;
}

/* 资源管理器整体布局 */
.resource-manager-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 确保鼠标事件正常传递 */
  pointer-events: auto;
}

.resource-manager-container {
  width: 90%;
  max-width: 1100px;
  height: 88%;
  max-height: 750px;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 头部样式 */
.resource-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.75rem;
  background-color: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.resource-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
  margin: 0;
}

/* 实例信息栏 */
.instance-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.75rem;
  background-color: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.instance-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-connected {
  background-color: hsl(var(--su) / 0.1);
  color: hsl(var(--su));
  border: 1px solid hsl(var(--su) / 0.2);
}

.status-error {
  background-color: hsl(var(--er) / 0.1);
  color: hsl(var(--er));
  border: 1px solid hsl(var(--er) / 0.2);
}

.status-warning {
  background-color: hsl(var(--wa) / 0.1);
  color: hsl(var(--wa));
  border: 1px solid hsl(var(--wa) / 0.2);
}

/* 主体内容布局 */
.resource-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 侧边栏导航 */
.resource-sidebar {
  width: 200px;
  min-width: 180px;
  background-color: #ffffff;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  overflow-y: auto;
  padding: 1.5rem 0;
}

.resource-nav {
  display: flex;
  flex-direction: column;
  padding: 0 1rem;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.5rem;
  border-radius: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgba(0, 0, 0, 0.7);
  font-weight: 500;
  text-align: left;
  width: 100%;
  min-height: 40px;
  margin: 0 0 0.5rem 0;
}

.nav-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.9);
}

.nav-item.active {
  background-color: hsl(var(--p));
  color: hsl(var(--pc));
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.nav-icon {
  flex-shrink: 0;
  width: 16px !important;
  height: 16px !important;
  max-width: 16px;
  max-height: 16px;
}

.nav-label {
  font-size: 0.875rem;
}

/* 主内容区域 */
.resource-main {
  flex: 1;
  overflow: hidden;
  position: relative;
  background-color: #ffffff;
}

/* 资源面板样式 */
.resource-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}

.panel-header {
  padding: 2rem 2.5rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  background-color: #ffffff;
}

.panel-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
  margin: 0 0 0.75rem 0;
}

.panel-description {
  color: rgba(0, 0, 0, 0.6);
  margin: 0;
  line-height: 1.6;
  font-size: 0.95rem;
}

.resource-section {
  flex: 1;
  overflow-y: auto;
  padding: 2.5rem;
  background-color: #ffffff;
  scroll-behavior: smooth;
}

/* 资源组样式 */
.resource-group {
  margin-bottom: 2.5rem;
  background: hsl(var(--b2) / 0.3);
  border-radius: 16px;
  padding: 1.75rem;
  border: 1px solid hsl(var(--b3) / 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.group-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.group-title::before {
  content: "";
  width: 4px;
  height: 1.25rem;
  background: linear-gradient(135deg, hsl(var(--p)) 0%, hsl(var(--s)) 100%);
  border-radius: 2px;
}

/* 资源项样式 */
.resource-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 0;
  background: transparent;
  margin-bottom: 0;
  border: none;
  border-bottom: 1px solid hsl(var(--b3) / 0.1);
  transition: all 0.2s ease;
  gap: 1.5rem;
}

.resource-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.resource-item:hover {
  transform: none;
  box-shadow: none;
}

.resource-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.resource-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
  margin-bottom: 0;
  display: block;
  font-size: 0.95rem;
}

.resource-desc {
  color: rgba(0, 0, 0, 0.6);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
}

.resource-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.resource-value {
  font-weight: 600;
  color: hsl(var(--p));
  font-size: 0.9rem;
}

/* 状态指示器 */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-connected .status-dot {
  background-color: hsl(var(--su));
}

.status-error .status-dot {
  background-color: hsl(var(--er));
}

.status-warning .status-dot {
  background-color: hsl(var(--wa));
}

/* 统计网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background-color: hsl(var(--b1));
  border-radius: 0.5rem;
  border: 1px solid hsl(var(--b3) / 0.2);
}

.stat-icon {
  flex-shrink: 0;
  width: 18px !important;
  height: 18px !important;
  max-width: 18px;
  max-height: 18px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: hsl(var(--bc));
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: hsl(var(--bc) / 0.6);
  margin-top: 0.25rem;
}

/* 信息卡片 */
.instance-info-card,
.version-info-card {
  background-color: hsl(var(--b1));
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid hsl(var(--b3) / 0.2);
}

.info-item,
.version-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid hsl(var(--b3));
}

.info-item:last-child,
.version-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-label,
.version-name {
  font-weight: 500;
  color: hsl(var(--bc) / 0.7);
}

.info-value,
.version-number {
  font-weight: 600;
  color: hsl(var(--bc));
  font-family: 'JetBrains Mono', monospace;
}

/* 切换开关 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: hsl(var(--b3));
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-input:checked + .toggle-slider {
  background-color: hsl(var(--p));
}

.toggle-input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

/* 加载状态 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: hsl(var(--b1) / 0.98);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.loading-content {
  text-align: center;
  padding: 2rem;
  background-color: hsl(var(--b1));
  border-radius: 1rem;
  box-shadow: 0 8px 30px hsl(var(--b3) / 0.3);
  border: 1px solid hsl(var(--b3));
}

.loading-content p {
  color: hsl(var(--bc) / 0.8);
  margin: 0;
}

/* 动画效果 */
.resource-panel-fade-enter-active,
.resource-panel-fade-leave-active {
  transition: opacity 0.3s ease;
}

.resource-panel-fade-enter-from,
.resource-panel-fade-leave-to {
  opacity: 0;
}

.resource-panel-slide-right-enter-active,
.resource-panel-slide-right-leave-active {
  transition: all 0.3s ease;
}

.resource-panel-slide-right-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.resource-panel-slide-right-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.resource-panel-slide-left-enter-active,
.resource-panel-slide-left-leave-active {
  transition: all 0.3s ease;
}

.resource-panel-slide-left-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.resource-panel-slide-left-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* 响应式设计 */
@media (min-width: 1400px) {
  .resource-manager-container {
    max-width: 1200px;
  }
}

@media (max-width: 1200px) {
  .resource-manager-container {
    width: 95%;
    height: 90%;
  }
  
  .resource-sidebar {
    width: 180px;
    min-width: 160px;
  }
}

@media (max-width: 968px) {
  .resource-manager-backdrop {
    padding: 0.5rem;
  }
  
  .resource-manager-container {
    width: 98%;
    height: 95%;
    border-radius: 12px;
    max-width: none;
  }
  
  .resource-sidebar {
    width: 160px;
    min-width: 140px;
  }
  
  .nav-item {
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
  }
  
  .nav-label {
    font-size: 0.8rem;
  }
  
  .panel-header {
    padding: 1.5rem 1.5rem 1rem;
  }
  
  .resource-section {
    padding: 2rem;
  }
}

@media (max-width: 768px) {
  .resource-manager-backdrop {
    padding: 0;
  }
  
  .resource-manager-container {
    height: 100vh;
    border-radius: 0;
    max-width: none;
  }
  
  .resource-content {
    flex-direction: column;
  }
  
  .resource-sidebar {
    width: 100%;
    min-width: auto;
    height: auto;
    border-right: none;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    padding: 0.75rem 0;
  }
  
  .resource-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 0.75rem;
    gap: 0.5rem;
  }
  
  .nav-item {
    white-space: nowrap;
    min-width: auto;
    flex-shrink: 0;
    padding: 0.625rem 1rem;
  }
  
  .nav-icon {
    width: 15px !important;
    height: 15px !important;
  }
  
  .nav-label {
    font-size: 0.875rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-icon {
    width: 19px !important;
    height: 19px !important;
  }
  
  .resource-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .resource-control {
    align-self: stretch;
    justify-content: flex-end;
  }
  
  .panel-header {
    padding: 1rem;
  }
  
  .resource-section {
    padding: 1rem;
  }
  
  .instance-info-bar {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .resource-header {
    padding: 1rem;
  }
  
  .resource-title {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .stat-item {
    padding: 0.75rem;
    gap: 0.5rem;
  }
  
  .stat-icon {
    width: 18px !important;
    height: 18px !important;
  }
  
  .nav-item {
    padding: 0.5rem 0.75rem;
    gap: 0.375rem;
  }
  
  .nav-icon {
    width: 14px !important;
    height: 14px !important;
  }
  
  .nav-label {
    font-size: 0.8rem;
  }
}

/* 深色主题适配 */
[data-theme="dark"] .resource-manager-backdrop {
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

[data-theme="dark"] .resource-manager-container {
  border-color: hsl(var(--bc) / 0.1);
  box-shadow: 
    0 32px 64px rgba(0, 0, 0, 0.5), 
    0 0 0 1px rgba(255, 255, 255, 0.05);
  background-color: hsl(var(--b1));
}

[data-theme="dark"] .resource-header,
[data-theme="dark"] .instance-info-bar,
[data-theme="dark"] .resource-sidebar,
[data-theme="dark"] .resource-main,
[data-theme="dark"] .resource-panel,
[data-theme="dark"] .panel-header,
[data-theme="dark"] .resource-section {
  background-color: hsl(var(--b1));
  border-color: hsl(var(--bc) / 0.1);
}

[data-theme="dark"] .resource-title,
[data-theme="dark"] .panel-title,
[data-theme="dark"] .group-title,
[data-theme="dark"] .resource-label {
  color: hsl(var(--bc));
}

[data-theme="dark"] .panel-description,
[data-theme="dark"] .resource-desc {
  color: hsl(var(--bc) / 0.6);
}

[data-theme="dark"] .nav-item {
  color: hsl(var(--bc) / 0.7);
}

[data-theme="dark"] .nav-item:hover {
  background-color: hsl(var(--b2));
  color: hsl(var(--bc));
}

[data-theme="dark"] .stat-item,
[data-theme="dark"] .resource-item,
[data-theme="dark"] .instance-info-card,
[data-theme="dark"] .version-info-card {
  background-color: hsl(var(--b1));
  border-color: hsl(var(--bc) / 0.1);
}

[data-theme="dark"] .resource-group {
  border-color: hsl(var(--bc) / 0.1);
}

[data-theme="dark"] .group-title {
  border-bottom-color: hsl(var(--bc) / 0.1);
}

[data-theme="dark"] .info-item,
[data-theme="dark"] .version-item {
  border-bottom-color: hsl(var(--bc) / 0.1);
}
</style>
