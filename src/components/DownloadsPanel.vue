<template>
  <div class="downloads-tab">
    <div class="header-section">
      <h3>安装管理</h3>
      <div class="header-actions">
        <el-button type="primary" @click="refreshDownloads" size="small">刷新</el-button>
      </div>
    </div>

    <!-- 安装配置组件 -->
    <InstallConfig @refresh-instances="refreshInstances" @add-log="addLog" />

    <!-- 日志显示组件 -->
    <LogsDisplay :logs="allLogs" @clear-logs="clearLogs">
      <template #before-logs>
        <div v-if="isGlobalMockMode" style="padding: 10px;">
          <el-alert title="模拟模式提示" type="info" description="当前处于模拟数据模式，安装过程的实时日志可能不完整或为模拟信息。" show-icon
            :closable="false" />
        </div>
      </template>
    </LogsDisplay>

    <!-- 实例列表组件 -->
    <InstancesList :instances="instanceList" @toggle-instance="toggleInstance" @refresh-instances="refreshInstances" />

    <!-- 控制台对话框组件 -->
    <ConsoleDialog v-model:visible="consoleVisible" :instanceId="runningInstanceId" :instanceName="runningInstanceName"
      :logs="instanceLogs" :isRunning="!!runningInstanceId" @close="closeConsole" @stop="handleInstanceStopped"
      @refresh="refreshDownloads" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, inject, nextTick } from 'vue';
import { ElMessage, ElAlert } from 'element-plus'; // 引入 ElAlert
// 导入统一的API服务
import { instancesApi, deployApi } from '@/services/api';
import { WebSocketService } from '../services/websocket';
import { isMockModeActive } from '../services/apiService'; // 引入模拟模式检查
import { handleApiError } from '../utils/vue-utils'; // 添加这行导入

import InstallConfig from './downloads/InstallConfig.vue';
import LogsDisplay from './downloads/LogsDisplay.vue';
import InstancesList from './downloads/InstancesList.vue';
import ConsoleDialog from './downloads/ConsoleDialog.vue';
import { isInstallationComplete, isInstallationError } from '../utils/logParser.js';

// 事件总线，用于与其他组件通信
const emitter = inject('emitter');

// 状态变量
const loading = ref(false);
const installHistory = ref([]);
const allLogs = ref([]);

// 控制台相关状态
const consoleVisible = ref(false);
const instanceLogs = ref([]);
const runningInstanceId = ref(null);
const runningInstanceName = ref('');
const isGlobalMockMode = ref(false); // 添加全局模拟模式状态

let wsConnection = null;
let logPollingInterval = null;

// 计算属性
const instanceList = computed(() => {
  return installHistory.value;
});

// 更新配置项，简化为必要的选项
const config = ref({
  name: '',
  version: '0.6.3',  // 更新到最新版本
  installNapcat: true,
  installAdapter: true
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
    // 使用模拟数据而不是抛出错误
    const mockInstances = getMockInstances();
    installHistory.value = mockInstances.map(instance => ({
      id: instance.name,
      name: instance.name,
      installedAt: instance.installedAt,
      status: instance.status,
      path: instance.path || '/mock/path'
    }));
    console.log('使用模拟数据:', mockInstances.length, '个实例');

    // 可以添加一个提示，但不抛出错误
    ElMessage({
      message: '使用模拟实例数据',
      type: 'info',
      duration: 3000
    });
  } finally {
    loading.value = false;
  }
};

// 添加获取模拟实例数据的函数
const getMockInstances = () => {
  return [
    {
      name: '本地实例_1',
      status: 'stopped',
      installedAt: '2023-05-13',
      path: 'D:\\MaiBot\\本地实例_1',
    },
    {
      name: '本地实例_2',
      status: 'running',
      installedAt: '2023-05-12',
      path: 'D:\\MaiBot\\本地实例_2',
    },
    {
      name: '测试实例_3',
      status: 'starting',
      installedAt: '2023-05-11',
      path: 'D:\\MaiBot\\测试实例_3',
    }
  ];
};

