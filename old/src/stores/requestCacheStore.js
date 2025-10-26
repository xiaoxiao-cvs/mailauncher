import { ref } from "vue";
import { defineStore } from "pinia";

export const useRequestCacheStore = defineStore("requestCache", () => {
  // 缓存存储
  const cache = ref(new Map());
  const pendingRequests = ref(new Map());

  // 默认缓存时间（毫秒）
  const defaultCacheTTL = ref(5 * 60 * 1000); // 5分钟

  // 缓存配置
  const cacheConfig = ref({
    instances: { ttl: 30 * 1000, maxSize: 10 }, // 30秒，最多10个条目
    "system-stats": { ttl: 10 * 1000, maxSize: 5 }, // 10秒，最多5个条目
    "deploy-status": { ttl: 5 * 1000, maxSize: 20 }, // 5秒，最多20个条目
    versions: { ttl: 10 * 60 * 1000, maxSize: 5 }, // 10分钟，最多5个条目
  });

  // 生成缓存key
  const generateCacheKey = (
    url,
    method = "GET",
    params = null,
    data = null
  ) => {
    const key = `${method}:${url}`;
    if (params) {
      const paramStr = new URLSearchParams(params).toString();
      return `${key}?${paramStr}`;
    }
    if (data) {
      const dataStr = JSON.stringify(data);
      return `${key}:${btoa(dataStr)}`;
    }
    return key;
  };
  // 获取缓存条目的类型
  const getCacheType = (url) => {
    if (url.includes("/instances")) return "instances";
    if (url.includes("/system") || url.includes("/metrics"))
      return "system-stats";
    if (url.includes("/deploy") || url.includes("/install-status"))
      return "deploy-status";
    if (url.includes("/versions")) return "versions";
    return "default";
  };

  // 检查缓存是否有效
  const isCacheValid = (cacheEntry, cacheType = "default") => {
    if (!cacheEntry) return false;

    const config = cacheConfig.value[cacheType] || {
      ttl: defaultCacheTTL.value,
    };
    const now = Date.now();

    return now - cacheEntry.timestamp < config.ttl;
  };

  // 强制使缓存失效
  const invalidateCache = (cacheKey) => {
    if (cache.value.has(cacheKey)) {
      cache.value.delete(cacheKey);
      console.log(`强制失效缓存: ${cacheKey}`);
      return true;
    }
    return false;
  };

  // 批量失效相关缓存
  const invalidateCacheByPattern = (pattern) => {
    const keysToDelete = [];

    for (const [key] of cache.value) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      cache.value.delete(key);
      console.log(`批量失效缓存: ${key}`);
    });

    return keysToDelete.length;
  };

  // 获取缓存数据
  const getCachedData = (cacheKey) => {
    const cacheEntry = cache.value.get(cacheKey);
    if (!cacheEntry) return null;

    const cacheType = getCacheType(cacheKey);
    if (!isCacheValid(cacheEntry, cacheType)) {
      // 缓存过期，删除
      cache.value.delete(cacheKey);
      return null;
    }

    console.log(`缓存命中: ${cacheKey}`);
    return cacheEntry.data;
  };

  // 设置缓存数据
  const setCachedData = (cacheKey, data) => {
    const cacheType = getCacheType(cacheKey);
    const config = cacheConfig.value[cacheType] || {};

    // 检查缓存大小限制
    if (config.maxSize && cache.value.size >= config.maxSize) {
      // 删除最旧的缓存条目
      const oldestKey = Array.from(cache.value.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      )[0]?.[0];

      if (oldestKey) {
        cache.value.delete(oldestKey);
        console.log(`删除最旧缓存: ${oldestKey}`);
      }
    }

    cache.value.set(cacheKey, {
      data,
      timestamp: Date.now(),
      cacheType,
    });

    console.log(`设置缓存: ${cacheKey}`);
  };

  // 缓存的API请求包装器
  const cachedRequest = async (requestFn, cacheKey, forceRefresh = false) => {
    // 检查是否强制刷新
    if (!forceRefresh) {
      // 检查缓存
      const cachedData = getCachedData(cacheKey);
      if (cachedData !== null) {
        return cachedData;
      }
    }

    // 检查是否有相同的请求正在进行
    if (pendingRequests.value.has(cacheKey)) {
      console.log(`等待进行中的请求: ${cacheKey}`);
      return pendingRequests.value.get(cacheKey);
    }

    // 创建新的请求Promise
    const requestPromise = requestFn()
      .then((data) => {
        // 请求成功，缓存数据
        setCachedData(cacheKey, data);
        return data;
      })
      .catch((error) => {
        // 请求失败，不缓存
        throw error;
      })
      .finally(() => {
        // 清除进行中的请求记录
        pendingRequests.value.delete(cacheKey);
      });

    // 记录进行中的请求
    pendingRequests.value.set(cacheKey, requestPromise);

    return requestPromise;
  };

  // 批量清除缓存
  const clearCacheByPattern = (pattern) => {
    const keysToDelete = [];

    for (const [key] of cache.value) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      cache.value.delete(key);
      console.log(`清除缓存: ${key}`);
    });

    return keysToDelete.length;
  };

  // 清除指定类型的缓存
  const clearCacheByType = (cacheType) => {
    const keysToDelete = [];

    for (const [key, entry] of cache.value) {
      if (entry.cacheType === cacheType) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      cache.value.delete(key);
    });

    console.log(`清除${cacheType}类型缓存，共${keysToDelete.length}个条目`);
    return keysToDelete.length;
  };

  // 清除过期缓存
  const clearExpiredCache = () => {
    const keysToDelete = [];

    for (const [key, entry] of cache.value) {
      if (!isCacheValid(entry, entry.cacheType)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      cache.value.delete(key);
    });

    console.log(`清除过期缓存，共${keysToDelete.length}个条目`);
    return keysToDelete.length;
  };

  // 清除所有缓存
  const clearAllCache = () => {
    const size = cache.value.size;
    cache.value.clear();
    pendingRequests.value.clear();
    console.log(`清除所有缓存，共${size}个条目`);
    return size;
  };

  // 获取缓存统计信息
  const getCacheStats = () => {
    const stats = {
      total: cache.value.size,
      byType: {},
      pendingRequests: pendingRequests.value.size,
    };

    for (const [, entry] of cache.value) {
      const type = entry.cacheType || "unknown";
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }

    return stats;
  };

  // 更新缓存配置
  const updateCacheConfig = (type, config) => {
    cacheConfig.value[type] = { ...cacheConfig.value[type], ...config };
  };

  // 预热缓存（可用于应用启动时）
  const warmupCache = async (requestsList) => {
    console.log("开始缓存预热");

    const promises = requestsList.map(async ({ requestFn, cacheKey }) => {
      try {
        await cachedRequest(requestFn, cacheKey);
        console.log(`预热成功: ${cacheKey}`);
      } catch (error) {
        console.warn(`预热失败: ${cacheKey}`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log("缓存预热完成");
  };
  return {
    // 状态
    cache,
    pendingRequests,
    defaultCacheTTL,
    cacheConfig,

    // 方法
    generateCacheKey,
    getCachedData,
    setCachedData,
    cachedRequest,
    clearCacheByPattern,
    clearCacheByType,
    clearExpiredCache,
    clearAllCache,
    getCacheStats,
    updateCacheConfig,
    warmupCache,
    isCacheValid,
    invalidateCache,
    invalidateCacheByPattern,

    // 便捷方法（向后兼容）
    get: getCachedData,
    set: setCachedData,
  };
});
