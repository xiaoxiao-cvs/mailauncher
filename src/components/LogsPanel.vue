<template>
  <div class="logs-tab">
    <div class="log-header">
      <h3>日志记录</h3>
      <div class="header-actions">
        <el-select 
          v-model="currentLogSource" 
          placeholder="选择日志来源" 
          size="small" 
          style="width: 200px; margin-right: 10px"
          @change="changeLogSource">
          <el-option label="系统日志" value="system" />
          <el-option 
            v-for="instance in botInstances" 
            :key="instance" 
            :label="`实例: ${instance}`" 
            :value="instance" />
        </el-select>
        <el-button 
          type="primary" 
          size="small" 
          @click="clearLogs"
          class="clear-btn">
          清空日志
        </el-button>
      </div>
    </div>
    
    <div class="log-container">
      <div v-if="logs.length === 0" class="empty-logs">
        <el-empty description="暂无日志" />
      </div>
      <div v-else>
        <div v-for="(log, index) in logs" :key="index" class="log-item">
          <div class="log-icon">
            <el-icon :color="getLogColor(log.type)">
              <WarningFilled v-if="log.type === 'warning' || log.type === 'ERROR'" />
              <SuccessFilled v-else-if="log.type === 'success' || log.type === 'INFO'" />
              <InfoFilled v-else />
            </el-icon>
          </div>
          <div class="log-content">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          <div class="log-action">
            <el-button size="small" text @click="copyLog(log.message)">
              <el-icon><DocumentCopy /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="log-footer">
      <el-checkbox v-model="autoScroll">自动滚动</el-checkbox>
      <el-button type="default" size="small" @click="exportLogs">
        <el-icon><Download /></el-icon> 导出日志
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { WarningFilled, SuccessFilled, InfoFilled, DocumentCopy, Download } from '@element-plus/icons-vue'
import axios from 'axios';

// 状态变量
const logs = ref([])
const botInstances = ref([])
const currentLogSource = ref('system')
const autoScroll = ref(true)
const logContainer = ref(null)

// 初始样例日志
logs.value = [
  {
    type: 'INFO',
    time: formatTime(new Date()),
    message: '日志系统初始化完成'
  }
]

// 功能方法
const copyLog = (message) => {
  navigator.clipboard.writeText(message)
    .then(() => {
      ElMessage.success('日志已复制')
    })
    .catch(err => {
      ElMessage.error('复制失败')
      console.error('复制失败:', err)
    })
}

const clearLogs = () => {
  logs.value = []
  ElMessage.success('日志已清空')
}

const fetchBotInstances = async () => {
  try {
    const response = await axios.get('/api/instances');
    if (response.data && response.data.instances) {
      botInstances.value = response.data.instances.map(instance => instance.name);
    }
  } catch (error) {
    console.error('获取Bot实例列表失败:', error);
  }
}

const changeLogSource = (source) => {
  if (source === 'system') {
    fetchSystemLogs();
  } else {
    fetchInstanceLogs(source);
  }
}

const fetchSystemLogs = async () => {
  try {
    const response = await axios.get('/api/logs/system');
    if (response.data && response.data.logs) {
      logs.value = response.data.logs;
    }
  } catch (error) {
    console.error('获取系统日志失败:', error);
    ElMessage.error('获取系统日志失败');
  }
}

const fetchInstanceLogs = async (instanceName) => {
  try {
    const response = await axios.get(`/api/logs/instance/${instanceName}`);
    if (response.data && response.data.logs) {
      logs.value = response.data.logs;
    }
  } catch (error) {
    console.error(`获取实例 ${instanceName} 日志失败:`, error);
    ElMessage.error(`获取实例 ${instanceName} 日志失败`);
  }
}

// WebSocket日志订阅
const setupLogWS = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/api/logs/ws`);
  
  ws.onmessage = (event) => {
    try {
      const logData = JSON.parse(event.data);
      if (logData.source === currentLogSource.value) {
        addLog(logData);
      }
    } catch (error) {
      console.error('处理WebSocket日志消息失败:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket错误:', error);
  };
  
  ws.onopen = () => {
    console.log('日志WebSocket已连接');
  };
  
  ws.onclose = () => {
    console.log('日志WebSocket已关闭，尝试重连...');
    setTimeout(setupLogWS, 3000);
  };
}

const addLog = (logData) => {
  logs.value.push({
    type: logData.level || 'INFO',
    time: logData.time || formatTime(new Date()),
    message: logData.message
  });
  
  if (autoScroll.value) {
    scrollToBottom();
  }
}

const scrollToBottom = async () => {
  await nextTick();
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight;
  } else {
    const container = document.querySelector('.log-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
}

const exportLogs = () => {
  const logText = logs.value.map(log => `[${log.time}][${log.type}] ${log.message}`).join('\n');
  const blob = new Blob([logText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `logs-${currentLogSource.value}-${formatDateForFile(new Date())}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 辅助方法
function formatTime(date) {
  return date.toLocaleString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit'
  });
}

function formatDateForFile(date) {
  return date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
}

function getLogColor(type) {
  switch(type.toUpperCase()) {
    case 'ERROR':
    case 'WARNING':
      return '#E6A23C';
    case 'SUCCESS':
    case 'INFO':
      return '#67C23A';
    default:
      return '#909399';
  }
}

watch(logs, () => {
  if (autoScroll.value) {
    scrollToBottom();
  }
}, { deep: true });

// 初始化
onMounted(async () => {
  await fetchBotInstances();
  fetchSystemLogs();
  setupLogWS();
})

// 暴露方法给父组件调用
// defineExpose已经是编译宏，不需要导入
defineExpose({
  changeLogSource(source) {
    currentLogSource.value = source;
    if (source === 'system') {
      fetchSystemLogs();
    } else {
      fetchInstanceLogs(source);
    }
  }
});
</script>

<style>
@import '../assets/css/logsPanel.css';
</style>
