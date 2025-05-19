<template>
  <div class="instances-tab">
    <!-- 实例列表组件 -->
    <InstancesList :instances="instancesData" @refresh-instances="loadInstances"
      @toggle-instance="handleToggleInstance" />

    <!-- 实例配置抽屉组件 -->
    <InstanceSettingsDrawer :is-open="isSettingsOpen" :instance-name="currentInstance.name"
      :instance-path="currentInstance.path" @close="closeInstanceSettings" @save="handleInstanceSettingsSave" />
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onBeforeUnmount } from 'vue';
import InstancesList from './instances/InstancesList.vue';
import InstanceSettingsDrawer from './settings/InstanceSettingsDrawer.vue';

// 获取事件总线
const emitter = inject('emitter');

// 实例数据
const instancesData = ref([
  { id: 1, name: '开发环境', status: 'running', installedAt: '2023-04-15 10:30', path: 'D:/maibot/dev' },
  { id: 2, name: '测试环境', status: 'stopped', installedAt: '2023-05-20 14:45', path: 'D:/maibot/test' },
  { id: 3, name: '生产环境', status: 'error', installedAt: '2023-06-05 09:15', path: 'D:/maibot/prod' }
]);

// 实例设置抽屉状态
const isSettingsOpen = ref(false);
const currentInstance = ref({ name: '', path: '' });

// 打开实例设置
const openInstanceSettings = (instance) => {
  currentInstance.value = instance;
  isSettingsOpen.value = true;
};

// 关闭实例设置
const closeInstanceSettings = () => {
  isSettingsOpen.value = false;
};

// 处理保存设置
const handleInstanceSettingsSave = (config) => {
  showToast(`实例 ${currentInstance.value.name} 配置已保存`, 'success');
};

// 加载实例列表
const loadInstances = () => {
  // 模拟加载数据的延迟
  showToast('正在刷新实例列表...', 'info');
  setTimeout(() => {
    // 在真实应用中，这里应该是API调用
    showToast('实例列表已更新', 'success');
  }, 800);
};

// 处理实例状态切换
const handleToggleInstance = (instance) => {
  // 模拟状态切换
  const index = instancesData.value.findIndex(i => i.id === instance.id);
  if (index !== -1) {
    const newStatus = instancesData.value[index].status === 'running' ? 'stopped' : 'running';
    // 先设置为过渡状态
    instancesData.value[index].status = newStatus === 'running' ? 'starting' : 'stopping';

    // 模拟状态变更延迟
    setTimeout(() => {
      instancesData.value[index].status = newStatus;
      showToast(`实例 ${instance.name} 已${newStatus === 'running' ? '启动' : '停止'}`, 'success');
    }, 1500);
  }
};

// 辅助函数：显示Toast提示
const showToast = (message, type = 'info') => {
  const toast = document.createElement('div');
  toast.className = 'toast toast-top toast-center';

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `<span>${message}</span>`;

  toast.appendChild(alert);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
};

// 设置事件监听
onMounted(() => {
  if (emitter) {
    emitter.on('open-instance-settings', openInstanceSettings);
  }
});

// 移除事件监听
onBeforeUnmount(() => {
  if (emitter) {
    emitter.off('open-instance-settings', openInstanceSettings);
  }
});
</script>

<style scoped>
@import '../assets/css/instancesPanel.css';

.toast {
  position: fixed;
  top: 2rem;
  z-index: 100;
  transition: opacity 0.3s ease;
}
</style>
