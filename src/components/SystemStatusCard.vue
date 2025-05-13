<template>
  <el-card class="system-status-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <span>系统状态</span>
        <el-button circle size="small" @click="refreshStatus" :loading="loading">
          <el-icon><RefreshRight /></el-icon>
        </el-button>
      </div>
    </template>
    <div class="status-items">
      <div class="status-item" v-for="(service, name) in services" :key="name">
        <div class="service-name">{{ getServiceDisplayName(name) }}</div>
        <div class="service-status">
          <el-tag :type="getTagType(service.status)" size="small">
            {{ getStatusText(service.status) }}
          </el-tag>
          <span class="service-info">{{ service.info }}</span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RefreshRight } from '@element-plus/icons-vue';
import axios from 'axios';

const services = ref({});
const loading = ref(false);

// 获取服务状态
const fetchServiceStatus = async () => {
  loading.value = true;
  try {
    const response = await axios.get('/api/status');
    services.value = response.data;
  } catch (error) {
    console.error('获取服务状态失败:', error);
    // 设置模拟数据
    services.value = {
      mongodb: { status: 'running', info: '本地实例' },
      napcat: { status: 'running', info: '端口 8095' },
      nonebot: { status: 'stopped', info: '' },
      maibot: { status: 'stopped', info: '' }
    };
  } finally {
    loading.value = false;
  }
};

const refreshStatus = () => {
  fetchServiceStatus();
};

const getServiceDisplayName = (name) => {
  const displayNames = {
    mongodb: 'MongoDB',
    napcat: 'NapCat',
    nonebot: 'NoneBot',
    maibot: 'MaiBot'
  };
  return displayNames[name] || name;
};

const getTagType = (status) => {
  switch (status) {
    case 'running':
      return 'success';
    case 'stopped':
      return 'info';
    case 'error':
      return 'danger';
    default:
      return 'warning';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'running':
      return '运行中';
    case 'stopped':
      return '已停止';
    case 'error':
      return '错误';
    default:
      return '未知状态';
  }
};

onMounted(() => {
  fetchServiceStatus();
});
</script>

<style>
@import '../assets/css/systemStatusCard.css';
</style>
