<template>
  <div class="downloads-tab">
    <div class="header-section">
      <h3>安装管理</h3>
      <div class="header-actions">
        <button class="btn btn-primary btn-sm" @click="refreshDownloads">刷新</button>
      </div>
    </div>

    <!-- 实例列表组件 -->
    <InstancesList :instances="instanceList" @toggle-instance="toggleInstance" @refresh-instances="refreshInstances" />

    <!-- 控制台对话框组件 -->
    <ConsoleDialog v-model:visible="consoleVisible" :instanceId="runningInstanceId" :instanceName="runningInstanceName"
      :logs="instanceLogs" :isRunning="!!runningInstanceId" @close="closeConsole" @stop="handleInstanceStopped"
      @refresh="refreshDownloads" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, inject } from 'vue';
import { instancesApi } from '@/services/api';
import toastService from '@/services/toastService';

import InstancesList from './downloads/InstancesList.vue';
import ConsoleDialog from './downloads/ConsoleDialog.vue';

// 事件总线，用于与其他组件通信
const emitter = inject('emitter');

// 状态变量
const loading = ref(false);
const installHistory = ref([]);

// 控制台相关状态
const consoleVisible = ref(false);
const instanceLogs = ref([]);
const runningInstanceId = ref(null);
const runningInstanceName = ref('');

// 计算属性
const instanceList = computed(() => {
  return installHistory.value;
});

// 刷新安装历史
const refreshDownloads = async () => {
  loading.value = true;
  try {
    console.log('刷新实例列表...');
    const response = await instancesApi.getInstances();
    if (response.data && response.data.instances) {
      installHistory.value = response.data.instances.map(instance => ({
        id: instance.name,
        name: instance.name,
        installedAt: instance.installedAt,
        status: instance.status,
        path: instance.path
      }));
      console.log(`获取到${installHistory.value.length}个实例`);
    }
  } catch (error) {
    console.error('获取实例列表失败:', error);
    // 使用模拟数据
    const mockInstances = getMockInstances();
    installHistory.value = mockInstances.map(instance => ({
      id: instance.name,
      name: instance.name,
      installedAt: instance.installedAt,
      status: instance.status,
      path: instance.path || '/mock/path'
    }));
    console.log('使用模拟数据:', mockInstances.length, '个实例');
    toastService.info('使用模拟实例数据');
  } finally {
    loading.value = false;
  }
};

// 获取模拟实例数据
const getMockInstances = () => {
  return [
    {
      name: '本地实例_1',
      status: 'stopped',
      installedAt: '2023-05-13 19:56:18',
      path: 'D:\\MaiBot\\本地实例_1'
    },
    {
      name: '本地实例_2',
      status: 'running',
      installedAt: '2023-05-12 10:30:00',
      path: 'D:\\MaiBot\\本地实例_2'
    }
  ];
};

// 启动或停止实例
const toggleInstance = async (instance) => {
  try {
    if (instance.status === 'running') {
      // 停止实例
      toastService.success(`${instance.name} 已停止`);
      instance.status = 'stopped';

      // 如果有正在查看的终端，关闭它
      if (runningInstanceId.value === instance.id) {
        closeConsole();
      }
    } else {
      // 启动实例
      toastService.success(`${instance.name} 已启动`);
      instance.status = 'running';

      // 显示控制台
      showConsole(instance);
    }

    // 刷新实例列表
    setTimeout(refreshDownloads, 1000);
  } catch (error) {
    console.error('控制实例失败:', error);
    toastService.error('控制实例失败: ' + (error.message || '未知错误'));
  }
};

// 显示控制台
const showConsole = (instance) => {
  runningInstanceId.value = instance.id;
  runningInstanceName.value = instance.name;
  instanceLogs.value = [{
    level: 'INFO',
    message: `正在启动 ${instance.name}...`
  }];
  consoleVisible.value = true;
};

// 关闭控制台
const closeConsole = () => {
  consoleVisible.value = false;
  runningInstanceId.value = null;
  runningInstanceName.value = '';
  instanceLogs.value = [];
};

// 实例被停止的处理函数
const handleInstanceStopped = () => {
  // 找到并更新实例状态
  const instance = installHistory.value.find(item => item.id === runningInstanceId.value);
  if (instance) {
    instance.status = 'stopped';
  }
};

// 刷新实例列表
const refreshInstances = () => {
  refreshDownloads();
  if (emitter) {
    emitter.emit('refresh-instances');
  }
};

// 添加事件处理函数
const handleRefreshDownloads = () => {
  refreshDownloads();
};

const handleRefreshInstances = () => {
  refreshInstances();
};

// 组件挂载
onMounted(() => {
  // 初始加载数据
  refreshDownloads();

  // 监听事件
  if (emitter) {
    emitter.on('refresh-downloads', handleRefreshDownloads);
    emitter.on('refresh-instances', handleRefreshInstances);
  }
});

// 组件卸载前清理
onBeforeUnmount(() => {
  // 移除事件监听
  if (emitter) {
    emitter.off('refresh-downloads', handleRefreshDownloads);
    emitter.off('refresh-instances', handleRefreshInstances);
  }
});
</script>

<style>
@import '../assets/css/downloadsPanel.css';
</style>
