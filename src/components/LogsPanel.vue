<template>
  <div class="logs-tab">
    <div class="log-header">
      <h3>日志记录</h3>
      <div class="header-actions">
        <el-select v-model="currentLogSource" placeholder="选择日志来源" size="small" style="width: 200px; margin-right: 10px"
          @change="changeLogSource">
          <el-option label="系统日志" value="system" />
          <el-option v-for="instance in botInstances" :key="instance" :label="`实例: ${instance}`" :value="instance" />
        </el-select>
        <el-button type="primary" size="small" @click="clearLogs" class="clear-btn">
          清空日志
        </el-button>
      </div>
    </div>

    <div class="log-container" ref="logContainerRef">
      <div v-if="isMockMode && !wsConnected" class="mock-mode-notice">
        <el-alert title="模拟模式提示" type="info" description="当前处于模拟数据模式，实时日志不可用。" show-icon :closable="false" />
      </div>
      <div v-if="logs.length === 0 && !isMockMode" class="empty-logs">
        <el-empty description="暂无日志" />
      </div>
      <div v-else>
        <div v-for="(log, index) in logs" :key="index" class="log-item">
          <div class="log-icon">
            <el-icon :color="getLogColor(log.type || log.level)">
              <WarningFilled v-if="isWarningOrError(log)" />
              <SuccessFilled v-else-if="isSuccessOrInfo(log)" />
              <InfoFilled v-else />
            </el-icon>
          </div>
          <div class="log-content">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          <div class="log-action">
            <el-button size="small" text @click="copyLog(log.message)">
              <el-icon>
                <DocumentCopy />
              </el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="log-footer">
      <el-checkbox v-model="autoScroll">自动滚动</el-checkbox>
      <el-button type="default" size="small" @click="exportLogs">
        <el-icon>
          <Download />
        </el-icon> 导出日志
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { ElMessage, ElAlert } from 'element-plus' // 引入 ElAlert
import { WarningFilled, SuccessFilled, InfoFilled, DocumentCopy, Download } from '@element-plus/icons-vue'
import axios from 'axios';
import { getLogWebSocketService, WebSocketService } from '../services/websocket'; // 引入 WebSocketService
import { isMockModeActive } from '../services/apiService'; // 引入模拟模式检查

// 状态变量
const logs = ref([])
const botInstances = ref([])
const currentLogSource = ref('system')
const autoScroll = ref(true)
const logContainerRef = ref(null) // 修改引用名称以匹配模板
const wsService = ref(null); // WebSocket服务实例
const wsConnected = ref(false); // WebSocket连接状态
const isMockMode = ref(false); // 本地模拟模式状态，用于UI

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

// 新增的辅助函数，判断是否为警告或错误类型
const isWarningOrError = (log) => {
  const type = (log.type || log.level || '').toLowerCase();
  return type === 'warning' || type === 'error';
}

// 新增的辅助函数，判断是否为成功或信息类型
const isSuccessOrInfo = (log) => {
  const type = (log.type || log.level || '').toLowerCase();
  return type === 'success' || type === 'info';
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
    } else {
      logs.value = [{ type: 'INFO', time: formatTime(new Date()), message: `实例 ${instanceName} 暂无日志。` }];
    }
  } catch (error) {
    console.error(`获取实例 ${instanceName} 日志失败:`, error);
    ElMessage.error(`获取实例 ${instanceName} 日志失败`);
    logs.value = [{ type: 'ERROR', time: formatTime(new Date()), message: `获取实例 ${instanceName} 日志失败。` }];
  }
}

// WebSocket日志订阅
const setupLogWS = () => {
  isMockMode.value = isMockModeActive();
  if (isMockMode.value) {
    console.log('LogsPanel: 模拟模式激活，不尝试连接WebSocket。');
    wsConnected.value = false;
    // 可以添加一条模拟日志提示
    addLog({ type: 'WARNING', message: '模拟模式已激活，实时日志功能已禁用。' });
    return;
  }

  if (wsService.value) {
    wsService.value.disconnect();
  }

  // 使用 getLogWebSocketService 或 new WebSocketService()
  // 为了确保每次切换日志源时能正确订阅，这里我们创建一个新的实例
  // 如果希望全局共享一个连接，则应使用 getLogWebSocketService() 并管理其订阅
  wsService.value = new WebSocketService({
    url: `${getWebSocketProtocol()}//${window.location.host}/api/logs/ws?source=${currentLogSource.value}`,
    reconnectDelay: 5000, // 增加重连延迟
  });

  wsService.value.on('open', () => {
    wsConnected.value = true;
    console.log(`日志WebSocket已连接到源: ${currentLogSource.value}`);
    addLog({ type: 'INFO', message: `实时日志监控已连接 (源: ${currentLogSource.value})` });
  });

  wsService.value.on('message', (logData) => {
    // 后端推送的日志可能需要根据 source 过滤，如果WebSocket URL已包含source则不需要
    // 假设后端推送的日志已根据连接参数中的source进行了过滤
    // 或者，如果后端推送所有日志，前端需要过滤：
    // if (logData.source === currentLogSource.value) {
    //   addLog(logData);
    // }
    addLog(logData); // 假设后端已按source过滤
  });

  wsService.value.on('error', (error) => {
    wsConnected.value = false;
    console.error('日志WebSocket错误:', error);
    addLog({ type: 'ERROR', message: `实时日志连接错误: ${error.message || '未知错误'}` });
  });

  wsService.value.on('close', (event) => {
    wsConnected.value = false;
    console.log('日志WebSocket已关闭。原因:', event.reason);
    if (!isMockModeActive()) { // 仅在非模拟模式下提示重连
      addLog({ type: 'WARNING', message: '实时日志连接已断开。' + (event.reason && event.reason.includes('Mock mode') ? '' : ' 尝试重连中...') });
    }
  });

  wsService.value.connect();
}

const getWebSocketProtocol = () => {
  return window.location.protocol === 'https:' ? 'wss:' : 'ws:';
};

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
  if (logContainerRef.value) { // 使用正确的引用名称
    logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
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
  if (!type) return '#909399'; // 添加默认颜色以处理undefined情况

  switch (type.toString().toUpperCase()) {
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

watch(currentLogSource, (newSource, oldSource) => {
  if (newSource !== oldSource) {
    logs.value = []; // 清空旧日志
    addLog({ type: 'INFO', message: `日志源已切换到: ${newSource}` });
    setupLogWS(); // 重新建立WebSocket连接或更新订阅
  }
});

// 初始化
onMounted(async () => {
  isMockMode.value = isMockModeActive();
  await fetchBotInstances();
  // 根据 currentLogSource 初始化日志
  if (currentLogSource.value === 'system') {
    fetchSystemLogs();
  } else {
    fetchInstanceLogs(currentLogSource.value);
  }
  setupLogWS();
})

onBeforeUnmount(() => {
  if (wsService.value) {
    wsService.value.disconnect();
  }
});

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

.mock-mode-notice {
  padding: 10px;
  margin-bottom: 10px;
}
</style>
