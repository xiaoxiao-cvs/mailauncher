import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { WebSocketService } from "../services/websocket";
import * as instancesApi from "../api/instances";
import * as logsApi from "../api/logs";
import * as chartService from "../services/charts";
import { useDarkMode, useTheme } from "../services/theme";
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
      // 模拟延迟
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 生成模拟数据
      stats.value.cpu.usage = Math.floor(20 + Math.random() * 40);
      stats.value.cpu.temperature = 40 + Math.floor(stats.value.cpu.usage / 5);

      stats.value.gpu.usage = Math.floor(15 + Math.random() * 60);
      stats.value.gpu.temperature = 50 + Math.floor(stats.value.gpu.usage / 4);
      stats.value.gpu.memory.used =
        (2 + Math.random() * 6) * 1024 * 1024 * 1024;

      const memUsed = (5 + Math.random() * 8) * 1024 * 1024 * 1024;
      stats.value.memory.used = memUsed;
      stats.value.memory.available = stats.value.memory.total - memUsed;
      stats.value.memory.percentage = Math.round(
        (memUsed / stats.value.memory.total) * 100
      );

      const uploadSpeed = Math.random() * 2 * 1024 * 1024; // 0-2 MB/s
      const downloadSpeed = Math.random() * 10 * 1024 * 1024; // 0-10 MB/s
      stats.value.network.uploadSpeed = uploadSpeed;
      stats.value.network.downloadSpeed = downloadSpeed;

      stats.value.network.uploaded += uploadSpeed;
      stats.value.network.downloaded += downloadSpeed;
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
 * 深色模式组合式API
 */
export const useDarkMode = () => {
  const isDarkMode = ref(false);

  onMounted(() => {
    // 检查本地存储或系统偏好
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode !== null) {
      isDarkMode.value = savedMode === "true";
    } else {
      // 检查系统偏好
      isDarkMode.value = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
    }

    // 应用深色模式
    applyDarkMode(isDarkMode.value);
  });

  const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value;
    localStorage.setItem("darkMode", isDarkMode.value.toString());
    applyDarkMode(isDarkMode.value);
  };

  const applyDarkMode = (isDark) => {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark-mode");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark-mode");
    }
  };

  return {
    isDarkMode,
    toggleDarkMode,
  };
};

/**
 * 主题组合式API
 */
export const useTheme = () => {
  const currentTheme = ref(localStorage.getItem("theme") || "light");
  const availableThemes = ref([
    { name: "light", color: "#e5e7eb", label: "明亮" },
    { name: "dark", color: "#2a303c", label: "暗黑" },
    { name: "cupcake", color: "#65c3c8", label: "蛋糕" },
    { name: "bumblebee", color: "#e0a82e", label: "大黄蜂" },
    { name: "emerald", color: "#66cc8a", label: "翡翠" },
    { name: "corporate", color: "#4b6bfb", label: "企业" },
    { name: "synthwave", color: "#e779c1", label: "合成波" },
    { name: "retro", color: "#ef9995", label: "复古" },
    { name: "cyberpunk", color: "#ff7598", label: "赛博朋克" },
    // ...existing code...
  ]);

  onMounted(() => {
    if (savedTheme) {
      currentTheme.value = savedTheme;
      applyTheme(savedTheme);
    }
  });

  const setTheme = (themeName) => {
    const theme = availableThemes.value.find((t) => t.name === themeName);
    if (theme) {
      currentTheme.value = themeName;
      localStorage.setItem("theme", themeName);
      applyTheme(themeName);

      // 发送主题变化事件
      if (emitter) {
        emitter.emit("theme-changed", themeName);
      }
    }
  };

  const applyTheme = (themeName) => {
    const theme = availableThemes.value.find((t) => t.name === themeName);
    if (theme) {
      document.documentElement.setAttribute("data-theme", themeName);
      document.documentElement.style.setProperty("--p", theme.color);
      // 为DaisyUI设置主色变量
      document.documentElement.style.setProperty("--primary", theme.color);
    }
  };

  return {
    currentTheme,
    availableThemes,
    setTheme,
  };
};

export { useDarkMode, useTheme };

export default {
  useWebSocketLogs,
  useInstances,
  useLogs,
  usePerformanceMonitoring,
  useCharts,
  useDarkMode,
  useTheme,
};
