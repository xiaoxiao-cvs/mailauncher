import { ref, computed } from "vue";
import { defineStore } from "pinia";
import apiService from "@/services/apiService";

export const useSystemStore = defineStore("system", () => {
  // 系统性能状态
  const systemStats = ref({
    cpu: {
      usage: 0,
      cores: 8,
      model: "Intel(R) Core(TM) i7-8700K",
    },
    memory: {
      total: 16 * 1024 * 1024 * 1024, // 16GB
      used: 0,
      available: 0,
      usage: 0,
    },
    disk: {
      total: 1024 * 1024 * 1024 * 1024, // 1TB
      used: 0,
      available: 0,
      usage: 0,
    },
    network: {
      up: 0,
      down: 0,
      rate: 1024 * 1024, // 1MB/s
    },
  });

  const loading = ref(false);
  const error = ref(null);
  const lastFetchTime = ref(0);
  const cacheTimeout = ref(30 * 1000); // 30秒缓存

  // 轮询控制
  let pollingTimer = null;
  const pollingInterval = ref(10000); // 默认10秒
  const isPolling = ref(false);

  // 请求防重复
  let fetchPromise = null;

  // 计算属性
  const memoryUsagePercent = computed(() =>
    systemStats.value.memory.total > 0
      ? Math.round(
          (systemStats.value.memory.used / systemStats.value.memory.total) * 100
        )
      : 0
  );

  const diskUsagePercent = computed(() =>
    systemStats.value.disk.total > 0
      ? Math.round(
          (systemStats.value.disk.used / systemStats.value.disk.total) * 100
        )
      : 0
  );

  const cpuUsagePercent = computed(() =>
    Math.round(systemStats.value.cpu.usage)
  );

  // 缓存检查
  const isCacheValid = () => {
    return Date.now() - lastFetchTime.value < cacheTimeout.value;
  };

  // 获取系统性能数据（带缓存和防重复）
  const fetchSystemStats = async (forceRefresh = false) => {
    // 缓存检查
    if (!forceRefresh && isCacheValid()) {
      console.log("使用缓存的系统性能数据");
      return systemStats.value;
    }

    // 防重复请求
    if (fetchPromise) {
      console.log("等待正在进行的系统性能请求");
      return fetchPromise;
    }

    fetchPromise = _performFetch();

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      fetchPromise = null;
    }
  };

  // 实际执行获取数据的方法
  const _performFetch = async () => {
    try {
      loading.value = true;
      error.value = null;
      console.log("发起新的系统性能请求");

      // 尝试从API获取真实数据
      try {
        const response = await apiService.get("/api/v1/system/metrics");
        if (response.data && response.data.data) {
          // 适配后端返回的数据结构
          _adaptBackendData(response.data.data);
        } else {
          throw new Error("API响应数据格式错误");
        }
      } catch (apiError) {
        console.error("API获取系统性能失败:", apiError);
        throw new Error(`无法获取系统性能数据: ${apiError.message}`);
      }

      lastFetchTime.value = Date.now();
      console.log("系统性能数据更新完成");

      return systemStats.value;
    } catch (err) {
      console.error("获取系统性能失败:", err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };
  // 适配后端返回的数据结构
  const _adaptBackendData = (backendData) => {
    try {
      console.log("适配后端数据:", backendData);

      // 适配CPU数据
      if (backendData.cpu_usage_percent !== undefined) {
        systemStats.value.cpu.usage = Math.round(backendData.cpu_usage_percent);
      }

      // 从system_info中提取CPU信息
      if (backendData.system_info && backendData.system_info.processor) {
        systemStats.value.cpu.model = backendData.system_info.processor;
      }

      // 检测CPU核心数（目前后端没有提供，使用导航器API检测）
      if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
        systemStats.value.cpu.cores = navigator.hardwareConcurrency;
      }

      // 适配内存数据
      if (backendData.memory_usage) {
        const memData = backendData.memory_usage;
        systemStats.value.memory.total = memData.total_mb * 1024 * 1024; // 转换为字节
        systemStats.value.memory.used = memData.used_mb * 1024 * 1024;
        systemStats.value.memory.available = memData.available_mb * 1024 * 1024;
        systemStats.value.memory.usage = Math.round(memData.percent);
      }

      // 适配磁盘数据
      if (backendData.disk_usage_root) {
        const diskData = backendData.disk_usage_root;
        systemStats.value.disk.total = diskData.total_gb * 1024 * 1024 * 1024; // 转换为字节
        systemStats.value.disk.used = diskData.used_gb * 1024 * 1024 * 1024;
        systemStats.value.disk.available =
          diskData.free_gb * 1024 * 1024 * 1024;
        systemStats.value.disk.usage = Math.round(diskData.percent);
      } // 网络数据（如果后端没有提供，使用默认值）
      if (!backendData.network_up && !backendData.network_down) {
        systemStats.value.network.up = 0;
        systemStats.value.network.down = 0;
        systemStats.value.network.rate = 0;
      } else {
        systemStats.value.network.up = backendData.network_up || 0;
        systemStats.value.network.down = backendData.network_down || 0;
        systemStats.value.network.rate =
          (backendData.network_up || 0) + (backendData.network_down || 0);
      }

      console.log("数据适配完成:", systemStats.value);
    } catch (error) {
      console.error("数据适配失败:", error);
      throw error;
    }
  };
  // 启动性能监控轮询
  const startPolling = (interval = pollingInterval.value) => {
    if (isPolling.value) {
      console.log("性能监控轮询已在运行");
      return;
    }

    console.log(`启动系统性能轮询，间隔: ${interval}ms`);
    pollingInterval.value = interval;
    isPolling.value = true;

    // 立即获取一次数据
    fetchSystemStats();

    // 设置定时器
    pollingTimer = setInterval(() => {
      fetchSystemStats();
    }, interval);
  };

  // 停止性能监控轮询
  const stopPolling = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
    isPolling.value = false;
    console.log("系统性能轮询已停止");
  };

  // 更新轮询间隔
  const updatePollingInterval = (newInterval) => {
    if (newInterval !== pollingInterval.value) {
      pollingInterval.value = newInterval;

      if (isPolling.value) {
        // 重启轮询以使用新间隔
        stopPolling();
        startPolling(newInterval);
      }
    }
  };

  // 手动刷新
  const refresh = () => {
    clearCache();
    return fetchSystemStats(true);
  };

  // 清除缓存
  const clearCache = () => {
    lastFetchTime.value = 0;
  };

  // 重置状态
  const reset = () => {
    stopPolling();
    systemStats.value = {
      cpu: { usage: 0, cores: 8, model: "Intel(R) Core(TM) i7-8700K" },
      memory: {
        total: 16 * 1024 * 1024 * 1024,
        used: 0,
        available: 0,
        usage: 0,
      },
      disk: {
        total: 1024 * 1024 * 1024 * 1024,
        used: 0,
        available: 0,
        usage: 0,
      },
      network: { up: 0, down: 0, rate: 1024 * 1024 },
    };
    loading.value = false;
    error.value = null;
    lastFetchTime.value = 0;
    fetchPromise = null;
  };

  return {
    // 状态
    systemStats,
    loading,
    error,
    isPolling,
    pollingInterval,

    // 计算属性
    memoryUsagePercent,
    diskUsagePercent,
    cpuUsagePercent,

    // 方法
    fetchSystemStats,
    startPolling,
    stopPolling,
    updatePollingInterval,
    refresh,
    clearCache,
    isCacheValid,
    reset,
  };
});
