<template>
  <div class="instances-panel">
    <!-- 实例列表组件 -->
    <InstancesList />

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
  // 创建toast提示
  const toast = document.createElement('div');
  toast.className = 'toast toast-top toast-center';
  toast.innerHTML = `
    <div class="alert alert-success">
      <span>实例 ${currentInstance.value.name} 配置已保存</span>
    </div>
  `;
  document.body.appendChild(toast);

  // 设置显示时长
  setTimeout(() => {
    document.body.removeChild(toast);
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
.instances-panel {
  height: 100%;
  overflow-y: auto;
}

.toast {
  position: fixed;
  top: 2rem;
  z-index: 100;
  left: 50%;
  transform: translateX(-50%);
}
</style>
