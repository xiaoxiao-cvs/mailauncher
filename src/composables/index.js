import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { WebSocketService } from '../services/websocket';
import * as instancesApi from '../api/instances';
import * as logsApi from '../api/logs';
import * as chartService from '../services/charts';
import { useDarkMode, useTheme } from '../services/theme';
import { formatTime } from '../utils/formatters';
import eventBus from '../services/eventBus';

/**
 * 使用WebSocket连接日志服务
 * @param {Object} options 选项
 * @returns {Object} WebSocket相关状态和方法
 */
export const useWebSocketLogs = (options = {}) => {
  const logs = ref([]);
  const connected = ref(false);
  const wsService = new WebSocketService({
    url: options.url || '/api/logs/ws',
    autoReconnect: options.autoReconnect !== false,
    reconnectDelay: options.reconnectDelay || 3000
  });
  
  const addLog = (log) => {
    if (typeof log === 'string') {
      log = {
        time: formatTime(new Date()),
        level: 'INFO',
        message: log
      };
    }
    
    // 如果没有时间戳，添加当前时间
    if (!log.time) {
      log.time = formatTime(new Date());
    }
    
    logs.value.push(log);
    
    // 限制日志长度，避免内存占用过大
    if (options.maxLogs && logs.value.length > options.maxLogs) {
      logs.value = logs.value.slice(-options.maxLogs);
    }
  };
  
  const clearLogs = () => {
    logs.value = [];
  };
  
  onMounted(() => {
    wsService.on('open', () => {
      connected.value = true;
      addLog({
        time: formatTime(new Date()),
        level: 'INFO',
        message: 'WebSocket连接已建立'
      });
    });
    
    wsService.on('message', (data) => {
      if (data && options.filter && !options.filter(data)) {
        return; // 如果有过滤函数并且返回false，则忽略此消息
      }
      addLog(data);
    });
    
    wsService.on('error', (error) => {
      connected.value = false;
      addLog({
        time: formatTime(new Date()),
        level: 'ERROR',
        message: `WebSocket错误: ${error}`
      });
    });
    
    wsService.on('close', () => {
      connected.value = false;
      addLog({
        time: formatTime(new Date()),
        level: 'WARNING',
        message: 'WebSocket连接已关闭，正在重连...'
      });
    });
    
    wsService.connect();
  });
  
  onBeforeUnmount(() => {
    wsService.disconnect();
  });
  
  return {
    logs,
    connected,
    addLog,
    clearLogs,
    wsService
  };
};

/**
 * 使用实例管理API
 * @returns {Object} 实例管理相关状态和方法
 */
