<template>
  <div class="downloads-tab">
    <div class="header-section">
      <h3>下载中心</h3>
    </div>

    <!-- 使用新的下载中心组件 -->
    <DownloadCenter @refresh="refreshDownloads" />

    <!-- 控制台对话框组件 -->
    <ConsoleDialog v-model:visible="consoleVisible" :instanceId="runningInstanceId" :instanceName="runningInstanceName"
      :logs="instanceLogs" :isRunning="!!runningInstanceId" @close="closeConsole" @stop="handleInstanceStopped"
      @refresh="refreshDownloads" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, inject } from 'vue';
// 修复：使用正确的导入路径
import { deployApi } from '@/services/api';
import toastService from '@/services/toastService';

import DownloadCenter from './downloads/DownloadCenter.vue';
import ConsoleDialog from './downloads/ConsoleDialog.vue';

// 事件总线，用于与其他组件通信
const emitter = inject('emitter');

// 状态变量
const loading = ref(false);

// 控制台相关状态
const consoleVisible = ref(false);
const instanceLogs = ref([]);
const runningInstanceId = ref(null);
const runningInstanceName = ref('');

// 刷新下载中心 - 移除重复的版本请求，让DownloadCenter组件处理
const refreshDownloads = async () => {
  console.log('下载中心刷新事件触发');
  // 不再在这里重复请求版本信息，避免与DownloadCenter组件的初始化请求重复
};

// 关闭控制台
const closeConsole = () => {
  consoleVisible.value = false;
};

// 处理实例停止
const handleInstanceStopped = () => {
  runningInstanceId.value = null;
  refreshDownloads();
};

// 组件挂载时执行
onMounted(() => {
  // 移除重复的版本请求，由DownloadCenter组件负责数据初始化
  console.log('DownloadsPanel 已挂载');

  // 监听事件
  if (emitter) {
    emitter.on('refresh-downloads', refreshDownloads);
  }
});

// 组件卸载前清理
onBeforeUnmount(() => {
  if (emitter) {
    emitter.off('refresh-downloads', refreshDownloads);
  }
});
</script>

<style>
@import '../assets/css/downloadsPanel.css';
</style>