// 启动或停止实例
const toggleInstance = async (instance) => {
  try {
    if (instance.status === 'running') {
      // 停止实例
      const response = await instancesApi.stopInstance();
      if (response.data && response.data.success) {
        ElMessage.success(`${instance.name} 已停止`);
        instance.status = 'stopped';

        // 如果有正在查看的终端，关闭他
        if (runningInstanceId.value === instance.id) {
          closeConsole();
        }
      } else {
        ElMessage.error('停止实例失败');
      }
    } else {
      // 启动实例
      const response = await instancesApi.startInstance(instance.id);
      if (response.data && response.data.success) {
        ElMessage.success(`${instance.name} 已启动`);
        instance.status = 'running';

        // 显示控制台
        showConsole(instance);
      } else {
        ElMessage.error('启动实例失败');
      }
    }

    // 刷新实例以获取最新的实例状态，以便用户定位问题
    setTimeout(refreshDownloads, 1000);

  } catch (error) {
    console.error('控制实例失败:', error);
    ElMessage.error('控制实例失败: ' + (error.response?.data?.message || error.message));
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

  // 启动日志轮询
  startLogPolling();
};

// 关闭控制台
const closeConsole = () => {
  consoleVisible.value = false;
  runningInstanceId.value = null;
  runningInstanceName.value = '';
  instanceLogs.value = [];
  stopLogPolling();
};

// 实例被停止的处理函数
const handleInstanceStopped = () => {
  // 找到并更新实例状态
  const instance = installHistory.value.find(item => item.id === runningInstanceId.value);
  if (instance) {
    instance.status = 'stopped';
  }
};

// 开始日志轮询
const startLogPolling = () => {
  if (logPollingInterval) {
    clearInterval(logPollingInterval);
  }

  fetchInstanceLogs();
  logPollingInterval = setInterval(fetchInstanceLogs, 2000);
};

// 停止日志轮询
const stopLogPolling = () => {
  if (logPollingInterval) {
    clearInterval(logPollingInterval);
    logPollingInterval = null;
  }
};

// 获取实例日志
const fetchInstanceLogs = async () => {
  if (!runningInstanceId.value) return;

  try {
    const response = await instancesApi.getLogs(runningInstanceId.value);
    if (response.data && response.data.logs) {
      // 更新日志，保持最多显示1000条
      const newLogs = response.data.logs;
      if (newLogs.length > 0) {
        instanceLogs.value = newLogs.slice(-1000);
      }
    }
  } catch (error) {
    console.error('获取实例日志失败:', error);
    // 不在界面上显示错误，避免干扰用户
  }
};

// WebSocket连接
const setupWebSocket = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/api/logs/ws`; // 这个WebSocket主要用于安装过程的日志

  isGlobalMockMode.value = isMockModeActive(); // 更新全局模拟模式状态

  // 如果已经有连接，先关闭
  if (wsConnection && wsConnection.readyState !== WebSocket.CLOSED) {
    wsConnection.close();
  }

  try {
    // 使用WebSocketService代替原生WebSocket
    wsConnection = new WebSocketService({
      url: wsUrl, // 通常安装日志会推送到一个通用的端点或特定的安装任务端点
      reconnectDelay: 3000,
      maxReconnectAttempts: 5,
      autoReconnect: true // WebSocketService内部会处理模拟模式下的重连
    });

    wsConnection.on('open', () => {
      console.log('WebSocket连接已建立');
      addLog({
        time: formatTime(new Date()),
        source: 'system',
        level: 'INFO',
        message: 'WebSocket日志连接已建立'
      });

      // 连接成功后显示指令提示
      addLog({
        time: formatTime(new Date()),
        source: 'command',
        level: 'INFO',
        message: '$ 开始安装过程，请等待...'
      });
    });

    wsConnection.on('message', (data) => {
      try {
        const logData = typeof data === 'string' ? JSON.parse(data) : data;

        // 美化日志消息，去除多余的空格和换行
        if (logData.message && typeof logData.message === 'string') {
          logData.message = logData.message.replace(/\s+$/, '');

          // 如果是pip安装日志，美化格式
          if (logData.message.includes('Successfully installed') && !logData.source) {
            logData.source = 'pip';
            logData.level = 'SUCCESS';
          } else if (logData.message.includes('Requirement already satisfied') && !logData.source) {
            logData.source = 'pip';
          } else if (logData.message.includes('ERROR: ') && !logData.source) {
            logData.source = 'pip';
            logData.level = 'ERROR';
          }

          // 识别python错误
          if (logData.message.includes('.py') && logData.message.includes('Error:') && !logData.source) {
            logData.source = 'python';
            logData.level = 'ERROR';
          }
        }

        // 将日志添加到全局日志列表
        addLog({
          time: logData.time || formatTime(new Date()),
          source: logData.source || 'system',
          level: logData.level || 'INFO',
          message: logData.message || '未知消息'
        });

        // 使用新的日志解析工具来判断安装状态
        const isCompleted = isInstallationComplete(logData);
        const isError = isInstallationError(logData);

        // 如果是完成消息
        if (isCompleted) {
          console.log('检测到安装完成消息:', logData.message);

          // 添加命令行样式的完成提示
          addLog({
            time: formatTime(new Date()),
            source: 'command',
            level: 'SUCCESS',
            message: '$ 安装过程已完成!'
          });

          // 稍后刷新列表
          setTimeout(() => {
            refreshDownloads();
            refreshInstances();

            // 成功通知
            ElMessage.success({
              message: '安装已完成，请在实例管理中查看',
              duration: 5000
            });
          }, 1000);
        }

        // 如果是错误消息
        if (isError) {
          console.log('检测到安装错误消息:', logData.message);

          // 添加命令行样式的错误提示
          addLog({
            time: formatTime(new Date()),
            source: 'command',
            level: 'ERROR',
            message: '$ 安装过程中发生错误，请检查上方日志!'
          });

          // 仍然刷新列表，因为可能部分安装成功
          setTimeout(() => {
            refreshDownloads();
            refreshInstances();
          }, 1000);
        }

        // 处理依赖安装消息
        if (logData.message && logData.message.includes('依赖安装成功')) {
          addLog({
            time: formatTime(new Date()),
            source: 'command',
            level: 'INFO',
            message: '$ 依赖安装已完成，正在执行后续配置...'
          });
        }

        // 处理"安装完成"类消息，添加更清晰的结束提示
        if (logData.message && logData.message.includes('安装完成！请运行启动脚本')) {
          addLog({
            time: formatTime(new Date()),
            source: 'command',
            level: 'SUCCESS',
            message: '$ 所有安装和配置步骤已完成，Bot实例已准备就绪!'
          });
        }
      } catch (error) {
        console.error('处理WebSocket消息失败:', error);
      }
    });

    wsConnection.on('error', (error) => {
      console.error('WebSocket错误:', error);
      addLog({
        time: formatTime(new Date()),
        source: 'system',
        level: 'ERROR',
        message: 'WebSocket连接错误'
      });
    });

    wsConnection.on('close', () => {
      console.log('WebSocket连接已关闭');
      addLog({
        time: formatTime(new Date()),
        source: 'system',
        level: 'WARNING',
        message: 'WebSocket连接已关闭，正在重连...'
      });
    });

    wsConnection.connect();
  } catch (error) {
    console.error('创建WebSocket连接失败:', error);
    addLog({
      time: formatTime(new Date()),
      source: 'system',
      level: 'ERROR',
      message: `创建WebSocket连接失败: ${error.message}`
    });
    // 使用延时重连，避免连续失败重连太快
    setTimeout(setupWebSocket, 5000);
  }
};

// 添加日志
const addLog = (log) => {
  allLogs.value.push(log);

  // 限制日志条数
  if (allLogs.value.length > 1000) {
    allLogs.value = allLogs.value.slice(-900);
  }
};

// 清空日志
const clearLogs = () => {
  allLogs.value = [];
};

// 刷新实例列表
const refreshInstances = () => {
  refreshDownloads();
  if (emitter) {
    emitter.emit('refresh-instances');
  }
};

// 格式化时间展示
function formatTime(date) {
  return date.toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 开始下载
const startDownload = async () => {
  if (!config.value.name) {
    ElMessage.error('请输入实例名称');
    return;
  }

  downloading.value = true;
  addLog({
    time: formatTime(new Date()),
    level: 'INFO',
    message: `开始下载 MaiBot ${config.value.version}`
  });

  try {
    const response = await axios.post('/api/download', {
      name: config.value.name,
      version: config.value.version,
      options: {
        napcat: config.value.installNapcat,
        adapter: config.value.installAdapter
      }
    });

    // ...existing code...
  } catch (error) {
    // ...existing code...
  }
};

// 生命周期钩子
onMounted(() => {
  isGlobalMockMode.value = isMockModeActive(); // 初始化时检查
  // 启动时添加延迟，确保后端服务已启动
  setTimeout(() => {
    refreshDownloads();
    setupWebSocket();
  }, 1000);

  // 监听实例列表更新事件
  if (emitter) {
    emitter.on('refresh-instances', refreshDownloads);
  }
});

onBeforeUnmount(() => {
  // 停止所有定时器和连接
  if (wsConnection) {
    wsConnection.disconnect();
  }

  stopLogPolling();

  // 移除事件监听
  if (emitter) {
    emitter.off('refresh-instances', refreshDownloads);
  }
});
</script>

<style>
/* 将@import移到样式最前面 */
@import '../assets/css/downloadsPanel.css';
</style>
