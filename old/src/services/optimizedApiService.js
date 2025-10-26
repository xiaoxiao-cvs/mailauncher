import apiService from "@/services/apiService";
import {
  startInstance as apiStartInstance,
  stopInstance as apiStopInstance,
  restartInstance as apiRestartInstance,
  deleteInstance as apiDeleteInstance,
  fetchInstances as apiFetchInstances,
} from "@/api/instances";
import deployApi from "@/services/deployApi";

/**
 * 优化的API服务 - 防重复请求和批量处理（已移除缓存功能）
 */
export class OptimizedApiService {
  constructor() {
    // 请求批处理队列
    this.batchQueue = new Map();
    this.batchTimer = null;
    this.batchDelay = 100; // 100ms批处理延迟

    // 实例操作队列
    this.instanceOperations = new Map();
  }
  /**
   * 直接获取实例列表，不使用缓存
   */
  async getInstances(forceRefresh = false) {
    return apiFetchInstances();
  }
  /**
   * 带缓存的系统状态获取
   */
  async getSystemStats(forceRefresh = false) {
    const cacheKey = this.cacheStore.generateCacheKey("/system/metrics", "GET");

    return this.cacheStore.cachedRequest(
      () => apiService.get("/api/v1/system/metrics"),
      cacheKey,
      forceRefresh
    );
  }

  /**
   * 带缓存的版本列表获取
   */
  async getVersions(forceRefresh = false) {
    const cacheKey = this.cacheStore.generateCacheKey(
      "/deploy/versions",
      "GET"
    );

    return this.cacheStore.cachedRequest(
      () => deployApi.getVersions(),
      cacheKey,
      forceRefresh
    );
  }

  /**
   * 带缓存的服务列表获取
   */
  async getServices(forceRefresh = false) {
    const cacheKey = this.cacheStore.generateCacheKey(
      "/deploy/services",
      "GET"
    );

    return this.cacheStore.cachedRequest(
      () => deployApi.getServices(),
      cacheKey,
      forceRefresh
    );
  }

  /**
   * 部署状态检查（高频轮询优化）
   */
  async checkDeployStatus(instanceId, forceRefresh = false) {
    const cacheKey = this.cacheStore.generateCacheKey(
      `/deploy/install-status/${instanceId}`,
      "GET"
    );

    return this.cacheStore.cachedRequest(
      () => deployApi.checkInstallStatus(instanceId),
      cacheKey,
      forceRefresh
    );
  }

  /**
   * 批量实例状态检查
   */
  async batchCheckInstanceStatus(instanceIds) {
    if (!Array.isArray(instanceIds) || instanceIds.length === 0) {
      return {};
    }

    console.log(`批量检查${instanceIds.length}个实例状态`);

    // 将请求添加到批处理队列
    const promises = instanceIds.map((instanceId) =>
      this._addToBatchQueue("instance-status", instanceId)
    );

    // 触发批处理
    this._processBatchQueue();

    // 等待所有结果
    const results = await Promise.allSettled(promises);

    // 组织返回结果
    const statusMap = {};
    results.forEach((result, index) => {
      const instanceId = instanceIds[index];
      if (result.status === "fulfilled") {
        statusMap[instanceId] = result.value;
      } else {
        console.error(`获取实例${instanceId}状态失败:`, result.reason);
        statusMap[instanceId] = { error: result.reason.message };
      }
    });

    return statusMap;
  }

  /**
   * 防重复的实例操作
   */
  async performInstanceOperation(instanceId, operation, additionalData = {}) {
    const operationKey = `${instanceId}:${operation}`;

    // 检查是否有相同操作正在进行
    if (this.instanceOperations.has(operationKey)) {
      console.log(`实例操作已在进行中: ${operationKey}`);
      return this.instanceOperations.get(operationKey);
    }

    // 创建操作Promise
    const operationPromise = this._executeInstanceOperation(
      instanceId,
      operation,
      additionalData
    ).finally(() => {
      // 操作完成后清除记录
      this.instanceOperations.delete(operationKey);

      // 清除实例相关缓存
      this._invalidateInstanceCache(instanceId);
    });

    // 记录正在进行的操作
    this.instanceOperations.set(operationKey, operationPromise);

    return operationPromise;
  }

  /**
   * 执行实例操作
   */
  async _executeInstanceOperation(instanceId, operation, additionalData) {
    console.log(`执行实例操作: ${instanceId} - ${operation}`);

    switch (operation) {
      case "start":
        return apiStartInstance(instanceId);
      case "stop":
        return apiStopInstance(instanceId);
      case "restart":
        return apiRestartInstance(instanceId);
      case "delete":
        return apiDeleteInstance(instanceId);
      default:
        throw new Error(`不支持的实例操作: ${operation}`);
    }
  }

