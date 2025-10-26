import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { WebSocketService } from "../services/websocket";
import * as instancesApi from "../api/instances";
import * as logsApi from "../api/logs";
import * as chartService from "../services/charts";
import {
  useDarkMode as useThemeDarkMode,
  useTheme as useThemeService,
} from "../services/theme";
import { formatTime } from "../utils/formatters";
import eventBus from "../services/eventBus";

/**
 * 使用WebSocket连接日志服务
 * @param {Object} options 选项
 * @returns {Object} WebSocket相关状态和方法
 */
export const useWebSocketLogs = (options = {}) => {
  const logs = ref([]);
  const connected = ref(false);
  const wsService = new WebSocketService({
    url: options.url || "/api/logs/ws",
    autoReconnect: options.autoReconnect !== false,
    reconnectDelay: options.reconnectDelay || 3000,
  });

  const addLog = (log) => {
    if (typeof log === "string") {
      log = {
        time: formatTime(new Date()),
        level: "INFO",
        message: log,
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
    wsService.on("open", () => {
      connected.value = true;
      addLog({
        time: formatTime(new Date()),
        level: "INFO",
        message: "WebSocket连接已建立",
      });
    });

    wsService.on("message", (data) => {
      if (data && options.filter && !options.filter(data)) {
        return; // 如果有过滤函数并且返回false，则忽略此消息
      }
      addLog(data);
    });

    wsService.on("error", (error) => {
      connected.value = false;
      addLog({
        time: formatTime(new Date()),
        level: "ERROR",
        message: `WebSocket错误: ${error}`,
      });
    });

    wsService.on("close", () => {
      connected.value = false;
      addLog({
        time: formatTime(new Date()),
        level: "WARNING",
        message: "WebSocket连接已关闭，正在重连...",
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
    wsService,
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
      console.error("加载实例失败:", err);
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
    eventBus.on("refresh-instances", fetchInstances);
  });

  onBeforeUnmount(() => {
    eventBus.off("refresh-instances", fetchInstances);
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
    openFolder: instancesApi.openFolder,
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
  const source = ref(options.source || "system");

  const fetchLogs = async () => {
    loading.value = true;
    try {
      if (source.value === "system") {
        logs.value = await logsApi.fetchSystemLogs();
      } else {
        logs.value = await logsApi.fetchInstanceLogs(source.value);
      }
    } catch (err) {
      console.error("获取日志失败:", err);
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
    exportLogs: () => logsApi.exportLogs(logs.value, source.value),
  };
};

/**
 * 使用性能监控API
 * @returns {Object} 性能监控相关状态和方法
 */
export const usePerformanceMonitoring = () => {
  const stats = ref({
    cpu: {
      usage: 0,
      model: "Intel Core i7-12700K",
      cores: 12,
      frequency: 3.6,
      temperature: 45,
    },
    gpu: {
      usage: 0,
      model: "NVIDIA RTX 3080",
      memory: {
        used: 2.5 * 1024 * 1024 * 1024,
        total: 10 * 1024 * 1024 * 1024,
      },
      temperature: 65,
    },
    memory: {
      used: 0,
      available: 0,
      total: 16 * 1024 * 1024 * 1024,
      percentage: 0,
    },
    network: {
      uploadSpeed: 0,
      downloadSpeed: 0,
      uploaded: 0,
      downloaded: 0,
    },
  });
  const isRefreshing = ref(false);
  const refreshStats = async () => {
    isRefreshing.value = true;
    try {
      // 这里应该调用真实的系统统计API
      // TODO: 实现真实的系统性能数据获取
      throw new Error("系统性能统计功能需要后端API支持");
    } catch (error) {
      console.error("获取系统性能统计失败:", error);
      throw error;
    } finally {
      isRefreshing.value = false;
    }
  };

  return {
    stats,
    isRefreshing,
    refreshStats,
  };
};

/**
 * 图表组合式API
 * @param {Object} options 图表选项
 * @returns {Object} 图表相关状态和方法
 */
export const useCharts = (options = {}) => {
  // 图表引用集合
  const chartRefs = ref({});
  const charts = {};
  const chartData = ref({});

  // 初始化图表
  const initializeCharts = () => {
    // 初始化逻辑将由调用者实现
  };

  // 更新图表数据
  const updateChartData = (key, data) => {
    chartData.value[key] = data;
  };

  // 刷新所有图表
  const refreshCharts = () => {
    Object.keys(charts).forEach((key) => {
      if (charts[key] && chartData.value[key]) {
        // 使用图表特定的更新逻辑
      }
    });
  };

  // 调整图表大小
  const resizeCharts = () => {
    Object.values(charts).forEach((chart) => chart?.resize());
  };

  // 清理图表
  const disposeCharts = () => {
    Object.values(charts).forEach((chart) => chart?.dispose());
    Object.keys(charts).forEach((key) => (charts[key] = null));
  };

  // 监听窗口大小变化
  onMounted(() => {
    window.addEventListener("resize", resizeCharts);
  });

  // 组件销毁时清理
  onBeforeUnmount(() => {
    window.removeEventListener("resize", resizeCharts);
    disposeCharts();
  });

  return {
    chartRefs,
    chartData,
    initializeCharts,
    updateChartData,
    refreshCharts,
    resizeCharts,
    disposeCharts,
  };
};

/**
 * 深色模式组合式API - 移除重复代码，使用服务中的实现
 */
export const useDarkMode = (emitter) => {
  return useThemeDarkMode(emitter);
};

/**
 * 主题组合式API - 移除重复代码，使用服务中的实现
 */
export const useTheme = () => {
  return useThemeService();
};

export default {
  useWebSocketLogs,
  useInstances,
  useLogs,
  usePerformanceMonitoring,
  useCharts,
  useDarkMode,
  useTheme,
};
