import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { fetchInstances as apiFetchInstances } from "@/api/instances";
import { adaptInstancesList } from "@/utils/apiAdapters";
import toastService from "@/services/toastService";

export const useInstanceStore = defineStore("instances", () => {
  // 状态
  const instances = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const lastFetchTime = ref(0);
  const cacheTimeout = ref(5 * 60 * 1000); // 5分钟缓存

  // 请求队列管理 - 防止重复请求
  let fetchPromise = null;
  const requestQueue = new Map();

  // 计算属性
  const instanceStats = computed(() => {
    const total = instances.value.length;
    const running = instances.value.filter(
      (i) => i.status === "running"
    ).length;
    const stopped = instances.value.filter(
      (i) => i.status === "stopped"
    ).length;
    const starting = instances.value.filter(
      (i) => i.status === "starting"
    ).length;
    const stopping = instances.value.filter(
      (i) => i.status === "stopping"
    ).length;

    return {
      total,
      running,
      stopped,
      starting,
      stopping,
    };
  });

  const runningInstances = computed(() =>
    instances.value.filter((i) => i.status === "running")
  );

  const stoppedInstances = computed(() =>
    instances.value.filter((i) => i.status === "stopped")
  );

  // 缓存检查
  const isCacheValid = () => {
    return Date.now() - lastFetchTime.value < cacheTimeout.value;
  };

  // 防重复请求的fetchInstances
  const fetchInstances = async (forceRefresh = false) => {
    // 如果缓存有效且不是强制刷新，直接返回缓存数据
    if (!forceRefresh && isCacheValid() && instances.value.length > 0) {
      console.log("使用缓存的实例数据");
      return instances.value;
    }

    // 如果已有请求在进行中，返回该请求的Promise
    if (fetchPromise) {
      console.log("等待正在进行的实例请求");
      return fetchPromise;
    }

    // 创建新的请求Promise
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

      console.log("发起新的实例列表请求");
      const rawInstances = await apiFetchInstances();

      // 使用适配器处理数据
      const adaptedInstances = adaptInstancesList(rawInstances);

      // 为每个实例添加必要的UI状态
      instances.value = adaptedInstances.map((instance) => ({
        ...instance,
        isLoading: false,
        id: instance.id || instance.name,
      }));

      lastFetchTime.value = Date.now();

      console.log(`成功获取${instances.value.length}个实例`);
      return instances.value;
    } catch (err) {
      console.error("获取实例列表失败:", err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // 更新单个实例状态
  const updateInstanceStatus = (instanceId, status, additionalData = {}) => {
    const instance = instances.value.find(
      (i) => (i.id || i.name) === instanceId
    );

    if (instance) {
      Object.assign(instance, { status, ...additionalData });
      console.log(`更新实例 ${instanceId} 状态为: ${status}`);
    }
  };

  // 设置实例加载状态
  const setInstanceLoading = (instanceId, isLoading) => {
    const instance = instances.value.find(
      (i) => (i.id || i.name) === instanceId
    );

    if (instance) {
      instance.isLoading = isLoading;
    }
  };

  // 添加新实例
  const addInstance = (instance) => {
    const newInstance = {
      ...instance,
      isLoading: false,
      id: instance.id || instance.name,
    };
    instances.value.push(newInstance);
    lastFetchTime.value = Date.now(); // 更新缓存时间
  };

  // 删除实例
  const removeInstance = (instanceId) => {
    const index = instances.value.findIndex(
      (i) => (i.id || i.name) === instanceId
    );

    if (index !== -1) {
      instances.value.splice(index, 1);
      lastFetchTime.value = Date.now(); // 更新缓存时间
    }
  };

  // 批量更新实例状态（用于轮询更新）
  const batchUpdateInstances = (updatedInstances) => {
    if (!Array.isArray(updatedInstances)) return;

    // 创建ID到实例的映射，提高查找效率
    const instanceMap = new Map(
      instances.value.map((i) => [i.id || i.name, i])
    );

    // 批量更新
    updatedInstances.forEach((updated) => {
      const existing = instanceMap.get(updated.id || updated.name);
      if (existing) {
        // 只更新变化的字段
        Object.assign(existing, updated);
      }
    });

    lastFetchTime.value = Date.now();
  };

  // 清除缓存，强制下次获取时重新请求
  const clearCache = () => {
    lastFetchTime.value = 0;
  };

  // 根据ID或名称查找实例
  const findInstance = (instanceId) => {
    return instances.value.find((i) => (i.id || i.name) === instanceId);
  };

  // 过滤实例
  const getFilteredInstances = (filterType, searchQuery) => {
    let result = instances.value;

    // 状态过滤
    if (filterType && filterType !== "all") {
      result = result.filter((instance) => {
        if (filterType === "not_running") {
          return instance.status === "stopped";
        }
        return instance.status === filterType;
      });
    }

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (instance) =>
          instance.name.toLowerCase().includes(query) ||
          (instance.description &&
            instance.description.toLowerCase().includes(query))
      );
    }

    return result;
  };

  // 重置状态
  const reset = () => {
    instances.value = [];
    loading.value = false;
    error.value = null;
    lastFetchTime.value = 0;
    fetchPromise = null;
    requestQueue.clear();
  };

  return {
    // 状态
    instances,
    loading,
    error,
    lastFetchTime,

    // 计算属性
    instanceStats,
    runningInstances,
    stoppedInstances,

    // 方法
    fetchInstances,
    updateInstanceStatus,
    setInstanceLoading,
    addInstance,
    removeInstance,
    batchUpdateInstances,
    clearCache,
    findInstance,
    getFilteredInstances,
    isCacheValid,
    reset,
  };
});