export const useInstances = () => {
  const instances = ref([]);
  const loading = ref(false);
  const error = ref(null);
  
  const fetchInstances = async () => {
    loading.value = true;
    error.value = null;
    try {
      instances.value = await instancesApi.fetchInstances();
    } catch (err) {
      error.value = err.message;
      console.error('加载实例失败:', err);
    } finally {
      loading.value = false;
    }
  };
  
  const startInstance = async (instanceName) => {
    try {
      const result = await instancesApi.startInstance(instanceName);
      if (result.success) {
        await fetchInstances(); // 重新加载实例列表
      }
      return result;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };
  
  const stopInstance = async () => {
    try {
      const result = await instancesApi.stopInstance();
      if (result.success) {
        await fetchInstances(); // 重新加载实例列表
      }
      return result;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };
  
  // 更多实例管理方法...
  
  onMounted(() => {
    fetchInstances();
    
    // 监听全局刷新实例事件
    eventBus.on('refresh-instances', fetchInstances);
  });
  
  onBeforeUnmount(() => {
    eventBus.off('refresh-instances', fetchInstances);
  });
  
  return {
    instances,
    loading,
    error,
    fetchInstances,
    startInstance,
    stopInstance,
    // 可以添加更多方法...
    startNapcat: instancesApi.startNapcat,
    startNonebot: instancesApi.startNonebot,
    updateInstance: instancesApi.updateInstance,
    deleteInstance: instancesApi.deleteInstance,
    openFolder: instancesApi.openFolder
  };
};

/**
 * 使用日志管理API
 * @param {Object} options 选项
 * @returns {Object} 日志管理相关状态和方法
 */
export const useLogs = (options = {}) => {
  const logs = ref([]);
  const loading = ref(false);
  const source = ref(options.source || 'system');
  
  const fetchLogs = async () => {
    loading.value = true;
    try {
      if (source.value === 'system') {
        logs.value = await logsApi.fetchSystemLogs();
      } else {
        logs.value = await logsApi.fetchInstanceLogs(source.value);
      }
    } catch (err) {
      console.error('获取日志失败:', err);
    } finally {
      loading.value = false;
    }
  };
  
  const changeLogSource = async (newSource) => {
    source.value = newSource;
    await fetchLogs();
  };
  
  onMounted(() => {
    fetchLogs();
  });
  
  watch(source, fetchLogs);
  
  return {
    logs,
    loading,
    source,
    fetchLogs,
    changeLogSource,
    getLogColor: logsApi.getLogColor,
    exportLogs: () => logsApi.exportLogs(logs.value, source.value)
  };
};

/**
 * 使用性能监控API
 * @returns {Object} 性能监控相关状态和方法
 */
export const usePerformanceMonitoring = () => {
  const performance = ref({
    cpu: { usage: 0, cores: 0, frequency: 0, model: '' },
    memory: { total: 0, used: 0, free: 0 },
    network: { sent: 0, received: 0, sentRate: 0, receivedRate: 0 }
  });
  const loading = ref(false);
  const error = ref(null);
  let refreshInterval = null;
  
  const fetchPerformance = async () => {
    loading.value = true;
    try {
      const metrics = await instancesApi.fetchSystemMetrics();
      
      // 处理网络速率计算
      if (performance.value.network.sent && metrics.network) {
        const timeGap = 5; // 假设间隔为5秒
        metrics.network.sentRate = Math.max(0, (metrics.network.sent - performance.value.network.sent) / timeGap);
        metrics.network.receivedRate = Math.max(0, (metrics.network.received - performance.value.network.received) / timeGap);
      } else if (metrics.network) {
        metrics.network.sentRate = 0;
        metrics.network.receivedRate = 0;
      }
      
      performance.value = metrics;
      error.value = null;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };
  
  const startMonitoring = (interval = 5000) => {
    fetchPerformance();
    refreshInterval = setInterval(fetchPerformance, interval);
  };
  
  const stopMonitoring = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  };
  
  onMounted(() => {
    fetchPerformance();
  });
  
  onBeforeUnmount(() => {
    stopMonitoring();
  });
  
  return {
    performance,
    loading,
    error,
    fetchPerformance,
    startMonitoring,
    stopMonitoring
  };
};

/**
 * 使用图表
 * @param {Object} options 图表选项
 * @returns {Object} 图表相关状态和方法
 */
export const useCharts = (options = {}) => {
  const chartRefs = {
    cpu: ref(null),
    memory: ref(null),
    network: ref(null)
  };
  
  const charts = {
    cpu: null,
    memory: null,
    network: null
  };
  
  const chartData = {
    cpu: ref([0, 0, 0, 0, 0, 0]),
    memory: ref([0, 0, 0, 0, 0, 0]),
    network: ref([0, 0, 0, 0, 0, 0]),
    timeLabels: ref(['00:00', '00:00', '00:00', '00:00', '00:00', '00:00'])
  };
  
  const initCharts = (isDarkMode) => {
    if (chartRefs.cpu.value && !charts.cpu) {
      charts.cpu = chartService.initCpuChart(
        chartRefs.cpu.value,
        chartData.cpu.value,
        chartData.timeLabels.value,
        isDarkMode
      );
    }
    
    if (chartRefs.memory.value && !charts.memory) {
      charts.memory = chartService.initMemoryChart(
        chartRefs.memory.value,
        chartData.memory.value,
        chartData.timeLabels.value,
        options.maxMemoryGB || 8,
        isDarkMode
      );
    }
    
    if (chartRefs.network.value && !charts.network) {
      charts.network = chartService.initNetworkChart(
        chartRefs.network.value,
        chartData.network.value,
        chartData.timeLabels.value,
        options.maxNetworkKBs || 1024,
        isDarkMode
      );
    }
  };
  
  const updateCharts = (cpuUsage, memoryUsed, networkRate) => {
    const now = new Date();
    const timeLabel = formatTime(now);
    
    // 更新时间标签
    chartData.timeLabels.value.shift();
    chartData.timeLabels.value.push(timeLabel);
    
    // 更新CPU数据
    chartData.cpu.value.shift();
    chartData.cpu.value.push(Math.round(cpuUsage || 0));
    
    // 更新内存数据 (转换为GB)
    chartData.memory.value.shift();
    const memGB = memoryUsed ? (memoryUsed / (1024 * 1024 * 1024)).toFixed(1) : 0;
    chartData.memory.value.push(parseFloat(memGB));
    
    // 更新网络数据
    chartData.network.value.shift();
    chartData.network.value.push(networkRate);
    
    // 更新图表
    chartService.updateChartData(charts.cpu, chartData.cpu.value, chartData.timeLabels.value);
    chartService.updateChartData(charts.memory, chartData.memory.value, chartData.timeLabels.value);
    chartService.updateChartData(charts.network, chartData.network.value, chartData.timeLabels.value);
  };
  
  const updateChartsTheme = (isDarkMode) => {
    Object.values(charts).forEach(chart => {
      if (chart) {
        chartService.updateChartTheme(chart, isDarkMode);
      }
    });
  };
  
  const resizeCharts = chartService.debounce(() => {
    Object.values(charts).forEach(chart => {
      if (chart) chart.resize();
    });
  }, 200);
  
  onMounted(() => {
    // 添加窗口大小变化监听器
    window.addEventListener('resize', resizeCharts);
  });
  
  onBeforeUnmount(() => {
    // 移除窗口大小变化监听器
    window.removeEventListener('resize', resizeCharts);
    
    // 销毁图表实例
    Object.values(charts).forEach(chart => {
      if (chart) {
        chart.dispose();
      }
    });
  });
  
  return {
    chartRefs,
    charts,
    chartData,
    initCharts,
    updateCharts,
    updateChartsTheme,
    resizeCharts
  };
};

export {
  useDarkMode,
  useTheme
};

export default {
  useWebSocketLogs,
  useInstances,
  useLogs,
  usePerformanceMonitoring,
  useCharts,
  useDarkMode,
  useTheme
};
