<template>
  <div class="section" v-if="hasInstances">
    <div class="section-title">已安装实例</div>
    <el-table :data="instances" style="width: 100%">
      <el-table-column prop="name" label="实例名称" min-width="180" />
      <el-table-column prop="installedAt" label="安装时间" width="180" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{row}">
          <el-tag :type="row.status === 'running' ? 'success' : 'info'">
            {{ row.status === 'running' ? '运行中' : '已停止' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{row}">
          <el-button size="small" type="success" @click="openFolder(row.path)">
            打开文件夹
          </el-button>
          <el-button 
            size="small" 
            :type="row.status === 'running' ? 'danger' : 'primary'"
            @click="toggleInstance(row)">
            {{ row.status === 'running' ? '停止' : '启动' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';

const props = defineProps({
  instances: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['toggle-instance', 'refresh-instances']);

const hasInstances = computed(() => {
  return props.instances && props.instances.length > 0;
});

// 打开文件夹
const openFolder = (path) => {
  if (!path) return;
  
  axios.post('/api/open-path', { path })
    .catch(error => {
      ElMessage.error('无法打开文件夹');
    });
};

// 启动或停止实例
const toggleInstance = (instance) => {
  emit('toggle-instance', instance);
};
</script>