  /**
   * 添加到批处理队列
   */
  _addToBatchQueue(requestType, param) {
    return new Promise((resolve, reject) => {
      if (!this.batchQueue.has(requestType)) {
        this.batchQueue.set(requestType, []);
      }

      this.batchQueue.get(requestType).push({
        param,
        resolve,
        reject,
      });
    });
  }

  /**
   * 处理批处理队列
   */
  _processBatchQueue() {
    if (this.batchTimer) {
      return;
    }

    this.batchTimer = setTimeout(async () => {
      try {
        await this._executeBatchRequests();
      } finally {
        this.batchTimer = null;
      }
    }, this.batchDelay);
  }

  /**
   * 执行批处理请求
   */
  async _executeBatchRequests() {
    for (const [requestType, requests] of this.batchQueue) {
      if (requests.length === 0) continue;

      try {
        await this._executeBatchRequestType(requestType, requests);
      } catch (error) {
        console.error(`批处理请求失败: ${requestType}`, error);

        // 批处理失败时，拒绝所有相关Promise
        requests.forEach((req) => req.reject(error));
      }
    }

    // 清空队列
    this.batchQueue.clear();
  }

  /**
   * 执行特定类型的批处理请求
   */
  async _executeBatchRequestType(requestType, requests) {
    switch (requestType) {
      case "instance-status":
        await this._batchGetInstanceStatus(requests);
        break;
      default:
        throw new Error(`不支持的批处理请求类型: ${requestType}`);
    }
  }

  /**
   * 批量获取实例状态
   */
  async _batchGetInstanceStatus(requests) {
    try {
      // 获取所有实例的最新数据
      const instances = await this.getInstances(true);

      // 为每个请求返回对应的实例状态
      requests.forEach((req) => {
        const instance = instances.find((i) => (i.id || i.name) === req.param);

        if (instance) {
          req.resolve({
            status: instance.status,
            isLoading: instance.isLoading || false,
          });
        } else {
          req.reject(new Error(`实例不存在: ${req.param}`));
        }
      });
    } catch (error) {
      requests.forEach((req) => req.reject(error));
    }
  }
  /**
   * 实例缓存失效（已移除缓存功能，保留方法以兼容现有代码）
   */
  _invalidateInstanceCache(instanceId = null) {
    // 缓存功能已移除，此方法现在为空实现
    console.log("实例缓存功能已移除，无需清理缓存");
  }

  /**
   * 预加载关键数据
   */
  async preloadCriticalData() {
    console.log("预加载关键数据");

    const preloadTasks = [
      {
        requestFn: () => this.getInstances(),
        cacheKey: this.cacheStore.generateCacheKey("/instances", "GET"),
      },
      {
        requestFn: () => this.getVersions(),
        cacheKey: this.cacheStore.generateCacheKey("/deploy/versions", "GET"),
      },
      {
        requestFn: () => this.getServices(),
        cacheKey: this.cacheStore.generateCacheKey("/deploy/services", "GET"),
      },
    ];

    await this.cacheStore.warmupCache(preloadTasks);
  }

  /**
   * 优化的轮询更新
   */
  async pollUpdate(dataType, options = {}) {
    const { forceRefresh = false, batchSize = 10, interval = 30000 } = options;

    switch (dataType) {
      case "instances":
        return this.getInstances(forceRefresh);

      case "system-stats":
        return this.getSystemStats(forceRefresh);

      case "instance-status":
        // 批量更新实例状态
        const instances = await this.getInstances();
        const instanceIds = instances
          .map((i) => i.id || i.name)
          .slice(0, batchSize);
        return this.batchCheckInstanceStatus(instanceIds);

      default:
        throw new Error(`不支持的轮询数据类型: ${dataType}`);
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.batchQueue.clear();
    this.instanceOperations.clear();
    this.cacheStore.clearAllCache();
  }

  /**
   * 获取服务统计信息
   */
  getStats() {
    return {
      cacheStats: this.cacheStore.getCacheStats(),
      pendingOperations: this.instanceOperations.size,
      batchQueueSize: Array.from(this.batchQueue.values()).reduce(
        (total, queue) => total + queue.length,
        0
      ),
    };
  }
}

// 创建单例实例
export const optimizedApi = new OptimizedApiService();

// 默认导出
export default optimizedApi;
