import { ref } from "vue";
import { defineStore } from "pinia";
import { useInstanceStore } from "./instanceStore";
import { useSystemStore } from "./systemStore";

export const usePollingStore = defineStore("polling", () => {
  // 轮询管理状态
  const pollingTasks = ref(new Map());
  const isGlobalPollingActive = ref(false);

  // 默认轮询配置
  const defaultPollingConfig = ref({
    instances: {
      interval: 30000, // 30秒
      enabled: true,
      priority: "high",
    },
    systemStats: {
      interval: 10000, // 10秒
      enabled: true,
      priority: "medium",
    },
    deployStatus: {
      interval: 2000, // 2秒（部署状态需要更频繁）
      enabled: false, // 按需启用
      priority: "high",
    },
  });

  // 轮询任务状态
  const pollingStatus = ref(new Map());

  // 注册轮询任务
  const registerPollingTask = (taskName, pollingFn, config = {}) => {
    const finalConfig = {
      ...defaultPollingConfig.value[taskName],
      ...config,
    };

    // 如果任务已存在，先停止
    if (pollingTasks.value.has(taskName)) {
      stopPolling(taskName);
    }

    pollingTasks.value.set(taskName, {
      fn: pollingFn,
      config: finalConfig,
      timer: null,
      lastExecuted: 0,
      errorCount: 0,
      isRunning: false,
    });

    pollingStatus.value.set(taskName, {
      enabled: finalConfig.enabled,
      interval: finalConfig.interval,
      lastExecuted: 0,
      lastError: null,
      errorCount: 0,
    });

    console.log(`注册轮询任务: ${taskName}`, finalConfig);
  };

  // 启动特定轮询任务
  const startPolling = (taskName, config = {}) => {
    const task = pollingTasks.value.get(taskName);
    if (!task) {
      console.error(`轮询任务不存在: ${taskName}`);
      return false;
    }

    // 更新配置
    if (Object.keys(config).length > 0) {
      Object.assign(task.config, config);
      const status = pollingStatus.value.get(taskName);
      Object.assign(status, config);
    }

    // 如果已在运行，先停止
    if (task.timer) {
      clearInterval(task.timer);
    }

    // 立即执行一次
    _executePollingTask(taskName);

    // 设置定时器
    task.timer = setInterval(() => {
      _executePollingTask(taskName);
    }, task.config.interval);

    task.isRunning = true;
    pollingStatus.value.get(taskName).enabled = true;

    console.log(`启动轮询任务: ${taskName}, 间隔: ${task.config.interval}ms`);
    return true;
  };

  // 停止特定轮询任务
  const stopPolling = (taskName) => {
    const task = pollingTasks.value.get(taskName);
    if (!task) {
      console.error(`轮询任务不存在: ${taskName}`);
      return false;
    }

    if (task.timer) {
      clearInterval(task.timer);
      task.timer = null;
    }

    task.isRunning = false;
    pollingStatus.value.get(taskName).enabled = false;

    console.log(`停止轮询任务: ${taskName}`);
    return true;
  };

  // 执行轮询任务
  const _executePollingTask = async (taskName) => {
    const task = pollingTasks.value.get(taskName);
    const status = pollingStatus.value.get(taskName);

    if (!task || !task.config.enabled) {
      return;
    }

    try {
      console.log(`执行轮询任务: ${taskName}`);
      await task.fn();

      // 更新状态
      task.lastExecuted = Date.now();
      task.errorCount = 0;
      status.lastExecuted = task.lastExecuted;
      status.lastError = null;
      status.errorCount = 0;
    } catch (error) {
      console.error(`轮询任务执行失败: ${taskName}`, error);

      // 更新错误状态
      task.errorCount++;
      status.errorCount = task.errorCount;
      status.lastError = error.message;

      // 如果连续错误次数过多，暂停任务
      if (task.errorCount >= 5) {
        console.warn(`轮询任务错误次数过多，暂停任务: ${taskName}`);
        stopPolling(taskName);
      }
    }
  };

  // 启动所有轮询任务
  const startAllPolling = () => {
    if (isGlobalPollingActive.value) {
      console.log("全局轮询已启动");
      return;
    }

    console.log("启动所有轮询任务");

    for (const [taskName, task] of pollingTasks.value) {
      if (task.config.enabled) {
        startPolling(taskName);
      }
    }

    isGlobalPollingActive.value = true;
  };

  // 停止所有轮询任务
  const stopAllPolling = () => {
    console.log("停止所有轮询任务");

    for (const taskName of pollingTasks.value.keys()) {
      stopPolling(taskName);
    }

    isGlobalPollingActive.value = false;
  };

  // 更新轮询间隔
  const updatePollingInterval = (taskName, newInterval) => {
    const task = pollingTasks.value.get(taskName);
    const status = pollingStatus.value.get(taskName);

    if (!task) {
      console.error(`轮询任务不存在: ${taskName}`);
      return false;
    }

    // 更新配置
    task.config.interval = newInterval;
    status.interval = newInterval;

    // 如果任务正在运行，重启以应用新间隔
    if (task.isRunning) {
      stopPolling(taskName);
      startPolling(taskName);
    }

    console.log(`更新轮询间隔: ${taskName} = ${newInterval}ms`);
    return true;
  };

  // 根据页面状态调整轮询策略
  const adjustPollingByPageState = (pageState) => {
    console.log(`根据页面状态调整轮询: ${pageState}`);

    switch (pageState) {
      case "home":
        // 首页需要实例和系统数据
        updatePollingInterval("instances", 30000);
        updatePollingInterval("systemStats", 10000);
        startPolling("instances");
        startPolling("systemStats");
        break;

      case "instances":
        // 实例页面需要更频繁的实例数据
        updatePollingInterval("instances", 15000);
        stopPolling("systemStats"); // 暂停系统数据
        startPolling("instances");
        break;

      case "downloads":
        // 下载页面暂停实例轮询，按需启用部署状态轮询
        stopPolling("instances");
        stopPolling("systemStats");
        break;

      case "background":
        // 应用在后台时降低轮询频率
        updatePollingInterval("instances", 60000); // 1分钟
        updatePollingInterval("systemStats", 30000); // 30秒
        break;

      default:
        // 默认状态
        startAllPolling();
    }
  };

  // 智能轮询调度（根据数据变化频率调整间隔）
  const enableSmartPolling = (taskName) => {
    const task = pollingTasks.value.get(taskName);
    if (!task) return;

    // 记录数据变化历史
    task.changeHistory = task.changeHistory || [];
    task.lastData = task.lastData || null;

    // 原始轮询函数
    const originalFn = task.fn;

    // 包装轮询函数以检测数据变化
    task.fn = async () => {
      const result = await originalFn();

      // 检测数据是否变化
      const currentDataStr = JSON.stringify(result);
      const hasChanged = task.lastData !== currentDataStr;

      if (hasChanged) {
        task.changeHistory.push(Date.now());
        task.lastData = currentDataStr;

        // 保留最近10次变化记录
        if (task.changeHistory.length > 10) {
          task.changeHistory.shift();
        }
      }

      // 根据变化频率调整轮询间隔
      _adjustPollingInterval(taskName);

      return result;
    };
  };

  // 根据变化频率调整轮询间隔
  const _adjustPollingInterval = (taskName) => {
    const task = pollingTasks.value.get(taskName);
    if (!task || !task.changeHistory) return;

    const now = Date.now();
    const recentChanges = task.changeHistory.filter(
      (time) => now - time < 5 * 60 * 1000
    ); // 5分钟内

    const originalInterval =
      defaultPollingConfig.value[taskName]?.interval || 30000;
    let newInterval = originalInterval;

    if (recentChanges.length >= 3) {
      // 变化频繁，增加轮询频率
      newInterval = Math.max(5000, originalInterval * 0.5);
    } else if (recentChanges.length === 0) {
      // 无变化，降低轮询频率
      newInterval = Math.min(120000, originalInterval * 2);
    }

    if (newInterval !== task.config.interval) {
      updatePollingInterval(taskName, newInterval);
      console.log(
        `智能调整轮询间隔: ${taskName} = ${newInterval}ms (变化次数: ${recentChanges.length})`
      );
    }
  };

  // 获取轮询状态
  const getPollingStatus = () => {
    const status = {};
    for (const [taskName, taskStatus] of pollingStatus.value) {
      status[taskName] = { ...taskStatus };
    }
    return status;
  };

  // 重置轮询状态
  const resetPolling = () => {
    stopAllPolling();
    pollingTasks.value.clear();
    pollingStatus.value.clear();
    isGlobalPollingActive.value = false;
  };
  // 初始化默认轮询任务
  const initializeDefaultPolling = () => {
    // 延迟获取store引用，避免循环依赖
    const instanceStore = useInstanceStore();
    const systemStore = useSystemStore();

    // 注册实例轮询任务
    registerPollingTask("instances", async () => {
      await instanceStore.fetchInstances();
    });

    // 注册系统性能轮询任务
    registerPollingTask("systemStats", async () => {
      await systemStore.fetchSystemStats();
    });

    console.log("默认轮询任务初始化完成");
  };

  return {
    // 状态
    pollingTasks,
    pollingStatus,
    isGlobalPollingActive,
    defaultPollingConfig,

    // 方法
    registerPollingTask,
    startPolling,
    stopPolling,
    startAllPolling,
    stopAllPolling,
    updatePollingInterval,
    adjustPollingByPageState,
    enableSmartPolling,
    getPollingStatus,
    resetPolling,
    initializeDefaultPolling,
  };
});
